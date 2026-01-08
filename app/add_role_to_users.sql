-- Add 'role' column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'researcher';

-- Promote the primary admin
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'dadiengalfred1911@gmail.com';

-- Verify the change
SELECT * FROM public.users WHERE role = 'admin';
