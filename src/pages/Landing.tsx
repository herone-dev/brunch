import { Link } from "react-router-dom";
import HeroSection from "@/components/landing/HeroSection";
import ProblemSection from "@/components/landing/ProblemSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import PricingSection from "@/components/landing/PricingSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import StatsSection from "@/components/landing/StatsSection";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTASection from "@/components/landing/FinalCTASection";
import { Button } from "@/components/ui/button";

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
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <FeaturesSection />
        <PricingSection />
        <TestimonialsSection />
        <StatsSection />
        <FAQSection />
        <FinalCTASection />
      </main>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© 2026 BRUNCH — La carte digitale restaurant interactive gratuite</p>
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
