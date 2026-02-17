import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CategoryWithItems, ItemWithDetails } from '@/lib/types';

interface ItemPropsInput {
  item: ItemWithDetails;
  onUpdate: (data: any) => void;
  onDelete: () => void;
}

export function ItemProperties({ item, onUpdate, onDelete }: ItemPropsInput) {
  const fr = item.translations.find(t => t.lang === 'fr');
  const en = item.translations.find(t => t.lang === 'en');
  const [nameFr, setNameFr] = useState(fr?.name || '');
  const [nameEn, setNameEn] = useState(en?.name || '');
  const [descFr, setDescFr] = useState(fr?.description || '');
  const [descEn, setDescEn] = useState(en?.description || '');
  const [price, setPrice] = useState(String(item.price_cents / 100));
  const [tags, setTags] = useState(item.tags?.join(', ') || '');
  const [allergens, setAllergens] = useState(item.allergens?.join(', ') || '');
  const [available, setAvailable] = useState(item.is_available);

  useEffect(() => {
    const f = item.translations.find(t => t.lang === 'fr');
    const e = item.translations.find(t => t.lang === 'en');
    setNameFr(f?.name || ''); setNameEn(e?.name || '');
    setDescFr(f?.description || ''); setDescEn(e?.description || '');
    setPrice(String(item.price_cents / 100));
    setTags(item.tags?.join(', ') || '');
    setAllergens(item.allergens?.join(', ') || '');
    setAvailable(item.is_available);
  }, [item]);

  const handleSave = () => {
    onUpdate({
      priceCents: Math.round(parseFloat(price) * 100),
      tags: tags ? tags.split(',').map(s => s.trim()) : [],
      allergens: allergens ? allergens.split(',').map(s => s.trim()) : [],
      isAvailable: available,
      translations: [
        { lang: 'fr', name: nameFr, description: descFr },
        { lang: 'en', name: nameEn || nameFr, description: descEn || descFr },
      ],
    });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plat</h3>
      <Tabs defaultValue="content">
        <TabsList className="w-full h-8">
          <TabsTrigger value="content" className="flex-1 text-xs">Contenu</TabsTrigger>
          <TabsTrigger value="media" className="flex-1 text-xs">Médias</TabsTrigger>
        </TabsList>
        <TabsContent value="content" className="space-y-2.5 mt-2">
          <Field label="Nom (FR)" value={nameFr} onChange={setNameFr} />
          <Field label="Nom (EN)" value={nameEn} onChange={setNameEn} />
          <FieldArea label="Description (FR)" value={descFr} onChange={setDescFr} />
          <FieldArea label="Description (EN)" value={descEn} onChange={setDescEn} />
          <Field label="Prix (€)" value={price} onChange={setPrice} type="number" />
          <Field label="Tags" value={tags} onChange={setTags} placeholder="vegan, épicé" />
          <Field label="Allergènes" value={allergens} onChange={setAllergens} placeholder="gluten, oeufs" />
          <div className="flex items-center justify-between">
            <Label className="text-xs">Disponible</Label>
            <Switch checked={available} onCheckedChange={setAvailable} />
          </div>
          <Button onClick={handleSave} className="w-full h-8 text-xs">Enregistrer</Button>
          <Button variant="destructive" onClick={onDelete} className="w-full h-8 text-xs">
            <Trash2 className="h-3 w-3 mr-1" /> Supprimer
          </Button>
        </TabsContent>
        <TabsContent value="media" className="mt-2">
          <MediaUploader itemId={item.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function CategoryProperties({ category, onUpdate }: {
  category: CategoryWithItems;
  onUpdate: (data: any) => void;
}) {
  const fr = category.translations.find(t => t.lang === 'fr');
  const en = category.translations.find(t => t.lang === 'en');
  const [nameFr, setNameFr] = useState(fr?.name || '');
  const [nameEn, setNameEn] = useState(en?.name || '');
  const [visible, setVisible] = useState(category.is_visible);

  useEffect(() => {
    setNameFr(category.translations.find(t => t.lang === 'fr')?.name || '');
    setNameEn(category.translations.find(t => t.lang === 'en')?.name || '');
    setVisible(category.is_visible);
  }, [category]);

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Catégorie</h3>
      <Field label="Nom (FR)" value={nameFr} onChange={setNameFr} />
      <Field label="Nom (EN)" value={nameEn} onChange={setNameEn} />
      <div className="flex items-center justify-between">
        <Label className="text-xs">Visible</Label>
        <Switch checked={visible} onCheckedChange={setVisible} />
      </div>
      <Button onClick={() => onUpdate({
        isVisible: visible,
        translations: [
          { lang: 'fr', name: nameFr },
          { lang: 'en', name: nameEn || nameFr },
        ],
      })} className="w-full h-8 text-xs">
        Enregistrer
      </Button>
    </div>
  );
}

function Field({ label, value, onChange, type, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <Input value={value} onChange={e => onChange(e.target.value)} type={type} placeholder={placeholder} className="h-7 text-xs" />
    </div>
  );
}

function FieldArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <Textarea value={value} onChange={e => onChange(e.target.value)} rows={2} className="text-xs min-h-[48px]" />
    </div>
  );
}

function MediaUploader({ itemId }: { itemId: string }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const path = `${itemId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('menu-media').upload(path, file);
        if (uploadError) throw uploadError;
        await supabase.from('menu_item_media').insert({ item_id: itemId, storage_path: path, type: 'image' });
      }
      toast.success("Photos uploadées !");
    } catch (err: any) { toast.error(err.message); }
    finally { setUploading(false); }
  };

  return (
    <div className="space-y-2">
      <Label className="text-[10px] text-muted-foreground">Photos du plat</Label>
      <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
        <Upload className="h-6 w-6 text-muted-foreground mb-1" />
        <span className="text-[10px] text-muted-foreground">
          {uploading ? "Upload..." : "Ajouter des photos"}
        </span>
        <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" disabled={uploading} />
      </label>
    </div>
  );
}
