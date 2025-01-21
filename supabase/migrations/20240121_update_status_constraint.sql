-- Drop existing constraint
ALTER TABLE detainees DROP CONSTRAINT IF EXISTS detainees_check;

-- Add new constraint with updated status values
ALTER TABLE detainees ADD CONSTRAINT detainees_check CHECK (
  status IN (
    'معتقل',
    'مفقود',
    'محرر',
    'متوفى',
    'مغيب قسراً',
    'غير معروف'
  )
);