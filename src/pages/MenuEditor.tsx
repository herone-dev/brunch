import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMenuByRestaurant, useAddCategory, useAddItem, useUpdateItem, useUpdateCategory, useDeleteCategory, useDeleteItem, usePublishMenu, useUnpublishMenu } from "@/hooks/useMenuEditor";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, GripVertical, Eye, Upload, Globe } from "lucide-react";
import { toast } from "sonner";
import type { CategoryWithItems, ItemWithDetails, Restaurant } from "@/lib/types";

const MenuEditor = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: menu, isLoading } = useMenuByRestaurant(restaurantId);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithItems | null>(null);
  const [selectedItem, setSelectedItem] = useState<ItemWithDetails | null>(null);
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [catNameFr, setCatNameFr] = useState("");
  const [catNameEn, setCatNameEn] = useState("");
  const [itemNameFr, setItemNameFr] = useState("");
  const [itemNameEn, setItemNameEn] = useState("");
  const [itemDescFr, setItemDescFr] = useState("");
  const [itemDescEn, setItemDescEn] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemTags, setItemTags] = useState("");
  const [itemAllergens, setItemAllergens] = useState("");
  const [previewLang, setPreviewLang] = useState<'fr' | 'en'>('fr');

  const publishMenu = usePublishMenu();
  const unpublishMenu = useUnpublishMenu();

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (restaurantId) {
      supabase.from('restaurants').select('*').eq('id', restaurantId).single()
        .then(({ data }) => setRestaurant(data));
    }
  }, [restaurantId]);

  const addCategory = useAddCategory(menu?.id || '');
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addCategory.mutateAsync({
        names: { fr: catNameFr, en: catNameEn || catNameFr },
        sortOrder: (menu?.categories.length || 0),
      });
      setAddCatOpen(false);
      setCatNameFr("");
      setCatNameEn("");
      toast.success("Catégorie ajoutée !");
    } catch (err: any) { toast.error(err.message); }
  };

  const addItemToCategory = useAddItem(selectedCategory?.id || '');
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addItemToCategory.mutateAsync({
        names: { fr: itemNameFr, en: itemNameEn || itemNameFr },
        descriptions: { fr: itemDescFr, en: itemDescEn || itemDescFr },
        priceCents: Math.round(parseFloat(itemPrice || '0') * 100),
        tags: itemTags ? itemTags.split(',').map(s => s.trim()) : [],
        allergens: itemAllergens ? itemAllergens.split(',').map(s => s.trim()) : [],
        sortOrder: (selectedCategory?.items.length || 0),
      });
      setAddItemOpen(false);
      setItemNameFr(""); setItemNameEn(""); setItemDescFr(""); setItemDescEn("");
      setItemPrice(""); setItemTags(""); setItemAllergens("");
      toast.success("Plat ajouté !");
    } catch (err: any) { toast.error(err.message); }
  };

  const deleteCategory = useDeleteCategory();
  const deleteItem = useDeleteItem();
  const updateItem = useUpdateItem();
  const updateCategory = useUpdateCategory();

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="w-64 h-8" />
      </div>
    );
  }

  const getName = (translations: { lang: string; name: string }[], lang: string) =>
    translations.find(t => t.lang === lang)?.name || translations[0]?.name || '—';

  const getDesc = (translations: { lang: string; description?: string | null }[], lang: string) =>
    translations.find(t => t.lang === lang)?.description || '';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/app"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-lg font-bold">{restaurant?.name || 'Éditeur'}</h1>
            <div className="flex items-center gap-2">
              <Badge variant={menu?.status === 'published' ? 'default' : 'secondary'}>
                {menu?.status === 'published' ? 'Publié' : 'Brouillon'}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {menu && menu.status === 'draft' ? (
            <Button onClick={() => publishMenu.mutate(menu.id)} disabled={publishMenu.isPending}>
              <Eye className="h-4 w-4 mr-1" /> Publier
            </Button>
          ) : menu ? (
            <Button variant="outline" onClick={() => unpublishMenu.mutate(menu.id)} disabled={unpublishMenu.isPending}>
              Dépublier
            </Button>
          ) : null}
        </div>
      </header>

      {/* 3-panel editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Structure */}
        <div className="w-72 border-r border-border bg-card overflow-y-auto shrink-0 hidden md:block">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Catégories</h3>
              <Button size="sm" variant="ghost" onClick={() => setAddCatOpen(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {menu?.categories.map((cat) => (
              <div key={cat.id} className="mb-3">
                <div
                  className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                    selectedCategory?.id === cat.id ? 'bg-accent' : 'hover:bg-muted'
                  }`}
                  onClick={() => { setSelectedCategory(cat); setSelectedItem(null); }}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium">{getName(cat.translations, 'fr')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">{cat.items.length}</Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={(e) => { e.stopPropagation(); deleteCategory.mutate(cat.id); toast.success("Supprimé"); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {selectedCategory?.id === cat.id && (
                  <div className="ml-4 mt-1 space-y-1">
                    {cat.items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-2 rounded text-sm cursor-pointer ${
                          selectedItem?.id === item.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                        }`}
                        onClick={() => setSelectedItem(item)}
                      >
                        <span className="truncate">{getName(item.translations, 'fr')}</span>
                        <span className="text-xs text-muted-foreground">{(item.price_cents / 100).toFixed(2)}€</span>
                      </div>
                    ))}
                    <Button size="sm" variant="ghost" className="w-full text-xs" onClick={() => setAddItemOpen(true)}>
                      <Plus className="h-3 w-3 mr-1" /> Ajouter un plat
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {(!menu?.categories || menu.categories.length === 0) && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <p className="mb-2">Aucune catégorie</p>
                <Button size="sm" onClick={() => setAddCatOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Ajouter
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* CENTER: Preview */}
        <div className="flex-1 flex flex-col items-center justify-start p-6 overflow-y-auto bg-muted/30">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-muted-foreground">Langue :</span>
            <Button size="sm" variant={previewLang === 'fr' ? 'default' : 'outline'} onClick={() => setPreviewLang('fr')}>FR</Button>
            <Button size="sm" variant={previewLang === 'en' ? 'default' : 'outline'} onClick={() => setPreviewLang('en')}>EN</Button>
          </div>

          <div className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-lg overflow-hidden">
            {/* Mock phone header */}
            <div className="bg-primary text-primary-foreground p-4 text-center">
              <h3 className="text-lg font-bold">{restaurant?.name}</h3>
              {restaurant?.city && <p className="text-sm opacity-80">{restaurant.city}</p>}
            </div>

            {/* Categories tabs */}
            <div className="flex overflow-x-auto border-b border-border">
              {menu?.categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
                    selectedCategory?.id === cat.id
                      ? 'border-primary text-primary font-medium'
                      : 'border-transparent text-muted-foreground'
                  }`}
                  onClick={() => { setSelectedCategory(cat); setSelectedItem(null); }}
                >
                  {getName(cat.translations, previewLang)}
                </button>
              ))}
            </div>

            {/* Items */}
            <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
              {(selectedCategory || menu?.categories[0])?.items.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedItem?.id === item.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                  }`}
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{getName(item.translations, previewLang)}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{getDesc(item.translations, previewLang)}</p>
                    </div>
                    <span className="text-sm font-semibold text-primary whitespace-nowrap ml-2">
                      {(item.price_cents / 100).toFixed(2)}€
                    </span>
                  </div>
                  {(item.tags?.length || 0) > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {item.tags?.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )) || (
                <p className="text-center text-muted-foreground text-sm py-8">
                  Sélectionnez une catégorie
                </p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Properties */}
        <div className="w-80 border-l border-border bg-card overflow-y-auto shrink-0 hidden lg:block">
          <div className="p-4">
            {selectedItem ? (
              <ItemProperties
                item={selectedItem}
                onUpdate={(data) => {
                  updateItem.mutate({ itemId: selectedItem.id, ...data });
                  toast.success("Mis à jour !");
                }}
                onDelete={() => {
                  deleteItem.mutate(selectedItem.id);
                  setSelectedItem(null);
                  toast.success("Supprimé");
                }}
              />
            ) : selectedCategory ? (
              <CategoryProperties
                category={selectedCategory}
                onUpdate={(data) => {
                  updateCategory.mutate({ categoryId: selectedCategory.id, ...data });
                  toast.success("Mis à jour !");
                }}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <p>Sélectionnez un élément pour modifier ses propriétés</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Category Dialog */}
      <Dialog open={addCatOpen} onOpenChange={setAddCatOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle catégorie</DialogTitle></DialogHeader>
          <form onSubmit={handleAddCategory} className="space-y-4">
            <div className="space-y-2">
              <Label>Nom (FR)</Label>
              <Input value={catNameFr} onChange={(e) => setCatNameFr(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Nom (EN)</Label>
              <Input value={catNameEn} onChange={(e) => setCatNameEn(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={addCategory.isPending}>Ajouter</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nouveau plat</DialogTitle></DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nom (FR)</Label>
                <Input value={itemNameFr} onChange={(e) => setItemNameFr(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Nom (EN)</Label>
                <Input value={itemNameEn} onChange={(e) => setItemNameEn(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Description (FR)</Label>
                <Textarea value={itemDescFr} onChange={(e) => setItemDescFr(e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Description (EN)</Label>
                <Textarea value={itemDescEn} onChange={(e) => setItemDescEn(e.target.value)} rows={2} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Prix (€)</Label>
              <Input type="number" step="0.01" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Tags (séparés par virgule)</Label>
              <Input value={itemTags} onChange={(e) => setItemTags(e.target.value)} placeholder="vegan, épicé" />
            </div>
            <div className="space-y-2">
              <Label>Allergènes (séparés par virgule)</Label>
              <Input value={itemAllergens} onChange={(e) => setItemAllergens(e.target.value)} placeholder="gluten, oeufs" />
            </div>
            <Button type="submit" className="w-full" disabled={addItemToCategory.isPending}>Ajouter le plat</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Sub-components
function ItemProperties({ item, onUpdate, onDelete }: {
  item: ItemWithDetails;
  onUpdate: (data: any) => void;
  onDelete: () => void;
}) {
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
    <div className="space-y-4">
      <h3 className="font-semibold">Propriétés du plat</h3>
      <Tabs defaultValue="content">
        <TabsList className="w-full">
          <TabsTrigger value="content" className="flex-1">Contenu</TabsTrigger>
          <TabsTrigger value="media" className="flex-1">Médias</TabsTrigger>
        </TabsList>
        <TabsContent value="content" className="space-y-3 mt-3">
          <div className="space-y-2">
            <Label className="text-xs">Nom (FR)</Label>
            <Input value={nameFr} onChange={(e) => setNameFr(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Nom (EN)</Label>
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Description (FR)</Label>
            <Textarea value={descFr} onChange={(e) => setDescFr(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Description (EN)</Label>
            <Textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Prix (€)</Label>
            <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Tags</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Allergènes</Label>
            <Input value={allergens} onChange={(e) => setAllergens(e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Disponible</Label>
            <Switch checked={available} onCheckedChange={setAvailable} />
          </div>
          <Button onClick={handleSave} className="w-full">Enregistrer</Button>
          <Button variant="destructive" onClick={onDelete} className="w-full">Supprimer ce plat</Button>
        </TabsContent>
        <TabsContent value="media" className="mt-3">
          <MediaUploader itemId={item.id} restaurantId="" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CategoryProperties({ category, onUpdate }: {
  category: CategoryWithItems;
  onUpdate: (data: any) => void;
}) {
  const fr = category.translations.find(t => t.lang === 'fr');
  const en = category.translations.find(t => t.lang === 'en');
  const [nameFr, setNameFr] = useState(fr?.name || '');
  const [nameEn, setNameEn] = useState(en?.name || '');
  const [visible, setVisible] = useState(category.is_visible);

  useEffect(() => {
    const f = category.translations.find(t => t.lang === 'fr');
    const e = category.translations.find(t => t.lang === 'en');
    setNameFr(f?.name || '');
    setNameEn(e?.name || '');
    setVisible(category.is_visible);
  }, [category]);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Propriétés de la catégorie</h3>
      <div className="space-y-2">
        <Label className="text-xs">Nom (FR)</Label>
        <Input value={nameFr} onChange={(e) => setNameFr(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Nom (EN)</Label>
        <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
      </div>
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
      })} className="w-full">
        Enregistrer
      </Button>
    </div>
  );
}

function MediaUploader({ itemId, restaurantId }: { itemId: string; restaurantId: string }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const path = `${itemId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('menu-media')
          .upload(path, file);
        if (uploadError) throw uploadError;

        await supabase.from('menu_item_media').insert({
          item_id: itemId,
          storage_path: path,
          type: 'image',
        });
      }
      toast.success("Photos uploadées !");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs">Photos du plat</Label>
      <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
        <span className="text-sm text-muted-foreground">
          {uploading ? "Upload en cours..." : "Cliquez pour ajouter des photos"}
        </span>
        <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" disabled={uploading} />
      </label>
    </div>
  );
}

export default MenuEditor;
