
-- Table pour stocker l'abonnement de chaque restaurant
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  generations_used integer NOT NULL DEFAULT 0,
  generations_limit integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id)
);

-- RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view subscription"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (is_restaurant_member(auth.uid(), restaurant_id));

CREATE POLICY "System can insert subscription"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (is_restaurant_member(auth.uid(), restaurant_id));

CREATE POLICY "System can update subscription"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (is_restaurant_member(auth.uid(), restaurant_id));

-- Auto-create a free subscription when a restaurant is created
CREATE OR REPLACE FUNCTION public.auto_create_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (restaurant_id, plan, generations_limit)
  VALUES (NEW.id, 'free', 3);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_subscription
  AFTER INSERT ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_subscription();

-- Create subscriptions for existing restaurants that don't have one
INSERT INTO public.subscriptions (restaurant_id, plan, generations_limit)
SELECT id, 'free', 3 FROM public.restaurants r
WHERE NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.restaurant_id = r.id);
