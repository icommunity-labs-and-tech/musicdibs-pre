import { useState, useEffect, useCallback } from 'react';
import Joyride, { CallBackProps, STATUS, ACTIONS, EVENTS, Step, TooltipRenderProps } from 'react-joyride';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

const TOUR_KEY = 'musicdibs_music_creator_tour_seen';

function getTourKey(userId: string) {
  return `${TOUR_KEY}_${userId}`;
}

function buildSteps(t: (k: string, fallback?: string) => string): Step[] {
  const has = (sel: string) =>
    typeof document !== 'undefined' && !!document.querySelector(sel);
  const targetOrBody = (sel: string): { target: string; placement?: 'center' } =>
    has(sel) ? { target: sel } : { target: 'body', placement: 'center' };


    const steps: Step[] = [
      {
        target: 'body',
        placement: 'center' as const,
        title: t('aiCreate.tour.welcomeTitle', 'Crea música completa con IA 🎵'),
        content: t(
          'aiCreate.tour.welcomeContent',
          'Esta herramienta genera canciones completas a partir de una descripción.\n\n• Canciones originales con letra\n• Bases instrumentales\n• Cualquier género musical\n\nTe mostramos cómo obtener los mejores resultados en pocos pasos.'
        ),
        disableBeacon: true,
      },
      {
        target: '[data-tour="mc-description"]',
        title: t('aiCreate.tour.descTitle', 'Describe tu canción 🎙️'),
        content: t(
          'aiCreate.tour.descContent',
          'Escribe cómo quieres que suene tu canción. Cuanto más detalle incluyas, mejores serán los resultados.\n\nEjemplo: "Una canción pop sobre un amor de verano, voz femenina, estilo Aitana"\n\n⚠️ No pongas textos contradictorios entre la descripción y el campo de letra. En ese caso la IA elegirá uno de los dos de forma aleatoria.'
        ),
        disableBeacon: true,
      },
    ];

    // Only include the lyrics step if the lyrics block is actually rendered (song mode)
    if (typeof document !== 'undefined' && document.querySelector('[data-tour="mc-lyrics"]')) {
      steps.push({
        target: '[data-tour="mc-lyrics"]',
        title: t('aiCreate.tour.lyricsTitle', 'Añade tu letra (opcional) 🎤'),
        content: t(
          'aiCreate.tour.lyricsContent',
          'Si tienes una letra escrita, pégala en el campo correspondiente. La IA la usará como base para la canción.\n\n⚠️ La IA puede modificar la letra para adaptarla a la descripción musical.\n\n💡 Si lo dejas vacío, la IA generará la letra automáticamente a partir de la descripción.'
        ),
        disableBeacon: true,
      });
    }

    steps.push(
      {
        target: '[data-tour="mc-settings"]',
        title: t('aiCreate.tour.voiceTitle', 'Ajusta el estilo musical 🎧'),
        content: t(
          'aiCreate.tour.voiceContent',
          'Selecciona una voz del catálogo o elige un artista virtual guardado para personalizar el estilo vocal de tu canción.\n\n🎤 Catálogo: voces predefinidas listas para usar\n🎙️ Artistas virtuales: tus voces y estilos guardados\n\nSi eliges "Solo instrumental", no se aplicará ninguna voz.'
        ),
        disableBeacon: true,
      },
      {
        target: '[data-tour="mc-settings"]',
        title: t('aiCreate.tour.durationTitle', 'Elige la duración ⏱️'),
        content: t(
          'aiCreate.tour.durationContent',
          'Define cuánto durará tu canción (de 1 a 4 minutos).\n\n💡 Consejo: empieza con duraciones cortas (1–2 min) para iterar rápido y, cuando te guste el resultado, genera la versión completa.\n\nRecuerda: a mayor duración, mayor consumo de créditos.'
        ),
        disableBeacon: true,
      },
      {
        target: '[data-tour="mc-generate"]',
        title: t('aiCreate.tour.generateTitle', 'Genera tu canción 🚀'),
        content: t(
          'aiCreate.tour.generateContent',
          'Cuando todo esté listo, pulsa este botón para generar tu canción.\n\nEl proceso dura aproximadamente 30–60 segundos. Mientras tanto, puedes seguir trabajando o explorar otras secciones.'
        ),
        disableBeacon: true,
      },
      {
        target: '[data-tour="mc-results"]',
        title: t('aiCreate.tour.resultsTitle', 'Tus resultados 🎶'),
        content: t(
          'aiCreate.tour.resultsContent',
          'Aquí aparecerán todas tus canciones generadas. Podrás:\n\n▶️ Reproducirlas y escuchar el resultado\n❤️ Marcarlas como favoritas\n⬇️ Descargarlas en alta calidad\n🛡️ Registrarlas en blockchain con un solo clic\n\nTodas tus generaciones quedan guardadas en tu biblioteca.'
        ),
        disableBeacon: true,
      },
      {
        target: '[data-tour="mc-tab-lyrics"]',
        title: t('aiCreate.tour.lyricsTabTitle', 'Compositor de letras ✍️'),
        content: t(
          'aiCreate.tour.lyricsTabContent',
          'Si solo necesitas una letra, cambia a esta pestaña.\n\nPodrás generar letras profesionales eligiendo género, mood, estructura, esquema de rima y más, para luego usarlas en la creación musical.'
        ),
        disableBeacon: true,
      },
      {
        target: 'body',
        placement: 'center' as const,
        title: t('aiCreate.tour.readyTitle', '¡Listo para crear! 🎉'),
        content: t(
          'aiCreate.tour.readyContent',
          'Ya conoces todo lo que necesitas para crear tu música con IA.\n\n💡 Recuerda: cuanto más específica sea tu descripción, mejores resultados obtendrás.\n\nPuedes volver a ver este tutorial en cualquier momento desde el botón de ayuda.'
        ),
        disableBeacon: true,
      },
    );

    return steps;
  }, [t]);
}

