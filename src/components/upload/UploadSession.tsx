"use client"

import { Database, UploadStatus } from '@/lib/database.types'
import { supabaseClient } from '@/lib/supabase.client'
import Logger from '@/lib/logger'
import { RealtimeChannel } from '@supabase/supabase-js'

// Use the CsvUploadSession type from database
type UploadSession = Database['public']['Tables']['upload_sessions']['Row'];

export class UploadSessionManager {
  private supabase = supabaseClient;
  private channel: RealtimeChannel | null = null;
  private retryCount = 0;
  private readonly maxRetries = 5;
  private readonly retryDelay = 1000; // Base delay in ms
  private retryTimeout: NodeJS.Timeout | null = null;
  private isCompleted = false;
  private currentStatus: UploadStatus | null = null;
  private onProgress?: (progress: number) => void;
  private onStatusChange?: (status: UploadStatus) => void;
  private onError?: (errors: any[]) => void;
  private onStatsUpdate?: (stats: { total: number; valid: number; invalid: number; duplicates: number }) => void;
  private onCurrentRecord?: (record: string) => void;

  constructor(callbacks?: {
    onProgress?: (progress: number) => void;
    onStatusChange?: (status: UploadStatus) => void;
    onError?: (errors: any[]) => void;
    onStatsUpdate?: (stats: { total: number; valid: number; invalid: number; duplicates: number }) => void;
    onCurrentRecord?: (record: string) => void;
  }) {
    if (callbacks) {
      this.onProgress = callbacks.onProgress;
      this.onStatusChange = callbacks.onStatusChange;
      this.onError = callbacks.onError;
      this.onStatsUpdate = callbacks.onStatsUpdate;
      this.onCurrentRecord = callbacks.onCurrentRecord;
    }
  }

  private sanitizePathComponent(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9-_]/g, '_') // Replace any non-alphanumeric chars with underscore
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .toLowerCase();
  }

  public async startUpload(file: File, organization: string): Promise<void> {
    Logger.info('Starting file upload', { fileName: file.name, organization });

    try {
      // 1. Create upload session
      const { data: session, error: sessionError } = await this.supabase
        .from('upload_sessions')
        .insert({
          organization,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || 'text/csv',
          status: 'uploading',
          total_records: 0,
          processed_records: 0,
          valid_records: 0,
          invalid_records: 0,
          duplicate_records: 0,
          processing_details: {
            started_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (sessionError || !session) {
        Logger.error('Failed to create session', { error: sessionError });
        throw new Error(sessionError?.message || 'فشل إنشاء جلسة التحميل');
      }

      const sessionId = session.id;
      Logger.debug('Created upload session', { sessionId });

      // Set up realtime subscription before starting upload
      this.setupChannel(sessionId);

      // 2. Get signed URL for upload
      const sanitizedOrg = this.sanitizePathComponent(organization);
      const storagePath = `uploads/${sanitizedOrg}/${sessionId}/${this.sanitizePathComponent(file.name)}`;
      Logger.debug('Getting signed URL', { sessionId, storagePath });

      const { data: signedData, error: signedUrlError } = await this.supabase
        .storage
        .from('csv-uploads')
        .createSignedUploadUrl(storagePath);

      if (signedUrlError || !signedData?.signedUrl) {
        Logger.error('Failed to get signed URL', { error: signedUrlError });
        throw new Error(signedUrlError?.message || 'فشل الحصول على رابط التحميل');
      }

      // 3. Upload file
      const uploadResponse = await fetch(signedData.signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': 'text/csv'
        }
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        Logger.error('Failed to upload file', { 
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          error: errorText
        });
        throw new Error('فشل تحميل الملف');
      }

      const publicUrl = this.supabase.storage
        .from('csv-uploads')
        .getPublicUrl(storagePath)
        .data.publicUrl;

      Logger.debug('File uploaded successfully', { publicUrl });

      // 4. Update session with file URL and mark as pending
      const { error: updateError } = await this.supabase
        .from('upload_sessions')
        .update({ 
          file_url: publicUrl,
          status: 'pending',
          processing_details: {
            ...session.processing_details,
            upload_completed: new Date().toISOString(),
            storage_path: storagePath
          }
        })
        .eq('id', sessionId);

      if (updateError) {
        Logger.error('Failed to update session', { error: updateError });
        throw new Error('فشل تحديث حالة الجلسة');
      }

      // 5. Start processing
      const processResponse = await fetch('/api/process-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        Logger.error('Failed to start processing', errorData);
        throw new Error(errorData.error || 'فشل بدء معالجة الملف');
      }

      Logger.debug('Processing started successfully');

    } catch (error) {
      Logger.error('Upload failed', { error });
      throw error;
    }
  }

  private setupChannel(sessionId: string) {
    try {
      // Clean up any existing subscription
      this.cleanup();

      // Subscribe to session updates
      this.channel = this.supabase
        .channel(`upload_progress_${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'upload_sessions',
            filter: `id=eq.${sessionId}`,
          },
          (payload) => {
            Logger.debug('Received session update', payload);
            this.handleSessionUpdate(payload.new as UploadSession);
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            Logger.debug('Successfully subscribed to updates');
          } else {
            Logger.error('Failed to subscribe to channel', { status, err });
            this.retrySubscription(sessionId);
          }
        });

    } catch (error) {
      Logger.error('Error setting up channel', { error });
      this.retrySubscription(sessionId);
    }
  }

  private handleSessionUpdate(data: UploadSession) {
    if (!data) return;

    Logger.debug('Processing session update', { 
      status: data.status,
      processed: data.processed_records,
      total: data.total_records 
    });

    // Update status
    if (this.onStatusChange && data.status) {
      this.currentStatus = data.status as UploadStatus;
      this.onStatusChange(this.currentStatus);
    }

    // Update progress
    const totalRecords = data.total_records ?? 0;
    const processedRecords = data.processed_records ?? 0;
    
    if (this.onProgress && totalRecords > 0) {
      const progress = Math.round((processedRecords / totalRecords) * 100);
      this.onProgress(Math.min(progress, 100));
    }

    // Update stats
    if (this.onStatsUpdate) {
      this.onStatsUpdate({
        total: totalRecords,
        valid: data.valid_records ?? 0,
        invalid: data.invalid_records ?? 0,
        duplicates: data.duplicate_records ?? 0
      });
    }

    // Update current record
    if (this.onCurrentRecord && data.current_record) {
      this.onCurrentRecord(data.current_record);
    }

    // Update errors
    if (this.onError && data.errors) {
      // Ensure errors is an array before passing to callback
      const errorsArray = Array.isArray(data.errors) ? data.errors : [];
      this.onError(errorsArray);
    }

    // Handle completion
    if (data.status === 'completed' || data.status === 'failed') {
      Logger.debug('Processing completed', { status: data.status });
      this.isCompleted = true;
      this.cleanup();
    }
  }

  private retrySubscription(sessionId: string) {
    if (this.retryCount < this.maxRetries && !this.isCompleted) {
      this.retryCount++;
      const delay = Math.min(this.retryDelay * Math.pow(2, this.retryCount - 1), 10000);
      
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
      }
      
      this.retryTimeout = setTimeout(() => {
        if (!this.isCompleted) {
          this.setupChannel(sessionId);
        }
      }, delay);
    }
  }

  cleanup() {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    this.retryCount = 0;
  }

  unsubscribeFromSession() {
    this.cleanup();
  }
}
