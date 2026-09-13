ALTER TABLE applications ADD COLUMN IF NOT EXISTS salary varchar(128);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS application_deadline timestamp;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS work_mode varchar(32);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS fit_level integer;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS interest_level integer;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS job_highlights text;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS job_concerns text;
