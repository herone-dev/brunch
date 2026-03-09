-- Migration : ajoute les colonnes 3D sur la table menu_items
-- et crée le bucket Supabase Storage pour les modèles GLB

-- 1. Colonnes sur menu_items
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS model_3d_url    TEXT,
  ADD COLUMN IF NOT EXISTS model_3d_status TEXT NOT NULL DEFAULT 'none';

-- Valeurs possibles pour model_3d_status :
--   'none'        → pas encore de modèle 3D
--   'generating'  → en cours de génération
--   'ready'       → modèle GLB disponible
--   'error'       → erreur lors de la génération

COMMENT ON COLUMN menu_items.model_3d_url
  IS 'URL publique du fichier GLB dans Supabase Storage (bucket dish-models)';
COMMENT ON COLUMN menu_items.model_3d_status
  IS 'Statut de la génération 3D TRELLIS.2';

-- 2. Bucket Storage pour les modèles 3D (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('dish-models', 'dish-models', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Bucket Storage pour les photos upload (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('dish-photos', 'dish-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Policies Storage : lecture publique
CREATE POLICY "Public read dish-models"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dish-models');

CREATE POLICY "Public read dish-photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dish-photos');

-- 5. Policies Storage : écriture authentifiée seulement
CREATE POLICY "Auth write dish-models"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'dish-models' AND auth.role() = 'authenticated');

CREATE POLICY "Auth write dish-photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'dish-photos' AND auth.role() = 'authenticated');

-- 6. Service role peut écrire (pour l'edge function)
CREATE POLICY "Service write dish-models"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'dish-models');

CREATE POLICY "Service upsert dish-models"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'dish-models');
