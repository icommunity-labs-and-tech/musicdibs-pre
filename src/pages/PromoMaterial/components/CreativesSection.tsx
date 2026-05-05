import { useState } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCredits } from '@/hooks/useCredits';
import { NoCreditsAlert } from '@/components/dashboard/NoCreditsAlert';
import { FEATURE_COSTS } from '@/lib/featureCosts';
import { Loader2, Download, Sparkles, RefreshCw, ImageIcon } from 'lucide-react';
import { PricingLink } from '@/components/dashboard/PricingPopup';
import { GenerationWarning } from '@/components/ai-studio/GenerationWarning';
import { useProductTracking } from '@/hooks/useProductTracking';

type Format = 'feed' | 'story' | 'youtube';

const ASPECT_CLASS: Record<Format, string> = {
  feed: 'aspect-square',
  story: 'aspect-[9/16] max-w-xs mx-auto',
  youtube: 'aspect-video',
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const CreativesSection = () => {
  const { t } = useTranslation();
  const { hasEnough } = useCredits();
  const { track } = useProductTracking();

  const ts = (key: string, opts?: any) => t(`promoMaterial.creatives.simple.${key}`, opts) as string;

  const FORMAT_LABELS: Record<Format, string> = {
    feed: ts('formatFeedLabel'),
    story: ts('formatStoryLabel'),
    youtube: ts('formatYoutubeLabel'),
  };
  const FORMAT_LOADING: Record<Format, string> = {
    feed: ts('loadingFeed'),
    story: ts('loadingStory'),
    youtube: ts('loadingYoutube'),
  };

  const [platform, setPlatform] = useState<'instagram' | 'youtube'>('instagram');
  const [instagramFormat, setInstagramFormat] = useState<'feed' | 'story'>('feed');

  const [description, setDescription] = useState('');
  const [basePhoto, setBasePhoto] = useState<File | null>(null);
  const [basePhotoPreview, setBasePhotoPreview] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [improving, setImproving] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [resultFormat, setResultFormat] = useState<Format>('feed');

  const handleImproveDescription = async () => {
    if (!description.trim()) {
      toast.error(ts('needDescription'));
      return;
    }
    setImproving(true);
    try {
      const mode = platform === 'youtube' ? 'youtube_thumbnail' : 'instagram_creative';
      const { data, error } = await supabase.functions.invoke('improve-prompt', {
        body: { prompt: description, mode },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      if (data?.improved) {
        setDescription(data.improved.slice(0, 1000));
        toast.success(ts('improvedToast'));
      }
    } catch (err: any) {
      toast.error(err.message || ts('errorImprove'));
    } finally {
      setImproving(false);
    }
  };

  const currentFormat: Format = platform === 'youtube' ? 'youtube' : instagramFormat;
  const creditCost = FEATURE_COSTS.generate_cover ?? 1;
  const canGenerate = description.trim().length > 0 && hasEnough(creditCost);

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error(ts('addDescription'));
      return;
    }
    if (!hasEnough(creditCost)) {
      toast.error(t('dashboard.noCredits.costMessage', { action: ts('generateAction'), cost: creditCost }));
      return;
    }

    setGenerating(true);
    setGeneratedImage(null);

    try {
      let { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        sessionData = { session: refreshed.session } as any;
      }
      if (!sessionData.session) {
        toast.error(ts('sessionExpired'));
        setGenerating(false);
        return;
      }

      let photo_base64: string | null = null;
      if (basePhoto) photo_base64 = await fileToBase64(basePhoto);

      const { data, error } = await supabase.functions.invoke('generate-promo-creative', {
        body: { description, format: currentFormat, photo_base64 },
      });

      if (data?.fallback) throw new Error(data.message || ts('errorGenerate'));
      if (error || data?.error) throw new Error(data?.error || error?.message);

      setGeneratedImage(data.image_url);
      setResultFormat(currentFormat);
      const trackingFeature = currentFormat === 'youtube' ? 'youtube_thumbnail' : 'instagram_creative';
      const trackingEvent = currentFormat === 'youtube' ? 'youtube_thumbnail_generated' : 'instagram_creative_generated';
      track(trackingEvent as any, { feature: trackingFeature as any, metadata: { format: currentFormat } });
      toast.success(ts('resultGenerated', { format: FORMAT_LABELS[currentFormat] }));
    } catch (err: any) {
      toast.error(err.message || ts('errorGenerate'));
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedImage) return;
    const filename = `creative-${resultFormat}-${Date.now()}.png`;

    try {
      const res = await fetch(generatedImage);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      const a = document.createElement('a');
      a.href = generatedImage;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleReset = () => {
    setGeneratedImage(null);
  };

  const formBlock = (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          {FORMAT_LABELS[currentFormat]}
        </CardTitle>
        <CardDescription>{ts('cardDescription', { format: FORMAT_LABELS[currentFormat] })}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm">{ts('describeLabel')} <span className="text-destructive">*</span></Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleImproveDescription}
              disabled={improving || generating || !description.trim()}
              className="h-8 gap-1.5 px-3 text-xs hover:bg-accent"
            >
              {improving ? (
                <><Loader2 className="h-3 w-3 animate-spin" />{ts('improving')}</>
              ) : (
                <><Sparkles className="h-3 w-3" />{ts('improveWithAIShort')}</>
              )}
            </Button>
          </div>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
            placeholder={ts('describePlaceholder')}
            rows={4}
            maxLength={1000}
            className="resize-none text-sm"
          />
          <p className="text-[11px] text-muted-foreground text-right">{description.length}/1000</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">{ts('basePhotoLabel')}</Label>
          <p className="text-xs text-muted-foreground mb-1">{ts('basePhotoHint')}</p>
          <FileDropzone
            fileType="image"
            accept="image/jpeg,image/png,image/webp"
            maxSize={10}
            currentFile={basePhoto}
            preview={basePhotoPreview}
            onFileSelect={(file) => {
              if (file.size > 10 * 1024 * 1024) { toast.error(ts('imageTooLarge')); return; }
              setBasePhoto(file);
              setBasePhotoPreview(URL.createObjectURL(file));
            }}
            onRemove={() => {
              setBasePhoto(null);
              if (basePhotoPreview) URL.revokeObjectURL(basePhotoPreview);
              setBasePhotoPreview(null);
            }}
          />
        </div>

        {!hasEnough(creditCost) ? (
          <NoCreditsAlert cost={creditCost} actionLabel={ts('generateAction')} />
        ) : (
          <Button className="w-full gap-2" size="lg" onClick={handleGenerate} disabled={generating || !canGenerate}>
            {generating ? (
              <><Loader2 className="h-4 w-4 animate-spin" />{FORMAT_LOADING[currentFormat]}</>
            ) : (
              <><Sparkles className="h-4 w-4" />{ts('generateBtn')}</>
            )}
          </Button>
        )}
        <PricingLink className="block text-center mt-1" />
        <GenerationWarning />
      </CardContent>
    </Card>
  );

  const resultBlock = (
    <div className="space-y-4">
      {generating ? (
        <Card className="border-border/40">
          <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium">{FORMAT_LOADING[currentFormat]}</p>
              <p className="text-sm text-muted-foreground">{ts('waitHint')}</p>
            </div>
          </CardContent>
        </Card>
      ) : generatedImage ? (
        <div className="space-y-3">
          <div className={`relative rounded-2xl overflow-hidden border border-border/40 shadow-lg ${ASPECT_CLASS[resultFormat]}`}>
            <img src={generatedImage} alt={FORMAT_LABELS[resultFormat]} className="w-full h-full object-cover" />
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="bg-muted px-2 py-1 rounded">{FORMAT_LABELS[resultFormat]}</span>
            <span className="bg-muted px-2 py-1 rounded">
              {resultFormat === 'feed' ? '1:1' : resultFormat === 'story' ? '9:16' : '16:9'}
            </span>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1 gap-2" onClick={handleDownload}>
              <Download className="h-4 w-4" />{ts('download')}
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleReset}>
              <RefreshCw className="h-4 w-4" />{ts('generateAnother')}
            </Button>
          </div>
        </div>
      ) : (
        <Card className="border-dashed border-border/40">
          <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium text-muted-foreground">{ts('placeholderTitle')}</p>
              <p className="text-sm text-muted-foreground">{ts('placeholderSubtitle')}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{t('promoMaterial.creatives.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('promoMaterial.creatives.subtitle')}</p>
      </div>

      <Tabs value={platform} onValueChange={(v) => { setPlatform(v as typeof platform); setGeneratedImage(null); }}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="instagram" className="gap-1.5 text-xs sm:text-sm">{ts('tabInstagram')}</TabsTrigger>
          <TabsTrigger value="youtube" className="gap-1.5 text-xs sm:text-sm">{ts('tabYoutube')}</TabsTrigger>
        </TabsList>

        <TabsContent value="instagram" className="mt-6 space-y-4">
          <Tabs value={instagramFormat} onValueChange={(v) => { setInstagramFormat(v as typeof instagramFormat); setGeneratedImage(null); }}>
            <TabsList className="grid w-full grid-cols-2 max-w-sm">
              <TabsTrigger value="feed" className="gap-1.5 text-xs sm:text-sm">
                {ts('tabFeed')} <Badge variant="outline" className="ml-1 text-[10px]">1:1</Badge>
              </TabsTrigger>
              <TabsTrigger value="story" className="gap-1.5 text-xs sm:text-sm">
                {ts('tabStory')} <Badge variant="outline" className="ml-1 text-[10px]">9:16</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={instagramFormat} className="mt-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {formBlock}
                {resultBlock}
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="youtube" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {formBlock}
            {resultBlock}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
