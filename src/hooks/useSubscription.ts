import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Subscription {
  id: string;
  restaurant_id: string;
  plan: string;
  status: string;
  generations_used: number;
  generations_limit: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
}

const PLAN_LABELS: Record<string, string> = {
  free: 'FREE',
  starter: 'STARTER',
  premium: 'PREMIUM',
};

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-muted text-muted-foreground',
  starter: 'bg-primary text-primary-foreground',
  premium: 'bg-accent text-accent-foreground',
};

export function useSubscription(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['subscription', restaurantId],
    enabled: !!restaurantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .single();

      if (error) throw error;
      return data as Subscription;
    },
  });
}

export function getPlanLabel(plan: string) {
  return PLAN_LABELS[plan] || plan.toUpperCase();
}

export function getPlanBadgeClass(plan: string) {
  return PLAN_COLORS[plan] || PLAN_COLORS.free;
}

export function isGenerationAllowed(sub: Subscription | undefined | null): boolean {
  if (!sub) return false;
  // Unlimited for paid plans
  if (sub.plan === 'starter' || sub.plan === 'premium') return true;
  return sub.generations_used < sub.generations_limit;
}

export function getRemainingGenerations(sub: Subscription | undefined | null): number | 'unlimited' {
  if (!sub) return 0;
  if (sub.plan === 'starter' || sub.plan === 'premium') return 'unlimited';
  return Math.max(0, sub.generations_limit - sub.generations_used);
}
