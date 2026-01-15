-- Add end_time column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments' 
        AND column_name = 'end_time'
    ) THEN
        ALTER TABLE public.appointments 
        ADD COLUMN end_time TIME NOT NULL DEFAULT '00:00:00';
        
        -- Update existing records to have a calculated end_time based on start_time
        -- Assuming default duration of 30 minutes for existing records
        UPDATE public.appointments
        SET end_time = (start_time::time + INTERVAL '30 minutes')::time
        WHERE end_time = '00:00:00' OR end_time IS NULL;
    END IF;
END $$;
