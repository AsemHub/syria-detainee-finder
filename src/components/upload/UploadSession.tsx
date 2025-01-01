"use client"

import { Database } from '@/lib/database.types'
import { supabaseClient } from '@/lib/supabase.client'
import Logger from '@/lib/logger'
import { RealtimeChannel } from '@supabase/supabase-js'

// Define the UploadStatus type
export type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed';

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

  async createSession(file: File, organization: string): Promise<UploadSession> {
    try {
      // Create the upload session
      const { data: session, error } = await this.supabase
        .from('upload_sessions')
        .insert({
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          organization: organization,
          uploaded_by: 'anonymous',
          status: 'pending',
          total_records: 0,
          processed_records: 0,
          valid_records: 0,
          invalid_records: 0,
          duplicate_records: 0
        })
        .select()
        .single();

      if (error) {
        Logger.error('Failed to create session', { error });
        throw error;
      }

      Logger.debug('Upload session created', { sessionId: session.id });

      // Prepare form data for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('organization', organization);
      formData.append('sessionId', session.id);

      // Log form data for debugging
      const formDataEntries: Record<string, any> = {};
      formData.forEach((value, key) => {
        formDataEntries[key] = value instanceof Blob ? {
          type: value.type,
          size: value.size,
          name: value instanceof File ? value.name : 'blob'
        } : value;
      });
      Logger.debug('FormData being sent', { formData: formDataEntries });

      // Upload file using API route
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const responseData = await response.json();
        Logger.error('Upload failed', { 
          status: response.status,
          statusText: response.statusText,
          responseData
        });
        
        // Update session status on error
        await this.supabase
          .from('upload_sessions')
          .update({
            status: 'failed',
            errors: [{
              record: '',
              errors: [{ 
                message: responseData.message || 'خطأ في رفع الملف',
                type: 'error'
              }]
            }]
          })
          .eq('id', session.id);
          
        throw new Error(responseData.message || 'خطأ في رفع الملف');
      }

      return session;

    } catch (error) {
      Logger.error('Error in upload process', { 
        error,
        stack: error instanceof Error ? error.stack : undefined,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async startUpload(file: File, organization: string, sessionId: string): Promise<void> {
    try {
      Logger.info(`Starting file upload: ${file.name}`);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('organization', organization);
      formData.append('sessionId', sessionId);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        Logger.error(`Upload failed: ${response.status}`, { error: errorData });
        throw new Error(`Upload failed: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      Logger.info(`Upload completed successfully`, { data });

    } catch (error) {
      Logger.error(`Upload error occurred`, { error });
      throw error;
    }
  }

  subscribeToSession(sessionId: string, callbacks: {
    onProgress?: (progress: number) => void;
    onStatusChange?: (status: UploadStatus) => void;
    onError?: (errors: any[]) => void;
    onStatsUpdate?: (stats: { total: number; valid: number; invalid: number; duplicates: number }) => void;
    onCurrentRecord?: (record: string) => void;
  }): () => void {
    Logger.debug('Setting up session subscription', { sessionId });

    // Reset state
    this.retryCount = 0;
    this.isCompleted = false;
    this.currentStatus = null;
    
    // Get initial session state
    this.getInitialSession(sessionId).then(session => {
      if (session) {
        this.handleSessionUpdate(session, callbacks);
      }
    });

    // Setup real-time channel
    this.setupChannel(sessionId, callbacks);

    // Return cleanup function
    return () => this.cleanup();
  }

  private async getInitialSession(sessionId: string): Promise<UploadSession | null> {
    try {
      const { data, error } = await this.supabase
        .from('upload_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        Logger.error('Failed to get initial session state', { error, sessionId });
        return null;
      }

      return data;
    } catch (error) {
      Logger.error('Error getting initial session state', { error, sessionId });
      return null;
    }
  }

  private setupChannel(sessionId: string, callbacks: any) {
    if (this.channel) {
      this.channel.unsubscribe();
    }

    Logger.debug('Creating channel', { sessionId, retryCount: this.retryCount });

    this.channel = this.supabase
      .channel('public:upload_sessions')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'upload_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          const data = payload.new as UploadSession;
          Logger.debug('Realtime update received', { 
            sessionId, 
            status: data.status,
            progress: data.processed_records,
            total: data.total_records
          });

          this.handleSessionUpdate(data, callbacks);
        }
      )
      .subscribe((status) => {
        Logger.debug('Channel subscription status', { status, sessionId });
        
        if (status === 'SUBSCRIBED') {
          Logger.info('Successfully subscribed to channel', { sessionId });
          this.retryCount = 0;
        } else if (!this.isCompleted && (status === 'CLOSED' || status === 'CHANNEL_ERROR')) {
          // Only log error if we're not completed
          Logger.error('Channel subscription failed', { status, sessionId });
          this.handleReconnect(sessionId, callbacks);
        } else if (this.isCompleted && (status === 'CLOSED' || status === 'CHANNEL_ERROR')) {
          // Just debug log if we're completed - this is expected
          Logger.debug('Channel closed after completion', { status, sessionId });
        }
      });
  }

  private handleSessionUpdate(data: UploadSession, callbacks: any) {
    try {
      // Update progress
      if (callbacks.onProgress) {
        const totalRecords = data.total_records ?? 0;
        const processedRecords = data.processed_records ?? 0;
        
        if (totalRecords > 0) {
          const progress = Math.round((processedRecords / totalRecords) * 100);
          callbacks.onProgress(Math.min(progress, 100));
        }
      }

      // Update stats
      if (callbacks.onStatsUpdate) {
        callbacks.onStatsUpdate({
          total: data.total_records ?? 0,
          valid: data.valid_records ?? 0,
          invalid: data.invalid_records ?? 0,
          duplicates: data.duplicate_records ?? 0
        });
      }

      // Update current record
      if (callbacks.onCurrentRecord && data.current_record) {
        callbacks.onCurrentRecord(data.current_record);
      }

      // Update errors
      if (callbacks.onError && data.errors && Array.isArray(data.errors)) {
        callbacks.onError(data.errors);
      }

      // Update status last
      if (callbacks.onStatusChange && data.status) {
        const status = data.status.toLowerCase() as UploadStatus;
        if (['completed', 'failed', 'processing', 'pending'].includes(status)) {
          // Update current status before callback
          const oldStatus = this.currentStatus;
          this.currentStatus = status;
          
          if (oldStatus !== status) {
            Logger.debug('Status changed', { 
              sessionId: data.id,
              oldStatus,
              newStatus: status
            });
            callbacks.onStatusChange(status);
          }
          
          if (status === 'completed' || status === 'failed') {
            this.isCompleted = true;
            Logger.debug('Session completed', { 
              sessionId: data.id,
              status,
              stats: {
                total: data.total_records ?? 0,
                valid: data.valid_records ?? 0,
                invalid: data.invalid_records ?? 0,
                duplicates: data.duplicate_records ?? 0
              }
            });
            this.cleanup();
          }
        }
      }

    } catch (error) {
      Logger.error('Error processing session update', { 
        error,
        sessionId: data.id,
        data
      });
    }
  }

  private handleReconnect(sessionId: string, callbacks: any) {
    if (this.isCompleted) {
      Logger.debug('Session already completed, skipping reconnection');
      return;
    }

    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      const delay = this.retryDelay * Math.pow(2, this.retryCount - 1);
      
      Logger.debug('Scheduling reconnection', { 
        sessionId, 
        retryCount: this.retryCount,
        delay 
      });
      
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
      }
      
      this.retryTimeout = setTimeout(() => {
        if (!this.isCompleted) {
          Logger.debug('Attempting reconnection', { sessionId, retryCount: this.retryCount });
          this.setupChannel(sessionId, callbacks);
        } else {
          Logger.debug('Session completed during retry delay, skipping reconnection');
        }
      }, delay);
    } else {
      Logger.error('Max retries reached', { sessionId });
      if (callbacks.onStatusChange) {
        callbacks.onStatusChange('failed');
      }
      this.cleanup();
    }
  }

  private cleanup() {
    Logger.debug('Cleaning up session subscription', { 
      isCompleted: this.isCompleted,
      hasChannel: !!this.channel,
      hasRetryTimeout: !!this.retryTimeout
    });
    
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }

    // Reset state
    this.currentStatus = null;
    this.retryCount = 0;
  }

  unsubscribeFromSession() {
    this.cleanup();
  }
}
