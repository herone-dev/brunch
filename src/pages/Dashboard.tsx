import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMyRestaurants, useCreateRestaurant } from "@/hooks/useRestaurants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, UtensilsCrossed, LogOut, QrCode, Pencil } from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: restaurants, isLoading } = useMyRestaurants();
  const createRestaurant = useCreateRestaurant();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [slug, setSlug] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

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
      setOpen(false);
      setName("");
      setCity("");
      setSlug("");
      navigate(`/app/restaurants/${result.id}/menu`);
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Skeleton className="w-64 h-8" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Link to="/" className="text-2xl font-bold text-primary">BRUNCH</Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
          <Button variant="ghost" size="icon" onClick={() => { signOut(); navigate("/"); }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl">Mes restaurants</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Nouveau restaurant</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un restaurant</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom du restaurant</Label>
                  <Input value={name} onChange={(e) => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')); }} required />
                </div>
                <div className="space-y-2">
                  <Label>Ville</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Slug (URL)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">/m/</span>
                    <Input value={slug} onChange={(e) => setSlug(e.target.value)} required />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createRestaurant.isPending}>
                  {createRestaurant.isPending ? "Création..." : "Créer"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : restaurants?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <UtensilsCrossed className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Aucun restaurant encore. Créez le premier !</p>
              <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Créer un restaurant</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {restaurants?.map((r) => (
              <Card key={r.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="flex items-center justify-between py-4 px-6">
                  <div>
                    <CardTitle className="text-lg">{r.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{r.city} • /m/{r.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/app/restaurants/${r.id}/qr`}><QrCode className="h-4 w-4" /></Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link to={`/app/restaurants/${r.id}/menu`}><Pencil className="h-4 w-4 mr-1" /> Éditer</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
