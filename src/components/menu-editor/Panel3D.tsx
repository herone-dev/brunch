import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Box, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { CategoryWithItems, ItemWithDetails, ModelJob } from '@/lib/types';

const MAX_GENERATIONS = 50; // Monthly quota

interface Panel3DProps {
  categories: CategoryWithItems[];
  restaurantId: string;
}

export function Panel3D({ categories, restaurantId }: Panel3DProps) {
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  // Fetch model jobs for this restaurant
  const { data: jobs = [], refetch: refetchJobs } = useQuery({
    queryKey: ['model-jobs', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('model_jobs')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ModelJob[];
    },
  });

  // Fetch all items with their model status
  const allItems = categories.flatMap(c => c.items);

  // Count used generations (completed + processing + pending)
  const usedGenerations = jobs.filter(j => ['completed', 'processing', 'pending'].includes(j.status)).length;
  const remaining = Math.max(0, MAX_GENERATIONS - usedGenerations);
  const progressPercent = (usedGenerations / MAX_GENERATIONS) * 100;

  // Active jobs (pending + processing)
  const activeJobs = jobs.filter(j => j.status === 'pending' || j.status === 'processing');
  const completedJobs = jobs.filter(j => j.status === 'completed');
  const failedJobs = jobs.filter(j => j.status === 'failed');

  const getItemName = (itemId: string) => {
    const item = allItems.find(i => i.id === itemId);
    if (!item) return 'Plat inconnu';
    const fr = item.translations.find(t => t.lang === 'fr');
    return fr?.name || item.translations[0]?.name || 'Sans nom';
  };

  const handleGenerate = async () => {
    if (!selectedItemId) {
      toast.error("Sélectionnez un plat");
      return;
    }
    if (remaining <= 0) {
      toast.error("Quota de générations atteint");
      return;
    }

    // Check if item has enough media (photos)
    const item = allItems.find(i => i.id === selectedItemId);
    if (!item || item.media.length < 1) {
      toast.error("Ajoutez au moins une photo au plat avant de générer un modèle 3D");
      return;
    }

    setGenerating(true);
    try {
      const inputPaths = item.media.map(m => m.storage_path);
      const { error } = await supabase.from('model_jobs').insert({
        item_id: selectedItemId,
        restaurant_id: restaurantId,
        status: 'pending',
        input_paths: inputPaths,
      });
      if (error) throw error;

      // Also update model status on the item
      await supabase.from('menu_item_models').upsert({
        item_id: selectedItemId,
        status: 'pending',
      });

      toast.success("Génération 3D lancée !");
      setSelectedItemId('');
      refetchJobs();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="text-[9px] gap-1"><Loader2 className="h-2.5 w-2.5 animate-spin" />En attente</Badge>;
      case 'processing':
        return <Badge className="text-[9px] gap-1 bg-warning/15 text-warning border-warning/30"><Loader2 className="h-2.5 w-2.5 animate-spin" />En cours</Badge>;
      case 'completed':
        return <Badge className="text-[9px] gap-1 bg-primary/15 text-primary border-primary/30"><CheckCircle2 className="h-2.5 w-2.5" />Terminé</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-[9px] gap-1"><AlertCircle className="h-2.5 w-2.5" />Échoué</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Quota section */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Box className="h-3.5 w-3.5" /> Générations 3D
        </h3>
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-muted-foreground">Quota mensuel</span>
            <span className="text-xs font-semibold">{remaining} restantes</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <p className="text-[10px] text-muted-foreground">{usedGenerations} / {MAX_GENERATIONS} utilisées</p>
        </div>
      </div>

      {/* Generate section */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-medium">Nouveau modèle 3D</h4>
        <Select value={selectedItemId} onValueChange={setSelectedItemId}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Choisir un plat..." />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => {
              const catName = cat.translations.find(t => t.lang === 'fr')?.name || 'Catégorie';
              return cat.items.map(item => {
                const itemName = item.translations.find(t => t.lang === 'fr')?.name || 'Sans nom';
                return (
                  <SelectItem key={item.id} value={item.id} className="text-xs">
                    <span className="text-muted-foreground">{catName}</span> › {itemName}
                  </SelectItem>
                );
              });
            })}
          </SelectContent>
        </Select>
        <Button
          onClick={handleGenerate}
          disabled={generating || !selectedItemId || remaining <= 0}
          className="w-full h-8 text-xs gap-1.5"
        >
          {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          Générer le modèle 3D
        </Button>
      </div>

      {/* Active jobs */}
      {activeJobs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">En cours ({activeJobs.length})</h4>
          <div className="space-y-1.5">
            {activeJobs.map(job => (
              <div key={job.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                <span className="text-[11px] truncate max-w-[120px]">{getItemName(job.item_id)}</span>
                {statusBadge(job.status)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent completed */}
      {completedJobs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Terminées ({completedJobs.length})</h4>
          <div className="space-y-1.5">
            {completedJobs.slice(0, 5).map(job => (
              <div key={job.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                <span className="text-[11px] truncate max-w-[120px]">{getItemName(job.item_id)}</span>
                {statusBadge(job.status)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Failed */}
      {failedJobs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Échouées ({failedJobs.length})</h4>
          <div className="space-y-1.5">
            {failedJobs.slice(0, 3).map(job => (
              <div key={job.id} className="flex items-center justify-between p-2 bg-destructive/5 rounded-md">
                <span className="text-[11px] truncate max-w-[120px]">{getItemName(job.item_id)}</span>
                {statusBadge(job.status)}
              </div>
            ))}
          </div>
        </div>
      )}

      {jobs.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <Box className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-[11px]">Aucune génération 3D pour le moment</p>
          <p className="text-[10px] mt-1">Sélectionnez un plat et lancez votre première génération</p>
        </div>
      )}
    </div>
  );
}
