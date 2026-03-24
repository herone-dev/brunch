import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Shield, Users, UtensilsCrossed, Box, ScanLine, Trash2,
  ArrowLeft, Loader2, Search, Crown,
} from "lucide-react";
import { toast } from "sonner";

interface RestaurantAdmin {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  created_at: string;
  owner_email: string;
  subscription: {
    plan: string;
    generations_used: number;
    generations_limit: number;
    status: string;
  } | null;
  item_count: number;
  models_ready: number;
  models_total: number;
  scan_count: number;
}

interface PlatformStats {
  totalRestaurants: number;
  totalItems: number;
  totalModelsReady: number;
  totalScans: number;
  totalUsers: number;
  planCounts: { free: number; starter: number; premium: number };
}

const PLAN_BADGE: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  starter: "bg-primary text-primary-foreground",
  premium: "bg-accent text-accent-foreground",
};

const AdminPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [restaurants, setRestaurants] = useState<RestaurantAdmin[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");

  // Dialogs
  const [changePlanTarget, setChangePlanTarget] = useState<RestaurantAdmin | null>(null);
  const [newPlan, setNewPlan] = useState("free");
  const [deleteTarget, setDeleteTarget] = useState<RestaurantAdmin | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Check admin status
  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      const { data } = await supabase
        .from("platform_admins")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      setIsAdmin(!!data);
    })();
  }, [user, authLoading]);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-api/overview");
      if (error) throw error;
      setRestaurants(data.restaurants || []);
      setStats(data.stats || null);
    } catch (err: any) {
      console.error("Admin fetch error:", err);
      toast.error("Erreur de chargement des données admin");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
    if (isAdmin === false) navigate("/app");
  }, [authLoading, user, isAdmin, navigate]);

  const handleChangePlan = async () => {
    if (!changePlanTarget) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke("admin-api/update-plan", {
        body: { restaurantId: changePlanTarget.id, plan: newPlan },
      });
      if (error) throw error;
      toast.success(`Plan changé en ${newPlan.toUpperCase()}`);
      setChangePlanTarget(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke("admin-api/delete-restaurant", {
        body: { restaurantId: deleteTarget.id },
      });
      if (error) throw error;
      toast.success("Restaurant supprimé");
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter restaurants
  const filtered = restaurants.filter(r => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.slug.toLowerCase().includes(search.toLowerCase()) ||
      r.owner_email.toLowerCase().includes(search.toLowerCase());
    const matchPlan = planFilter === "all" || (r.subscription?.plan || "free") === planFilter;
    return matchSearch && matchPlan;
  });

  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-destructive" />
          <span className="text-lg font-bold">BRUNCH — Admin</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/app")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Dashboard
        </Button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Global Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard icon={<UtensilsCrossed className="h-4 w-4" />} label="Restaurants" value={stats.totalRestaurants} />
            <StatCard icon={<Users className="h-4 w-4" />} label="Utilisateurs" value={stats.totalUsers} />
            <StatCard icon={<Box className="h-4 w-4" />} label="Plats" value={stats.totalItems} />
            <StatCard icon={<Box className="h-4 w-4" />} label="Modèles 3D" value={stats.totalModelsReady} />
            <StatCard icon={<ScanLine className="h-4 w-4" />} label="Scans QR" value={stats.totalScans} />
            <Card>
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Crown className="h-4 w-4 text-primary" />
                </div>
                <div className="flex gap-2 justify-center text-[10px]">
                  <span>Free: {stats.planCounts.free}</span>
                  <span>Starter: {stats.planCounts.starter}</span>
                  <span>Premium: {stats.planCounts.premium}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Plans</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher restaurant, email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs">
            {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Restaurant</TableHead>
                    <TableHead>Propriétaire</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-center">Plats</TableHead>
                    <TableHead className="text-center">3D</TableHead>
                    <TableHead className="text-center">Scans</TableHead>
                    <TableHead className="text-center">Générations</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{r.name}</p>
                          <p className="text-[10px] text-muted-foreground">/{r.slug} · {r.city || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.owner_email}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${PLAN_BADGE[r.subscription?.plan || "free"] || PLAN_BADGE.free}`}>
                          {(r.subscription?.plan || "free").toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm">{r.item_count}</TableCell>
                      <TableCell className="text-center text-sm">
                        {r.models_ready}/{r.models_total}
                      </TableCell>
                      <TableCell className="text-center text-sm">{r.scan_count}</TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {r.subscription?.generations_used || 0}/{r.subscription?.plan === "free" ? r.subscription?.generations_limit : "∞"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                            onClick={() => { setChangePlanTarget(r); setNewPlan(r.subscription?.plan || "free"); }}
                          >
                            <Crown className="h-3 w-3 mr-1" /> Plan
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(r)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Aucun restaurant trouvé
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </main>

      {/* Change Plan Dialog */}
      <Dialog open={!!changePlanTarget} onOpenChange={o => !o && setChangePlanTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Changer le plan</DialogTitle>
            <DialogDescription>{changePlanTarget?.name}</DialogDescription>
          </DialogHeader>
          <Select value={newPlan} onValueChange={setNewPlan}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free (3 générations)</SelectItem>
              <SelectItem value="starter">Starter (illimité)</SelectItem>
              <SelectItem value="premium">Premium (illimité)</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePlanTarget(null)}>Annuler</Button>
            <Button onClick={handleChangePlan} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer le restaurant</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{deleteTarget?.name}</strong> ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <div className="flex items-center justify-center gap-1 mb-1 text-primary">{icon}</div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

export default AdminPage;
