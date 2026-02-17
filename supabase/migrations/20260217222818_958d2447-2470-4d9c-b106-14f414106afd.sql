-- Add design settings column to store template + custom styles
ALTER TABLE public.menus ADD COLUMN IF NOT EXISTS design_json jsonb DEFAULT '{}'::jsonb;