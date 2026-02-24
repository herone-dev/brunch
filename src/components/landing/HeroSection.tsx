import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star } from "lucide-react";
import heroPhones from "@/assets/hero-phones.png";

export default function HeroSection() {
  return (
    <>
      {/* Hero */}
      <section className="max-w-landing mx-auto px-5 py-8 md:py-12 lg:py-14 grid md:grid-cols-2 gap-8 items-center min-h-[calc(100vh-60px)] md:min-h-0">
        <div className="space-y-4">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium tracking-wide border" style={{ background: '#F3F0E8', borderColor: '#E5DCC8', color: '#6B5E3E' }}>
            <div className="flex">
              {Array(5).fill(0).map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span>
              Déjà utilisé par <span className="font-semibold">+1 000 restaurants</span> en France
            </span>
          </div>

          <h1 className="text-[1.75rem] sm:text-[2rem] md:text-[2.25rem] lg:text-[2.75rem] !leading-[1.15]">
            Fini les cartes imprimées.
            <br />
            <span className="text-primary">
              Votre carte interactive 3D, gratuite et prête en 5 minutes.
            </span>
          </h1>

          <p className="text-[15px] md:text-base text-muted-foreground max-w-[500px] leading-[1.6]">
            Importez votre menu existant en photo, personnalisez en quelques clics, générez votre QR code. Vos clients scannent et visualisent vos plats en 3D — sans installer d'application.{" "}
            <strong className="text-foreground">Gratuit maintenant, gratuit toujours.</strong>
          </p>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="h-11 px-6 rounded-[10px] text-sm font-semibold hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200" asChild>
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

        </div>

        <div className="flex justify-center">
          <img
            src={heroPhones}
            alt="Application BRUNCH - menu digital restaurant interactif sur smartphone avec QR code et visualisation 3D des plats"
            className="w-full max-w-[240px] md:max-w-[280px] rounded-2xl -rotate-1"
            style={{ filter: 'drop-shadow(0 20px 60px rgba(0,0,0,0.15))' }}
            loading="eager"
          />
        </div>
      </section>

      {/* Social proof ticker */}
      <div className="border-y border-border overflow-hidden" style={{ background: 'hsl(40, 15%, 95%)' }}>
        <div className="max-w-landing mx-auto px-5 py-2.5 flex items-center justify-center gap-6 md:gap-10 flex-wrap text-sm font-medium text-muted-foreground">
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
