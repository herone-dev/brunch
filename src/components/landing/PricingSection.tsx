import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Check,
  X,
  Shield,
  ArrowRight,
  Star,
  Info,
  CreditCard,
} from "lucide-react";

type BillingPeriod = "monthly" | "6months" | "12months";

const BILLING_OPTIONS: { key: BillingPeriod; label: string; badge?: string }[] =
  [
    { key: "monthly", label: "Mensuel" },
    { key: "6months", label: "6 mois" },
    { key: "12months", label: "12 mois", badge: "⭐ Meilleure offre" },
  ];

interface PlanFeature {
  text: string;
  included: boolean;
  tooltip?: string;
}

interface PlanData {
  name: string;
  badge: string;
  recommended?: boolean;
  premium?: boolean;
  custom?: boolean;
  getPrice: (period: BillingPeriod) => string;
  getSubPrice: (period: BillingPeriod) => string;
  getPeriodBadge?: (period: BillingPeriod) => string | null;
  getPeriodExtra?: (period: BillingPeriod) => string | null;
  description: string;
  features: PlanFeature[];
  cta: string;
  ctaVariant: "outline" | "default" | "secondary";
  ctaLink?: string;
  microcopy: string;
}

const PLANS: PlanData[] = [
  {
    name: "FREE",
    badge: "Gratuit pour toujours",
    getPrice: () => "0€",
    getSubPrice: () => "Sans CB · Sans engagement",
    description:
      "Pour découvrir BRUNCH et digitaliser votre carte en quelques minutes.",
    features: [
      { text: "1 carte interactive QR code", included: true },
      { text: "Mise à jour en temps réel", included: true },
      { text: "Traduction multilingue de base", included: true },
      { text: "Import IA depuis photo (1 import)", included: true },
      { text: "QR code personnalisé", included: true },
      { text: "3 visualisations 3D de plats", included: true },
      { text: "Générations 3D illimitées", included: false },
      { text: "Analytics avancés", included: false },
      { text: "Avantage basse saison", included: false },
      { text: "Support prioritaire", included: false },
      { text: "Multi-établissements", included: false },
    ],
    cta: "Commencer gratuitement — sans CB",
    ctaVariant: "outline",
    ctaLink: "/signup",
    microcopy: "Aucune carte bancaire requise",
  },
  {
    name: "STARTER",
    badge: "Le plus populaire",
    recommended: true,
    getPrice: (period) => {
      if (period === "monthly") return "49,99€";
      return "41,66€";
    },
    getSubPrice: (period) => {
      if (period === "monthly") return "Sans engagement · Résiliable à tout moment";
      if (period === "6months") return "Soit 249,96€ facturés en une fois · Économisez ~50€";
      return "Soit 499,92€ facturés en une fois";
    },
    getPeriodBadge: (period) => {
      if (period === "6months") return "-17%";
      if (period === "12months") return "⭐ 2 MOIS OFFERTS";
      return null;
    },
    getPeriodExtra: (period) => {
      if (period === "12months") return "Économisez ~100€";
      return null;
    },
    description:
      "Pour les restaurants qui veulent une carte professionnelle, interactive et toujours à jour.",
    features: [
      { text: "Tout le plan FREE", included: true },
      { text: "Générations 3D illimitées de plats", included: true },
      { text: "Traduction multilingue complète (10+ langues)", included: true },
      { text: "Import IA illimité depuis photo ou PDF", included: true },
      { text: "QR codes illimités et personnalisés", included: true },
      {
        text: "Analytics de base (vues, plats les plus consultés)",
        included: true,
      },
      { text: "Support par email sous 24h", included: true },
      { text: "1 établissement", included: true },
      { text: "Avantage basse saison", included: false },
      { text: "Analytics avancés", included: false },
      { text: "Multi-établissements", included: false },
      { text: "Support prioritaire", included: false },
    ],
    cta: "Commencer avec STARTER",
    ctaVariant: "default",
    ctaLink: "/signup",
    microcopy: "Résiliable à tout moment · Paiement sécurisé",
  },
  {
    name: "PREMIUM",
    badge: "Pour les pros",
    premium: true,
    getPrice: (period) => {
      if (period === "monthly") return "99,99€";
      if (period === "6months") return "83,33€";
      return "79,99€";
    },
    getSubPrice: (period) => {
      if (period === "monthly")
        return "+ Avantage basse saison + 5 générations 3D bonus/mois\nSans engagement · Résiliable à tout moment";
      if (period === "6months")
        return "Soit 499,98€ facturés en une fois · Économisez ~100€";
      return "Soit 959,88€ facturés en une fois";
    },
    getPeriodBadge: (period) => {
      if (period === "6months") return "-17%";
      if (period === "12months") return "−20%";
      return null;
    },
    getPeriodExtra: (period) => {
      if (period === "12months")
        return "+ 20 générations 3D BONUS + Avantage basse saison inclus · Vous économisez ~240€/an";
      return null;
    },
    description:
      "Pour les établissements qui veulent dominer l'expérience client : analytics complets, 3D premium, gestion multi-sites et avantage basse saison.",
    features: [
      { text: "Tout le plan STARTER", included: true },
      {
        text: "Générations 3D illimitées (+ bonus)",
        included: true,
        tooltip:
          "+ 5 bonus/mois en mensuel · + 20 bonus en annuel pour renouveler ou améliorer vos modèles.",
      },
      {
        text: "Analytics avancés (comportement, heatmap, conversion)",
        included: true,
      },
      {
        text: "Avantage basse saison",
        included: true,
        tooltip:
          "Votre abonnement est suspendu automatiquement pendant vos périodes de fermeture (max 3 mois/an). Vous ne payez que quand vous travaillez.",
      },
      { text: "Multi-établissements (jusqu'à 5)", included: true },
      { text: "Support prioritaire (réponse sous 4h)", included: true },
      { text: "Personnalisation avancée du design", included: true },
      { text: "Accès aux nouvelles fonctionnalités en avant-première", included: true },
    ],
    cta: "Passer à PREMIUM",
    ctaVariant: "default",
    ctaLink: "/signup",
    microcopy: "Paiement sécurisé · Avantage basse saison inclus",
  },
  {
    name: "CUSTOM",
    badge: "Groupes & Chaînes",
    custom: true,
    getPrice: () => "Sur devis",
    getSubPrice: () => "Tarif adapté à votre volume",
    description:
      "Vous gérez plusieurs établissements, une franchise ou une chaîne de restauration ? On construit une offre sur mesure.",
    features: [
      { text: "Tout le plan PREMIUM", included: true },
      { text: "Établissements illimités", included: true },
      { text: "Intégration sur mesure (caisse, POS, site web)", included: true },
      { text: "Onboarding dédié avec un expert BRUNCH", included: true },
      { text: "SLA garanti et support 7j/7", included: true },
      { text: "Formations équipe incluses", included: true },
      { text: "Facturation adaptée (mensuelle, trimestrielle, annuelle)", included: true },
    ],
    cta: "Nous contacter",
    ctaVariant: "outline",
    microcopy: "Réponse sous 24h · Pas d'engagement avant validation de l'offre",
  },
];

