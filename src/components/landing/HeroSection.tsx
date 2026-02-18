import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star } from "lucide-react";
import heroPhones from "@/assets/hero-phones.png";
import { useScrollFadeIn } from "@/hooks/useScrollFadeIn";

export default function HeroSection() {
  const ref = useScrollFadeIn();

  return (
    <>
      {/* Hero */}
      <section ref={ref} className="fade-in-section is-visible max-w-landing mx-auto px-5 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium tracking-wide border" style={{ background: '#F3F0E8', borderColor: '#E5DCC8', color: '#6B5E3E' }}>
            <div className="flex">
              {Array(5).fill(0).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span>
              Déjà utilisé par <span className="font-semibold">+1 000 restaurants</span> en France
            </span>
          </div>

          <h1 className="text-[2.75rem] md:text-[3.25rem] lg:text-[3.75rem]">
            Fini les cartes imprimées.
            <br />
            <span className="text-primary">
              Votre carte interactive 3D, gratuite et prête en 5 minutes.
            </span>
          </h1>

          <p className="text-[17px] text-muted-foreground max-w-[520px] leading-[1.65]">
            Importez votre menu existant en photo, personnalisez en quelques clics, générez votre QR code. Vos clients scannent et visualisent vos plats en 3D — sans installer d'application.{" "}
            <strong className="text-foreground">Gratuit maintenant, gratuit toujours.</strong>
          </p>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="h-12 px-7 rounded-[10px] text-base font-semibold hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200" asChild>
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

          <p className="text-[13px] text-[hsl(0,0%,64%)] tracking-wide">
            ✅ Sans carte bancaire · ✅ Sans engagement · ✅ Menu 3D inclus · ✅ Prêt en 5 min
          </p>
        </div>

        <div className="flex justify-center">
          <img
            src={heroPhones}
            alt="Application BRUNCH - menu digital restaurant interactif sur smartphone avec QR code et visualisation 3D des plats"
            className="w-full max-w-xs md:max-w-sm rounded-2xl -rotate-1"
            style={{ filter: 'drop-shadow(0 20px 60px rgba(0,0,0,0.15))' }}
            loading="eager"
          />
        </div>
      </section>

      {/* Social proof ticker */}
      <div className="border-y border-border overflow-hidden" style={{ background: 'hsl(40, 15%, 95%)' }}>
        <div className="max-w-landing mx-auto px-5 py-3 flex items-center justify-center gap-6 md:gap-10 flex-wrap text-sm font-medium text-muted-foreground">
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
