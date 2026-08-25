import { useState, useEffect, useRef, useCallback } from 'react';
import { SEO } from '@/components/SEO';
import { FileDropzone } from '@/components/FileDropzone';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { parseAiError } from '@/lib/aiErrorHandler';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft, ArrowDown, Mic, Download, Loader2, Music, Sparkles, Upload,
  Trash2, Pencil, Check, X, Play, Pause, Lock,
  CheckCircle2, AlertCircle, Palette, Users,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { AIStudioThemeBar } from '@/components/ai-studio/AIStudioThemeBar';

import { VoiceRecorder } from '@/components/voice/VoiceRecorder';
import { VoiceToolsTour } from '@/components/ai-studio/VoiceToolsTour';
import { HelpCircle } from 'lucide-react';
import { useProductTracking } from '@/hooks/useProductTracking';
import { FEATURE_COSTS } from '@/lib/featureCosts';
import { GenerationWarning } from '@/components/ai-studio/GenerationWarning';
import { CreditsChip } from '@/components/ai-studio/CreditsChip';
import { PricingLink } from '@/components/dashboard/PricingPopup';

const THEMES = ["Amor", "Desamor", "Superación", "Fiesta", "Calle", "Familia", "Libertad", "Nostalgia", "Éxito", "Identidad"];
const MUSIC_GENRES = ['Pop', 'Rock', 'Hip-Hop', 'Reggaeton', 'Flamenco', 'Electrónica', 'Jazz', 'Clásica', 'R&B', 'Latin'];
const MUSIC_MOODS = ['Alegre', 'Melancólico', 'Épico', 'Relajado', 'Enérgico', 'Romántico', 'Oscuro', 'Motivador'];
const LYRIC_STYLES = ["Narrativa", "Abstracta", "Descriptiva", "Reivindicativa", "Introspectiva", "Poética"];
const LYRIC_LANGUAGES = ["Español", "Inglés", "Spanglish", "Portugués", "Francés"];
const RHYME_SCHEMES = [
  { value: "ABAB", label: "ABAB — Alterna" },
  { value: "AABB", label: "AABB — Pareados" },
  { value: "ABCB", label: "ABCB — Balada" },
  { value: "libre", label: "Libre — Sin rima" },
];
const STRUCTURES = [
  { value: "V+C+V+C+P+C", label: "Verso · Coro · Verso · Coro · Puente · Coro" },
  { value: "V+C+V+C", label: "Verso · Coro · Verso · Coro" },
  { value: "V+V+C+V+C", label: "Verso · Verso · Coro · Verso · Coro" },
  { value: "V+C+P+C", label: "Verso · Coro · Puente · Coro" },
];
// Artist presets removed — users can type freely
const POVS = ["Primera persona", "Segunda persona", "Tercera persona"];

