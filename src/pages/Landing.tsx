import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { QrCode, Globe, UtensilsCrossed, Sparkles, Clock, Camera, ArrowRight, Star, TrendingUp, TrendingDown, ShoppingCart } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import heroPhones from "@/assets/hero-phones.png";

const Landing = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <h1 className="text-2xl font-bold text-primary tracking-tight">BRUNCH</h1>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#how" className="hover:text-foreground transition-colors">Comment ça marche</a>
            <a href="#features" className="hover:text-foreground transition-colors">Fonctionnalités</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Tarifs</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </nav>
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link to="/login">Connexion</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">S'inscrire</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h2 className="text-4xl md:text-5xl lg:text-6xl leading-tight">
              La carte interactive{" "}
              <span className="text-primary">la + simple et rapide</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-lg">
              Créez votre carte de restaurant interactive avec QR code, multilingue et visualisation 3D des plats. En quelques minutes, pas en quelques jours.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="text-base px-8" asChild>
                <Link to="/signup">
                  Créer ma carte gratuitement
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base" asChild>
                <Link to="/m/demo">Voir la démo</Link>
              </Button>
            </div>
          </div>
          <div className="flex justify-center">
            <img
              src={heroPhones}
              alt="Application BRUNCH - menu digital sur smartphone avec QR code"
              className="w-full max-w-xs md:max-w-sm rounded-2xl drop-shadow-2xl"
              loading="eager"
            />
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="bg-card border-y border-border">
          <div className="max-w-6xl mx-auto px-6 py-20">
            <h2 className="text-3xl md:text-4xl text-center mb-16">Comment ça marche ?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  icon: Camera,
                  title: "Importez ou créez votre carte",
                  desc: "Prenez en photo votre menu existant ou créez-le de zéro. Notre outil structure tout automatiquement en quelques secondes.",
                },
                {
                  step: "2",
                  icon: UtensilsCrossed,
                  title: "Personnalisez à votre image",
                  desc: "Design, couleurs, photos de plats, traductions… Configurez votre carte simplement depuis l'éditeur type Canva.",
                },
                {
                  step: "3",
                  icon: QrCode,
                  title: "Partagez via QR Code",
                  desc: "Générez votre QR code, imprimez-le et posez-le sur vos tables. Vos clients scannent et découvrent votre carte.",
                },
              ].map((item) => (
                <div key={item.step} className="text-center space-y-4">
                  <div className="mx-auto w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                    {item.step}
                  </div>
                  <item.icon className="mx-auto h-8 w-8 text-primary" />
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-12">
              <Button size="lg" asChild>
                <Link to="/signup">Créer ma carte gratuitement</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-3xl md:text-4xl text-center mb-16">Des fonctionnalités pour vos besoins</h2>

          <div className="space-y-20">
            {[
              {
                icon: Globe,
                title: "Traduction instantanée",
                desc: "Traduisez votre menu en plusieurs langues sans effort et sans frais ! Français, anglais, espagnol, arabe et plus encore… Traduisez automatiquement votre carte en quelques clics.",
                reverse: false,
              },
              {
                icon: Sparkles,
                title: "Visualisation 3D & AR",
                desc: "Vos clients peuvent visualiser les plats en 3D directement depuis leur téléphone. Une expérience immersive unique qui fait la différence et augmente les commandes.",
                reverse: true,
              },
              {
                icon: Clock,
                title: "Mise à jour en temps réel",
                desc: "Un changement de dernière minute sur votre menu ? Pas de stress ! Ajoutez un nouveau produit, modifiez son prix, masquez temporairement un plat en rupture… Tout est instantané, même en plein service.",
                reverse: false,
              },
              {
                icon: Camera,
                title: "Importation photo intelligente",
                desc: "Prenez en photo votre carte papier existante et notre intelligence artificielle la structure automatiquement. Catégories, plats, prix, descriptions : tout est reconnu et organisé pour vous.",
                reverse: true,
              },
            ].map((feature, i) => (
              <div
                key={i}
                className={`flex flex-col ${feature.reverse ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-10`}
              >
                <div className="flex-1 space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-primary text-sm font-medium">
                    <feature.icon className="h-4 w-4" />
                    {feature.title}
                  </div>
                  <h3 className="text-2xl md:text-3xl">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="w-64 h-64 rounded-2xl bg-muted flex items-center justify-center">
                    <feature.icon className="h-20 w-20 text-primary/30" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="bg-card border-y border-border">
          <div className="max-w-4xl mx-auto px-6 py-20 text-center space-y-8">
            <h2 className="text-3xl md:text-4xl">Et l'addition s'il vous plaît ?</h2>
            <div className="inline-block rounded-2xl border-2 border-primary bg-background p-8 md:p-12 space-y-4">
              <p className="text-5xl md:text-6xl font-bold text-primary">100% Gratuit</p>
              <p className="text-lg text-muted-foreground">et sans engagement</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Fini les dépenses liées à l'impression de vos cartes ! Création du menu, QR code, mises à jour illimitées : tout est inclus gratuitement.
              </p>
              <Button size="lg" className="mt-4" asChild>
                <Link to="/signup">Commencer maintenant</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-3xl md:text-4xl text-center mb-12">Ils ont choisi BRUNCH</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "BRUNCH est un outil très pratique au quotidien. Je peux modifier mon menu en un clin d'œil. Avant, je passais ma vie à imprimer mes cartes.",
                name: "Marie L.",
                place: "Bistrot du Marché, Lyon",
              },
              {
                quote: "Depuis qu'on utilise BRUNCH, c'est beaucoup plus facile de modifier sa carte, d'ajouter de nouveaux plats, de changer les prix. C'est très rapide.",
                name: "Thomas K.",
                place: "La Brasserie, Paris 11e",
              },
              {
                quote: "Mes clients adorent le QR code pour consulter notre carte. Le rendu 3D des plats, c'est la cerise sur le gâteau. Tout est fluide et professionnel.",
                name: "Sofia R.",
                place: "Chez Sofia, Marseille",
              },
            ].map((t, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="flex gap-1">
                  {Array(5).fill(0).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic">"{t.quote}"</p>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.place}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Stats / Pourquoi choisir BRUNCH */}
        <section className="bg-card border-y border-border">
          <div className="max-w-6xl mx-auto px-6 py-20 text-center space-y-12">
            <h2 className="text-3xl md:text-4xl">
              Pourquoi les restaurants choisissent{" "}
              <span className="text-primary">BRUNCH</span>
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { value: "+35%", label: "De visibilité sur les plats", icon: TrendingUp },
                { value: "-50%", label: "De frais d'impression", icon: TrendingDown },
                { value: "+20%", label: "De commandes sur les plats phares", icon: ShoppingCart },
              ].map((stat, i) => (
                <div key={i} className="rounded-2xl border border-border bg-background p-8 space-y-2">
                  <stat.icon className="mx-auto h-8 w-8 text-primary/60" />
                  <p className="text-5xl font-bold text-primary">{stat.value}</p>
                  <p className="text-muted-foreground text-sm">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="max-w-3xl mx-auto px-6 py-20">
          <h2 className="text-3xl md:text-4xl text-center mb-4">Questions fréquentes</h2>
          <p className="text-center text-muted-foreground mb-10">
            Tout ce que vous devez savoir sur BRUNCH
          </p>
          <Accordion type="single" collapsible className="w-full">
            {[
              {
                q: "BRUNCH est-il vraiment gratuit ?",
                a: "Oui, BRUNCH est 100% gratuit et sans engagement. La création de votre menu, le QR code et les mises à jour illimitées sont inclus. Aucune carte bancaire n'est requise.",
              },
              {
                q: "Comment fonctionne la traduction multilingue ?",
                a: "Votre carte est automatiquement traduite en plusieurs langues (français, anglais, espagnol, arabe, etc.) grâce à notre technologie IA. Vos clients voient le menu dans leur langue préférée.",
              },
              {
                q: "Faut-il installer une application pour les clients ?",
                a: "Non, aucune installation n'est nécessaire. Le client scanne le QR code et le menu s'ouvre instantanément dans son navigateur. Aucune barrière, aucune friction.",
              },
              {
                q: "Comment fonctionne la visualisation 3D des plats ?",
                a: "Ajoutez des photos de vos plats et notre technologie génère des modèles 3D interactifs. Vos clients peuvent visualiser chaque plat sous tous les angles directement sur leur téléphone.",
              },
              {
                q: "Puis-je modifier mon menu en temps réel ?",
                a: "Absolument. Un plat en rupture ? Un nouveau plat du jour ? Modifiez votre carte en un clic, les changements sont visibles instantanément par vos clients.",
              },
              {
                q: "Puis-je importer mon menu existant ?",
                a: "Oui ! Prenez simplement en photo votre carte papier. Notre IA reconnaît automatiquement les catégories, plats, prix et descriptions pour structurer votre menu digital.",
              },
              {
                q: "Puis-je gérer plusieurs restaurants ?",
                a: "Oui, vous pouvez gérer autant de restaurants que vous souhaitez depuis un seul compte BRUNCH, chacun avec ses propres menus et QR codes.",
              },
            ].map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-base">{item.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Final CTA */}
        <section className="bg-primary text-primary-foreground">
          <div className="max-w-4xl mx-auto px-6 py-20 text-center space-y-6">
            <h2 className="text-3xl md:text-4xl text-primary-foreground">
              Prêt à réinventer votre carte ?
            </h2>
            <p className="text-primary-foreground/80 text-lg max-w-xl mx-auto">
              Rejoignez les restaurateurs qui font confiance à BRUNCH pour leur carte interactive.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" variant="secondary" className="text-base px-8" asChild>
                <Link to="/signup">
                  Essayer maintenant — c'est gratuit
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
                <Link to="/m/demo">Voir un vrai menu</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© 2026 BRUNCH — L'expérience restaurant interactive</p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/login" className="hover:text-foreground transition-colors">Connexion</Link>
            <Link to="/signup" className="hover:text-foreground transition-colors">S'inscrire</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
