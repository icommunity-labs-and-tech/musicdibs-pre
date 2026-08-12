import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Play, Pause, RotateCcw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob, durationSec: number) => void;
  minDurationSec?: number;
  maxDurationSec?: number;
  recordLabel?: string;
  stopLabel?: string;
  retryLabel?: string;
  useLabel?: string;
}

/**
 * Grabador de audio por micrófono reutilizable (MediaRecorder API).
 * Usado en la clonación de voz KIE: tanto para la muestra inicial como
 * para la lectura en vivo de la frase de verificación anti-fraude.
 */
export function VoiceRecorder({
  onRecordingComplete,
  minDurationSec = 0,
  maxDurationSec = 120,
  recordLabel = 'Grabar',
  stopLabel = 'Detener',
  retryLabel = 'Repetir',
  useLabel = 'Usar esta grabación',
}: VoiceRecorderProps) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const clearTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  // Limpieza únicamente al desmontar: no debe re-ejecutarse con cada grabación.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => { clearTimer(); stopStream(); if (recordedUrl) URL.revokeObjectURL(recordedUrl); }, []);

  const startRecording = useCallback(async () => {
    setIsRequesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
        stopStream();
      };

      recorder.start();
      setIsRecording(true);
      setElapsed(0);
      timerRef.current = window.setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (next >= maxDurationSec) {
            recorder.stop();
            setIsRecording(false);
            clearTimer();
          }
          return next;
        });
      }, 1000);
    } catch {
      toast({ title: 'No se pudo acceder al micrófono', description: 'Comprueba los permisos de tu navegador.', variant: 'destructive' });
    } finally {
      setIsRequesting(false);
    }
  }, [maxDurationSec, stopStream, toast]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    clearTimer();
  }, []);

  const retry = useCallback(() => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setElapsed(0);
    setIsPlaying(false);
  }, [recordedUrl]);

  const togglePreview = useCallback(() => {
    if (!recordedUrl) return;
    if (isPlaying) { audioRef.current?.pause(); setIsPlaying(false); return; }
    const audio = new Audio(recordedUrl);
    audioRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    audio.play();
    setIsPlaying(true);
  }, [recordedUrl, isPlaying]);

  const formatTime = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
  const meetsMin = elapsed >= minDurationSec;

  if (recordedBlob && recordedUrl) {
    return (
      <div className="flex flex-col gap-3 p-4 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-3">
          <Button type="button" size="icon" variant="outline" onClick={togglePreview}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <span className="text-sm text-muted-foreground">Grabación de {formatTime(elapsed)}</span>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={retry} className="gap-2">
            <RotateCcw className="h-3.5 w-3.5" /> {retryLabel}
          </Button>
          <Button type="button" size="sm" onClick={() => onRecordingComplete(recordedBlob, elapsed)} className="gap-2">
            {useLabel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 p-6 rounded-lg border bg-muted/30">
      {isRecording && (
        <span className="text-2xl font-mono tabular-nums text-primary">{formatTime(elapsed)}</span>
      )}
      <Button
        type="button"
        size="lg"
        variant={isRecording ? 'destructive' : 'default'}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isRequesting}
        className="gap-2"
      >
        {isRequesting ? <Loader2 className="h-4 w-4 animate-spin" /> : isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        {isRecording ? stopLabel : recordLabel}
      </Button>
      {isRecording && minDurationSec > 0 && !meetsMin && (
        <p className="text-xs text-muted-foreground">Mínimo {minDurationSec}s ({minDurationSec - elapsed}s restantes)</p>
      )}
    </div>
  );
}
