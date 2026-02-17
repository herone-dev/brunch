import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import type { Restaurant } from "@/lib/types";

const QRCodePage = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  useEffect(() => {
    if (restaurantId) {
      supabase.from('restaurants').select('*').eq('id', restaurantId).single()
        .then(({ data }) => setRestaurant(data));
    }
  }, [restaurantId]);

  const menuUrl = `${window.location.origin}/m/${restaurant?.slug || ''}`;

  const handleDownload = () => {
    const svg = document.getElementById('qr-code-svg');
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
      link.download = `brunch-qr-${restaurant?.slug}.png`;
      link.href = pngUrl;
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
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

      <main className="max-w-md mx-auto px-6 py-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Votre QR Code</CardTitle>
            <p className="text-sm text-muted-foreground">Imprimez-le et placez-le sur vos tables</p>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="p-6 bg-card rounded-xl border border-border">
              <QRCodeSVG
                id="qr-code-svg"
                value={menuUrl}
                size={256}
                level="H"
                includeMargin
                fgColor="hsl(16, 65%, 55%)"
              />
            </div>
            <p className="text-sm text-muted-foreground text-center break-all">{menuUrl}</p>
            <div className="flex gap-2 w-full">
              <Button className="flex-1" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" /> Télécharger PNG
              </Button>
              <Button variant="outline" asChild>
                <a href={menuUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default QRCodePage;
