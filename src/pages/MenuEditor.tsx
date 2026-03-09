import { useState, useEffect, useCallback, useRef } from "react";
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
import { ArrowLeft, Eye, EyeOff, Upload, Image, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, X, Layers, Palette, Camera } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CategoryWithItems, ItemWithDetails, Restaurant } from "@/lib/types";
import { type MenuDesign, DEFAULT_DESIGN } from "@/lib/menu-templates";
import { TemplatePicker } from "@/components/menu-editor/TemplatePicker";
import { MenuCanvas } from "@/components/menu-editor/MenuCanvas";
import { EditorToolbar } from "@/components/menu-editor/EditorToolbar";
import { CategorySidebar } from "@/components/menu-editor/CategorySidebar";
import { ItemProperties, CategoryProperties } from "@/components/menu-editor/PropertiesPanel";
import { Panel3D } from "@/components/menu-editor/Panel3D";
import { MenuPhotoImporter } from "@/components/menu-editor/MenuPhotoImporter";
import { useImportMenuFromPhoto } from "@/hooks/useImportMenuFromPhoto";


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
  const isMobile = useIsMobile();
  const [leftOpen, setLeftOpen] = useState(!isMobile);
  const [rightOpen, setRightOpen] = useState(!isMobile);
  const [photoImportOpen, setPhotoImportOpen] = useState(false);
  const importFromPhoto = useImportMenuFromPhoto(menu?.id || '');

  // Close panels when switching to mobile
  useEffect(() => {
    if (isMobile) { setLeftOpen(false); setRightOpen(false); }
    else { setLeftOpen(true); setRightOpen(true); }
  }, [isMobile]);

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
      <header className="flex items-center justify-between px-2 sm:px-4 py-2 border-b border-border bg-card shrink-0 h-12">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
            <Link to="/app"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xs sm:text-sm font-bold truncate">{restaurant?.name || 'Éditeur'}</h1>
            <Badge variant={menu?.status === 'published' ? 'default' : 'secondary'} className="text-[10px] shrink-0">
              {menu?.status === 'published' ? 'Publié' : 'Brouillon'}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPhotoImportOpen(true)}>
            <Camera className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Importer photo</span>
          </Button>
          <div className="flex items-center border rounded-md overflow-hidden">
            {(restaurant?.supported_langs || ['fr', 'en']).map(lang => (
              <button
                key={lang}
                className={`px-2 sm:px-2.5 py-1 text-[10px] font-medium uppercase transition-colors ${
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
              <Eye className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Publier</span>
            </Button>
          ) : menu ? (
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => unpublishMenu.mutate(menu.id)} disabled={unpublishMenu.isPending}>
              <EyeOff className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Dépublier</span>
            </Button>
          ) : null}
        </div>
      </header>

      {/* 3-panel editor */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left collapse toggle - desktop only */}
        {!isMobile && !leftOpen && (
          <Button variant="ghost" size="icon" className="absolute left-1 top-1 z-10 h-7 w-7" onClick={() => setLeftOpen(true)}>
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        )}

        {/* LEFT PANEL: Structure + Templates — overlay on mobile, sidebar on desktop */}
        {leftOpen && (
        <>
          {isMobile && <div className="absolute inset-0 z-20 bg-black/40" onClick={() => setLeftOpen(false)} />}
          <div className={`${isMobile ? 'absolute left-0 top-0 bottom-0 z-30 w-72 max-w-[85vw]' : 'w-64 shrink-0'} border-r border-border bg-card overflow-y-auto flex flex-col`}>
            <div className="flex items-center justify-between p-1.5 border-b border-border shrink-0">
              <span className="text-xs font-semibold text-muted-foreground pl-2">{leftTab === 'structure' ? 'Structure' : 'Templates'}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLeftOpen(false)}>
                {isMobile ? <X className="h-4 w-4" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
              </Button>
            </div>
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
                <TemplatePicker design={design} onChange={handleDesignChange} restaurant={restaurant} restaurantId={restaurantId} onLogoUpload={handleLogoUpload} />
              </TabsContent>
            </Tabs>
          </div>
        </>
        )}

        {/* CENTER: Canvas Preview */}
        <div className="flex-1 overflow-y-auto bg-muted/30 flex items-start justify-center p-3 sm:p-6 pb-16 sm:pb-6">
          <MenuCanvas
            restaurant={restaurant}
            categories={menu?.categories || []}
            design={design}
            lang={previewLang}
            selectedCategoryId={selectedCategory?.id}
            selectedItemId={selectedItem?.id}
            onSelectCategory={(id) => {
              const cat = menu?.categories.find(c => c.id === id);
              if (cat) {
                setSelectedCategory(cat);
                setSelectedItem(null);
                setLeftTab('structure');
                if (!isMobile) setLeftOpen(true);
              }
            }}
            onSelectItem={(id) => {
              for (const cat of menu?.categories || []) {
                const item = cat.items.find(i => i.id === id);
                if (item) {
                  setSelectedCategory(cat);
                  setSelectedItem(item);
                  setLeftTab('structure');
                  if (!isMobile) setLeftOpen(true);
                  break;
                }
              }
            }}
            onDesignChange={handleDesignChange}
            onUpdateItemText={(itemId, field, lang, value) => {
              const translations = field === 'name'
                ? [{ lang, name: value, description: '' }]
                : [{ lang, name: '', description: value }];
              // For inline edits, build proper translation payload
              const cat = menu?.categories.find(c => c.items.some(i => i.id === itemId));
              const item = cat?.items.find(i => i.id === itemId);
              if (item) {
                const existing = item.translations.find(t => t.lang === lang);
                updateItem.mutate({
                  itemId,
                  translations: [{
                    lang,
                    name: field === 'name' ? value : (existing?.name || ''),
                    description: field === 'description' ? value : (existing?.description || ''),
                  }],
                });
              }
            }}
            onUpdateCategoryText={(catId, lang, value) => {
              updateCategory.mutate({
                categoryId: catId,
                translations: [{ lang, name: value }],
              });
            }}
          />
        </div>

        {/* Right collapse toggle - desktop only */}
        {!isMobile && !rightOpen && (
          <Button variant="ghost" size="icon" className="absolute right-1 top-1 z-10 h-7 w-7" onClick={() => setRightOpen(true)}>
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        )}

        {/* RIGHT PANEL: Design + Properties — overlay on mobile, sidebar on desktop */}
        {rightOpen && (
        <>
          {isMobile && <div className="absolute inset-0 z-20 bg-black/40" onClick={() => setRightOpen(false)} />}
          <div className={`${isMobile ? 'absolute right-0 top-0 bottom-0 z-30 w-72 max-w-[85vw]' : 'w-64 shrink-0'} border-l border-border bg-card overflow-y-auto flex flex-col`}>
            <div className="flex items-center justify-between p-1.5 border-b border-border shrink-0">
              <span className="text-xs font-semibold text-muted-foreground pl-2">Design</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRightOpen(false)}>
                {isMobile ? <X className="h-4 w-4" /> : <PanelRightClose className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <Tabs defaultValue="design" className="flex flex-col flex-1">
              <TabsList className="w-full rounded-none border-b border-border h-9 bg-transparent shrink-0">
                <TabsTrigger value="design" className="flex-1 text-xs rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                  Design
                </TabsTrigger>
                <TabsTrigger value="3d" className="flex-1 text-xs rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                  3D
                </TabsTrigger>
              </TabsList>
              <TabsContent value="design" className="flex-1 overflow-y-auto m-0 p-3">
                <EditorToolbar design={design} onChange={handleDesignChange} restaurant={restaurant} restaurantId={restaurantId} />
              </TabsContent>
              <TabsContent value="3d" className="flex-1 overflow-y-auto m-0 p-3">
                {selectedItem ? (
                  <Panel3D
                    dishId={selectedItem.id}
                    existingModelUrl={selectedItem.model?.glb_path}
                    onModelReady={(url) => {
                      toast.success("Modèle 3D prêt !");
                    }}
                  />
                ) : (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    Sélectionnez un plat pour générer son modèle 3D
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </>
        )}
      </div>

      {/* Mobile bottom toolbar */}
      {isMobile && (
        <div className="shrink-0 flex items-center justify-around border-t border-border bg-card h-12 px-2">
          <Button variant="ghost" size="sm" className="flex-1 h-10 text-xs flex-col gap-0.5" onClick={() => { setLeftTab('structure'); setLeftOpen(true); setRightOpen(false); }}>
            <Layers className="h-4 w-4" />
            <span>Structure</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 h-10 text-xs flex-col gap-0.5" onClick={() => { setLeftTab('templates'); setLeftOpen(true); setRightOpen(false); }}>
            <Image className="h-4 w-4" />
            <span>Templates</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 h-10 text-xs flex-col gap-0.5" onClick={() => { setRightOpen(true); setLeftOpen(false); }}>
            <Palette className="h-4 w-4" />
            <span>Design</span>
          </Button>
        </div>
      )}

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

      {/* Photo Import Dialog */}
      <MenuPhotoImporter
        open={photoImportOpen}
        onOpenChange={setPhotoImportOpen}
        onMenuImported={async (menuData) => {
          try {
            await importFromPhoto.mutateAsync(menuData);
          } catch (err: any) {
            toast.error(err.message || "Erreur lors de l'import");
          }
        }}
      />
    </div>
  );
};

export default MenuEditor;
