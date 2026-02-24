import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Camera, Upload, FileText, ArrowLeft, Loader2, Plus,
  X, CheckCircle2, Smartphone,
} from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  onMenuCreated: (menuId: string) => void;
}

type Step = 'choice' | 'camera' | 'review' | 'uploading' | 'processing' | 'name-scratch';

export function NewMenuDialog({ open, onOpenChange, restaurantId, onMenuCreated }: Props) {
  const [step, setStep] = useState<Step>('choice');
  const [menuName, setMenuName] = useState('');
  const [creating, setCreating] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup camera on unmount / step change
  useEffect(() => {
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (step === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [step]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep('choice');
      setMenuName('');
      setFiles([]);
      setPreviews(p => { p.forEach(url => URL.revokeObjectURL(url)); return []; });
      setProcessing(false);
      stopCamera();
    }
  }, [open]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast.error("Impossible d'accéder à la caméra");
      setStep('choice');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const capturedFile = new File([blob], `menu-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      stopCamera();
      setFiles(prev => [...prev, capturedFile]);
      setPreviews(prev => [...prev, URL.createObjectURL(capturedFile)]);
      setStep('review');
    }, 'image/jpeg', 0.92);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFiles(prev => [...prev, selected]);
    setPreviews(prev => [...prev, URL.createObjectURL(selected)]);
    setStep('review');
  };

  const removePhoto = (index: number) => {
    setPreviews(prev => { URL.revokeObjectURL(prev[index]); return prev.filter((_, i) => i !== index); });
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (files.length <= 1) setStep('choice');
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX = 2000;
          if (width > MAX) { height = (height * MAX) / width; width = MAX; }
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

  const handleProcessAll = async () => {
    if (files.length === 0) return;
    setStep('uploading');
    try {
      const base64 = await fileToBase64(files[0]);
      setStep('processing');
      toast.success('Fichier envoyé ! Traitement en cours…');

      const { data, error } = await supabase.functions.invoke('analyze-menu-photo', {
        body: { image: base64, filename: files[0].name },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.message || "Erreur d'analyse");

      const result = data?.menu_data || data;

      // Create menu from result
      const { data: newMenu, error: menuErr } = await supabase
        .from('menus')
        .insert({
          restaurant_id: restaurantId,
          name: result?.restaurant_name || 'Menu importé',
        })
        .select()
        .single();
      if (menuErr) throw menuErr;

      const lang = result?.language_detected || 'fr';
      if (result?.categories?.length) {
        for (let ci = 0; ci < result.categories.length; ci++) {
          const cat = result.categories[ci];
          const { data: newCat } = await supabase
            .from('menu_categories')
            .insert({ menu_id: newMenu.id, sort_order: ci })
            .select()
            .single();

          if (newCat) {
            await supabase.from('menu_category_translations').insert({
              category_id: newCat.id,
              lang,
              name: cat.name || `Catégorie ${ci + 1}`,
            });

            if (cat.items?.length) {
              for (let ii = 0; ii < cat.items.length; ii++) {
                const item = cat.items[ii];
                const { data: newItem } = await supabase
                  .from('menu_items')
                  .insert({
                    category_id: newCat.id,
                    sort_order: ii,
                    price_cents: Math.round((item.price || 0) * 100),
                    tags: item.tags || [],
                    allergens: item.allergens || [],
                  })
                  .select()
                  .single();

                if (newItem) {
                  await supabase.from('menu_item_translations').insert({
                    item_id: newItem.id,
                    lang,
                    name: item.name || `Plat ${ii + 1}`,
                    description: item.description || null,
                  });
                }
              }
            }
          }
        }
      }

      toast.success(`Menu importé ! ${result?.categories?.length || 0} catégories`);
      onMenuCreated(newMenu.id);
      onOpenChange(false);
    } catch (err: any) {
      console.error('Import error:', err);
      toast.error(err.message || "Erreur lors de l'import");
      setStep('choice');
    }
  };


  const handleCreateFromScratch = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('menus')
        .insert({ restaurant_id: restaurantId, name: menuName })
        .select()
        .single();
      if (error) throw error;
      toast.success('Menu créé !');
      onMenuCreated(data.id);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        {/* ── Choice step ── */}
        {step === 'choice' && (
          <div className="p-6 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-xl">Créer un nouveau menu</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Importez votre carte existante ou partez de zéro
              </p>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Import option */}
              <button
                onClick={() => setStep('camera')}
                className="group relative rounded-xl border-2 border-dashed border-border p-6 hover:border-primary/50 hover:bg-primary/5 transition-all text-left space-y-3"
              >
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Camera className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Importer ma carte</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Prenez en photo votre carte ou importez un fichier (PDF, image)
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Camera className="h-3 w-3" /> Photo
                  <span className="text-border">·</span>
                  <Upload className="h-3 w-3" /> Fichier
                </div>
              </button>

              {/* From scratch option */}
              <button
                onClick={() => setStep('name-scratch')}
                className="group relative rounded-xl border-2 border-dashed border-border p-6 hover:border-secondary/50 hover:bg-secondary/5 transition-all text-left space-y-3"
              >
                <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                  <Plus className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Partir de zéro</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Créez votre carte directement dans l'éditeur
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <FileText className="h-3 w-3" /> Éditeur complet
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── Camera step ── */}
        {step === 'camera' && (
          <div className="relative">
            <div className="relative bg-black aspect-[3/4] overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Guide overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Semi-transparent border */}
                <div className="absolute inset-0 border-[40px] sm:border-[60px] border-black/50" />
                {/* Corner guides */}
                <div className="absolute top-10 left-10 sm:top-14 sm:left-14 w-8 h-8 border-t-2 border-l-2 border-white/80 rounded-tl-md" />
                <div className="absolute top-10 right-10 sm:top-14 sm:right-14 w-8 h-8 border-t-2 border-r-2 border-white/80 rounded-tr-md" />
                <div className="absolute bottom-10 left-10 sm:bottom-14 sm:left-14 w-8 h-8 border-b-2 border-l-2 border-white/80 rounded-bl-md" />
                <div className="absolute bottom-10 right-10 sm:bottom-14 sm:right-14 w-8 h-8 border-b-2 border-r-2 border-white/80 rounded-br-md" />
                {/* Instructions */}
                <div className="absolute top-3 left-0 right-0 flex justify-center">
                  <span className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    <Smartphone className="h-3 w-3" /> Posez la carte à plat et cadrez-la
                  </span>
                </div>
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />

            {/* Camera controls */}
            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 bg-black/40 text-white hover:bg-black/60"
                onClick={() => setStep('choice')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <button
                onClick={capturePhoto}
                className="h-16 w-16 rounded-full bg-white border-4 border-white/50 hover:scale-105 active:scale-95 transition-transform shadow-lg"
              >
                <div className="h-full w-full rounded-full bg-white hover:bg-gray-100 transition-colors" />
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 bg-black/40 text-white hover:bg-black/60"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-5 w-5" />
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* ── Review step ── */}
        {step === 'review' && (
          <div className="p-6 space-y-5">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <button onClick={() => { if (files.length === 0) setStep('choice'); else setStep('choice'); }} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <DialogTitle>Vos photos ({files.length})</DialogTitle>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
              {previews.map((src, i) => (
                <div key={i} className="relative rounded-lg overflow-hidden border border-border aspect-[3/4]">
                  <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep('camera')}
              >
                <Camera className="h-4 w-4 mr-2" />
                {files.length > 0 ? 'Ajouter une photo' : 'Reprendre'}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Importer fichier
              </Button>
            </div>

            <Button
              className="w-full"
              disabled={files.length === 0}
              onClick={handleProcessAll}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Traiter {files.length > 1 ? `les ${files.length} photos` : 'la photo'}
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* ── Uploading step ── */}
        {step === 'uploading' && (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div>
              <p className="font-semibold">Envoi en cours…</p>
              <p className="text-xs text-muted-foreground mt-1">Téléversement de votre fichier</p>
            </div>
          </div>
        )}

        {/* ── Processing step ── */}
        {step === 'processing' && (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <div className="relative">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="absolute -top-1 -right-1 h-4 w-4 bg-secondary rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-3 w-3 text-secondary-foreground" />
              </div>
            </div>
            <div>
              <p className="font-semibold">Analyse de votre carte…</p>
              <p className="text-xs text-muted-foreground mt-1">
                Notre IA extrait les catégories et plats de votre menu. Cela peut prendre quelques instants.
              </p>
            </div>
            <div className="w-full max-w-xs">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full animate-pulse w-2/3" />
              </div>
            </div>
          </div>
        )}

        {/* ── Name (from scratch) step ── */}
        {step === 'name-scratch' && (
          <div className="p-6 space-y-6">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <button onClick={() => setStep('choice')} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <DialogTitle>Nouveau menu</DialogTitle>
              </div>
            </DialogHeader>
            <form onSubmit={handleCreateFromScratch} className="space-y-4">
              <div className="space-y-2">
                <Label>Nom du menu</Label>
                <Input
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                  placeholder="Menu du soir"
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Création…</> : "Créer et ouvrir l'éditeur"}
              </Button>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
