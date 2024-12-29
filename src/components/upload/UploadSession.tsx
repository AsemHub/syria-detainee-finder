"use client"

import { supabaseClient } from '@/lib/supabase.client'
import Logger from '@/lib/logger'
import { UploadStatus, UploadSession } from '@/types/upload'

export class UploadSessionManager {
  private supabase = supabaseClient;

  async createSession(file: File, organization: string): Promise<UploadSession> {
    try {
      // First create the session
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
          duplicate_records: 0,
          processing_details: {
            current_index: 0,
            total: 0
          }
        })
        .select()
        .single();

      if (error) {
        Logger.error('Failed to create session', { error });
        throw error;
      }

      Logger.debug('Upload session created', { sessionId: session.id });

      // Create form data for the file upload
      const formData = new FormData();
      
      // Add the file directly without conversion
      formData.append('file', file);
      formData.append('organization', organization);
      formData.append('sessionId', session.id);

      // Log the FormData contents
      const formDataEntries: Record<string, any> = {};
      formData.forEach((value, key) => {
        formDataEntries[key] = value instanceof Blob ? {
          type: value.type,
          size: value.size,
          name: value instanceof File ? value.name : 'blob'
        } : value;
      });
      Logger.debug('FormData being sent', { formData: formDataEntries });

      // Upload the file using the API route
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const responseData = await response.json();

      if (!response.ok) {
        Logger.error('Failed to upload file', { 
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
                message: responseData.error || responseData.message || 'Failed to upload file',
                type: 'error'
              }]
            }]
          })
          .eq('id', session.id);
          
        throw new Error(responseData.error || responseData.message || 'Failed to upload file');
      }

      return session;
    } catch (error) {
      Logger.error('Error creating upload session', { 
        error,
        stack: error instanceof Error ? error.stack : undefined,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  subscribeToSession(sessionId: string, callbacks: {
    onProgress?: (progress: number) => void;
    onStatusChange?: (status: UploadStatus) => void;
    onError?: (errors: any[]) => void;
    onStatsUpdate?: (stats: { total: number; valid: number; invalid: number; duplicates: number }) => void;
    onCurrentRecord?: (record: string) => void;
  }) {
    Logger.debug('Setting up session subscription', { sessionId });

    const channel = this.supabase
      .channel(`upload_session_${sessionId}`)
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
          Logger.debug('Session update received', { 
            sessionId, 
            status: data.status,
            progress: data.processed_records,
            total: data.total_records,
            errors: data.errors?.length || 0
          });

          try {
            // Update progress
            if (data.total_records > 0 && data.processed_records >= 0 && callbacks.onProgress) {
              const progress = Math.round((data.processed_records / data.total_records) * 100);
              callbacks.onProgress(Math.min(progress, 100));
            }

            // Update stats
            if (callbacks.onStatsUpdate) {
              callbacks.onStatsUpdate({
                total: data.total_records || 0,
                valid: data.valid_records || 0,
                invalid: data.invalid_records || 0,
                duplicates: data.duplicate_records || 0
              });
            }

            // Update current record
            if (data.current_record && callbacks.onCurrentRecord) {
              callbacks.onCurrentRecord(data.current_record);
            }

            // Update errors
            if (data.errors && Array.isArray(data.errors) && callbacks.onError) {
              callbacks.onError(data.errors);
            }

            // Update status
            if (callbacks.onStatusChange) {
              const status = data.status.toLowerCase();
              if (['completed', 'failed', 'processing', 'pending'].includes(status)) {
                callbacks.onStatusChange(status as UploadStatus);
              }
            }
          } catch (error) {
            Logger.error('Error processing session update', { error, sessionId });
          }
        }
      );

    // Subscribe and handle subscription status
    channel.subscribe((status) => {
      Logger.debug('Subscription status', { sessionId, status });
      
      if (status === 'SUBSCRIBED') {
        Logger.debug('Successfully subscribed to session updates', { sessionId });
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        Logger.error('Subscription error', { sessionId, status });
        if (callbacks.onStatusChange) {
          callbacks.onStatusChange('failed');
        }
      }
    });

    // Return cleanup function
    return () => {
      Logger.debug('Cleaning up session subscription', { sessionId });
      this.supabase.channel(`upload_session_${sessionId}`).unsubscribe();
    };
  }

  unsubscribeFromSession(sessionId: string) {
    Logger.debug('Unsubscribing from session', { sessionId });
    this.supabase.channel(`upload_session_${sessionId}`).unsubscribe();
  }

  async getInitialSession(sessionId: string): Promise<UploadSession | null> {
    try {
      const { data: session, error } = await this.supabase
        .from('upload_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        Logger.error('Failed to get initial session', { error });
        return null;
      }

      return session;
    } catch (error) {
      Logger.error('Error getting initial session', { error });
      return null;
    }
  }
}
