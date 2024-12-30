"use client"

import { supabaseClient } from '@/lib/supabase.client'
import Logger from '@/lib/logger'
import { UploadStatus, UploadSession } from '@/types/upload'
import { RealtimeChannel } from '@supabase/supabase-js'

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

    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 1000;
    let channel: RealtimeChannel | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;
    let isCompleted = false;

    const setupChannel = () => {
      if (channel) {
        channel.unsubscribe();
      }

      Logger.debug('Creating channel', { sessionId, retryCount });

      channel = this.supabase
        .channel(`upload_session_${sessionId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'upload_sessions',
            filter: `id=eq.${sessionId}`
          },
          (payload) => {
            Logger.debug('Realtime update received', { 
              sessionId, 
              eventType: payload.eventType,
              payload 
            });

            const data = payload.new as UploadSession;
            Logger.debug('Session update received', { 
              sessionId, 
              status: data.status,
              progress: data.processed_records,
              total: data.total_records,
              errors: data.errors?.length || 0,
              payload: data
            });

            try {
              // Reset retry count on successful update
              retryCount = 0;

              // Update progress
              if (callbacks.onProgress) {
                if (data.total_records > 0 && data.processed_records >= 0) {
                  const progress = Math.round((data.processed_records / data.total_records) * 100);
                  callbacks.onProgress(Math.min(progress, 100));
                } else {
                  callbacks.onProgress(0);
                }
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

              // Update status - ensure we always update status last
              if (callbacks.onStatusChange) {
                const status = data.status.toLowerCase();
                if (['completed', 'failed', 'processing', 'pending'].includes(status)) {
                  callbacks.onStatusChange(status as UploadStatus);
                  
                  Logger.debug('Status changed', { 
                    sessionId, 
                    newStatus: status,
                    stats: {
                      total: data.total_records || 0,
                      processed: data.processed_records || 0,
                      valid: data.valid_records || 0,
                      invalid: data.invalid_records || 0
                    }
                  });

                  // If status is terminal, mark as completed and clean up
                  if (status === 'completed' || status === 'failed') {
                    isCompleted = true;
                    Logger.debug('Session completed, cleaning up', { sessionId, status });
                    cleanup(false); // Don't retry for completed sessions
                  }
                }
              }
            } catch (error) {
              Logger.error('Error processing session update', { 
                error,
                sessionId,
                payload: data
              });
            }
          }
        )
        .subscribe((status) => {
          Logger.debug('Channel subscription status', { status, sessionId });
          
          if (status === 'SUBSCRIBED') {
            Logger.info('Successfully subscribed to channel', { sessionId });
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            Logger.error('Channel subscription failed', { status, sessionId });
            handleReconnect();
          }
        });

      return () => {
        if (channel) {
          Logger.debug('Unsubscribing from channel', { sessionId });
          channel.unsubscribe();
        }
      };
    };

    const handleReconnect = () => {
      if (isCompleted) {
        Logger.debug('Session already completed, skipping reconnection', { sessionId });
        return;
      }

      if (retryCount < maxRetries) {
        retryCount++;
        Logger.debug('Scheduling reconnection', { sessionId, retryCount, delay: retryDelay });
        
        if (retryTimeout) {
          clearTimeout(retryTimeout);
        }
        
        retryTimeout = setTimeout(() => {
          Logger.debug('Attempting reconnection', { sessionId, retryCount });
          setupChannel();
        }, retryDelay * Math.pow(2, retryCount - 1));
      } else {
        Logger.error('Max retries reached', { sessionId });
        if (callbacks.onStatusChange) {
          callbacks.onStatusChange('failed');
        }
        cleanup(false);
      }
    };

    const cleanup = (shouldRetry = true) => {
      Logger.debug('Cleaning up session subscription', { 
        sessionId,
        isCompleted,
        shouldRetry,
        hasChannel: !!channel,
        hasRetryTimeout: !!retryTimeout
      });
      
      // Clear any pending retry timeouts
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = null;
      }
      
      // Unsubscribe and close channel if it exists
      if (channel) {
        try {
          channel.unsubscribe();
          channel = null;
        } catch (error) {
          Logger.error('Error unsubscribing from channel', {
            error,
            sessionId
          });
        }
      }

      // Only schedule reconnection if explicitly requested and session not completed
      if (shouldRetry && !isCompleted) {
        handleReconnect();
      }
    };

    // Initial setup
    setupChannel();

    // Return cleanup function
    return () => cleanup(false);
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
