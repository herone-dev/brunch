import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Upload, Loader2, Save, MapPin, Phone, Mail, Globe,
  Instagram, Facebook, Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { Restaurant } from "@/lib/types";
import { useQueryClient } from "@tanstack/react-query";

// TikTok icon (not in lucide)
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.42a8.16 8.16 0 004.76 1.52V7.5a4.85 4.85 0 01-1-.81z" />
  </svg>
);

interface RestaurantSettingsProps {
  restaurant: Restaurant;
}

export function RestaurantSettings({ restaurant }: RestaurantSettingsProps) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Form state – cast to any for new columns not yet in generated types
  const r = restaurant as any;
  const [name, setName] = useState(r.name || "");
  const [description, setDescription] = useState(r.description || "");
  const [address, setAddress] = useState(r.address || "");
  const [city, setCity] = useState(r.city || "");
  const [phone, setPhone] = useState(r.phone || "");
  const [email, setEmail] = useState(r.email || "");
  const [website, setWebsite] = useState(r.website || "");
  const [instagram, setInstagram] = useState(r.instagram || "");
  const [facebook, setFacebook] = useState(r.facebook || "");
  const [tiktok, setTiktok] = useState(r.tiktok || "");
  const [logoPath, setLogoPath] = useState(r.logo_path || "");
  const [coverPath, setCoverPath] = useState(r.cover_image_path || "");

  const logoUrl = logoPath
    ? supabase.storage.from("menu-media").getPublicUrl(logoPath).data.publicUrl
    : null;
  const coverUrl = coverPath
    ? supabase.storage.from("menu-media").getPublicUrl(coverPath).data.publicUrl
    : null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Record<string, any> = {
        name,
        city,
        description,
        address,
        phone,
        email,
        website,
        instagram,
        facebook,
        tiktok,
        logo_path: logoPath || null,
        cover_image_path: coverPath || null,
      };
      const { error } = await supabase
        .from("restaurants")
        .update(updates as any)
        .eq("id", restaurant.id);

      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["my-restaurant"] });
      toast.success("Informations sauvegardées !");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (
    file: File,
    prefix: string,
    onPath: (path: string) => void,
    setUploading: (v: boolean) => void
  ) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${restaurant.id}/${prefix}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("menu-media").upload(path, file);
      if (error) throw error;
      onPath(path);
      toast.success("Image uploadée !");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cover image */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Image de couverture</CardTitle>
          <CardDescription className="text-xs">Utilisée en haut de votre menu en ligne</CardDescription>
        </CardHeader>
        <CardContent>
          <label className="block cursor-pointer group">
            <div className="relative h-40 rounded-lg border-2 border-dashed border-border overflow-hidden hover:border-primary/50 transition-colors bg-muted">
              {coverUrl ? (
                <img src={coverUrl} alt="Couverture" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-8 w-8 mb-2" />
                  <span className="text-xs">Ajouter une image de couverture</span>
                </div>
              )}
              {uploadingCover && (
                <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageUpload(f, "cover", setCoverPath, setUploadingCover);
              }}
            />
          </label>
        </CardContent>
      </Card>

      {/* Logo + Name */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Identité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            {/* Logo */}
            <label className="cursor-pointer shrink-0">
              <div className="h-20 w-20 rounded-xl border-2 border-dashed border-border overflow-hidden hover:border-primary/50 transition-colors bg-muted flex items-center justify-center relative">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
                ) : (
                  <Upload className="h-5 w-5 text-muted-foreground" />
                )}
                {uploadingLogo && (
                  <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-1">Logo</p>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImageUpload(f, "logo", setLogoPath, setUploadingLogo);
                }}
              />
            </label>

            <div className="flex-1 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nom du restaurant</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Cuisine française traditionnelle..."
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coordonnées */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Coordonnées
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Adresse</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="12 rue de la Paix" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Ville</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Paris" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Téléphone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+33 1 23 45 67 89" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@restaurant.fr" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Globe className="h-3 w-3" /> Site web</Label>
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Réseaux sociaux */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Réseaux sociaux</CardTitle>
          <CardDescription className="text-xs">Ces liens seront affichés sur votre menu en ligne</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5"><Instagram className="h-3.5 w-3.5" /> Instagram</Label>
            <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@monrestaurant" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5"><Facebook className="h-3.5 w-3.5" /> Facebook</Label>
            <Input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5"><TikTokIcon className="h-3.5 w-3.5" /> TikTok</Label>
            <Input value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="@monrestaurant" />
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sauvegarde...</> : <><Save className="h-4 w-4 mr-2" /> Sauvegarder</>}
      </Button>
    </div>
  );
}
