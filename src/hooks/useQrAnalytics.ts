import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ScanEvent {
  id: string;
  created_at: string;
  meta: { table?: string | null; slug?: string; ua?: string } | null;
}

export interface DailyScanStat {
  date: string;
  count: number;
}

export interface TableScanStat {
  table: string;
  count: number;
}

export function useQrAnalytics(restaurantId: string | undefined, days: number = 30) {
  return useQuery({
    queryKey: ['qr-analytics', restaurantId, days],
    enabled: !!restaurantId,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from('analytics_events')
        .select('id, created_at, meta')
        .eq('restaurant_id', restaurantId!)
        .eq('type', 'qr_scan')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const events = (data || []) as ScanEvent[];
      const total = events.length;

      // Daily breakdown
      const dailyMap = new Map<string, number>();
      for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dailyMap.set(d.toISOString().slice(0, 10), 0);
      }
      events.forEach(e => {
        const day = e.created_at.slice(0, 10);
        dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
      });
      const daily: DailyScanStat[] = Array.from(dailyMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Table breakdown
      const tableMap = new Map<string, number>();
      events.forEach(e => {
        const t = (e.meta as any)?.table || 'sans table';
        tableMap.set(t, (tableMap.get(t) || 0) + 1);
      });
      const byTable: TableScanStat[] = Array.from(tableMap.entries())
        .map(([table, count]) => ({ table, count }))
        .sort((a, b) => b.count - a.count);

      // Today / this week
      const today = new Date().toISOString().slice(0, 10);
      const todayCount = dailyMap.get(today) || 0;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekCount = events.filter(e => new Date(e.created_at) >= weekAgo).length;

      // Peak hour
      const hourMap = new Map<number, number>();
      events.forEach(e => {
        const h = new Date(e.created_at).getHours();
        hourMap.set(h, (hourMap.get(h) || 0) + 1);
      });
      let peakHour = '-';
      let peakCount = 0;
      hourMap.forEach((c, h) => {
        if (c > peakCount) { peakCount = c; peakHour = `${h}h–${h + 1}h`; }
      });

      return { total, todayCount, weekCount, daily, byTable, peakHour, events };
    },
  });
}