function CustomTooltip({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  tooltipProps,
  isLastStep,
  size,
  skipProps,
}: TooltipRenderProps) {
  const { t } = useTranslation();
  return (
    <div
      {...tooltipProps}
      className="w-80 rounded-2xl border border-border/40 bg-background p-5 shadow-2xl"
      style={{ zIndex: 10002 }}
    >
      {step.title && (
        <h3 className="text-base font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {step.title as string}
        </h3>
      )}
      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line mb-4">
        {step.content as string}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {Array.from({ length: size }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {index === 0 ? (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" {...skipProps}>
              {t('dashboard.tour.skip', 'Saltar')}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="text-xs" {...backProps}>
              {t('dashboard.tour.back', 'Atrás')}
            </Button>
          )}

          {isLastStep ? (
            <Button
              size="sm"
              className="text-xs bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground shadow-md"
              {...closeProps}
            >
              {t('dashboard.tour.start', '¡Empezar!')}
            </Button>
          ) : (
            <Button
              size="sm"
              className="text-xs bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground shadow-md"
              {...primaryProps}
            >
              {t('dashboard.tour.next', 'Siguiente')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function MusicCreatorTour() {
  const { user } = useAuth();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const steps = useSteps();

  useEffect(() => {
    if (!user) return;
    const seen = localStorage.getItem(getTourKey(user.id));
    if (!seen) {
      const timer = setTimeout(() => setRun(true), 800);
      return () => clearTimeout(timer);
    }
  }, [user]);

  useEffect(() => {
    const handler = () => {
      setStepIndex(0);
      setRun(true);
    };
    window.addEventListener('musicdibs:start-music-tour', handler);
    return () => window.removeEventListener('musicdibs:start-music-tour', handler);
  }, []);

  const handleCallback = useCallback(
    (data: CallBackProps) => {
      const { status, action, index, type } = data;

      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        setRun(false);
        setStepIndex(0);
        if (user) {
          localStorage.setItem(getTourKey(user.id), 'true');
        }
        return;
      }

      if (type === 'step:after') {
        if (action === ACTIONS.PREV) {
          setStepIndex(index - 1);
        } else {
          setStepIndex(index + 1);
        }
      }
    },
    [user],
  );

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      scrollToFirstStep
      showSkipButton
      disableOverlayClose
      disableCloseOnEsc={false}
      callback={handleCallback}
      tooltipComponent={CustomTooltip}
      styles={{
        options: {
          zIndex: 10001,
          arrowColor: 'hsl(var(--background))',
          overlayColor: 'rgba(0, 0, 0, 0.45)',
        },
        spotlight: {
          borderRadius: '12px',
        },
      }}
      floaterProps={{
        styles: {
          arrow: {
            length: 8,
            spread: 14,
          },
        },
      }}
    />
  );
}
