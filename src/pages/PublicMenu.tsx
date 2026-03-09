import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { usePublicMenu } from "@/hooks/usePublicMenu";
import { detectLang, t, type Lang } from "@/lib/i18n";
import type { ItemWithDetails, CategoryWithItems } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Globe, X, Box, Camera } from "lucide-react";
import { DishViewer3D, type DishViewer3DProps } from "@/components/menu-editor/DishViewer3D";

const PublicMenu = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: restaurant, isLoading, error } = usePublicMenu(slug);
  const [lang, setLang] = useState<Lang>(detectLang());
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ItemWithDetails | null>(null);
  const [show3D, setShow3D] = useState(false);

  const menu = restaurant?.menu;
  const categories = menu?.categories || [];

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

  const getName = (translations: { lang: string; name: string }[], l: string) =>
    translations.find(t => t.lang === l)?.name || translations[0]?.name || '—';

  const getDesc = (translations: { lang: string; description?: string | null }[], l: string) =>
    translations.find(t => t.lang === l)?.description || '';

  const filteredItems = (cat: CategoryWithItems) => {
    if (!search) return cat.items;
    const s = search.toLowerCase();
    return cat.items.filter(item =>
      item.translations.some(t => t.name.toLowerCase().includes(s) || t.description?.toLowerCase().includes(s))
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 p-6">
        <Skeleton className="w-32 h-8" />
        <Skeleton className="w-full max-w-sm h-12" />
        <Skeleton className="w-full max-w-sm h-64" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl mb-2">Restaurant introuvable</h1>
          <p className="text-muted-foreground">Ce menu n'existe pas ou n'est pas encore publié.</p>
        </div>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl mb-2">{restaurant.name}</h1>
          <p className="text-muted-foreground">Le menu n'est pas encore publié.</p>
        </div>
      </div>
    );
  }

  const currentCategory = categories.find(c => c.id === activeCategory) || categories[0];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{restaurant.name}</h1>
            {restaurant.city && <p className="text-sm opacity-80">{restaurant.city}</p>}
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="text-xs"
            onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
          >
            <Globe className="h-3 w-3 mr-1" />
            {lang.toUpperCase()}
          </Button>
        </div>
      </header>

      {/* Search */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-2">
        <div className="max-w-lg mx-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('menu.search', lang)}
            className="pl-9 pr-8"
          />
          {search && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="sticky top-[52px] z-10 bg-background border-b border-border overflow-x-auto">
        <div className="max-w-lg mx-auto flex">
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeCategory === cat.id
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground'
              }`}
              onClick={() => {
                setActiveCategory(cat.id);
                const el = document.getElementById(`public-cat-${cat.id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              {getName(cat.translations, lang)}
            </button>
          ))}
        </div>
      </div>

      {/* Items */}
      <main className="flex-1 px-4 py-4">
        <div className="max-w-lg mx-auto space-y-6">
          {categories.map(cat => {
            const items = filteredItems(cat);
            if (items.length === 0 && search) return null;
            return (
              <div key={cat.id} id={`public-cat-${cat.id}`} className="scroll-mt-28">
                <h2 className="text-lg font-bold mb-3 text-primary">{getName(cat.translations, lang)}</h2>
                <div className="space-y-3">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className="p-4 bg-card rounded-xl border border-border cursor-pointer hover:border-primary/40 transition-all active:scale-[0.98]"
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{getName(item.translations, lang)}</p>
                            <DishViewer3D
                              glbUrl={item.model?.glb_path}
                              dishName={getName(item.translations, lang)}
                              compact
                            />
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {getDesc(item.translations, lang)}
                          </p>
                          {(item.tags?.length || 0) > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {item.tags?.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-lg font-bold text-primary">{(item.price_cents / 100).toFixed(2)}€</span>
                          {item.model?.status === 'ready' && (
                            <Badge variant="outline" className="text-[10px]"><Box className="h-3 w-3 mr-1" /> 3D</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {items.length === 0 && (
                  <p className="text-center text-muted-foreground py-4 text-sm">{t('common.notFound', lang)}</p>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Item detail modal */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle>{getName(selectedItem.translations, lang)}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-muted-foreground text-sm">{getDesc(selectedItem.translations, lang)}</p>

                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-primary">
                    {(selectedItem.price_cents / 100).toFixed(2)}€
                  </span>
                </div>

                {(selectedItem.allergens?.length || 0) > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">{t('menu.allergens', lang)}</p>
                    <div className="flex gap-1 flex-wrap">
                      {selectedItem.allergens?.map(a => (
                        <Badge key={a} variant="destructive" className="text-[10px]">{a}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedItem.model?.status === 'ready' && (
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => setShow3D(true)}>
                      <Box className="h-4 w-4 mr-2" /> {t('menu.view3d', lang)}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 3D Viewer — fullscreen-like modal */}
      {show3D && selectedItem?.model?.glb_path && (
        <DishViewer3D
          glbUrl={selectedItem.model.glb_path}
          dishName={getName(selectedItem.translations, lang)}
          compact={false}
          className="fixed inset-0 z-50"
          onClose={() => setShow3D(false)}
        />
      )}
    </div>
  );
};

export default PublicMenu;
