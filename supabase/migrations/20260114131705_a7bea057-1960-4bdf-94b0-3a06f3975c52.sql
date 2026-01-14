-- Create appointments table
CREATE TABLE public.appointments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    service_type TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'blocked'))
);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Allow public to insert appointments (for booking)
CREATE POLICY "Anyone can create appointments"
ON public.appointments
FOR INSERT
WITH CHECK (true);

-- Allow public to read appointments (for checking availability)
CREATE POLICY "Anyone can view appointments"
ON public.appointments
FOR SELECT
USING (true);

-- Allow public to update appointments (for admin, will add proper auth later)
CREATE POLICY "Anyone can update appointments"
ON public.appointments
FOR UPDATE
USING (true);

-- Allow public to delete appointments
CREATE POLICY "Anyone can delete appointments"
ON public.appointments
FOR DELETE
USING (true);

-- Create index for faster availability queries
CREATE INDEX idx_appointments_date_time ON public.appointments (appointment_date, start_time, end_time);

-- Create index for status filtering
CREATE INDEX idx_appointments_status ON public.appointments (status);