export default function AIStudioVocal() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const s = (key: string, fb?: string): string => String(t(key, { defaultValue: fb }));
  const vc = (key: string, opts?: any): string => String(t(`dashboard.voiceCloning.${key}`, opts));
  const tv = (key: string, opts?: any): string => String(t(`aiVocal.${key}`, opts));
  const { track } = useProductTracking();

  useEffect(() => {
    track('ai_studio_entered', { feature: 'vocal' });
  }, []);

  // Voice clones
  const [voiceClones, setVoiceClones] = useState<any[]>([]);
  const [clonesLoading, setClonesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sing');

  // Singing state
  const [lyrics, setLyrics] = useState('');
  const [selectedCloneId, setSelectedCloneId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  // Lyrics generator
  const [lyricsDesc, setLyricsDesc] = useState('');
  const [_lyricsTheme] = useState(''); // kept for type compat
  const [lyricsGenre, setLyricsGenre] = useState('');
  const [lyricsMood, setLyricsMood] = useState('');
  const [lyricsStyle, setLyricsStyle] = useState('');
  const [lyricsLanguage, setLyricsLanguage] = useState('Español');
  const [lyricsStructure, setLyricsStructure] = useState('V+C+V+C+P+C');
  const [lyricsRhyme, setLyricsRhyme] = useState('ABAB');
  const [lyricsPov, setLyricsPov] = useState('Primera persona');
  const [lyricsArtistRefs, setLyricsArtistRefs] = useState<string[]>([]);
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);

  // Cloning form (KIE Suno Voice — flujo multi-paso con verificación anti-fraude)
  const [showCloneForm, setShowCloneForm] = useState(false);
  const [cloneName, setCloneName] = useState('');
  const [cloneDescription, setCloneDescription] = useState('');
  const [cloneAudioFile, setCloneAudioFile] = useState<File | null>(null);
  const [cloneAudioBlob, setCloneAudioBlob] = useState<Blob | null>(null);
  const [cloneAudioDuration, setCloneAudioDuration] = useState<number | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const cloneFileRef = useRef<HTMLInputElement>(null);
  // 'idle' | 'requesting_phrase' | 'awaiting_verification_recording' | 'generating' | 'active' | 'failed'
  const [cloneStep, setCloneStep] = useState<'idle' | 'requesting_phrase' | 'awaiting_verification_recording' | 'generating' | 'active' | 'failed'>('idle');
  const [activeCloneId, setActiveCloneId] = useState<string | null>(null);
  const [verificationPhrase, setVerificationPhrase] = useState<string | null>(null);
  const [cloneErrorMsg, setCloneErrorMsg] = useState<string | null>(null);
  const clonePollRef = useRef<number | null>(null);

  // Clone editing
  const [editingCloneId, setEditingCloneId] = useState<string | null>(null);
  const [editingCloneName, setEditingCloneName] = useState('');

  // Audio player
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const loadClones = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('voice_clones').select('*')
      .eq('user_id', user.id).eq('status', 'active').order('created_at', { ascending: false });
    const withUrls = await Promise.all((data || []).map(async (c: any) => {
      if (c.sample_storage_path) {
        const { data: urlData } = await supabase.storage.from('voice-clone-samples').createSignedUrl(c.sample_storage_path, 3600);
        return { ...c, sample_url: urlData?.signedUrl || null };
      }
      return { ...c, sample_url: null };
    }));
    setVoiceClones(withUrls);
    setClonesLoading(false);
    if (withUrls.length > 0 && !selectedCloneId) setSelectedCloneId(withUrls[0].id);
  }, [user, selectedCloneId]);

  useEffect(() => { const p = searchParams.get('lyrics'); if (p) setLyrics(decodeURIComponent(p)); }, [searchParams]);

  useEffect(() => {
    loadClones();
    if (user) {
      supabase.from('ai_generations').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(10)
        .then(({ data }) => setHistory((data || []).filter((d: any) => d.prompt?.startsWith('Pista vocal'))));
    }
  }, [user]);

  useEffect(() => { if (!clonesLoading && voiceClones.length === 0) setActiveTab('clone'); }, [clonesLoading, voiceClones.length]);

  const formatTime = (sec: number) => `${Math.floor(sec / 60)}:${Math.floor(sec % 60).toString().padStart(2, '0')}`;
  const stopPlayback = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setPlayingId(null); setCurrentTime(0); setDuration(0);
  }, []);
  const togglePlay = useCallback(async (clone: any) => {
    if (playingId === clone.id) { stopPlayback(); return; }
    stopPlayback();
    if (!clone.sample_url) return;
    const audio = new Audio(clone.sample_url);
    audioRef.current = audio;
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('ended', stopPlayback);
    const tick = () => { setCurrentTime(audio.currentTime); rafRef.current = requestAnimationFrame(tick); };
    setPlayingId(clone.id); await audio.play(); tick();
  }, [playingId, stopPlayback]);
  const handleSeek = useCallback((val: number[]) => { if (audioRef.current) { audioRef.current.currentTime = val[0]; setCurrentTime(val[0]); } }, []);
  useEffect(() => () => { stopPlayback(); }, [stopPlayback]);

  const handleCloneFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!CLONE_ALLOWED_EXTS.includes(ext)) {
      toast({ title: vc('invalidFormat'), description: vc('invalidFormatDesc'), variant: 'destructive' });
      if (cloneFileRef.current) cloneFileRef.current.value = '';
      return;
    }
    if (file.size > CLONE_MAX_BYTES) {
      toast({ title: vc('tooLarge'), description: vc('tooLargeDesc'), variant: 'destructive' });
      if (cloneFileRef.current) cloneFileRef.current.value = '';
      return;
    }
    setCloneAudioFile(file);
    setCloneAudioBlob(null);
    const audio = new Audio(URL.createObjectURL(file));
    audio.onloadedmetadata = () => setCloneAudioDuration(Math.round(audio.duration));
  };


  const uploadToVoiceSamples = async (fileOrBlob: File | Blob, ext: string): Promise<string> => {
    const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('voice-samples').upload(path, fileOrBlob, {
      contentType: fileOrBlob instanceof File ? fileOrBlob.type : 'audio/webm',
    });
    if (error) throw error;
    const { data } = supabase.storage.from('voice-samples').getPublicUrl(path);
    return data.publicUrl;
  };

  const stopClonePolling = () => { if (clonePollRef.current) { clearInterval(clonePollRef.current); clonePollRef.current = null; } };
  useEffect(() => () => stopClonePolling(), []);

  const pollCloneStatus = useCallback((cloneId: string) => {
    stopClonePolling();
    clonePollRef.current = window.setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kie-voice-clone`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          body: JSON.stringify({ action: 'check_status', cloneId }),
        });
        const data = await res.json();
        if (!res.ok) return;
        if (data.status === 'awaiting_verification_recording' && data.verificationPhrase) {
          setVerificationPhrase(data.verificationPhrase);
          setCloneStep('awaiting_verification_recording');
          stopClonePolling();
        } else if (data.status === 'active') {
          setCloneStep('active');
          stopClonePolling();
          toast({ title: vc('cloneSuccess'), description: vc('cloneSuccessDesc', { name: cloneName.trim() }) });
          track('voice_cloned', { feature: 'voice_cloning' });
          await loadClones();
          setActiveTab('sing');
          resetCloneFlow();
        } else if (data.status === 'failed') {
          setCloneStep('failed');
          setCloneErrorMsg(data.error || null);
          stopClonePolling();
        }
      } catch { /* reintenta en el siguiente tick */ }
    }, 4000);
  }, [cloneName, loadClones, toast, track]);

  const resetCloneFlow = () => {
    setShowCloneForm(false); setCloneStep('idle'); setActiveCloneId(null);
    setVerificationPhrase(null); setCloneErrorMsg(null);
    setCloneName(''); setCloneDescription(''); setCloneAudioFile(null); setCloneAudioBlob(null); setCloneAudioDuration(null);
    if (cloneFileRef.current) cloneFileRef.current.value = '';
  };

  // Paso 1: subir la muestra de voz y solicitar la frase de verificación.
  const handleClone = async () => {
    const sample = cloneAudioFile || cloneAudioBlob;
    if (!sample || !cloneName.trim() || !user) return;
    if (cloneAudioDuration !== null && cloneAudioDuration < 15) {
      toast({ title: vc('tooShort'), description: vc('tooShortDesc'), variant: 'destructive' }); return;
    }
    setIsCloning(true);
    setCloneStep('requesting_phrase');
    try {
      const voiceUrl = await uploadToVoiceSamples(sample, cloneAudioFile ? (cloneAudioFile.name.split('.').pop() || 'mp3') : 'webm');
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kie-voice-clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ action: 'request_phrase', voiceUrl, vocalStartS: 0, vocalEndS: Math.min(cloneAudioDuration ?? 10, 30), language: i18n.resolvedLanguage?.startsWith('en') ? 'en' : i18n.resolvedLanguage?.startsWith('pt') ? 'pt' : 'es', name: cloneName.trim(), description: cloneDescription }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('[voice-clone] request_phrase failed', res.status, data);
        const { userMessage } = parseAiError({ status: res.status }, data);
        const description = typeof data?.message === 'string' && data.message.trim() ? data.message : userMessage;
        toast({ title: vc('cloneError'), description, variant: 'destructive' });
        setCloneStep('idle');
        return;
      }

      setActiveCloneId(data.cloneId);
      pollCloneStatus(data.cloneId);
    } catch (err) {
      const { userMessage } = parseAiError(err);
      toast({ title: vc('connectionError'), description: userMessage, variant: 'destructive' });
      setCloneStep('idle');
    } finally {
      setIsCloning(false);
    }
  };

  // Paso 2: el usuario ya leyó la frase de verificación en voz alta.
  const handleVerificationRecordingComplete = async (blob: Blob) => {
    if (!activeCloneId) return;
    setIsCloning(true);
    try {
      const verificationAudioUrl = await uploadToVoiceSamples(blob, 'webm');
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kie-voice-clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ action: 'submit_verification', cloneId: activeCloneId, verificationAudioUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('[voice-clone] submit_verification failed', res.status, data);
        if (data.error === 'insufficient_credits') {
          toast({ title: tv('insufficientCredits'), variant: 'destructive' });
        } else {
          const { userMessage } = parseAiError({ status: res.status }, data);
          const description = typeof data?.message === 'string' && data.message.trim() ? data.message : userMessage;
          toast({ title: vc('cloneError'), description, variant: 'destructive' });
        }
        return;
      }

      setCloneStep('generating');
      pollCloneStatus(activeCloneId);
    } catch (err) {
      const { userMessage } = parseAiError(err);
      toast({ title: vc('connectionError'), description: userMessage, variant: 'destructive' });
    } finally {
      setIsCloning(false);
    }
  };

  const handleDeleteClone = async (clone: any) => {
    await supabase.from('voice_clones').update({ status: 'deleted' }).eq('id', clone.id);
    setVoiceClones(prev => prev.filter(c => c.id !== clone.id));
    toast({ title: vc('deleted') });
  };

  const handleRenameClone = async (cloneId: string) => {
    const trimmed = editingCloneName.trim(); if (!trimmed) return;
    const { error } = await supabase.from('voice_clones').update({ name: trimmed }).eq('id', cloneId);
    if (!error) { setVoiceClones(prev => prev.map(c => c.id === cloneId ? { ...c, name: trimmed } : c)); toast({ title: vc('renamed') }); }
    setEditingCloneId(null);
  };

  const formatDate = (dateStr: string) => {
    const lang = i18n.resolvedLanguage || 'es';
    const m: Record<string, string> = { es: 'es-ES', en: 'en-US', 'pt-BR': 'pt-BR', fr: 'fr-FR', it: 'it-IT', de: 'de-DE' };
    return new Date(dateStr).toLocaleDateString(m[lang] || 'es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const durationBadge = () => {
    if (cloneAudioDuration === null) return null;
    if (cloneAudioDuration < 15) return <span className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {vc('durationTooShort')}</span>;
    if (cloneAudioDuration < 30) return <span className="text-xs text-warning flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {vc('durationOk')}</span>;
    return <span className="text-xs text-success flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {vc('durationOptimal')}</span>;
  };

  const handleGenerateLyrics = async () => {
    if (!lyricsDesc.trim()) { toast({ title: s('aiCreate.describeSongOrTheme'), variant: 'destructive' }); return; }
    setIsGeneratingLyrics(true);
    try {
      const { data, error } = await supabase.functions.invoke('lyrics-generator', {
        body: { description: lyricsDesc, genre: lyricsGenre, mood: lyricsMood, style: lyricsStyle, language: lyricsLanguage, structure: lyricsStructure, rhymeScheme: lyricsRhyme, pov: lyricsPov, artistRefs: lyricsArtistRefs }
      });
      if (error) throw error;
      if (data?.lyrics) { setLyrics(data.lyrics); toast({ title: tv('lyricsGenerated'), description: tv('lyricsGeneratedDesc') }); }
    } catch (err) { const { userMessage } = parseAiError(err); toast({ title: userMessage, variant: 'destructive' }); }
    finally { setIsGeneratingLyrics(false); }
  };

  const handleGenerate = async () => {
    if (!lyrics.trim()) { toast({ title: tv('errorWriteLyrics'), variant: 'destructive' }); return; }
    const selectedClone = voiceClones.find((c: any) => c.id === selectedCloneId);
    if (!selectedClone) { toast({ title: tv('errorSelectVoice'), description: tv('errorSelectVoiceDesc'), variant: 'destructive' }); return; }
    setIsGenerating(true); setAudioUrl('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-vocal-track`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}`, 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          body: JSON.stringify({ lyrics, voice_id: selectedClone.provider_voice_id || selectedClone.elevenlabs_voice_id, voice_name: selectedClone.name }) });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'insufficient_credits') toast({ title: tv('insufficientCredits'), description: t('dashboard.noCredits.costMessage', { action: tv('title'), cost: FEATURE_COSTS.generate_vocal_track }), variant: 'destructive' });
        else { const { userMessage } = parseAiError({ status: res.status }, data); toast({ title: s('aiShared.error'), description: userMessage, variant: 'destructive' }); }
        setIsGenerating(false);
        return;
      }
      // KIE es asíncrono: la generación real (música + separación de voz)
      // llega vía callback. Hacemos polling sobre ai_generations hasta que
      // el resultado esté listo (o falle).
      const generationId = data.generationId;
      const poll = window.setInterval(async () => {
        // `status` existe en la tabla de producción aunque los tipos generados
        // estén desactualizados; casteamos para evitar el error de TS.
        const { data } = await supabase.from('ai_generations').select('status, audio_url').eq('id', generationId).maybeSingle();
        const row = data as unknown as { status: string | null; audio_url: string | null } | null;
        if (row?.status === 'completed' && row.audio_url) {
          window.clearInterval(poll);
          setAudioUrl(row.audio_url);
          setHistory(prev => [{ id: generationId, audio_url: row.audio_url as string, prompt: `Pista vocal: ${selectedClone.name}`, created_at: new Date().toISOString() }, ...prev]);
          toast({ title: tv('vocalGenerated'), description: tv('vocalGeneratedDesc') });
          track('vocal_track_generated', { feature: 'vocal' });
          setIsGenerating(false);
        } else if (row?.status === 'failed') {
          window.clearInterval(poll);
          toast({ title: s('aiShared.error'), description: s('aiVocal.generationFailed', 'La generación ha fallado. Se te ha reembolsado el crédito.'), variant: 'destructive' });
          setIsGenerating(false);
        }
      }, 4000);
    } catch (err) { const { userMessage } = parseAiError(err); toast({ title: s('aiShared.error'), description: userMessage, variant: 'destructive' }); setIsGenerating(false); }
  };

  const hasClones = voiceClones.length > 0;

  const voiceToolsTitle = s('aiVocal.voiceToolsTitle', 'Herramientas de Voz');
  const voiceToolsBadge = s('aiVocal.voiceTools', 'Herramientas de Voz');
  const voiceToolsSub = s('aiVocal.voiceToolsSubtitle', 'Tu estudio vocal IA: clona tu voz y canta tus letras en 29 idiomas');

  // ──── CLONE FORM (shared) ────
  const cloneFormUI = (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-lg">{vc('formTitle', { defaultValue: 'Clonar tu voz' })}</CardTitle>
        <CardDescription>{vc('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Paso 2: leer la frase de verificación en voz alta */}
        {cloneStep === 'awaiting_verification_recording' && verificationPhrase && (
          <div className="space-y-4">
            <div className="bg-primary/5 rounded-lg p-4 space-y-2">
              <p className="font-medium text-sm flex items-center gap-2"><Mic className="h-4 w-4 text-primary" /> {s('aiVocal.verificationTitle', 'Verificación de identidad vocal')}</p>
              <p className="text-sm text-muted-foreground">{s('aiVocal.verificationDesc', 'Para confirmar que es tu propia voz, lee en voz alta la siguiente frase y grábala:')}</p>
              <p className="text-lg font-semibold p-3 bg-background rounded border">{verificationPhrase}</p>
            </div>
            <VoiceRecorder
              onRecordingComplete={(blob) => handleVerificationRecordingComplete(blob)}
              minDurationSec={2}
              maxDurationSec={30}
              recordLabel={s('aiVocal.startRecording', 'Grabar lectura')}
              stopLabel={s('aiVocal.stopRecording', 'Detener')}
              retryLabel={s('aiVocal.retryRecording', 'Repetir')}
              useLabel={isCloning ? s('aiVocal.sending', 'Enviando...') : s('aiVocal.confirmRecording', 'Enviar y crear voz')}
            />
            <Button variant="ghost" size="sm" onClick={resetCloneFlow}>{vc('cancel')}</Button>
          </div>
        )}

        {/* Paso 3: generando la voz */}
        {cloneStep === 'generating' && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-medium">{s('aiVocal.generatingVoice', 'Creando tu voz personalizada...')}</p>
            <p className="text-sm text-muted-foreground">{s('aiVocal.generatingVoiceHint', 'Esto puede tardar unos minutos.')}</p>
          </div>
        )}

        {/* Estado de fallo */}
        {cloneStep === 'failed' && (
          <div className="space-y-3">
            <div className="bg-destructive/10 rounded-lg p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">{s('aiVocal.cloneFailedTitle', 'No se pudo crear la voz')}</p>
                {cloneErrorMsg && <p className="text-muted-foreground mt-1">{cloneErrorMsg}</p>}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={resetCloneFlow}>{s('aiVocal.tryAgain', 'Intentarlo de nuevo')}</Button>
          </div>
        )}

        {/* Paso 1: nombre + muestra de voz (subir o grabar) */}
        {(cloneStep === 'idle' || cloneStep === 'requesting_phrase') && (
          <>
            <div className="bg-primary/5 rounded-lg p-4 flex gap-3">
              <Mic className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-medium">{vc('tipsTitle')}</p>
                <ul className="text-muted-foreground space-y-0.5 list-disc list-inside">
                  <li>{vc('tip1')}</li><li>{vc('tip2')}</li><li>{vc('tip3')}</li><li>{vc('tip4')}</li><li>{vc('tip5')}</li>
                </ul>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{vc('nameLabel')}</Label>
              <Input value={cloneName} onChange={e => setCloneName(e.target.value)} placeholder={vc('namePlaceholder')} maxLength={50} />
            </div>
            <div className="space-y-1.5">
              <Label>{vc('descLabel')}</Label>
              <Input value={cloneDescription} onChange={e => setCloneDescription(e.target.value)} placeholder={vc('descPlaceholder')} maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <Label>{vc('uploadLabel')}</Label>
              {cloneAudioBlob ? (
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <span className="text-sm text-muted-foreground">{s('aiVocal.recordedSample', 'Muestra grabada')} ({cloneAudioDuration}s)</span>
                  <Button variant="ghost" size="sm" onClick={() => { setCloneAudioBlob(null); setCloneAudioDuration(null); }}>{vc('cancel')}</Button>
                </div>
              ) : cloneAudioFile ? (
                <FileDropzone
                  fileType="audio"
                  accept=".mp3,.wav,.m4a,audio/*"
                  maxSize={50}
                  currentFile={cloneAudioFile}
                  onFileSelect={(file) => handleCloneFileChange({ target: { files: [file] } } as any)}
                  onRemove={() => { setCloneAudioFile(null); setCloneAudioDuration(null); }}
                />
              ) : (
                <div className="space-y-3">
                  <VoiceRecorder
                    onRecordingComplete={(blob, durationSec) => { setCloneAudioBlob(blob); setCloneAudioDuration(durationSec); }}
                    minDurationSec={15}
                    maxDurationSec={60}
                    recordLabel={s('aiVocal.recordSample', 'Grabar muestra de voz')}
                    stopLabel={s('aiVocal.stopRecording', 'Detener')}
                    retryLabel={s('aiVocal.retryRecording', 'Repetir')}
                    useLabel={s('aiVocal.useThisSample', 'Usar esta muestra')}
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">{s('aiVocal.or', 'o')}</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <FileDropzone
                    fileType="audio"
                    accept=".mp3,.wav,.m4a,audio/*"
                    maxSize={50}
                    currentFile={cloneAudioFile}
                    onFileSelect={(file) => handleCloneFileChange({ target: { files: [file] } } as any)}
                    onRemove={() => { setCloneAudioFile(null); setCloneAudioDuration(null); }}
                  />
                </div>
              )}
              {durationBadge()}
            </div>
            <Button onClick={handleClone} disabled={(!cloneAudioFile && !cloneAudioBlob) || !cloneName.trim() || isCloning} className="w-full gap-2">
              {isCloning ? <><Loader2 className="h-4 w-4 animate-spin" /> {vc('cloningBtn')}</> : <><Mic className="h-4 w-4" /> {vc('cloneBtn')}</>}
            </Button>
            <div className="text-center"><PricingLink /></div>
          </>
        )}
      </CardContent>
    </Card>
  );

  // ──── COMING SOON ────
  const comingSoonUI = (locked: boolean) => {
    const tools = [
      { icon: Sparkles, title: s('aiVocal.comingSoonMorphTitle', 'Voice Morphing'), desc: s('aiVocal.comingSoonMorphDesc', 'Cambia género, edad y características de tu voz') },
      { icon: Palette, title: s('aiVocal.comingSoonEmotionTitle', 'Emotion Control'), desc: s('aiVocal.comingSoonEmotionDesc', 'Añade emociones: alegre, triste, enérgico...') },
      { icon: Users, title: s('aiVocal.comingSoonMixTitle', 'Voice Mixing'), desc: s('aiVocal.comingSoonMixDesc', 'Mezcla dos voces clonadas en una') },
    ];
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{s('aiVocal.comingSoonLabel', 'Próximamente')}</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {tools.map((tool, idx) => (
            <Card key={idx} className="relative overflow-hidden opacity-60">
              {locked && <div className="absolute top-3 right-3"><Lock className="h-4 w-4 text-muted-foreground" /></div>}
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <tool.icon className="h-5 w-5 text-muted-foreground" />
                  <Badge variant="secondary" className="text-[10px]">{s('aiVocal.comingSoonBadge', 'Próximamente')}</Badge>
                </div>
                <CardTitle className="text-sm">{tool.title}</CardTitle>
                <CardDescription className="text-xs">{tool.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  // ──── FIRST TIME (no clones) ────
  if (!clonesLoading && !hasClones) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <AIStudioThemeBar />
        <main className="container mx-auto px-4 py-6 pt-16">
          <div className="flex items-center justify-between mb-8 gap-3">
            <Link to="/ai-studio" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> {tv('backToStudio')}
            </Link>
            <CreditsChip />
          </div>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">{voiceToolsBadge}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{voiceToolsTitle}</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{voiceToolsSub}</p>
          </div>
          <div className="max-w-2xl mx-auto space-y-6">
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="py-8 text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                  <Mic className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">{s('aiVocal.firstTimeTitle', '¡Empieza aquí! Clona tu voz')}</h2>
                <p className="text-muted-foreground max-w-md mx-auto">{s('aiVocal.firstTimeDesc', 'Para usar cualquier herramienta, primero necesitas clonar tu voz. Solo toma 30 segundos.')}</p>
                <ArrowDown className="h-6 w-6 text-primary mx-auto animate-bounce" />
              </CardContent>
            </Card>
            {cloneFormUI}
            {comingSoonUI(true)}
          </div>
        </main>
      </div>
    );
  }

  // ──── REGULAR (has clones) ────
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Herramientas de Voz" description="Tu estudio vocal IA: clona tu voz y genera pistas vocales cantadas en 29 idiomas." path="/ai-studio/vocal" />
      <VoiceToolsTour />
      <Navbar />
      <AIStudioThemeBar />
      <main className="container mx-auto px-4 py-6 pt-16">
        <div className="flex items-center justify-between mb-8 gap-3">
          <Link to="/ai-studio" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> {tv('backToStudio')}
          </Link>
          <CreditsChip />
        </div>
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">{voiceToolsBadge}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{voiceToolsTitle}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-4">{voiceToolsSub}</p>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" onClick={() => window.dispatchEvent(new Event('musicdibs:start-voice-tour'))}>
            <HelpCircle className="h-3.5 w-3.5" /> {String(t('voiceToolsTour.rewatch', { defaultValue: 'Ver tutorial' }))}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-5xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="sing" className="gap-2" data-tour="vt-sing-tab">
              <Music className="h-4 w-4" />
              <span className="hidden sm:inline">{s('aiVocal.tabSing', 'Cantar')}</span>
            </TabsTrigger>
            <TabsTrigger value="clone" className="gap-2" data-tour="vt-clone-tab">
              <Mic className="h-4 w-4" />
              <span className="hidden sm:inline">{s('aiVocal.tabClone', 'Clonar')}</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB: SING */}
          <TabsContent value="sing">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-5">
                {/* Voice selector */}
                <Card data-tour="vt-cloned-list">
                  <CardHeader className="pb-3"><CardTitle className="text-base">{tv('clonedVoice')}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {voiceClones.map((c: any) => (
                        <button key={c.id} onClick={() => setSelectedCloneId(c.id)} className="w-full flex items-center gap-3 rounded-lg p-3 text-left transition-all"
                          style={{ border: selectedCloneId === c.id ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))', background: selectedCloneId === c.id ? 'hsl(var(--primary) / 0.08)' : 'transparent' }}>
                          <span className="text-lg">🎤</span>
                          <div><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{tv('clonedLabel')}</p></div>
                        </button>
                      ))}
                      <Button size="sm" variant="ghost" className="w-full text-xs text-muted-foreground mt-1" onClick={() => setActiveTab('clone')}>
                        <Mic className="w-3 h-3 mr-1" /> {tv('addVoice')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Lyrics */}
                <Card data-tour="vt-lyrics-gen">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{tv('yourLyrics')}</CardTitle>
                      <Badge variant="secondary" className="text-[10px]">{tv('freeGenBadge')}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Description */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">{tv('whatAbout')}</Label>
                      <Textarea value={lyricsDesc} onChange={e => setLyricsDesc(e.target.value)} placeholder={tv('descPlaceholder')} rows={4} className="resize-none text-sm" maxLength={1000} />
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">Incluye: tema, mood, historia, referencias...</span>
                        <span className="text-[11px] text-muted-foreground">{lyricsDesc.length}/1000</span>
                      </div>
                    </div>


                    {/* Mood chips */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Mood / Tono (opcional)</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {MUSIC_MOODS.map(m => <Badge key={m} variant={lyricsMood === m ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => setLyricsMood(lyricsMood === m ? '' : m)}>{m}</Badge>)}
                      </div>
                    </div>

                    {/* Language selector */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">{tv('languageLabel')}</Label>
                      <Select value={lyricsLanguage} onValueChange={setLyricsLanguage}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LYRIC_LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Advanced options */}
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-1">
                        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                        ⚙️ Opciones avanzadas
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-3 pt-3">
                        {/* Genre */}
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">{tv('genreLabel')}</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {MUSIC_GENRES.map(g => <Badge key={g} variant={lyricsGenre === g ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => setLyricsGenre(lyricsGenre === g ? '' : g)}>{g}</Badge>)}
                          </div>
                        </div>
                        {/* Structure & Rhyme */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">{tv('structureLabel')}</Label>
                            <Select value={lyricsStructure} onValueChange={setLyricsStructure}>
                              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {STRUCTURES.map(ss => <SelectItem key={ss.value} value={ss.value}>{ss.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">{tv('rhymeLabel')}</Label>
                            <Select value={lyricsRhyme} onValueChange={setLyricsRhyme}>
                              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {RHYME_SCHEMES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {/* POV */}
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">{tv('povLabel')}</Label>
                          <Select value={lyricsPov} onValueChange={setLyricsPov}>
                            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {POVS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        {/* Writing style */}
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">{tv('writingStyleLabel')}</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {LYRIC_STYLES.map(ls => <Badge key={ls} variant={lyricsStyle === ls ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => setLyricsStyle(lyricsStyle === ls ? '' : ls)}>{ls}</Badge>)}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Generate button */}
                    <Button className="w-full gap-2" onClick={handleGenerateLyrics} disabled={isGeneratingLyrics || !lyricsDesc.trim()}>
                      {isGeneratingLyrics ? <><Loader2 className="w-4 h-4 animate-spin" />Generando letra...</> : <>📝 Generar letra (gratis)</>}
                    </Button>

                    {/* Divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                      <div className="relative flex justify-center"><span className="bg-background px-2 text-xs text-muted-foreground">{tv('orWritePaste')}</span></div>
                    </div>
                    <Textarea value={lyrics} onChange={e => setLyrics(e.target.value)} placeholder={tv('lyricsPlaceholder')} rows={8} className="resize-none text-sm font-mono" />
                    <p className="text-xs text-muted-foreground">{tv('charsCount', { count: lyrics.length })}</p>
                  </CardContent>
                </Card>
                <Button className="w-full" size="lg" onClick={handleGenerate} disabled={isGenerating || !lyrics.trim() || !selectedCloneId}>
                  {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{tv('generatingVocal')}</> : <><Mic className="w-4 h-4 mr-2" />{tv('generateVocalBtn')}</>}
                </Button>
                <GenerationWarning />
              </div>

              {/* Right column */}
              <div className="space-y-5">
                {audioUrl && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardHeader className="pb-3"><CardTitle className="text-base text-primary">{tv('vocalReady')}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <audio controls className="w-full" src={audioUrl} />
                      <div className="flex gap-2">
                        <a href={audioUrl} download="pista-vocal.mp3" className="flex-1"><Button variant="outline" className="w-full gap-2"><Download className="w-4 h-4" /> {tv('downloadVocal')}</Button></a>
                        <Link to="/ai-studio/create" className="flex-1"><Button variant="outline" className="w-full gap-2"><Music className="w-4 h-4" /> {tv('generateInstrumental')}</Button></Link>
                      </div>
                      <p className="text-xs text-muted-foreground text-center">{tv('mixTip')}</p>
                    </CardContent>
                  </Card>
                )}
                {!audioUrl && (
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-base">{tv('howItWorks')}</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {(t('aiVocal.steps', { returnObjects: true }) as string[]).map((text: string, idx: number) => (
                        <div key={idx} className="flex gap-3 items-start">
                          <span className="min-w-[24px] h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                          <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {history.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-base">{tv('generatedTracks')}</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {history.slice(0, 5).map((h: any) => (
                        <div key={h.id} className="flex items-center gap-3 p-2 rounded-lg border border-border">
                          <Mic className="w-4 h-4 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{h.prompt || tv('vocalTrack')}</p>
                            <p className="text-[11px] text-muted-foreground">{new Date(h.created_at).toLocaleDateString('es-ES')}</p>
                          </div>
                          <a href={h.audio_url} download><Download className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-pointer" /></a>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* TAB: CLONE */}
          <TabsContent value="clone">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{vc('title')}</h2>
                  <p className="text-muted-foreground text-sm mt-1">{vc('subtitle')}</p>
                </div>
                {!showCloneForm && (
                  <Button onClick={() => setShowCloneForm(true)} className="gap-2"><Mic className="h-4 w-4" /> {vc('newVoice')}</Button>
                )}
              </div>
              {showCloneForm && (
                <div className="space-y-4">
                  {cloneFormUI}
                  <Button variant="ghost" onClick={() => { setShowCloneForm(false); setCloneAudioFile(null); setCloneAudioDuration(null); setCloneName(''); setCloneDescription(''); }}>{vc('cancel')}</Button>
                </div>
              )}
              {voiceClones.length > 0 && (
                <div className="grid gap-4">
                  {voiceClones.map(clone => (
                    <Card key={clone.id}>
                      <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1"><Badge className="bg-primary/15 text-primary border-0 text-xs">{vc('badge')}</Badge></div>
                          {editingCloneId === clone.id ? (
                            <div className="flex items-center gap-2">
                              <Input value={editingCloneName} onChange={e => setEditingCloneName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleRenameClone(clone.id); if (e.key === 'Escape') setEditingCloneId(null); }}
                                className="h-8 text-lg font-semibold w-48" maxLength={50} autoFocus />
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRenameClone(clone.id)}><Check className="h-3.5 w-3.5" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingCloneId(null)}><X className="h-3.5 w-3.5" /></Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-lg">{clone.name}</p>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => { setEditingCloneId(clone.id); setEditingCloneName(clone.name); }}><Pencil className="h-3.5 w-3.5" /></Button>
                            </div>
                          )}
                          {clone.description && <p className="text-xs text-muted-foreground mt-0.5">{clone.description}</p>}
                          <p className="text-xs text-muted-foreground mt-1">{vc('createdAt', { date: formatDate(clone.created_at) })}</p>
                          {clone.sample_url && (
                            <div className="flex items-center gap-2 mt-2">
                              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => togglePlay(clone)}>
                                {playingId === clone.id ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                              </Button>
                              <Slider value={[playingId === clone.id ? currentTime : 0]} max={playingId === clone.id && duration > 0 ? duration : 100} step={0.1} onValueChange={handleSeek} className="flex-1" disabled={playingId !== clone.id} />
                              <span className="text-[10px] text-muted-foreground tabular-nums w-16 text-right shrink-0">
                                {playingId === clone.id ? `${formatTime(currentTime)} / ${formatTime(duration)}` : '0:00'}
                              </span>
                            </div>
                          )}
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{vc('deleteTitle', { name: clone.name })}</AlertDialogTitle>
                              <AlertDialogDescription>{vc('deleteDesc')}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{vc('deleteCancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteClone(clone)}>{vc('deleteConfirm')}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="max-w-5xl mx-auto mt-12">{comingSoonUI(false)}</div>
      </main>
      
    </div>
  );
}
