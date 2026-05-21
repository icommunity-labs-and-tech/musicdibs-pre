import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Download, Music, Mic, Loader2, Search,
  CheckSquare, Square, Package, Play, Pause, Trash2, X,
  Film, ImageIcon, FolderOpen, Lock, Pencil, Check,
  FileMusic2, FileAudio,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLibraryAccess, registerFreeDownload } from "@/hooks/useLibraryAccess";
import LibraryAccessBanner from "@/components/library/LibraryAccessBanner";
import { useTranslation } from "react-i18next";
import JSZip from "jszip";

// ── Types ──
interface MediaAsset {
  id: string;
  type: "song" | "video" | "cover" | "vocal";
  title: string;
  /** May be null until lazily resolved (see resolveAssetUrl) */
  url: string | null;
  createdAt: string;
  meta?: Record<string, string>;
  /** Source info for delete mapping + lazy URL resolution */
  source: "ai_generations" | "video_generations" | "social_promotions" | "voice_clones" | "storage";
  /** KIE task ID — present for KIE/Suno-generated tracks. Needed for MIDI export. */
  provider_task_id?: string | null;
}

// ── Per-asset export job state ──
type ExportJobState = "idle" | "loading" | "done" | "error";

// Per-source row cap for the initial listing — keeps payload small & fast.
const PAGE_LIMIT = 100;

type TabType = "all" | "song" | "video" | "cover" | "vocal";

const TAB_CONFIG: { value: TabType; labelKey: string; fallback: string; icon: React.ElementType }[] = [
  { value: "all", labelKey: "dashboard.mediaLibrary.tabs.all", fallback: "Todo", icon: FolderOpen },
  { value: "song", labelKey: "dashboard.mediaLibrary.tabs.song", fallback: "Canciones", icon: Music },
  { value: "video", labelKey: "dashboard.mediaLibrary.tabs.video", fallback: "Vídeos", icon: Film },
  { value: "cover", labelKey: "dashboard.mediaLibrary.tabs.cover", fallback: "Portadas", icon: ImageIcon },
  { value: "vocal", labelKey: "dashboard.mediaLibrary.tabs.vocal", fallback: "Voces", icon: Mic },
];

