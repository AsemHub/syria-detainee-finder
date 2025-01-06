-- Update status constraint to include 'uploading' status
DO $$ 
BEGIN
    -- First drop the existing constraint
    ALTER TABLE upload_sessions DROP CONSTRAINT IF EXISTS upload_sessions_status_check;
    
    -- Add the new constraint with 'uploading' status
    ALTER TABLE upload_sessions ADD CONSTRAINT upload_sessions_status_check 
        CHECK (status IN ('uploading', 'pending', 'processing', 'completed', 'failed'));
END $$;
