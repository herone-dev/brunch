import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Camera,
  Clock,
  Globe,
  QrCode,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useScrollFadeIn } from "@/hooks/useScrollFadeIn";

const FEATURES = [
  {
    icon: Sparkles,
    badge: "Différenciateur clé",
    title: "Vos plats en 3D. Sur leur table. Avant même de commander.",
    desc: "Un simple scan QR code et vos clients visualisent chaque plat en 3D photo-réaliste, directement sur leur smartphone. Rotation 360°, zoom sur les détails, projection en taille réelle sur leur table. Aucune application à télécharger. Compatible tous les smartphones.",
    stat: "+20% de commandes sur les plats phares avec la visualisation 3D",
    ctaText: "Voir la démo 3D →",
    ctaLink: "/m/demo",
  },
  {
    icon: Camera,
    title: "Votre carte papier devient digitale en 10 secondes.",
    desc: "Photographiez votre menu existant. Notre intelligence artificielle le lit et le structure automatiquement : catégories, plats, prix, descriptions. Plus besoin de tout retaper manuellement. Votre menu est prêt en quelques secondes.",
  },
  {
    icon: Clock,
    title: "Votre menu est toujours exact. Même un samedi soir à 20h.",
    desc: "Rupture de stock ? Nouveau plat ? Prix modifié ? Connectez-vous depuis votre téléphone, faites la modification. Vos clients voient la mise à jour instantanément. Vos serveurs arrêtent de s'excuser.",
  },
  {
    icon: Globe,
    title: "Votre carte parle à tous vos clients.",
    desc: "Français, anglais, espagnol, arabe et plus encore. Activez la traduction en un clic. Vos clients étrangers sélectionnent leur langue dans l'interface du menu. Plus d'erreurs de commande, plus de malentendus, plus d'allers-retours inutiles en salle.",
  },
  {
    icon: QrCode,
    title: "Un QR code à votre image, pas un code générique.",
    desc: "Personnalisez votre QR code avec les couleurs et le logo de votre restaurant. Imprimez-le vous-même ou demandez à votre imprimeur local. Posez-le sur vos tables. C'est prêt.",
  },
];

export default function FeaturesSection() {
  const [active, setActive] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const ActiveIcon = FEATURES[active].icon;
  const feature = FEATURES[active];
  const ref = useScrollFadeIn();

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % FEATURES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const handleClick = useCallback((i: number) => {
    setActive(i);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 15000);
  }, []);

  const prev = () => handleClick(active === 0 ? FEATURES.length - 1 : active - 1);
  const next = () => handleClick(active === FEATURES.length - 1 ? 0 : active + 1);

  return (
    <section id="features" ref={ref} className="fade-in-section max-w-landing mx-auto px-5 py-24">
      <p className="text-center text-[13px] font-medium text-primary mb-2 tracking-wide">
        🔧 Fonctionnalités
      </p>
      <h2 className="text-3xl md:text-[2.5rem] text-center mb-4">
        Tout ce qu'un menu digital moderne doit faire.{" "}
        <span className="text-primary">Inclus. Gratuit.</span>
      </h2>
      <p className="text-center text-muted-foreground mb-16 max-w-[600px] mx-auto text-base leading-[1.7]">
        Chaque fonctionnalité a été pensée pour vous faire gagner du temps et offrir une expérience unique à vos clients.
      </p>

      <div className="grid md:grid-cols-2 gap-10 items-start">
        {/* Left: Accordion steps */}
        <div className="space-y-0">
          {FEATURES.map((f, i) => {
            const isActive = active === i;
            return (
              <button
                key={i}
                onClick={() => handleClick(i)}
                className={`w-full text-left border-l-2 transition-all duration-300 px-6 py-5 ${
                  isActive
                    ? "border-l-primary bg-primary/5"
                    : "border-l-transparent hover:border-l-muted-foreground/30 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[13px] font-bold tabular-nums tracking-wide ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    0{i + 1}
                  </span>
                  <span
                    className={`font-semibold text-sm ${
                      isActive ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {f.title}
                  </span>
                </div>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    isActive ? "max-h-60 opacity-100 mt-3" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="text-[15px] text-muted-foreground leading-[1.65] pl-8">
                    {f.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Visual card */}
        <div className="flex items-center justify-center sticky top-32">
          <div className="w-full aspect-square max-w-md rounded-2xl bg-background border border-border flex flex-col items-center justify-center gap-4 p-8 transition-all duration-500 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
            {feature.badge && (
              <Badge className="mb-2 bg-primary/10 text-primary border-0 text-xs">{feature.badge}</Badge>
            )}
            <ActiveIcon className="h-20 w-20 text-primary/40" />
            <p className="text-sm font-medium text-primary text-center">
              {feature.title}
            </p>
            {feature.stat && (
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 text-center">
                {feature.stat}
              </p>
            )}
            {feature.ctaText && feature.ctaLink && (
              <Link
                to={feature.ctaLink}
                className="text-xs text-primary hover:underline"
              >
                {feature.ctaText}
              </Link>
            )}
            <p className="text-[12px] text-muted-foreground bg-primary/10 text-primary px-3 py-1 rounded-full">
              0{active + 1}/{FEATURES.length}
            </p>

            {/* Nav arrows */}
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={prev}
                className="p-2 rounded-full bg-background border border-border hover:bg-muted transition-all duration-200 hover:-translate-y-0.5"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex gap-1.5">
                {FEATURES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handleClick(i)}
                    className={`h-2 rounded-full transition-all ${
                      active === i ? "w-6 bg-primary" : "w-2 bg-border"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={next}
                className="p-2 rounded-full bg-background border border-border hover:bg-muted transition-all duration-200 hover:-translate-y-0.5"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center mt-12">
        <Button size="lg" className="h-12 px-7 rounded-[10px] font-semibold hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200" asChild>
          <Link to="/signup">
            Commencer maintenant
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
