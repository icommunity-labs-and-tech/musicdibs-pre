import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Music, Search, Play, Pause, Loader2, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioAsset {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  genre?: string;
  mood?: string;
}

interface LibraryAudioPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string, title: string) => void;
}

export function LibraryAudioPicker({ open, onOpenChange, onSelect }: LibraryAudioPickerProps) {
  const { user } = useAuth();
  const [assets, setAssets] = useState<AudioAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    supabase
      .from('ai_generations')
      .select('id, prompt, audio_url, genre, mood, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setAssets(
            data
              .filter((s) => s.audio_url)
              .map((s) => ({
                id: s.id,
                title: s.prompt?.substring(0, 80) || 'Canción sin título',
                url: s.audio_url,
                createdAt: s.created_at,
                genre: s.genre || undefined,
                mood: s.mood || undefined,
              }))
          );
        }
        setLoading(false);
      });
  }, [open, user]);

  const filtered = assets.filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  const togglePlay = (asset: AudioAsset) => {
    if (playingId === asset.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(asset.url);
    audio.onended = () => setPlayingId(null);
    audio.play();
    audioRef.current = audio;
    setPlayingId(asset.id);
  };

  const handleSelect = (asset: AudioAsset) => {
    if (audioRef.current) audioRef.current.pause();
    setPlayingId(null);
    onSelect(asset.url, asset.title);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v && audioRef.current) { audioRef.current.pause(); setPlayingId(null); }
      onOpenChange(v);
    }}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Seleccionar audio de tu biblioteca
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-1 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Music className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">
                {assets.length === 0 ? 'No tienes audios en tu biblioteca' : 'Sin resultados'}
              </p>
            </div>
          ) : (
            filtered.map((asset) => (
              <div
                key={asset.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg border border-border/60 p-3 cursor-pointer transition-colors hover:bg-muted/50',
                  playingId === asset.id && 'border-primary/40 bg-primary/5'
                )}
                onClick={() => handleSelect(asset)}
              >
                <button
                  type="button"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                  onClick={(e) => { e.stopPropagation(); togglePlay(asset); }}
                >
                  {playingId === asset.id
                    ? <Pause className="h-4 w-4 text-primary" />
                    : <Play className="h-4 w-4 text-primary ml-0.5" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{asset.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {[asset.genre, asset.mood].filter(Boolean).join(' · ') ||
                      new Date(asset.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleSelect(asset); }}>
                  Usar
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
