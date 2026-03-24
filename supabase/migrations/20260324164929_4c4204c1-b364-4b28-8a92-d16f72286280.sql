
-- Table for platform-level admins (separate from restaurant roles)
CREATE TABLE public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Only platform admins can see the table
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = _user_id
  )
$$;

CREATE POLICY "Admins can view platform_admins"
  ON public.platform_admins FOR SELECT
  TO authenticated
  USING (is_platform_admin(auth.uid()));
