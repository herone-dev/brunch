import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star } from "lucide-react";
import heroPhones from "@/assets/hero-phones.png";

export default function HeroSection() {
  return (
    <>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-1.5 bg-muted rounded-full px-4 py-1.5 text-sm">
            <div className="flex">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-accent text-accent" />
                ))}
            </div>
            <span className="text-muted-foreground">
              Déjà utilisé par <span className="font-semibold text-foreground">+1 000 restaurants</span> en France
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl leading-[1.1]">
            Fini les cartes imprimées.
            <br />
            <span className="text-primary">
              Votre carte interactive 3D, gratuite et prête en 5 minutes.
            </span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-lg">
            Importez votre menu existant en photo, personnalisez en quelques clics, générez votre QR code. Vos clients scannent et visualisent vos plats en 3D — sans installer d'application.{" "}
            <strong className="text-foreground">Gratuit maintenant, gratuit toujours.</strong>
          </p>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="text-base px-8" asChild>
                <Link to="/signup">
                  Créer ma carte gratuitement — sans CB
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <Link
              to="/m/demo"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              → Voir une vraie carte en action
            </Link>
          </div>

          <p className="text-xs text-muted-foreground">
            ✅ Sans carte bancaire · ✅ Sans engagement · ✅ Menu 3D inclus · ✅ Prêt en 5 min
          </p>
        </div>

        <div className="flex justify-center">
          <img
            src={heroPhones}
            alt="Application BRUNCH - menu digital restaurant interactif sur smartphone avec QR code et visualisation 3D des plats"
            className="w-full max-w-xs md:max-w-sm rounded-2xl drop-shadow-2xl"
            loading="eager"
          />
        </div>
      </section>

      {/* Social proof ticker */}
      <div className="border-y border-border bg-muted/50 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-center gap-6 md:gap-10 flex-wrap text-sm font-medium text-muted-foreground">
          <span>+1 000 restaurants</span>
          <span className="hidden sm:inline text-border">·</span>
          <span>⭐ 4.9/5 satisfaction</span>
          <span className="hidden sm:inline text-border">·</span>
          <span>🍽️ Menu 3D inclus</span>
          <span className="hidden sm:inline text-border">·</span>
          <span>🌍 Multilingue</span>
          <span className="hidden sm:inline text-border">·</span>
          <span>💰 100% Gratuit</span>
        </div>
      </div>
    </>
  );
}
