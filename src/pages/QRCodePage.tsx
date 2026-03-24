import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, ExternalLink, Plus, Minus, Palette } from "lucide-react";
import type { Restaurant } from "@/lib/types";

const PRESET_COLORS = [
  "#D97A50", // brand terracotta
  "#1a1a2e",
  "#2d6a4f",
  "#e63946",
  "#264653",
  "#6d28d9",
  "#000000",
];

const QRCodePage = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [fgColor, setFgColor] = useState("#D97A50");
  const [tableNumber, setTableNumber] = useState("");
  const [tableCount, setTableCount] = useState(1);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (restaurantId) {
      supabase.from('restaurants').select('*').eq('id', restaurantId).single()
        .then(({ data }) => {
          setRestaurant(data);
          if (data?.logo_path) {
            const { data: urlData } = supabase.storage.from('menu-media').getPublicUrl(data.logo_path);
            setLogoUrl(urlData.publicUrl);
          }
        });
    }
  }, [restaurantId]);

  const getMenuUrl = useCallback((table?: string) => {
    const base = `${window.location.origin}/m/${restaurant?.slug || ''}`;
    return table ? `${base}?table=${table}` : base;
  }, [restaurant?.slug]);

  const handleDownload = (svgId: string, filename: string) => {
    const svg = document.getElementById(svgId);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      canvas.width = 1024;
      canvas.height = 1024;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1024, 1024);
      ctx.drawImage(img, 0, 0, 1024, 1024);
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = filename;
      link.href = pngUrl;
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleDownloadAll = () => {
    for (let i = 1; i <= tableCount; i++) {
      setTimeout(() => {
        handleDownload(`qr-table-${i}`, `qr-${restaurant?.slug}-table-${i}.png`);
      }, i * 300);
    }
  };

  if (!restaurant) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/app"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-lg font-bold">QR Code — {restaurant.name}</h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Color + Logo config */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4" /> Personnalisation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Couleur du QR</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setFgColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${fgColor === c ? 'border-primary scale-110 ring-2 ring-primary/30' : 'border-border'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <div className="flex items-center gap-1.5 ml-2">
                  <Label className="text-[10px] text-muted-foreground">Custom</Label>
                  <input
                    type="color"
                    value={fgColor}
                    onChange={e => setFgColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-border"
                  />
                </div>
              </div>
            </div>
            {logoUrl && (
              <div className="flex items-center gap-3">
                <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-contain border border-border" />
                <span className="text-xs text-muted-foreground">Logo intégré au centre du QR</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="single">
          <TabsList className="w-full">
            <TabsTrigger value="single" className="flex-1">QR unique</TabsTrigger>
            <TabsTrigger value="tables" className="flex-1">Par table</TabsTrigger>
          </TabsList>

          {/* Single QR */}
          <TabsContent value="single" className="mt-4">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-base">QR Code principal</CardTitle>
                <p className="text-xs text-muted-foreground">Pointe vers votre menu digital</p>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <QRPreview
                  id="qr-main"
                  url={getMenuUrl()}
                  fgColor={fgColor}
                  logoUrl={logoUrl}
                />
                <p className="text-xs text-muted-foreground text-center break-all">{getMenuUrl()}</p>
                <div className="flex gap-2 w-full">
                  <Button className="flex-1" onClick={() => handleDownload('qr-main', `qr-${restaurant.slug}.png`)}>
                    <Download className="h-4 w-4 mr-2" /> Télécharger PNG
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={getMenuUrl()} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Table QRs */}
          <TabsContent value="tables" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">QR par numéro de table</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Chaque QR inclut <code className="bg-muted px-1 rounded">?table=N</code> — vous saurez d'où vient chaque scan
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Label className="text-xs whitespace-nowrap">Nombre de tables</Label>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setTableCount(Math.max(1, tableCount - 1))}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={tableCount}
                      onChange={e => setTableCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                      className="w-16 h-8 text-center text-xs"
                    />
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setTableCount(Math.min(100, tableCount + 1))}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <Button onClick={handleDownloadAll} className="w-full">
                  <Download className="h-4 w-4 mr-2" /> Télécharger tous les QR ({tableCount} tables)
                </Button>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Array.from({ length: tableCount }, (_, i) => i + 1).map(num => (
                <Card key={num} className="p-3">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Table {num}</span>
                    <QRPreview
                      id={`qr-table-${num}`}
                      url={getMenuUrl(String(num))}
                      fgColor={fgColor}
                      logoUrl={logoUrl}
                      size={120}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[10px]"
                      onClick={() => handleDownload(`qr-table-${num}`, `qr-${restaurant.slug}-table-${num}.png`)}
                    >
                      <Download className="h-3 w-3 mr-1" /> PNG
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

function QRPreview({ id, url, fgColor, logoUrl, size = 256 }: {
  id: string; url: string; fgColor: string; logoUrl: string | null; size?: number;
}) {
  return (
    <div className="p-4 bg-card rounded-xl border border-border">
      <QRCodeSVG
        id={id}
        value={url}
        size={size}
        level="H"
        includeMargin
        fgColor={fgColor}
        imageSettings={logoUrl ? {
          src: logoUrl,
          height: Math.round(size * 0.2),
          width: Math.round(size * 0.2),
          excavate: true,
        } : undefined}
      />
    </div>
  );
}

export default QRCodePage;