export default function MediaLibraryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const libraryAccess = useLibraryAccess();
  const { t, i18n } = useTranslation();
  const tr = (key: string, fallback: string, options?: Record<string, unknown>) => String(t(key, { defaultValue: fallback, ...options }));
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabType>("all");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [midiJobs, setMidiJobs] = useState<Record<string, ExportJobState>>({});
  const [wavJobs, setWavJobs] = useState<Record<string, ExportJobState>>({});
  const exportPollsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const [customNames, setCustomNames] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem("media_library_names") || "{}");
    } catch { return {}; }
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const editInputRef = useRef<HTMLInputElement | null>(null);

  // ── Cache key ──
  const cacheKey = user ? `media_library_cache_${user.id}_${i18n.resolvedLanguage || i18n.language}` : '';

  // ── Fetch all assets (parallel + cached) ──
  useEffect(() => {
    if (!user) return;

    // Try to load from sessionStorage cache first for instant display
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { assets: cachedAssets, ts } = JSON.parse(cached);
        // Use cache if less than 2 minutes old
        if (Date.now() - ts < 120_000) {
          setAssets(cachedAssets);
          setLoading(false);
          // Still refresh in background
          loadAssets(user.id, false);
          return;
        }
      }
    } catch { /* ignore */ }

    loadAssets(user.id, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, cacheKey]);

  const loadAssets = async (userId: string, showSpinner: boolean) => {
    if (showSpinner) setLoading(true);

    // Lightweight queries: NO heavy URL columns (audio_url, video_url, merged_url, sample_url).
    // URLs are resolved on demand (play / download / open) via resolveAssetUrl().
    const [songsRes, videosRes, promosRes, coverFilesRes, clonesRes] = await Promise.all([
      supabase
        .from("ai_generations")
        .select("id, prompt, genre, mood, created_at, provider_task_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(PAGE_LIMIT),
      supabase
        .from("video_generations" as any)
        .select("id, prompt, status, created_at, style")
        .eq("user_id", userId)
        .eq("status", "COMPLETED")
        .order("created_at", { ascending: false })
        .limit(PAGE_LIMIT),
      supabase
        .from("social_promotions" as any)
        .select("id, image_url, created_at, work_id")
        .eq("user_id", userId)
        .not("image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(PAGE_LIMIT),
      supabase.storage
        .from("social-promo-images")
        .list(`covers/${userId}`, { limit: PAGE_LIMIT, sortBy: { column: "created_at", order: "desc" } }),
      supabase
        .from("voice_clones" as any)
        .select("id, name, created_at, status")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(PAGE_LIMIT),
    ]);

    const allAssets: MediaAsset[] = [];

    // Songs (URL lazily resolved)
    if (songsRes.data) {
      for (const s of songsRes.data as any[]) {
        allAssets.push({
          id: s.id, type: "song",
          title: s.prompt?.substring(0, 80) || tr("dashboard.mediaLibrary.untitledSong", "Canción sin título"),
          url: null, createdAt: s.created_at,
          meta: { genre: s.genre || "", mood: s.mood || "" },
          source: "ai_generations",
          provider_task_id: s.provider_task_id || null,
        });
      }
    }

    // Videos (URL lazily resolved)
    if (videosRes.data) {
      for (const v of videosRes.data as any[]) {
        allAssets.push({
          id: v.id, type: "video",
          title: v.prompt?.substring(0, 80) || tr("dashboard.mediaLibrary.untitledVideo", "Vídeo sin título"),
          url: null, createdAt: v.created_at,
          meta: { style: v.style || "" },
          source: "video_generations",
        });
      }
    }

    // Covers from social_promotions (image_url is small, keep it)
    const promoUrls = new Set<string>();
    if (promosRes.data) {
      for (const p of promosRes.data as any[]) {
        if (p.image_url) promoUrls.add(p.image_url);
        allAssets.push({
          id: p.id, type: "cover",
          title: tr("dashboard.mediaLibrary.promoCover", "Portada promocional"),
          url: p.image_url, createdAt: p.created_at,
          source: "social_promotions",
        });
      }
    }

    // Covers from storage (signed URLs — bucket is private)
    if (coverFilesRes.data && coverFilesRes.data.length > 0) {
      const validFiles = coverFilesRes.data.filter(
        (f) => f.name.endsWith(".png") || f.name.endsWith(".jpg")
      );
      const paths = validFiles.map((f) => `covers/${userId}/${f.name}`);
      const { data: signed } = await supabase.storage
        .from("social-promo-images")
        .createSignedUrls(paths, 60 * 60); // 1h
      const signedByPath = new Map<string, string>();
      signed?.forEach((s) => {
        if (s.signedUrl && s.path) signedByPath.set(s.path, s.signedUrl);
      });
      for (const f of validFiles) {
        const path = `covers/${userId}/${f.name}`;
        const url = signedByPath.get(path);
        if (!url) continue;
        allAssets.push({
          id: `cover-file-${f.id || f.name}`, type: "cover",
           title: tr("dashboard.mediaLibrary.aiCover", "Portada IA"),
          url, createdAt: f.created_at || new Date().toISOString(),
          source: "storage",
        });
      }
    }

    // Voice clones (URL lazily resolved)
    if (clonesRes.data) {
      for (const c of clonesRes.data as any[]) {
        allAssets.push({
          id: c.id, type: "vocal",
          title: c.name || tr("dashboard.mediaLibrary.clonedVoice", "Voz clonada"),
          url: null,
          createdAt: c.created_at,
          source: "voice_clones",
        });
      }
    }

    setAssets(allAssets);
    setLoading(false);

    // Cache in sessionStorage
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({ assets: allAssets, ts: Date.now() }));
    } catch { /* quota exceeded - ignore */ }
  };

  // ── Lazy URL resolver (only fetched when user plays / downloads / opens) ──
  const urlCache = useRef<Map<string, string>>(new Map());
  const resolveAssetUrl = async (asset: MediaAsset): Promise<string | null> => {
    if (asset.url) return asset.url;
    const cached = urlCache.current.get(asset.id);
    if (cached) return cached;

    let url: string | null = null;
    try {
      if (asset.source === "ai_generations") {
        const { data } = await supabase
          .from("ai_generations")
          .select("audio_url")
          .eq("id", asset.id)
          .maybeSingle();
        url = (data as any)?.audio_url ?? null;
      } else if (asset.source === "video_generations") {
        const { data } = await supabase
          .from("video_generations" as any)
          .select("video_url, merged_url")
          .eq("id", asset.id)
          .maybeSingle();
        url = (data as any)?.merged_url || (data as any)?.video_url || null;
      } else if (asset.source === "voice_clones") {
        const { data } = await supabase
          .from("voice_clones" as any)
          .select("sample_url")
          .eq("id", asset.id)
          .maybeSingle();
        url = (data as any)?.sample_url ?? null;
      }
    } catch { /* swallow */ }

    if (url) {
      urlCache.current.set(asset.id, url);
      // Patch asset in state so UI knows it's available without re-fetch.
      setAssets((prev) => prev.map((a) => a.id === asset.id ? { ...a, url } : a));
    }
    return url;
  };


  // ── Filtering ──
  const filtered = useMemo(() => {
    let list = assets;
    if (tab !== "all") list = list.filter((a) => a.type === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => {
        const displayName = customNames[a.id] || a.title;
        return displayName.toLowerCase().includes(q) ||
          a.title.toLowerCase().includes(q) ||
          Object.values(a.meta || {}).some((v) => v.toLowerCase().includes(q));
      });
    }
    return list;
  }, [assets, tab, search, customNames]);

  // ── Selection ──
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((a) => a.id)));
    }
  };

  // ── Download single ──
  const downloadSingle = async (asset: MediaAsset) => {
    if (!libraryAccess.canDownload) return;
    setDownloading(asset.id);
    try {
      const url = await resolveAssetUrl(asset);
      if (!url) throw new Error(tr("dashboard.mediaLibrary.urlUnavailable", "URL no disponible"));
      if (libraryAccess.tier === 'warning' && user) {
        await registerFreeDownload(user.id);
      }
      const resp = await fetch(url);
      const blob = await resp.blob();
      const ext = asset.type === "song" ? "mp3" : asset.type === "video" ? "mp4" : asset.type === "cover" ? "png" : "mp3";
      const displayName = customNames[asset.id] || asset.title;
      const filename = `${displayName.substring(0, 50).replace(/[^a-zA-Z0-9áéíóúñ ]/g, "")}.${ext}`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast({ title: tr("dashboard.mediaLibrary.downloadError", "Error al descargar"), variant: "destructive" });
    }
    setDownloading(null);
  };

  // ── Download ZIP ──
  const downloadZip = async () => {
    const items = assets.filter((a) => selected.has(a.id));
    if (!items.length) return;
    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      const folders: Record<string, JSZip> = {
        song: zip.folder(tr("dashboard.mediaLibrary.zipFolders.songs", "canciones"))!,
        video: zip.folder(tr("dashboard.mediaLibrary.zipFolders.videos", "videos"))!,
        cover: zip.folder(tr("dashboard.mediaLibrary.zipFolders.covers", "portadas"))!,
        vocal: zip.folder(tr("dashboard.mediaLibrary.zipFolders.voices", "voces"))!,
      };
      const extMap: Record<string, string> = { song: "mp3", video: "mp4", cover: "png", vocal: "mp3" };

      await Promise.all(
        items.map(async (asset, i) => {
          try {
            const url = await resolveAssetUrl(asset);
            if (!url) return;
            const resp = await fetch(url);
            const blob = await resp.blob();
            const dName = customNames[asset.id] || asset.title;
            const name = `${(i + 1).toString().padStart(2, "0")}_${dName.substring(0, 40).replace(/[^a-zA-Z0-9áéíóúñ ]/g, "")}.${extMap[asset.type]}`;
            folders[asset.type].file(name, blob);
          } catch { /* skip failed */ }
        })
      );

      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = `Musicdibs_assets_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast({ title: tr("dashboard.mediaLibrary.filesDownloaded", "{{count}} archivos descargados", { count: items.length }) });
      setSelected(new Set());
    } catch {
      toast({ title: tr("dashboard.mediaLibrary.zipError", "Error al crear ZIP"), variant: "destructive" });
    }
    setDownloadingZip(false);
  };

  // ── WAV export ─────────────────────────────────────────────────────────────
  const exportWav = async (asset: MediaAsset) => {
    if (wavJobs[asset.id] === "loading") return;
    setWavJobs((prev) => ({ ...prev, [asset.id]: "loading" }));

    try {
      const audioUrl = await resolveAssetUrl(asset);
      if (!audioUrl) throw new Error("URL de audio no disponible");

      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = (supabase as any).supabaseUrl as string ||
        (window as any).__SUPABASE_URL__ ||
        import.meta.env.VITE_SUPABASE_URL;

      const res = await fetch(`${supabaseUrl}/functions/v1/kie-wav-generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ audio_url: audioUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Error iniciando conversión WAV");

      // Descarga síncrona
      if (data.status === "completed" && data.wav_url) {
        triggerBlobDownload(data.wav_url, `${getDisplayName(asset)}.wav`);
        setWavJobs((prev) => ({ ...prev, [asset.id]: "done" }));
        setTimeout(() => setWavJobs((prev) => ({ ...prev, [asset.id]: "idle" })), 3000);
        return;
      }

      // Polling asíncrono
      const wavLogId = data.logId;
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        if (attempts > 40) {
          clearInterval(poll);
          exportPollsRef.current.delete(asset.id + "_wav");
          setWavJobs((prev) => ({ ...prev, [asset.id]: "error" }));
          toast({ title: "Conversión WAV tardó demasiado", variant: "destructive" });
          return;
        }
        const { data: row } = await supabase
          .from("ai_generation_logs")
          .select("status, output_url")
          .eq("id", wavLogId)
          .single();
        if (row?.status === "completed" && row?.output_url) {
          clearInterval(poll);
          exportPollsRef.current.delete(asset.id + "_wav");
          triggerBlobDownload(row.output_url as string, `${getDisplayName(asset)}.wav`);
          setWavJobs((prev) => ({ ...prev, [asset.id]: "done" }));
          setTimeout(() => setWavJobs((prev) => ({ ...prev, [asset.id]: "idle" })), 3000);
        } else if (row?.status === "failed") {
          clearInterval(poll);
          exportPollsRef.current.delete(asset.id + "_wav");
          setWavJobs((prev) => ({ ...prev, [asset.id]: "error" }));
          toast({ title: "Error al convertir a WAV", variant: "destructive" });
        }
      }, 5000);
      exportPollsRef.current.set(asset.id + "_wav", poll);
    } catch (e: any) {
      setWavJobs((prev) => ({ ...prev, [asset.id]: "error" }));
      toast({ title: e?.message || "Error al exportar WAV", variant: "destructive" });
    }
  };

  // ── MIDI export ─────────────────────────────────────────────────────────────
  const exportMidi = async (asset: MediaAsset) => {
    if (midiJobs[asset.id] === "loading") return;
    if (!asset.provider_task_id) {
      toast({ title: "MIDI solo disponible para tracks KIE/Suno", variant: "destructive" });
      return;
    }
    setMidiJobs((prev) => ({ ...prev, [asset.id]: "loading" }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = (supabase as any).supabaseUrl as string ||
        (window as any).__SUPABASE_URL__ ||
        import.meta.env.VITE_SUPABASE_URL;

      const res = await fetch(`${supabaseUrl}/functions/v1/kie-midi-generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ source_generation_id: asset.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.error === "insufficient_credits") {
          toast({ title: "Necesitas 2 créditos para exportar MIDI", variant: "destructive" });
        } else {
          throw new Error(data?.message || "Error iniciando MIDI");
        }
        setMidiJobs((prev) => ({ ...prev, [asset.id]: "error" }));
        return;
      }

      const midiLogId = data.logId;
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        if (attempts > 48) {
          clearInterval(poll);
          exportPollsRef.current.delete(asset.id + "_midi");
          setMidiJobs((prev) => ({ ...prev, [asset.id]: "error" }));
          toast({ title: "MIDI tardó demasiado. Inténtalo de nuevo.", variant: "destructive" });
          return;
        }
        const { data: row } = await supabase
          .from("ai_generation_logs")
          .select("status, output_url")
          .eq("id", midiLogId)
          .single();
        if (row?.status === "completed" && row?.output_url) {
          clearInterval(poll);
          exportPollsRef.current.delete(asset.id + "_midi");
          let midiUrl = row.output_url as string;
          try {
            const parsed = JSON.parse(midiUrl);
            if (parsed?.midi_files?.[0]) midiUrl = parsed.midi_files[0];
          } catch { /* URL directa */ }
          const a = document.createElement("a");
          a.href = midiUrl;
          a.download = `${getDisplayName(asset)}.mid`;
          a.target = "_blank";
          a.click();
          setMidiJobs((prev) => ({ ...prev, [asset.id]: "done" }));
          toast({ title: "¡MIDI descargado!" });
          setTimeout(() => setMidiJobs((prev) => ({ ...prev, [asset.id]: "idle" })), 4000);
        } else if (row?.status === "failed") {
          clearInterval(poll);
          exportPollsRef.current.delete(asset.id + "_midi");
          setMidiJobs((prev) => ({ ...prev, [asset.id]: "error" }));
          toast({ title: "Error al generar MIDI. Créditos no descontados.", variant: "destructive" });
        }
      }, 5000);
      exportPollsRef.current.set(asset.id + "_midi", poll);
    } catch (e: any) {
      setMidiJobs((prev) => ({ ...prev, [asset.id]: "error" }));
      toast({ title: e?.message || "Error al exportar MIDI", variant: "destructive" });
    }
  };

  // ── Blob download helper ───────────────────────────────────────────────────
  const triggerBlobDownload = (url: string, filename: string) => {
    fetch(url)
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      })
      .catch(() => window.open(url, "_blank"));
  };

  // ── Delete single ──
  const deleteAsset = async (asset: MediaAsset) => {
    setDeleting(asset.id);
    try {
      if (asset.source !== "storage") {
        const { error } = await supabase.from(asset.source as any).delete().eq("id", asset.id);
        if (error) throw error;
      }
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
      setSelected((prev) => { const n = new Set(prev); n.delete(asset.id); return n; });
      // Invalidate cache
      if (cacheKey) sessionStorage.removeItem(cacheKey);
      toast({ title: tr("dashboard.mediaLibrary.assetDeleted", "Asset eliminado") });
    } catch {
      toast({ title: tr("dashboard.mediaLibrary.deleteError", "Error al eliminar"), variant: "destructive" });
    }
    setDeleting(null);
  };

  // ── Delete bulk ──
  const deleteBulk = async () => {
    const items = assets.filter((a) => selected.has(a.id));
    if (!items.length) return;
    setDeletingBulk(true);
    let deleted = 0;

    const bySource = items.reduce((acc, a) => {
      if (a.source !== "storage") {
        (acc[a.source] ??= []).push(a.id);
      } else {
        deleted++;
      }
      return acc;
    }, {} as Record<string, string[]>);

    for (const [source, ids] of Object.entries(bySource)) {
      const { error } = await supabase.from(source as any).delete().in("id", ids);
      if (!error) deleted += ids.length;
    }

    setAssets((prev) => prev.filter((a) => !selected.has(a.id)));
    setSelected(new Set());
    if (cacheKey) sessionStorage.removeItem(cacheKey);
    toast({ title: tr("dashboard.mediaLibrary.assetsDeleted", "{{count}} assets eliminados", { count: deleted }) });
    setDeletingBulk(false);
  };

  // ── Playback (resolves audio URL on demand) ──
  const togglePlay = async (asset: MediaAsset) => {
    if (playingId === asset.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    const url = await resolveAssetUrl(asset);
    if (!url) {
      toast({ title: tr("dashboard.mediaLibrary.audioUnavailable", "Audio no disponible"), variant: "destructive" });
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(url);
    audio.onended = () => setPlayingId(null);
    audio.play();
    audioRef.current = audio;
    setPlayingId(asset.id);
  };

  // ── Rename (custom names via localStorage) ──
  const startEditing = (asset: MediaAsset) => {
    setEditingId(asset.id);
    setEditValue(customNames[asset.id] || asset.title);
    setTimeout(() => editInputRef.current?.select(), 50);
  };

  const confirmRename = (id: string) => {
    const trimmed = editValue.trim();
    if (trimmed) {
      const updated = { ...customNames, [id]: trimmed };
      setCustomNames(updated);
      localStorage.setItem("media_library_names", JSON.stringify(updated));
      toast({ title: tr("dashboard.mediaLibrary.nameUpdated", "Nombre actualizado") });
    }
    setEditingId(null);
  };

  // ── Icon for type ──
  const typeIcon = (type: MediaAsset["type"]) => {
    switch (type) {
      case "song": return <Music className="h-4 w-4" />;
      case "video": return <Film className="h-4 w-4" />;
      case "cover": return <ImageIcon className="h-4 w-4" />;
      case "vocal": return <Mic className="h-4 w-4" />;
    }
  };

  const getDisplayName = (asset: MediaAsset) => customNames[asset.id] || asset.title;

  const typeBadgeColor = (type: MediaAsset["type"]) => {
    switch (type) {
      case "song": return "bg-violet-500/15 text-violet-400 border-violet-500/30";
      case "video": return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      case "cover": return "bg-pink-500/15 text-pink-400 border-pink-500/30";
      case "vocal": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    }
  };

  const typeLabel = (type: MediaAsset["type"]) => {
    switch (type) {
      case "song": return tr("dashboard.mediaLibrary.types.song", "Canción");
      case "video": return tr("dashboard.mediaLibrary.types.video", "Vídeo");
      case "cover": return tr("dashboard.mediaLibrary.types.cover", "Portada");
      case "vocal": return tr("dashboard.mediaLibrary.types.vocal", "Voz");
    }
  };

  return (
    <div className="space-y-6">
      <LibraryAccessBanner />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">📂 {tr("dashboard.mediaLibrary.title", "Biblioteca multimedia")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tr("dashboard.mediaLibrary.subtitle", "Todos tus assets creados con AI Studio en un solo lugar")}
          </p>
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {tr("dashboard.mediaLibrary.selected", "{{count}} seleccionados", { count: selected.size })}
            </Badge>
            <Button size="sm" onClick={downloadZip} disabled={downloadingZip} className="rounded-full">
              {downloadingZip ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Package className="h-4 w-4 mr-1" />}
              {tr("dashboard.mediaLibrary.downloadZip", "Descargar ZIP")}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" disabled={deletingBulk} className="rounded-full">
                  {deletingBulk ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                  {tr("dashboard.mediaLibrary.delete", "Eliminar")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{tr("dashboard.mediaLibrary.deleteSelectedTitle", "¿Eliminar {{count}} assets?", { count: selected.size })}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {tr("dashboard.mediaLibrary.deleteSelectedDesc", "Esta acción no se puede deshacer. Los archivos seleccionados se eliminarán permanentemente.")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{tr("dashboard.mediaLibrary.cancel", "Cancelar")}</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteBulk} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {tr("dashboard.mediaLibrary.deleteSelectedAction", "Eliminar {{count}} assets", { count: selected.size })}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Search + Tabs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={tr("dashboard.mediaLibrary.searchPlaceholder", "Buscar por nombre, género, mood...")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={selectAll} className="shrink-0">
          {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare className="h-4 w-4 mr-1" /> : <Square className="h-4 w-4 mr-1" />}
          {selected.size === filtered.length && filtered.length > 0 ? tr("dashboard.mediaLibrary.deselectAll", "Deseleccionar todo") : tr("dashboard.mediaLibrary.selectAll", "Seleccionar todo")}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v as TabType); setSelected(new Set()); }}>
        <TabsList className="w-full sm:w-auto">
          {TAB_CONFIG.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs sm:text-sm">
              <t.icon className="h-3.5 w-3.5 mr-1" />
              {tr(t.labelKey, t.fallback)}
              {t.value !== "all" && (
                <span className="ml-1 text-muted-foreground">
                  ({assets.filter((a) => a.type === t.value).length})
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {TAB_CONFIG.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mb-3 opacity-40" />
                <p className="text-sm">{t.value !== "all" ? tr("dashboard.mediaLibrary.emptyByType", "No hay assets de tipo \"{{type}}\"", { type: tr(t.labelKey, t.fallback) }) : tr("dashboard.mediaLibrary.empty", "No hay assets")}</p>
                <p className="text-xs mt-1">{tr("dashboard.mediaLibrary.emptyHint", "Crea contenido en AI Studio para verlo aquí")}</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((asset) => (
                  <Card
                    key={asset.id}
                    className={`group relative transition-all duration-200 hover:border-primary/40 ${
                      selected.has(asset.id) ? "border-primary ring-1 ring-primary/20" : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selected.has(asset.id)}
                          onCheckedChange={() => toggleSelect(asset.id)}
                          className="mt-1 shrink-0"
                        />

                        {/* Preview thumbnail */}
                        {asset.type === "cover" && asset.url ? (
                          <div className="h-14 w-14 rounded-md overflow-hidden bg-muted shrink-0">
                            <img src={asset.url} alt={asset.title} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="h-14 w-14 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
                            {typeIcon(asset.type)}
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          {editingId === asset.id ? (
                            <div className="flex items-center gap-1">
                              