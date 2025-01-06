import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';
import Logger from '@/lib/logger';
import { normalizeArabicText } from '@/lib/arabic-utils';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function processNextJob() {
  try {
    // Get next pending job with highest priority and oldest creation date
    const { data: job, error: jobError } = await supabase
      .from('processing_queue')
      .select(`
        *,
        upload_sessions (
          id,
          file_url,
          organization,
          total_records,
          processed_records
        )
      `)
      .eq('status', 'pending')
      .lt('attempts', 'max_attempts')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (jobError || !job) {
      if (jobError?.code !== 'PGRST116') { // No rows returned
        Logger.error('Error fetching next job', { error: jobError });
      }
      return;
    }

    // Mark job as processing
    const { error: updateError } = await supabase
      .from('processing_queue')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
        attempts: job.attempts + 1,
        last_attempt_at: new Date().toISOString()
      })
      .eq('id', job.id);

    if (updateError) {
      Logger.error('Error updating job status', { error: updateError });
      return;
    }

    // Update session status
    await supabase
      .from('upload_sessions')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', job.session_id);

    // Process the CSV file
    try {
      const result = await processCsvFile(job.upload_sessions);
      
      // Mark job as completed
      await supabase
        .from('processing_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          processing_details: result
        })
        .eq('id', job.id);

    } catch (error) {
      Logger.error('Error processing CSV', { error, jobId: job.id });

      // Mark job as failed
      await supabase
        .from('processing_queue')
        .update({
          status: job.attempts >= job.max_attempts ? 'failed' : 'pending',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: job.attempts >= job.max_attempts ? new Date().toISOString() : null,
          processing_details: {
            last_error: error instanceof Error ? error.message : 'Unknown error',
            failed_at: new Date().toISOString()
          }
        })
        .eq('id', job.id);

      // Update session status if max attempts reached
      if (job.attempts >= job.max_attempts) {
        await supabase
          .from('upload_sessions')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date().toISOString(),
            completed_at: new Date().toISOString()
          })
          .eq('id', job.session_id);
      }

      throw error;
    }

  } catch (error) {
    Logger.error('Error processing job', { error });
  }
}

async function processCsvFile(session: any) {
  // Get file content
  const { data: fileData, error: fileError } = await supabase.storage
    .from('csv-uploads')
    .download(session.file_url);

  if (fileError) {
    throw new Error(`Failed to fetch file: ${fileError.message}`);
  }

  const fileContent = await fileData.text();
  const records = Papa.parse(fileContent, { header: true }).data;

  // Update session with total records
  await supabase
    .from('upload_sessions')
    .update({
      total_records: records.length,
      processed_records: 0,
      valid_records: 0,
      invalid_records: 0,
      duplicate_records: 0,
      updated_at: new Date().toISOString()
    })
    .eq('id', session.id);

  let validRecords = 0;
  let invalidRecords = 0;
  let duplicateRecords = 0;
  let skippedDuplicates = 0;
  const errors: Array<{ record: string, errors: Array<{ type: string, message: string }> }> = [];
  const failedRecords: any[] = [];

  // Process each record
  for (let i = 0; i < records.length; i++) {
    const record = records[i] as any;
    const recordErrors: Array<{ type: string, message: string }> = [];
    
    try {
      // Your existing record processing logic here
      // ...

      validRecords++;
    } catch (error) {
      invalidRecords++;
      const errorInfo = {
        record: record.الاسم_الكامل || `Record ${i + 1}`,
        errors: [{
          type: 'processing_error',
          message: error instanceof Error ? error.message : 'Unknown error'
        }]
      };
      errors.push(errorInfo);
      failedRecords.push({
        ...record,
        error: errorInfo.errors[0].message
      });
    }

    // Update progress every 10 records or on last record
    if (i % 10 === 0 || i === records.length - 1) {
      await supabase
        .from('upload_sessions')
        .update({
          processed_records: i + 1,
          valid_records: validRecords,
          invalid_records: invalidRecords,
          duplicate_records: duplicateRecords,
          skipped_duplicates: skippedDuplicates,
          current_record: record.الاسم_الكامل || `Record ${i + 1}`,
          updated_at: new Date().toISOString(),
          last_update: new Date().toISOString()
        })
        .eq('id', session.id);
    }
  }

  // Update final status
  const finalUpdate = {
    status: invalidRecords > 0 ? 'failed' : 'completed',
    processed_records: records.length,
    valid_records: validRecords,
    invalid_records: invalidRecords,
    duplicate_records: duplicateRecords,
    skipped_duplicates: skippedDuplicates,
    errors: errors.length > 0 ? errors : null,
    failed_records: failedRecords.length > 0 ? failedRecords : null,
    updated_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    last_update: new Date().toISOString()
  };

  await supabase
    .from('upload_sessions')
    .update(finalUpdate)
    .eq('id', session.id);

  return {
    total_records: records.length,
    valid_records: validRecords,
    invalid_records: invalidRecords,
    duplicate_records: duplicateRecords,
    skipped_duplicates: skippedDuplicates
  };
}

// Start processing loop
async function startProcessingLoop() {
  while (true) {
    await processNextJob();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between checks
  }
}

// Start the processing loop
startProcessingLoop().catch(error => {
  Logger.error('Processing loop failed', { error });
  process.exit(1);
});
