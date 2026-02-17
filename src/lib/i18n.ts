export type Lang = 'fr' | 'en';

const translations: Record<string, Record<Lang, string>> = {
  'menu.search': { fr: 'Rechercher un plat...', en: 'Search a dish...' },
  'menu.allCategories': { fr: 'Tout', en: 'All' },
  'menu.view3d': { fr: 'Voir en 3D', en: 'View in 3D' },
  'menu.viewLive': { fr: 'Voir en Live', en: 'View Live' },
  'menu.price': { fr: 'Prix', en: 'Price' },
  'menu.allergens': { fr: 'Allergènes', en: 'Allergens' },
  'menu.tags': { fr: 'Tags', en: 'Tags' },
  'menu.unavailable': { fr: 'Indisponible', en: 'Unavailable' },
  'menu.description': { fr: 'Description', en: 'Description' },
  'common.loading': { fr: 'Chargement...', en: 'Loading...' },
  'common.error': { fr: 'Erreur', en: 'Error' },
  'common.notFound': { fr: 'Restaurant introuvable', en: 'Restaurant not found' },
  'common.save': { fr: 'Enregistrer', en: 'Save' },
  'common.cancel': { fr: 'Annuler', en: 'Cancel' },
  'common.delete': { fr: 'Supprimer', en: 'Delete' },
  'common.add': { fr: 'Ajouter', en: 'Add' },
  'common.edit': { fr: 'Modifier', en: 'Edit' },
  'common.publish': { fr: 'Publier', en: 'Publish' },
  'common.draft': { fr: 'Brouillon', en: 'Draft' },
  'common.published': { fr: 'Publié', en: 'Published' },
  'auth.login': { fr: 'Se connecter', en: 'Log in' },
  'auth.signup': { fr: 'Créer un compte', en: 'Sign up' },
  'auth.email': { fr: 'Email', en: 'Email' },
  'auth.password': { fr: 'Mot de passe', en: 'Password' },
  'auth.logout': { fr: 'Déconnexion', en: 'Log out' },
  'dashboard.myRestaurants': { fr: 'Mes restaurants', en: 'My restaurants' },
  'dashboard.createRestaurant': { fr: 'Créer un restaurant', en: 'Create a restaurant' },
  'editor.categories': { fr: 'Catégories', en: 'Categories' },
  'editor.items': { fr: 'Plats', en: 'Dishes' },
  'editor.addCategory': { fr: 'Ajouter catégorie', en: 'Add category' },
  'editor.addItem': { fr: 'Ajouter un plat', en: 'Add a dish' },
  'editor.properties': { fr: 'Propriétés', en: 'Properties' },
  'editor.content': { fr: 'Contenu', en: 'Content' },
  'editor.style': { fr: 'Style', en: 'Style' },
  'editor.media': { fr: 'Médias', en: 'Media' },
  'editor.preview': { fr: 'Aperçu', en: 'Preview' },
  'editor.import': { fr: 'Importer', en: 'Import' },
  'editor.qrCode': { fr: 'QR Code', en: 'QR Code' },
};

export function t(key: string, lang: Lang = 'fr'): string {
  return translations[key]?.[lang] ?? key;
}

export function detectLang(): Lang {
  const nav = navigator.language?.slice(0, 2);
  return nav === 'en' ? 'en' : 'fr';
}