const PRICING_FAQ = [
  {
    q: "La formule FREE est-elle vraiment gratuite à vie ?",
    a: "Oui. Le plan FREE est gratuit sans limite dans le temps. Aucune carte bancaire n'est requise. Vous pouvez créer votre carte, générer votre QR code et le partager avec vos clients sans débourser un centime.",
  },
  {
    q: 'Que signifie "Avantage basse saison" ?',
    a: "Si votre restaurant ferme en dehors de la saison (hiver, entre-saisons…), vous pouvez suspendre votre abonnement PREMIUM jusqu'à 3 mois par an. Vous ne payez que les mois où vous êtes ouverts. Concrètement, pour un restaurant fermé 2 mois en hiver, vous économisez jusqu'à 200€/an.",
  },
  {
    q: "Puis-je passer d'un plan à l'autre ?",
    a: "Oui, à tout moment. Upgrade immédiat avec accès instantané aux nouvelles fonctionnalités. Downgrade effectif en fin de période de facturation en cours.",
  },
  {
    q: 'Qu\'est-ce qu\'une "génération 3D" ?',
    a: "Une génération 3D correspond à la création d'un modèle 3D pour un plat. Une fois le modèle créé, vos clients peuvent le visualiser un nombre illimité de fois. Seule la création initiale consomme un crédit de génération. Le plan FREE inclut 3 générations, STARTER les génère en illimité, PREMIUM offre des crédits bonus pour renouveler ou améliorer vos modèles régulièrement.",
  },
];

