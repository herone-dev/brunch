import { useState, useRef } from 'react';
import { Camera, Upload, Loader2, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ImportedMenuData, MenuAnalysisResponse } from '@/lib/menu-import-types';

interface MenuPhotoImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMenuImported: (menuData: ImportedMenuData) => void;
}

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX = 2000;
        if (width > MAX) {
          height = (height * MAX) / width;
          width = MAX;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('Erreur chargement image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Erreur lecture fichier'));
    reader.readAsDataURL(file);
  });
};

export function MenuPhotoImporter({ open, onOpenChange, onMenuImported }: MenuPhotoImporterProps) {
  const [step, setStep] = useState<'choose' | 'processing' | 'done'>('choose');
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('choose');
    setProgress(0);
    setProgressText('');
    setPreview(null);
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Format invalide. Utilisez JPG, PNG ou WEBP.');
      return;
    }

    try {
      setStep('processing');
      setProgress(10);
      setProgressText('Compression de l\'image…');

      const base64 = await compressImage(file);
      setPreview(base64);

      const sizeKB = Math.round((base64.length * 0.75) / 1024);
      if (sizeKB > 10240) {
        toast.error('Image trop volumineuse (max 10 MB)');
        reset();
        return;
      }

      setProgress(30);
      setProgressText('Analyse par l\'IA…');

      const { data, error } = await supabase.functions.invoke('analyze-menu-photo', {
        body: { image: base64, filename: file.name },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.message || 'Erreur d\'analyse');

      setProgress(90);
      setProgressText('Import des données…');

      const response = data as MenuAnalysisResponse;
      onMenuImported(response.menu_data);

      setProgress(100);
      setStep('done');
      setProgressText('');

      toast.success(`Menu importé ! ${response.stats.total_categories} catégories, ${response.stats.total_items} plats`);
    } catch (err: any) {
      console.error('Import error:', err);
      toast.error(err.message || 'Erreur lors de l\'import');
      reset();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importer un menu depuis une photo</DialogTitle>
        </DialogHeader>

        {step === 'choose' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Prenez une photo de votre menu ou importez une image. L'IA analysera et extraira automatiquement les catégories et plats.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-24 flex flex-col gap-2"
                onClick={() => cameraRef.current?.click()}
              >
                <Camera className="h-6 w-6" />
                <span className="text-xs">Prendre une photo</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex flex-col gap-2"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-6 w-6" />
                <span className="text-xs">Importer un fichier</span>
              </Button>
            </div>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleChange} />
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleChange} />
            <div className="text-[11px] text-muted-foreground space-y-0.5">
              <p>✓ Formats : JPG, PNG, WEBP</p>
              <p>✓ Max : 10 MB</p>
              <p>✓ Compression automatique</p>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="space-y-4 py-4">
            {preview && (
              <img src={preview} alt="Menu" className="w-full max-h-48 object-contain rounded-lg border" />
            )}
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {progressText}
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle className="h-10 w-10 text-primary" />
            <p className="text-sm font-medium">Import terminé !</p>
            <Button onClick={() => { reset(); onOpenChange(false); }}>Fermer</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
