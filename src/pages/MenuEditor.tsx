import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  useMenuByRestaurant, useAddCategory, useAddItem,
  useUpdateItem, useUpdateCategory, useDeleteCategory,
  useDeleteItem, usePublishMenu, useUnpublishMenu,
} from "@/hooks/useMenuEditor";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Eye, EyeOff, Upload, Image } from "lucide-react";
import { toast } from "sonner";
import type { CategoryWithItems, ItemWithDetails, Restaurant } from "@/lib/types";
import { type MenuDesign, DEFAULT_DESIGN } from "@/lib/menu-templates";
import { TemplatePicker } from "@/components/menu-editor/TemplatePicker";
import { MenuCanvas } from "@/components/menu-editor/MenuCanvas";
import { EditorToolbar } from "@/components/menu-editor/EditorToolbar";
import { CategorySidebar } from "@/components/menu-editor/CategorySidebar";
import { ItemProperties, CategoryProperties } from "@/components/menu-editor/PropertiesPanel";

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
  const [previewLang, setPreviewLang] = useState<string>('fr');
  const [leftTab, setLeftTab] = useState<string>('structure');

  // Design state
  const [design, setDesign] = useState<MenuDesign>(DEFAULT_DESIGN);

  // Load design from menu
  useEffect(() => {
    if (menu && (menu as any).design_json) {
      const dj = (menu as any).design_json;
      if (dj && typeof dj === 'object' && dj.templateId) {
        setDesign(dj as MenuDesign);
      }
    }
  }, [menu]);

  // Save design to DB (debounced)
  const saveDesign = useCallback(async (d: MenuDesign) => {
    if (!menu) return;
    await supabase.from('menus').update({ design_json: d as any }).eq('id', menu.id);
  }, [menu]);

  const handleDesignChange = (d: MenuDesign) => {
    setDesign(d);
    saveDesign(d);
  };

  // Logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !restaurantId) return;
    try {
      const ext = file.name.split('.').pop();
      const path = `${restaurantId}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('menu-media').upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('menu-media').getPublicUrl(path);
      const newDesign = { ...design, logoUrl: urlData.publicUrl };
      setDesign(newDesign);
      saveDesign(newDesign);
      // Also update restaurant logo_path
      await supabase.from('restaurants').update({ logo_path: path }).eq('id', restaurantId);
      toast.success("Logo uploadé !");
    } catch (err: any) { toast.error(err.message); }
  };

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
        sortOrder: menu?.categories.length || 0,
      });
      setAddCatOpen(false);
      setCatNameFr(""); setCatNameEn("");
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
        sortOrder: selectedCategory?.items.length || 0,
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

  // Sync selected items with latest data
  useEffect(() => {
    if (menu && selectedCategory) {
      const updated = menu.categories.find(c => c.id === selectedCategory.id);
      if (updated) {
        setSelectedCategory(updated);
        if (selectedItem) {
          const updatedItem = updated.items.find(i => i.id === selectedItem.id);
          if (updatedItem) setSelectedItem(updatedItem);
          else setSelectedItem(null);
        }
      }
    }
  }, [menu]);

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Skeleton className="w-64 h-8" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0 h-12">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link to="/app"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold">{restaurant?.name || 'Éditeur'}</h1>
            <Badge variant={menu?.status === 'published' ? 'default' : 'secondary'} className="text-[10px]">
              {menu?.status === 'published' ? 'Publié' : 'Brouillon'}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md overflow-hidden">
            {(restaurant?.supported_langs || ['fr', 'en']).map(lang => (
              <button
                key={lang}
                className={`px-2.5 py-1 text-[10px] font-medium uppercase transition-colors ${
                  previewLang === lang ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
                }`}
                onClick={() => setPreviewLang(lang)}
              >
                {lang}
              </button>
            ))}
          </div>
          {menu && menu.status === 'draft' ? (
            <Button size="sm" className="h-8 text-xs" onClick={() => publishMenu.mutate(menu.id)} disabled={publishMenu.isPending}>
              <Eye className="h-3.5 w-3.5 mr-1" /> Publier
            </Button>
          ) : menu ? (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => unpublishMenu.mutate(menu.id)} disabled={unpublishMenu.isPending}>
              <EyeOff className="h-3.5 w-3.5 mr-1" /> Dépublier
            </Button>
          ) : null}
        </div>
      </header>

      {/* 3-panel editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: Structure + Templates */}
        <div className="w-64 border-r border-border bg-card overflow-y-auto shrink-0 hidden md:flex flex-col">
          <Tabs value={leftTab} onValueChange={setLeftTab} className="flex flex-col flex-1">
            <TabsList className="w-full rounded-none border-b border-border h-9 bg-transparent shrink-0">
              <TabsTrigger value="structure" className="flex-1 text-xs rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                Structure
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex-1 text-xs rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                Templates
              </TabsTrigger>
            </TabsList>
            <TabsContent value="structure" className="flex-1 overflow-y-auto m-0">
              <CategorySidebar
                categories={menu?.categories || []}
                selectedCategoryId={selectedCategory?.id}
                selectedItemId={selectedItem?.id}
                onSelectCategory={(cat) => { setSelectedCategory(cat); setSelectedItem(null); }}
                onSelectItem={(item) => setSelectedItem(item)}
                onAddCategory={() => setAddCatOpen(true)}
                onAddItem={() => setAddItemOpen(true)}
                onDeleteCategory={(id) => { deleteCategory.mutate(id); toast.success("Supprimé"); }}
                onDeleteItem={(id) => { deleteItem.mutate(id); setSelectedItem(null); toast.success("Supprimé"); }}
              />
            </TabsContent>
            <TabsContent value="templates" className="flex-1 overflow-y-auto m-0 p-3">
              <TemplatePicker design={design} onChange={handleDesignChange} />
              {/* Logo upload */}
              <div className="mt-4 space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Image className="h-3.5 w-3.5" /> Logo
                </h4>
                <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                  {design.logoUrl ? (
                    <img src={design.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded" />
                  ) : (
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {design.logoUrl ? 'Changer le logo' : 'Ajouter un logo'}
                  </span>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* CENTER: Canvas Preview */}
        <div className="flex-1 overflow-y-auto bg-muted/30 flex items-start justify-center p-6">
          <MenuCanvas
            restaurant={restaurant}
            categories={menu?.categories || []}
            design={design}
            lang={previewLang}
            selectedCategoryId={selectedCategory?.id}
            selectedItemId={selectedItem?.id}
            onSelectCategory={(id) => {
              const cat = menu?.categories.find(c => c.id === id);
              if (cat) { setSelectedCategory(cat); setSelectedItem(null); }
            }}
            onSelectItem={(id) => {
              for (const cat of menu?.categories || []) {
                const item = cat.items.find(i => i.id === id);
                if (item) { setSelectedCategory(cat); setSelectedItem(item); break; }
              }
            }}
          />
        </div>

        {/* RIGHT PANEL: Properties / Customization */}
        <div className="w-72 border-l border-border bg-card overflow-y-auto shrink-0 hidden lg:block p-3">
          {selectedItem ? (
            <ItemProperties
              item={selectedItem}
              onUpdate={(data) => { updateItem.mutate({ itemId: selectedItem.id, ...data }); toast.success("Mis à jour !"); }}
              onDelete={() => { deleteItem.mutate(selectedItem.id); setSelectedItem(null); toast.success("Supprimé"); }}
            />
          ) : selectedCategory ? (
            <CategoryProperties
              category={selectedCategory}
              onUpdate={(data) => { updateCategory.mutate({ categoryId: selectedCategory.id, ...data }); toast.success("Mis à jour !"); }}
            />
          ) : (
            <EditorToolbar design={design} onChange={handleDesignChange} />
          )}
        </div>
      </div>

      {/* Add Category Dialog */}
      <Dialog open={addCatOpen} onOpenChange={setAddCatOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle catégorie</DialogTitle></DialogHeader>
          <form onSubmit={handleAddCategory} className="space-y-4">
            <div className="space-y-2">
              <Label>Nom (FR)</Label>
              <Input value={catNameFr} onChange={e => setCatNameFr(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Nom (EN)</Label>
              <Input value={catNameEn} onChange={e => setCatNameEn(e.target.value)} />
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
                <Input value={itemNameFr} onChange={e => setItemNameFr(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Nom (EN)</Label>
                <Input value={itemNameEn} onChange={e => setItemNameEn(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Description (FR)</Label>
                <Textarea value={itemDescFr} onChange={e => setItemDescFr(e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Description (EN)</Label>
                <Textarea value={itemDescEn} onChange={e => setItemDescEn(e.target.value)} rows={2} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Prix (€)</Label>
              <Input type="number" step="0.01" value={itemPrice} onChange={e => setItemPrice(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <Input value={itemTags} onChange={e => setItemTags(e.target.value)} placeholder="vegan, épicé" />
            </div>
            <div className="space-y-2">
              <Label>Allergènes</Label>
              <Input value={itemAllergens} onChange={e => setItemAllergens(e.target.value)} placeholder="gluten, oeufs" />
            </div>
            <Button type="submit" className="w-full" disabled={addItemToCategory.isPending}>Ajouter le plat</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MenuEditor;