function FeatureItem({ feature }: { feature: PlanFeature }) {
  const content = (
    <span className="flex items-start gap-2 text-sm">
      {feature.included ? (
        <Check className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
      ) : (
        <X className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground/40" />
      )}
      <span className={feature.included ? "text-foreground" : "text-muted-foreground/60"}>
        {feature.text}
      </span>
      {feature.tooltip && (
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/50" />
      )}
    </span>
  );

  if (feature.tooltip) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">{content}</div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            <p>{feature.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

function PlanCard({
  plan,
  period,
}: {
  plan: PlanData;
  period: BillingPeriod;
}) {
  const isRecommended = plan.recommended;
  const isPremium = plan.premium;
  const isCustom = plan.custom;
  const periodBadge = plan.getPeriodBadge?.(period);
  const periodExtra = plan.getPeriodExtra?.(period);
  const subPriceLines = plan.getSubPrice(period).split("\n");

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 md:p-8 transition-all ${
        isRecommended
          ? "border-primary shadow-lg shadow-primary/10 scale-[1.02] z-10 bg-background"
          : isPremium
          ? "border-border bg-background shadow-sm"
          : isCustom
          ? "border-dashed border-border bg-muted/30"
          : "border-border bg-background"
      }`}
    >
      {/* Badge */}
      <div className="flex items-center gap-2 mb-3">
        <Badge
          variant={isRecommended ? "default" : "secondary"}
          className={`text-xs ${isRecommended ? "" : "bg-muted text-muted-foreground border-0"}`}
        >
          {plan.badge}
        </Badge>
        {isRecommended && (
          <Badge className="bg-primary text-primary-foreground text-xs">
            Recommandé
          </Badge>
        )}
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold tracking-tight mb-2">{plan.name}</h3>

      {/* Price */}
      <div className="mb-1 flex items-end gap-2 flex-wrap">
        <span className="text-4xl font-bold text-foreground">
          {plan.getPrice(period)}
        </span>
        {!isCustom && (
          <span className="text-muted-foreground text-sm mb-1">/ mois</span>
        )}
        {periodBadge && (
          <Badge
            variant="secondary"
            className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 text-xs font-bold"
          >
            {periodBadge}
          </Badge>
        )}
      </div>

      {/* Sub-price */}
      <div className="mb-1">
        {subPriceLines.map((line, i) => (
          <p key={i} className="text-xs text-muted-foreground">
            {line}
          </p>
        ))}
      </div>

      {/* Period extra */}
      {periodExtra && (
        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
          {periodExtra}
        </p>
      )}

      {/* Basse saison note for Premium */}
      {isPremium && (
        <p className="text-xs italic text-muted-foreground mb-3">
          💡 Avantage basse saison : votre abonnement est suspendu automatiquement
          pendant vos périodes de fermeture (max 3 mois/an). Vous ne payez que quand
          vous travaillez.
        </p>
      )}

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>

      {/* Features */}
      <div className="flex-1 space-y-2.5 mb-6">
        {plan.features.map((f, i) => (
          <FeatureItem key={i} feature={f} />
        ))}
      </div>

      {/* CTA */}
      <Button
        variant={plan.ctaVariant}
        size="lg"
        className={`w-full text-sm ${
          isPremium
            ? "bg-foreground text-background hover:bg-foreground/90"
            : ""
        }`}
        asChild={!!plan.ctaLink}
      >
        {plan.ctaLink ? (
          <Link to={plan.ctaLink}>{plan.cta}</Link>
        ) : (
          <span>{plan.cta}</span>
        )}
      </Button>

      {/* Microcopy */}
      <p className="text-[11px] text-center text-muted-foreground mt-2">
        {plan.microcopy}
      </p>
    </div>
  );
}

export default function PricingSection() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");

  return (
    <>
      {/* Main Pricing */}
      <section id="pricing" className="bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          {/* Header */}
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-3 text-xs">
              💰 Transparent. Sans surprise.
            </Badge>
            <h2 className="text-3xl md:text-4xl mb-3">
              Commencez gratuitement.
              <br />
              <span className="text-primary">
                Passez au niveau supérieur quand vous êtes prêts.
              </span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              BRUNCH est gratuit pour toujours. Les plans payants débloquent la
              puissance complète de la 3D, de l'IA et des outils pros.
            </p>
          </div>

          {/* Toggle */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex items-center bg-muted rounded-full p-1 gap-1">
              {BILLING_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setBillingPeriod(opt.key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    billingPeriod === opt.key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                  {opt.badge && (
                    <span className="ml-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      {opt.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Plan Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
            {PLANS.map((plan) => (
              <PlanCard key={plan.name} plan={plan} period={billingPeriod} />
            ))}
          </div>

          {/* Payment logos */}
          <div className="flex items-center justify-center gap-4 mt-8 text-muted-foreground/50">
            <CreditCard className="h-5 w-5" />
            <span className="text-xs">
              Paiement sécurisé — Visa · Mastercard · CB
            </span>
          </div>
        </div>
      </section>

      {/* Guarantee */}
      <section className="bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-12 text-center space-y-3">
          <Shield className="mx-auto h-10 w-10 text-emerald-500" />
          <h3 className="text-xl font-bold">
            🛡️ Aucun risque. Vraiment.
          </h3>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Vous pouvez démarrer gratuitement sans CB. Si vous passez au plan
            STARTER ou PREMIUM et que vous n'êtes pas satisfait dans les 14
            jours, nous vous remboursons intégralement. Sans question.
          </p>
        </div>
      </section>

      {/* Pricing FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h3 className="text-2xl font-bold text-center mb-8">
          Questions sur les tarifs
        </h3>
        <Accordion type="single" collapsible className="w-full">
          {PRICING_FAQ.map((item, i) => (
            <AccordionItem key={i} value={`pf-${i}`}>
              <AccordionTrigger className="text-left text-base">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Final Pricing CTA */}
      <section className="border-t border-border bg-muted/30">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center space-y-6">
          <h2 className="text-3xl md:text-4xl">
            Quel que soit votre plan, commencez aujourd'hui.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Le plan FREE ne coûte rien et vous permet de tester BRUNCH sans
            risque. Si vous voulez aller plus loin, les plans STARTER et PREMIUM
            sont là.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" variant="outline" className="text-base" asChild>
              <Link to="/signup">Commencer gratuitement</Link>
            </Button>
            <Button size="lg" className="text-base px-8" asChild>
              <Link to="/signup">
                Choisir STARTER — 49,99€/mois
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            ✅ Sans CB pour le FREE · ✅ Remboursé sous 14 jours si pas satisfait
            · ✅ Résiliable à tout moment
          </p>
        </div>
      </section>
    </>
  );
}
