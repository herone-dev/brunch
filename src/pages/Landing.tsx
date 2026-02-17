import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, QrCode, Globe, Sparkles } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h1 className="text-2xl font-bold text-primary tracking-tight">BRUNCH</h1>
        <div className="flex gap-2">
          <Button variant="ghost" asChild>
            <Link to="/login">Connexion</Link>
          </Button>
          <Button asChild>
            <Link to="/signup">Commencer</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-8 max-w-3xl mx-auto">
        <div className="space-y-4">
          <h2 className="text-5xl md:text-6xl leading-tight">
            Votre carte de restaurant,{" "}
            <span className="text-primary">réinventée</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Créez une carte interactive multilingue avec visualisation 3D des plats.
            Vos clients scannent un QR code et découvrent vos plats autrement.
          </p>
        </div>

        <div className="flex gap-3 flex-wrap justify-center">
          <Button size="lg" asChild>
            <Link to="/signup">Créer ma carte gratuitement</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/m/demo">Voir la démo</Link>
          </Button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 w-full max-w-lg">
          {[
            { icon: QrCode, title: "QR Code", desc: "Accès instantané à la carte" },
            { icon: Globe, title: "Multilingue", desc: "FR, EN et plus" },
            { icon: UtensilsCrossed, title: "Éditeur avancé", desc: "Type Canva, simple et puissant" },
            { icon: Sparkles, title: "3D & AR", desc: "Visualisez les plats en 3D" },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border text-left">
              <f.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-muted-foreground border-t border-border">
        © 2026 BRUNCH — L'expérience restaurant interactive
      </footer>
    </div>
  );
};

export default Landing;
