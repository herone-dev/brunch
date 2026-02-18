
-- Add scheduling, default, and global columns to menus
ALTER TABLE public.menus
ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN schedule_start TIME,
ADD COLUMN schedule_end TIME,
ADD COLUMN schedule_days TEXT[] DEFAULT ARRAY['mon','tue','wed','thu','fri','sat','sun'],
ADD COLUMN is_global BOOLEAN NOT NULL DEFAULT false;

-- Only one default menu per restaurant
CREATE UNIQUE INDEX idx_menus_default_per_restaurant ON public.menus (restaurant_id) WHERE is_default = true AND is_global = false;

-- Only one global menu per restaurant
CREATE UNIQUE INDEX idx_menus_global_per_restaurant ON public.menus (restaurant_id) WHERE is_global = true;
