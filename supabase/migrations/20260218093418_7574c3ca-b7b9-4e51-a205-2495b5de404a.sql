
-- Custom saved templates per restaurant
CREATE TABLE public.custom_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  design_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view custom templates"
  ON public.custom_templates FOR SELECT
  USING (is_restaurant_member(auth.uid(), restaurant_id));

CREATE POLICY "Members can insert custom templates"
  ON public.custom_templates FOR INSERT
  WITH CHECK (is_restaurant_member(auth.uid(), restaurant_id));

CREATE POLICY "Members can update custom templates"
  ON public.custom_templates FOR UPDATE
  USING (is_restaurant_member(auth.uid(), restaurant_id));

CREATE POLICY "Members can delete custom templates"
  ON public.custom_templates FOR DELETE
  USING (is_restaurant_member(auth.uid(), restaurant_id));
