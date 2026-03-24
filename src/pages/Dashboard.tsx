import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMyRestaurant, useRestaurantMenus, useRestaurantItems, useModelJobs, useQrScanCount } from "@/hooks/useDashboard";
import { useCreateRestaurant, useCreateMenu } from "@/hooks/useRestaurants";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LogOut, QrCode, Pencil, Plus, UtensilsCrossed,
  Box, CheckCircle2, Clock, AlertCircle, Loader2,
  FileText, Eye, EyeOff, Settings, Image as ImageIcon,
  ExternalLink, ScanLine, MoreVertical, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { ItemWithDetails, Menu, ModelJob } from "@/lib/types";
import { RestaurantSettings } from "@/components/RestaurantSettings";
import { MenuScheduleDialog } from "@/components/MenuScheduleDialog";
import { NewMenuDialog } from "@/components/NewMenuDialog";
import { Generate3DDialog } from "@/components/Generate3DDialog";

/* ─── Onboarding dialog (first time) ─── */
const OnboardingDialog = ({ open, onCreated }: { open: boolean; onCreated: (id: string) => void }) => {
  const createRestaurant = useCreateRestaurant();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [slug, setSlug] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createRestaurant.mutateAsync({
        name,
        city,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
        supported_langs: ["fr", "en"],
      });
      toast.success("Restaurant créé !");
      onCreated(result.id);
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-xl">Bienvenue sur BRUNCH 👋</DialogTitle>
          <p className="text-sm text-muted-foreground">Commençons par créer votre restaurant.</p>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Nom du restaurant</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
              }}
              placeholder="Le Petit Bistrot"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Ville</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Paris" />
          </div>
          <div className="space-y-2">
            <Label>Slug (URL du menu)</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">/m/</span>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} required />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={createRestaurant.isPending}>
            {createRestaurant.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Création...</> : "Créer mon restaurant"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Menu card ─── */
const MenuCard = ({ menu, restaurantId, slug }: { menu: Menu; restaurantId: string; slug: string }) => {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const menuAny = menu as any;
  const hasSchedule = menuAny.schedule_start && menuAny.schedule_end;

  return (
    <>
      <Card className="group hover:border-primary/40 transition-all hover:shadow-sm">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-sm">{menu.name}</p>
                {menuAny.is_default && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-amber-400 text-amber-600">Par défaut</Badge>
                )}
                {menuAny.is_global && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary text-primary">Global</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant={menu.status === "published" ? "default" : "secondary"} className="text-[10px] h-4 px-1.5">
                  {menu.status === "published" ? <><Eye className="h-2.5 w-2.5 mr-0.5" /> Publié</> : <><EyeOff className="h-2.5 w-2.5 mr-0.5" /> Brouillon</>}
                </Badge>
                {hasSchedule && (
                  <span className="text-[10px] text-muted-foreground">
                    {menuAny.schedule_start?.slice(0, 5)} – {menuAny.schedule_end?.slice(0, 5)}
                  </span>
                )}
                {menu.published_at && !hasSchedule && (
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(menu.published_at).toLocaleDateString("fr-FR")}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setScheduleOpen(true)}>
              <Settings className="h-3.5 w-3.5" />
            </Button>
            {menu.status === "published" && (
              <Button size="sm" variant="ghost" asChild>
                <Link to={`/m/${slug}`} target="_blank">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Voir
                </Link>
              </Button>
            )}
            <Button size="sm" variant="outline" asChild>
              <Link to={`/app/restaurants/${restaurantId}/menu`}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Éditer
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      <MenuScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        menu={menu}
        restaurantId={restaurantId}
      />
    </>
  );
};

/* ─── 3D status helpers ─── */
const ModelStatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "ready":
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    case "processing":
    case "pending":
      return <Clock className="h-3.5 w-3.5 text-amber-500 animate-pulse" />;
    case "failed":
      return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
    default:
      return <Box className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

const modelStatusLabel: Record<string, string> = {
  none: "Pas de modèle",
  pending: "En attente",
  processing: "Génération…",
  ready: "Prêt",
  failed: "Erreur",
};

/* ─── Item card (library style) ─── */
const ItemCard = ({ item, compact }: { item: ItemWithDetails; compact?: boolean }) => {
  const frName = item.translations.find((t) => t.lang === "fr")?.name || "Sans nom";
  const status = item.model?.status || "none";
  const hasMedia = item.media.length > 0;

  return (
    <div className={`rounded-lg border border-border bg-card overflow-hidden hover:border-primary/40 transition-all hover:shadow-sm group ${compact ? 'shrink-0 w-28' : ''}`}>
      <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
        {hasMedia ? (
          <img
            src={supabase.storage.from("menu-media").getPublicUrl(item.media[0].storage_path).data.publicUrl}
            alt={frName}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
        )}
      </div>
      <div className="p-2">
        <p className="text-[11px] font-medium truncate">{frName}</p>
        <div className="flex items-center gap-1 mt-1">
          <ModelStatusIcon status={status} />
          <span className="text-[10px] text-muted-foreground">{modelStatusLabel[status]}</span>
        </div>
      </div>
    </div>
  );
};

/* ─── Dashboard ─── */
const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: restaurant, isLoading: restLoading } = useMyRestaurant();
  const { data: menus, isLoading: menusLoading } = useRestaurantMenus(restaurant?.id);
  const { data: items, isLoading: itemsLoading } = useRestaurantItems(restaurant?.id);
  const { data: modelJobs } = useModelJobs(restaurant?.id);
  const { data: qrScans } = useQrScanCount(restaurant?.id);
  const createMenu = useCreateMenu();
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  const isLoading = authLoading || restLoading;
  const showOnboarding = !isLoading && !restaurant;

  // 3D stats
  const totalItems = items?.length || 0;
  const readyModels = items?.filter((i) => i.model?.status === "ready").length || 0;
  const pendingModels = items?.filter((i) => i.model?.status === "processing" || i.model?.status === "pending").length || 0;
  const failedModels = items?.filter((i) => i.model?.status === "failed").length || 0;
  const noModels = totalItems - readyModels - pendingModels - failedModels;
  const progress3D = totalItems > 0 ? Math.round((readyModels / totalItems) * 100) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Onboarding */}
      <OnboardingDialog
        open={showOnboarding}
        onCreated={() => window.location.reload()}
      />

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-xl font-black tracking-tight text-primary">BRUNCH</Link>
          {restaurant && (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm font-medium">{restaurant.name}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {restaurant && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/app/restaurants/${restaurant.id}/qr`}>
                <QrCode className="h-3.5 w-3.5 mr-1.5" /> QR Code
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { signOut(); navigate("/"); }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {restaurant && (
        <main className="max-w-5xl mx-auto px-6 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="w-full max-w-lg">
              <TabsTrigger value="dashboard" className="flex-1">Dashboard</TabsTrigger>
              <TabsTrigger value="library" className="flex-1 flex items-center gap-1.5">
                <Box className="h-3.5 w-3.5" /> Bibliothèque 3D
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-1 flex items-center gap-1.5">
                <Settings className="h-3.5 w-3.5" /> Mon restaurant
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-8 mt-0">
              {/* ── Stats row ── */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{menus?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Menus</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{totalItems}</p>
                    <p className="text-xs text-muted-foreground">Plats & Boissons</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{readyModels}</p>
                    <p className="text-xs text-muted-foreground">Modèles 3D prêts</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{pendingModels}</p>
                    <p className="text-xs text-muted-foreground">En cours de génération</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <ScanLine className="h-5 w-5 text-primary" />
                      <p className="text-2xl font-bold">{qrScans ?? 0}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Scans QR Code</p>
                  </CardContent>
                </Card>
              </div>

              {/* ── Menus section ── */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Mes menus</h2>
                  <Button size="sm" onClick={() => setShowNewMenu(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Nouveau menu
                  </Button>
                </div>
                {menusLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : !menus?.length ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">Aucun menu créé</p>
                      <Button size="sm" className="mt-3" onClick={() => setShowNewMenu(true)}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Créer un menu
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {menus.map((m) => (
                      <MenuCard key={m.id} menu={m} restaurantId={restaurant.id} slug={restaurant.slug} />
                    ))}
                  </div>
                )}
              </section>

              <NewMenuDialog
                open={showNewMenu}
                onOpenChange={setShowNewMenu}
                restaurantId={restaurant.id}
                onMenuCreated={(menuId) => {
                  createMenu.reset();
                  navigate(`/app/restaurants/${restaurant.id}/menu`);
                }}
              />

              {/* ── 3D Preview (single row) ── */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Box className="h-5 w-5" /> Modèles 3D
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {readyModels} prêts · {pendingModels} en cours · {totalItems} plats
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setActiveTab("library")}>
                    Voir la bibliothèque
                  </Button>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2">
                  {/* First card = create new 3D model CTA */}
                  <div
                    onClick={() => setActiveTab("library")}
                    className="shrink-0 w-28 aspect-square rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary/60 hover:bg-primary/10 transition-colors"
                  >
                    <Plus className="h-6 w-6 text-primary" />
                    <span className="text-[10px] font-medium text-primary">Nouveau 3D</span>
                  </div>

                  {/* Preview of first items */}
                  {items?.slice(0, 5).map((item) => (
                    <ItemCard key={item.id} item={item} compact />
                  ))}
                </div>
              </section>
            </TabsContent>

            {/* ── Bibliothèque 3D tab ── */}
            <TabsContent value="library" className="space-y-6 mt-0">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
                  <Box className="h-5 w-5" /> Bibliothèque 3D
                </h2>
                <p className="text-xs text-muted-foreground">
                  Tous vos plats et leurs modèles 3D
                </p>
              </div>

              {totalItems > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progression globale</span>
                      <span className="text-sm font-bold text-primary">{progress3D}%</span>
                    </div>
                    <Progress value={progress3D} className="h-2" />
                    <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> {readyModels} prêts</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-amber-500" /> {pendingModels} en cours</span>
                      <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3 text-destructive" /> {failedModels} erreurs</span>
                      <span className="flex items-center gap-1"><Box className="h-3 w-3" /> {noModels} sans modèle</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {itemsLoading ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
                </div>
              ) : !items?.length ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Box className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">Ajoutez des plats dans un menu pour commencer la génération 3D</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {items.map((item) => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="settings" className="mt-0">
              <RestaurantSettings restaurant={restaurant} />
            </TabsContent>
          </Tabs>
        </main>
      )}
    </div>
  );
};

export default Dashboard;
