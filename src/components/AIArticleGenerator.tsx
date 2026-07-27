import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  Link,
  RefreshCw,
  Image,
  Loader2,
  FileText,
  Type,
  AlignLeft,
  ChevronDown,
  ChevronUp,
  Languages,
  Check,
} from "lucide-react";

type BlogForm = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image_url: string;
  category: string;
  tags: string;
  author: string;
  published: boolean;
  published_at: string;
};

type Props = {
  form: BlogForm;
  setForm: (form: BlogForm) => void;
  slugify: (text: string) => string;
  isEditing: boolean;
  currentPostId?: string | null;
};

type GenerationStep = "idle" | "extracting" | "generating" | "generating-image" | "translating" | "done";

const AIArticleGenerator = ({ form, setForm, slugify, isEditing, currentPostId }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [referenceText, setReferenceText] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [step, setStep] = useState<GenerationStep>("idle");
  const [progress, setProgress] = useState(0);
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);
  const [imageStyle, setImageStyle] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [translationResults, setTranslationResults] = useState<any[] | null>(null);
  const { toast } = useToast();

  const extractUrl = async () => {
    if (!referenceUrl.trim()) return;
    setStep("extracting");
    setProgress(20);

    try {
      const { data, error } = await supabase.functions.invoke("extract-url-content", {
        body: { url: referenceUrl },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setReferenceText(data.content || "");
      setProgress(100);
      toast({ title: "Contenido extraído", description: `Se extrajo el contenido de ${data.title || referenceUrl}` });
    } catch (e: any) {
      toast({ title: "Error al extraer", description: e.message, variant: "destructive" });
    } finally {
      setStep("idle");
      setProgress(0);
    }
  };

  const generateArticle = async () => {
    if (!referenceText.trim()) {
      toast({ title: "Texto de referencia requerido", description: "Pega un texto o extrae contenido de una URL.", variant: "destructive" });
      return;
    }

    setStep("generating");
    setProgress(30);

    try {
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 5, 85));
      }, 1500);

      const { data, error } = await supabase.functions.invoke("generate-blog-article", {
        body: { referenceText, language: "es" },
      });

      clearInterval(progressInterval);

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setProgress(95);

      const updatedForm = {
        ...form,
        title: data.title || form.title,
        slug: isEditing ? form.slug : slugify(data.title || form.title),
        excerpt: data.excerpt || form.excerpt,
        content: data.content || form.content,
        category: data.category || form.category,
        tags: data.tags?.join(", ") || form.tags,
      };
      setForm(updatedForm);

      setProgress(100);
      toast({ title: "¡Artículo generado!", description: "Generando imagen de portada…" });

      // Auto-generate cover image based on the article content
      try {
        setStep("generating-image");
        setProgress(50);
        const imgRes = await supabase.functions.invoke("generate-blog-image", {
          body: {
            title: updatedForm.title,
            excerpt: updatedForm.excerpt,
            style: imageStyle || "editorial, música, tecnología, profesional",
          },
        });
        if (!imgRes.error && !imgRes.data?.error && imgRes.data?.imageUrl) {
          setForm({ ...updatedForm, image_url: imgRes.data.imageUrl });
          toast({ title: "Imagen generada", description: "Portada creada automáticamente." });
        }
      } catch (imgErr) {
        console.warn("Auto image generation failed:", imgErr);
      }
    } catch (e: any) {
      toast({ title: "Error al generar", description: e.message, variant: "destructive" });
    } finally {
      setTimeout(() => {
        setStep("idle");
        setProgress(0);
      }, 1000);
    }
  };

  const regenerateSection = async (section: "title" | "excerpt" | "content") => {
    setRegeneratingSection(section);

    try {
      const { data, error } = await supabase.functions.invoke("generate-blog-article", {
        body: {
          referenceText,
          section,
          currentTitle: form.title,
          currentExcerpt: form.excerpt,
          currentContent: form.content,
          language: "es",
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const value = data.value || "";
      if (section === "title") {
        setForm({ ...form, title: value, slug: isEditing ? form.slug : slugify(value) });
      } else if (section === "excerpt") {
        setForm({ ...form, excerpt: value });
      } else {
        setForm({ ...form, content: value });
      }

      toast({ title: "Sección regenerada", description: `${section === "title" ? "Título" : section === "excerpt" ? "Extracto" : "Contenido"} actualizado.` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setRegeneratingSection(null);
    }
  };

  const generateImage = async () => {
    if (!form.title) {
      toast({ title: "Título requerido", description: "Primero genera o escribe un título para el artículo.", variant: "destructive" });
      return;
    }

    setGeneratingImage(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-blog-image", {
        body: { title: form.title, excerpt: form.excerpt, style: imageStyle },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setForm({ ...form, image_url: data.imageUrl });
      toast({ title: "¡Imagen generada!", description: "La imagen se ha guardado y asignado al artículo." });
    } catch (e: any) {
      toast({ title: "Error al generar imagen", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingImage(false);
    }
  };

  const translateArticle = async () => {
    if (!currentPostId) {
      toast({ title: "Guarda primero", description: "Guarda el artículo antes de traducirlo.", variant: "destructive" });
      return;
    }

    setStep("translating");
    setProgress(20);
    setTranslationResults(null);

    try {
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 3, 90));
      }, 2000);

      const { data, error } = await supabase.functions.invoke("translate-blog-posts", {
        body: { postId: currentPostId },
      });

      clearInterval(progressInterval);

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setProgress(100);
      setTranslationResults(data.results || []);

      const successCount = (data.results || []).filter((r: any) => r.success).length;
      toast({
        title: "Traducción completada",
        description: `${successCount} traducción(es) creada(s)/actualizada(s).`,
      });
    } catch (e: any) {
      toast({ title: "Error al traducir", description: e.message, variant: "destructive" });
    } finally {
      setTimeout(() => {
        setStep("idle");
        setProgress(0);
      }, 2000);
    }
  };

  const sectionLabels = {
    title: { icon: Type, label: "Título" },
    excerpt: { icon: AlignLeft, label: "Extracto" },
    content: { icon: FileText, label: "Contenido" },
  };

  const langLabels: Record<string, string> = { en: "Inglés", pt: "Portugués", es: "Español" };

  return (
    <div className="bg-gradient-to-br from-primary/10 to-info/10 border border-primary/20 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-primary-foreground/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-semibold text-primary-foreground/90">Generador IA</span>
          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Beta</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-primary-foreground/50" /> : <ChevronDown className="w-4 h-4 text-primary-foreground/50" />}
      </button>

      {isOpen && (
        <div className="p-4 pt-0 space-y-4">
          {/* Progress bar */}
          {step !== "idle" && step !== "done" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-primary-foreground/70">
                <Loader2 className="w-4 h-4 animate-spin" />
                {step === "extracting" && "Extrayendo contenido de la URL..."}
                {step === "generating" && "Generando artículo con IA..."}
                {step === "generating-image" && "Generando imagen..."}
                {step === "translating" && "Traduciendo artículo a otros idiomas..."}
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* URL extraction */}
          <div className="space-y-2">
            <Label className="text-primary-foreground/70 text-sm">URL de referencia (opcional)</Label>
            <div className="flex gap-2">
              <Input
                value={referenceUrl}
                onChange={(e) => setReferenceUrl(e.target.value)}
                placeholder="https://ejemplo.com/articulo"
                className="bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={extractUrl}
                disabled={step !== "idle" || !referenceUrl.trim()}
                className="gap-1 border-primary-foreground/20 text-black shrink-0"
              >
                {step === "extracting" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
                Extraer
              </Button>
            </div>
          </div>

          {/* Reference text */}
          <div className="space-y-2">
            <Label className="text-primary-foreground/70 text-sm">Texto de referencia</Label>
            <Textarea
              value={referenceText}
              onChange={(e) => setReferenceText(e.target.value)}
              rows={5}
              placeholder="Pega aquí el texto de referencia para generar el artículo, o extrae contenido de una URL arriba..."
              className="bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground text-sm"
            />
          </div>

          {/* Generate full article */}
          <Button
            onClick={generateArticle}
            disabled={step !== "idle" || !referenceText.trim()}
            className="w-full gap-2 bg-primary hover:bg-primary text-primary-foreground"
          >
            {step === "generating" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Generar artículo completo
          </Button>

          {/* Regenerate individual sections */}
          {(form.title || form.content) && (
            <div className="space-y-2">
              <Label className="text-primary-foreground/50 text-xs uppercase tracking-wider">Regenerar sección</Label>
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(sectionLabels) as Array<"title" | "excerpt" | "content">).map((section) => {
                  const { icon: Icon, label } = sectionLabels[section];
                  const isLoading = regeneratingSection === section;
                  return (
                    <Button
                      key={section}
                      variant="outline"
                      size="sm"
                      onClick={() => regenerateSection(section)}
                      disabled={regeneratingSection !== null || step !== "idle"}
                      className="gap-1.5 border-primary-foreground/10 text-foreground hover:text-foreground hover:border-primary/50 text-xs"
                    >
                      {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
                      <RefreshCw className="w-3 h-3" />
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Translate to other languages */}
          {(form.title || form.content) && (
            <div className="border-t border-primary-foreground/10 pt-4 space-y-2">
              <Label className="text-primary-foreground/70 text-sm flex items-center gap-2">
                <Languages className="w-4 h-4" />
                Traducir a otros idiomas
              </Label>
              <p className="text-xs text-primary-foreground/40">
                {currentPostId
                  ? "Traduce automáticamente este artículo a inglés y portugués y guárdalo como versiones adicionales."
                  : "Guarda el artículo primero para poder traducirlo."}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={translateArticle}
                disabled={step !== "idle" || !currentPostId}
                className="gap-2 border-primary-foreground/20 text-foreground hover:text-foreground hover:border-info/50"
              >
                {step === "translating" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Languages className="w-4 h-4" />
                )}
                Traducir a EN + PT
              </Button>

              {/* Translation results */}
              {translationResults && (
                <div className="flex gap-2 flex-wrap mt-2">
                  {translationResults.map((r: any) => (
                    <span
                      key={r.language}
                      className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                        r.success
                          ? "bg-success/20 text-success"
                          : "bg-red-500/20 text-red-300"
                      }`}
                    >
                      {r.success ? <Check className="w-3 h-3" /> : "✗"}
                      {langLabels[r.language] || r.language} — {r.success ? (r.action === "updated" ? "actualizado" : "creado") : r.error}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Image generation */}
          <div className="border-t border-primary-foreground/10 pt-4 space-y-2">
            <Label className="text-primary-foreground/70 text-sm flex items-center gap-2">
              <Image className="w-4 h-4" />
              Generar imagen del artículo
            </Label>
            <div className="flex gap-2">
              <Input
                value={imageStyle}
                onChange={(e) => setImageStyle(e.target.value)}
                placeholder="Estilo: moderno, abstracto, fotográfico..."
                className="bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground flex-1 text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={generateImage}
                disabled={generatingImage || !form.title}
                className="gap-1 border-primary-foreground/20 text-black shrink-0"
              >
                {generatingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                Generar
              </Button>
            </div>
            {form.image_url && (
              <img src={form.image_url} alt="Preview" loading="lazy" decoding="async" className="w-full h-32 object-cover rounded-lg mt-2" />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIArticleGenerator;
