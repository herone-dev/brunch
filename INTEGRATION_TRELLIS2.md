# Intégration TRELLIS.2 dans Brunch 🍽️ → 🧊

## Ce qui a été généré

```
supabase/
  functions/
    generate-3d/
      index.ts                 ← Edge Function proxy TRELLIS.2
  migrations/
    20260309_add_model_3d.sql  ← Colonnes + buckets Storage

src/
  components/
    menu-editor/
      Panel3D.tsx              ← Remplace l'ancien (upload + génération)
      DishViewer3D.tsx         ← Nouveau viewer public (menu client)
```

---

## Étape 1 — Ajouter model-viewer dans index.html

Ajoute cette ligne dans `<head>` de `index.html` :

```html
<script
  type="module"
  src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"
></script>
```

---

## Étape 2 — Migration Supabase

```bash
supabase db push
# ou via Supabase Dashboard > SQL Editor > coller le contenu de la migration
```

---

## Étape 3 — Ajouter le secret HF_TOKEN dans Supabase

```bash
supabase secrets set HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxx
```

Ton token HF doit avoir les permissions **read** (pour accéder au Space microsoft/TRELLIS.2).
Crée-le ici : https://huggingface.co/settings/tokens

---

## Étape 4 — Déployer l'Edge Function

```bash
supabase functions deploy generate-3d
```

Ajoute dans `supabase/config.toml` (pour étendre le timeout à 150s) :

```toml
[functions.generate-3d]
verify_jwt = true
```

---

## Étape 5 — Brancher Panel3D dans MenuEditor.tsx

Dans `src/pages/MenuEditor.tsx`, trouve là où tu affiches `<Panel3D ... />` et passe les nouvelles props :

```tsx
import { Panel3D } from "@/components/menu-editor/Panel3D";

// Dans le JSX, quand un plat est sélectionné :
<Panel3D
  dishId={selectedDish.id}
  existingModelUrl={selectedDish.model_3d_url}
  onModelReady={(url) => {
    // Met à jour le state local du plat si besoin
    setSelectedDish(prev => ({ ...prev, model_3d_url: url, model_3d_status: 'ready' }));
  }}
/>
```

---

## Étape 6 — Afficher le viewer 3D dans PublicMenu.tsx

Dans `src/pages/PublicMenu.tsx`, sur chaque carte de plat :

```tsx
import { DishViewer3D } from "@/components/menu-editor/DishViewer3D";

// Dans le JSX de chaque item :
<div className="relative">
  <img src={item.image_url} alt={item.name} className="..." />

  {/* Bouton 3D flottant sur la carte */}
  <div className="absolute bottom-2 right-2">
    <DishViewer3D
      glbUrl={item.model_3d_url}
      dishName={item.name}
      compact={true}  // ouvre une modale
    />
  </div>
</div>
```

---

## Étape 7 — Mettre à jour les types Supabase (si tu utilises les types générés)

Dans `src/integrations/supabase/types.ts`, assure-toi que `menu_items` inclut :

```ts
model_3d_url: string | null
model_3d_status: string
```

Ou régénère les types :
```bash
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

---

## Étape 8 — Installer react-dropzone (si pas encore présent)

```bash
npm install react-dropzone
# ou
bun add react-dropzone
```

---

## Architecture finale

```
Restaurateur (MenuEditor)
  └─ Panel3D.tsx
       └─ Upload photos → Supabase Storage (bucket: dish-photos)
       └─ supabase.functions.invoke("generate-3d")
            └─ Edge Function
                 └─ TRELLIS.2 API (HF_TOKEN sécurisé)
                      └─ preprocess_image → image_to_3d → extract_glb
                 └─ GLB → Supabase Storage (bucket: dish-models)
                 └─ UPDATE menu_items SET model_3d_url, model_3d_status

Client (PublicMenu)
  └─ DishViewer3D.tsx
       └─ Bouton "Voir en 3D" → Modale avec model-viewer
            └─ Charge le GLB depuis Supabase Storage (public URL)
```

---

## Notes importantes

- **Durée de génération** : TRELLIS.2 tourne sur ZeroGPU (gratuit).
  Selon la file d'attente, ça peut prendre 1 à 3 minutes.
  La génération se fait une seule fois, le GLB est stocké définitivement.

- **Photo recommandée** : fond blanc ou transparent, plat bien centré, vue de dessus/face.
  TRELLIS.2 supprime automatiquement le fond.

- **Résolution GLB** : configurée à "1024" par défaut dans l'edge function.
  Tu peux passer à "1536" pour plus de qualité (plus lent).

- **Timeout** : l'edge function attend max 130s. Si TRELLIS.2 est très chargé,
  relance simplement la génération.
