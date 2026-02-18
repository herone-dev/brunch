import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_ITEMS = [
  {
    q: "BRUNCH est-il vraiment gratuit, même la 3D ?",
    a: "Oui. La visualisation 3D des plats est incluse dans le plan gratuit. Aucun plan payant, aucune feature bloquée derrière un abonnement. BRUNCH est gratuit, maintenant et toujours.",
  },
  {
    q: "Mes clients doivent-ils télécharger une application ?",
    a: "Non. Vos clients scannent le QR code avec l'appareil photo de leur smartphone. Le menu 3D s'ouvre directement dans leur navigateur. Aucun téléchargement, aucune friction, compatible tous les smartphones.",
  },
  {
    q: "Comment fonctionne l'import de menu par photo ?",
    a: "Prenez en photo votre carte papier existante (ou envoyez un PDF). Notre IA analyse l'image, identifie les catégories, les plats, les prix et les descriptions, puis structure votre menu automatiquement. Vous vérifiez, ajustez si besoin, et c'est en ligne.",
  },
  {
    q: "Comment fonctionne la visualisation 3D ?",
    a: "Vos plats sont modélisés en 3D. Vos clients scannent le QR code, accèdent au menu et peuvent faire tourner chaque plat à 360°, zoomer sur les détails, et même le projeter en taille réelle sur leur table via la réalité augmentée — directement dans leur navigateur.",
  },
  {
    q: "Puis-je modifier mon menu en temps réel ?",
    a: "Oui. Depuis votre espace BRUNCH (accessible depuis n'importe quel téléphone ou ordinateur), modifiez un plat, un prix, masquez un produit en rupture. La mise à jour est instantanée pour tous vos clients.",
  },
  {
    q: "Puis-je gérer plusieurs restaurants ?",
    a: "Oui. Vous pouvez créer et gérer plusieurs établissements depuis un seul compte BRUNCH.",
  },
  {
    q: "La traduction est-elle automatique ?",
    a: "Oui. Activez la traduction depuis votre espace. Votre carte est disponible en plusieurs langues. Vos clients sélectionnent leur langue directement dans l'interface du menu.",
  },
  {
    q: "Combien de temps pour être opérationnel ?",
    a: "Environ 5 minutes. Importez votre menu (photo ou PDF), personnalisez, générez votre QR code. Imprimez-le et posez-le sur vos tables.",
  },
];

export default function FAQSection() {
  return (
    <section id="faq" className="max-w-3xl mx-auto px-6 py-20">
      <h2 className="text-3xl md:text-4xl text-center mb-4">
        Vos vraies questions. <span className="text-primary">Nos vraies réponses.</span>
      </h2>
      <p className="text-center text-muted-foreground mb-10">
        Tout ce que vous devez savoir sur BRUNCH, votre carte digitale restaurant gratuite.
      </p>
      <Accordion type="single" collapsible className="w-full">
        {FAQ_ITEMS.map((item, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
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
  );
}
