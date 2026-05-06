import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AIArticleGenerator from "@/components/AIArticleGenerator";
import RichTextEditor from "@/components/admin/RichTextEditor";
import {
  Plus,
  Pencil,
  Trash2,
  LogOut,
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Newspaper,
  Search,
  BarChart3,
  CalendarDays,
  Sparkles,
  Loader2,
} from "lucide-react";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  image_url: string | null;
  category: string | null;
  tags: string[] | null;
  author: string | null;
  published: boolean | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  language?: string | null;
  ai_generated?: boolean | null;
  scheduled?: boolean | null;
};

type ContentIdea = {
  id: string;
  title: string;
  topic: string;
  category: string;
  language: string;
  suggested_publish_date: string;
  editing?: boolean;
};

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

const emptyPost: BlogForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  image_url: "",
  category: "Musicdibs",
  tags: "",
  author: "Musicdibs",
  published: false,
  published_at: "",
};

const AdminBlog = () => {
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<BlogForm>(emptyPost);
  const [filter, setFilter] = useState<"all" | "published" | "scheduled" | "draft">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeView, setActiveView] = useState<"articles" | "planning">("articles");
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [postsPerWeek, setPostsPerWeek] = useState("2");
  const [monthsToPlan, setMonthsToPlan] = useState("3");
  const [languages, setLanguages] = useState<string[]>(["es", "en", "pt"]);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [generatingIdeas, setGeneratingIdeas] = useState(false);
  const [generatingContent, setGeneratingContent] = useState(false);
  const [contentProgress, setContentProgress] = useState({ done: 0, total: 0 });
  const [generationErrors, setGenerationErrors] = useState<string[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const initialFormRef = useRef<string>(JSON.stringify(emptyPost));
  const isDirty = JSON.stringify(form) !== initialFormRef.current;

  // Warn on browser tab close / refresh
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const confirmDiscard = () => !isDirty || window.confirm('Tienes cambios sin guardar. ¿Descartarlos y salir?');

  const closeForm = () => {
    if (!confirmDiscard()) return;
    setEditing(null);
    setCreating(false);
    setForm(emptyPost);
    initialFormRef.current = JSON.stringify(emptyPost);
  };

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/admin");
        return;
      }
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleData) navigate("/admin");
    };
    check();
  }, [navigate]);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("published_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as BlogPost[];
    },
  });

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

  const getPostStatus = (post: BlogPost): "published" | "scheduled" | "draft" => {
    if (post.published) return "published";
    if (post.published_at || post.scheduled) return "scheduled";
    return "draft";
  };

  const filteredPosts = posts?.filter((p) => {
    const matchesFilter = filter === "all" || getPostStatus(p) === filter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      p.title.toLowerCase().includes(q) ||
      (p.excerpt?.toLowerCase().includes(q)) ||
      (p.category?.toLowerCase().includes(q)) ||
      (p.tags?.some((tag) => tag.toLowerCase().includes(q)));
    return matchesFilter && matchesSearch;
  });

  const plannedPosts = posts
    ?.filter((post) => !post.published)
    .sort((a, b) => new Date(a.published_at || a.created_at).getTime() - new Date(b.published_at || b.created_at).getTime());

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        slug: form.slug || slugify(form.title),
        excerpt: form.excerpt || null,
        content: form.content || null,
        image_url: form.image_url || null,
        category: form.category || null,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        author: form.author || "Musicdibs",
        published: form.published,
        published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
        scheduled: !form.published && Boolean(form.published_at),
        updated_at: new Date().toISOString(),
      };

      if (editing) {
        const { error } = await supabase.from("blog_posts").update(payload).eq("id", editing);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_posts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Guardado", description: "Post guardado correctamente." });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      initialFormRef.current = JSON.stringify(form);
      setEditing(null);
      setCreating(false);
      setForm(emptyPost);
      initialFormRef.current = JSON.stringify(emptyPost);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Eliminado", description: "Post eliminado." });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    },
  });

  const publishNowMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("blog_posts")
        .update({ published: true, scheduled: false, published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Publicado", description: "El artículo se ha publicado ahora." });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    },
  });

  const startEdit = (post: BlogPost) => {
    if (!confirmDiscard()) return;
    setCreating(false);
    setEditing(post.id);
    const next: BlogForm = {
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || "",
      content: post.content || "",
      image_url: post.image_url || "",
      category: post.category || "Musicdibs",
      tags: post.tags?.join(", ") || "",
      author: post.author || "Musicdibs",
      published: post.published || false,
      published_at: post.published_at?.slice(0, 10) || "",
    };
    setForm(next);
    initialFormRef.current = JSON.stringify(next);
  };

  const startCreate = () => {
    if (!confirmDiscard()) return;
    setEditing(null);
    setCreating(true);
    setForm(emptyPost);
    initialFormRef.current = JSON.stringify(emptyPost);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin");
  };

  const updateIdea = (id: string, patch: Partial<ContentIdea>) => {
    setIdeas((current) => current.map((idea) => (idea.id === id ? { ...idea, ...patch } : idea)));
  };

  const plannedPublicationCount = Number(postsPerWeek) * Number(monthsToPlan) * 4;
  const plannedArticleCount = plannedPublicationCount * languages.length;

  const generateIdeas = async () => {
    if (!languages.length) {
      toast({ title: "Selecciona un idioma", description: "Elige al menos un idioma para generar ideas.", variant: "destructive" });
      return;
    }
    setGeneratingIdeas(true);
    setGenerationErrors([]);
    try {
      const { data, error } = await supabase.functions.invoke("generate-blog-article", {
        body: { action: "generate_ideas", count: plannedPublicationCount, languages: ["es"] },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const generatedIdeas = (data?.ideas || []).map((idea: Omit<ContentIdea, "id">, index: number) => ({
        ...idea,
        id: `${Date.now()}-${index}`,
      }));
      setIdeas(generatedIdeas);
      toast({ title: "Ideas generadas", description: `${generatedIdeas.length} publicaciones base listas para revisar.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron generar ideas.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setGeneratingIdeas(false);
    }
  };

  const generateAllContent = async () => {
    setGeneratingContent(true);
    setGenerationErrors([]);
    setContentProgress({ done: 0, total: ideas.length });
    const errors: string[] = [];

    for (const [index, idea] of ideas.entries()) {
      try {
        const articleResponse = await supabase.functions.invoke("generate-blog-article", {
          body: { action: "generate_full", title: idea.title, topic: idea.topic, category: idea.category, language: idea.language },
        });
        if (articleResponse.error) throw articleResponse.error;
        if (articleResponse.data?.error) throw new Error(articleResponse.data.error);
        const article = articleResponse.data;

        let imageUrl: string | null = null;
        try {
          const imageResponse = await supabase.functions.invoke("generate-blog-image", {
            body: { title: article.title, excerpt: article.excerpt, style: "editorial, música, tecnología, profesional" },
          });
          if (!imageResponse.error && !imageResponse.data?.error) imageUrl = imageResponse.data?.imageUrl || null;
        } catch (imageError) {
          errors.push(`${idea.title}: imagen no generada (${imageError instanceof Error ? imageError.message : "error"})`);
        }

        const { data: inserted, error: insertError } = await supabase
          .from("blog_posts")
          .insert({
            title: article.title,
            slug: `${article.slug || slugify(article.title)}-${idea.language}`,
            excerpt: article.excerpt || null,
            content: article.content || null,
            image_url: imageUrl,
            category: article.category || idea.category,
            tags: Array.isArray(article.tags) ? article.tags : [],
            author: "Musicdibs",
            published: false,
            published_at: new Date(idea.suggested_publish_date).toISOString(),
            language: idea.language,
            ai_generated: true,
            scheduled: true,
          })
          .select("id")
          .single();
        if (insertError) throw insertError;

        if (idea.language === "es" && inserted?.id) {
          try {
            await supabase.functions.invoke("translate-blog-posts", { body: { postId: inserted.id, sourceLanguage: "es", targetLanguages: ["en", "pt"] } });
          } catch (translationError) {
            errors.push(`${idea.title}: traducciones no completadas (${translationError instanceof Error ? translationError.message : "error"})`);
          }
        }
      } catch (error) {
        errors.push(`${idea.title}: ${error instanceof Error ? error.message : "error desconocido"}`);
      } finally {
        setContentProgress({ done: index + 1, total: ideas.length });
      }
    }

    setGenerationErrors(errors);
    setGeneratingContent(false);
    queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    toast({
      title: errors.length ? "Generación completada con avisos" : "Contenido generado",
      description: errors.length ? `${errors.length} elemento(s) requieren revisión.` : "Todos los artículos se han guardado como borradores planificados.",
    });
  };

  const showForm = editing || creating;

  return (
    <div className="min-h-screen page-bg">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Newspaper className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">Blog CMS</h1>
            <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded">{posts?.length || 0} posts</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={() => setPlannerOpen(true)} className="gap-1 text-black border-white/20">
              <Sparkles className="w-4 h-4" /> 🤖 Generar plan de contenido
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/ab-tests")} className="gap-1 text-black border-white/20">
              <BarChart3 className="w-4 h-4" /> A/B Tests
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/news")} className="gap-1 text-black border-white/20">
              <Eye className="w-4 h-4" /> Ver blog
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1 text-white/50">
              <LogOut className="w-4 h-4" /> Salir
            </Button>
          </div>
        </div>
      </header>

      {plannerOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm px-4 py-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto bg-card border border-border rounded-lg p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Planificación de contenido IA</h2>
                <p className="text-sm text-muted-foreground">Configura, revisa y genera borradores planificados.</p>
              </div>
              <Button variant="ghost" onClick={() => setPlannerOpen(false)}>Cerrar</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 rounded-lg border border-border bg-muted/30 p-4">
              <div>
                <Label className="text-foreground">Publicaciones por semana</Label>
                <select value={postsPerWeek} onChange={(event) => setPostsPerWeek(event.target.value)} className="w-full h-10 rounded-md border border-input bg-card px-3 text-sm text-black">
                  {[1, 2, 3, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-foreground">Meses a planificar</Label>
                <select value={monthsToPlan} onChange={(event) => setMonthsToPlan(event.target.value)} className="w-full h-10 rounded-md border border-input bg-card px-3 text-sm text-black">
                  {[1, 2, 3, 6].map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-foreground">Idiomas</Label>
                <div className="flex gap-4 pt-2">
                  {[{ code: "es", label: "ES" }, { code: "en", label: "EN" }, { code: "pt", label: "PT" }].map((lang) => (
                    <label key={lang.code} className="flex items-center gap-2 text-sm text-black">
                      <input
                        type="checkbox"
                        checked={languages.includes(lang.code)}
                        onChange={(event) => setLanguages((current) => event.target.checked ? [...current, lang.code] : current.filter((item) => item !== lang.code))}
                      />
                      {lang.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={generateIdeas} disabled={generatingIdeas || generatingContent} className="gap-2">
                {generatingIdeas && <Loader2 className="w-4 h-4 animate-spin" />}
                Generar ideas
              </Button>
              <Button onClick={generateAllContent} disabled={!ideas.length || generatingContent || generatingIdeas} className="gap-2">
                {generatingContent && <Loader2 className="w-4 h-4 animate-spin" />}
                ✨ Generar todo el contenido
              </Button>
              {generatingContent && <span className="text-sm text-muted-foreground">{contentProgress.done} de {contentProgress.total} artículos generados</span>}
              <span className="text-sm text-muted-foreground">
                {plannedPublicationCount} publicaciones base · {plannedArticleCount} artículos finales en {languages.length} idioma(s)
              </span>
            </div>
            {generatingContent && <Progress value={(contentProgress.done / Math.max(contentProgress.total, 1)) * 100} />}

            {ideas.length > 0 && (
              <div className="overflow-x-auto border border-border rounded-lg bg-card text-black shadow-sm">
                <table className="w-full text-sm text-black">
                  <thead className="bg-muted/50 text-black">
                    <tr>
                      <th className="p-3 text-left">Título</th>
                      <th className="p-3 text-left">Categoría</th>
                      <th className="p-3 text-left">Idioma</th>
                      <th className="p-3 text-left">Fecha sugerida</th>
                      <th className="p-3 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ideas.map((idea) => (
                      <tr key={idea.id} className="border-t border-border">
                        <td className="p-3 min-w-72">
                           {idea.editing ? <Input value={idea.title} onChange={(event) => updateIdea(idea.id, { title: event.target.value })} className="text-black" /> : idea.title}
                        </td>
                        <td className="p-3">{idea.category}</td>
                        <td className="p-3 uppercase">{idea.language}</td>
                        <td className="p-3">
                          {idea.editing ? (
                             <Input type="date" value={idea.suggested_publish_date.slice(0, 10)} onChange={(event) => updateIdea(idea.id, { suggested_publish_date: new Date(event.target.value).toISOString() })} className="text-black" />
                          ) : new Date(idea.suggested_publish_date).toLocaleDateString("es-ES")}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => updateIdea(idea.id, { editing: !idea.editing })}>{idea.editing ? "Listo" : "Editar"}</Button>
                            <Button size="sm" variant="ghost" onClick={() => setIdeas((current) => current.filter((item) => item.id !== idea.id))}>Eliminar</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {generationErrors.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                <p className="font-medium mb-2">Errores al finalizar:</p>
                <ul className="list-disc pl-5 space-y-1">{generationErrors.map((error) => <li key={error}>{error}</li>)}</ul>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-8">
        {showForm ? (
          <div className="max-w-3xl mx-auto">
            <button onClick={closeForm} className="flex items-center gap-2 text-white/50 hover:text-white text-sm mb-6">
              <ArrowLeft className="w-4 h-4" /> Volver a la lista
            </button>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-5">
              <h2 className="text-lg font-semibold">{editing ? "Editar artículo" : "Nuevo artículo"}</h2>
              <AIArticleGenerator form={form} setForm={setForm} slugify={slugify} isEditing={!!editing} currentPostId={editing} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/70">Título *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: editing ? form.slug : slugify(e.target.value) })} className="bg-white/5 border-white/10 text-white" />
                </div>
                <div>
                  <Label className="text-white/70">Slug</Label>
                  <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="bg-white/5 border-white/10 text-white" />
                </div>
              </div>

              <div>
                <Label className="text-white/70">Extracto</Label>
                <Textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} rows={3} className="bg-white/5 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-white/70">Contenido</Label>
                <RichTextEditor
                  value={form.content}
                  onChange={(html) => setForm({ ...form, content: html })}
                  placeholder="Escribe el artículo: añade encabezados, listas, enlaces, imágenes…"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/70">URL de imagen</Label>
                  <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="bg-white/5 border-white/10 text-white" placeholder="https://..." />
                </div>
                <div>
                  <Label className="text-white/70">Categoría</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bg-white/5 border-white/10 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/70">Tags (separados por coma)</Label>
                  <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="bg-white/5 border-white/10 text-white" placeholder="Musicdibs, Blockchain" />
                </div>
                <div>
                  <Label className="text-white/70">Autor</Label>
                  <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="bg-white/5 border-white/10 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/70">Fecha de publicación</Label>
                  <Input type="date" value={form.published_at} onChange={(e) => setForm({ ...form, published_at: e.target.value })} className="bg-white/5 border-white/10 text-white" />
                </div>
                <div className="flex flex-col gap-2 pt-6">
                  <div className="flex items-center gap-3">
                    <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
                    <Label className="text-white/70">{form.published ? "Publicado" : form.published_at ? "⏰ Planificado" : "Borrador"}</Label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.title} className="gap-2">
                  <Save className="w-4 h-4" /> {saveMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
                <Button variant="ghost" onClick={closeForm}>Cancelar</Button>
                {isDirty && <span className="text-xs text-amber-400 self-center">● Cambios sin guardar</span>}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-2">
                  <Button variant={activeView === "articles" ? "default" : "outline"} onClick={() => setActiveView("articles")}>Artículos</Button>
                  <Button
                    variant={activeView === "planning" ? "default" : "outline"}
                    onClick={() => setActiveView("planning")}
                    className={`gap-2 ${activeView === "planning" ? "" : "border-primary bg-primary text-primary-foreground hover:bg-primary/90"}`}
                  >
                    <CalendarDays className="w-4 h-4" /> 📅 Planificación
                  </Button>
                </div>
                <Button onClick={startCreate} className="gap-2"><Plus className="w-4 h-4" /> Nuevo artículo</Button>
              </div>

              {activeView === "articles" && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar por título, categoría o tags..." className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  </div>
                  <div className="flex gap-2 overflow-x-auto">
                    {([{ key: "all", label: "Todos" }, { key: "published", label: "Publicados" }, { key: "scheduled", label: "⏰ Programados" }, { key: "draft", label: "Borradores" }] as const).map((f) => (
                      <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${filter === f.key ? "bg-primary text-primary-foreground" : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"}`}>
                        {f.label}{f.key === "all" ? ` (${posts?.length || 0})` : ` (${posts?.filter((p) => getPostStatus(p) === f.key).length || 0})`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="text-center py-20 text-white/40">Cargando...</div>
            ) : activeView === "planning" ? (
              plannedPosts && plannedPosts.length > 0 ? (
                <div className="overflow-x-auto border border-white/10 rounded-lg bg-white/5">
                  <table className="w-full text-sm">
                    <thead className="text-white/50 border-b border-white/10">
                      <tr>
                        <th className="p-3 text-left">Título</th>
                        <th className="p-3 text-left">Idioma</th>
                        <th className="p-3 text-left">Categoría</th>
                        <th className="p-3 text-left">Fecha publicación</th>
                        <th className="p-3 text-left">Estado</th>
                        <th className="p-3 text-left">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plannedPosts.map((post) => (
                        <tr key={post.id} className="border-b border-white/10 last:border-0">
                          <td className="p-3 text-white/90 min-w-72">{post.title}</td>
                          <td className="p-3 text-white/60 uppercase">{post.language || "es"}</td>
                          <td className="p-3 text-white/60">{post.category}</td>
                          <td className="p-3 text-white/60">{post.published_at ? new Date(post.published_at).toLocaleDateString("es-ES") : "Sin fecha"}</td>
                          <td className="p-3"><span className="text-xs rounded bg-primary/20 text-primary px-2 py-1">{post.published_at ? "planificado" : "borrador"}</span></td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => startEdit(post)} className="h-8 w-8 text-white/50 hover:text-white"><Pencil className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => publishNowMutation.mutate(post.id)} className="text-white/50 hover:text-white">Publicar ahora</Button>
                              <Button variant="ghost" size="icon" onClick={() => confirm("¿Eliminar este artículo?") && deleteMutation.mutate(post.id)} className="h-8 w-8 text-white/50 hover:text-red-400"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div className="text-center py-20 text-white/40">No hay artículos planificados.</div>
            ) : filteredPosts && filteredPosts.length > 0 ? (
              <div className="space-y-2">
                {filteredPosts.map((post) => (
                  <div key={post.id} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-lg px-4 py-3 hover:bg-white/[0.07] transition-colors">
                    {post.image_url && <img src={post.image_url} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-white/90 truncate">{post.title}</h3>
                        {post.published ? <Eye className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> : <EyeOff className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        <span>{post.category}</span><span>·</span><span className="uppercase">{post.language || "es"}</span>
                        {post.published_at && <><span>·</span><span>{new Date(post.published_at).toLocaleDateString("es-ES")}</span></>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(post)} className="h-8 w-8 text-white/50 hover:text-white"><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => confirm("¿Eliminar este artículo?") && deleteMutation.mutate(post.id)} className="h-8 w-8 text-white/50 hover:text-red-400"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-white/40 mb-4">No hay artículos aún.</p>
                <Button onClick={startCreate} className="gap-2"><Plus className="w-4 h-4" /> Crear el primero</Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminBlog;
