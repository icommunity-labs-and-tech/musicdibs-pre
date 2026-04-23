import { useState, useEffect, useCallback, useMemo } from 'react';
import Joyride, { CallBackProps, STATUS, ACTIONS, Step, TooltipRenderProps } from 'react-joyride';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

function useSteps(): Step[] {
  const { t } = useTranslation();
  return useMemo(() => {
    const steps: Step[] = [
      {
        target: 'body',
        placement: 'center' as const,
        title: t('virtualArtists.tour.welcomeTitle', 'Crea tu artista virtual 🎤'),
        content: t(
          'virtualArtists.tour.welcomeContent',
          'Un artista virtual guarda tu voz, género, mood y notas de estilo para que todas tus canciones suenen coherentes.\n\nTe enseñamos cómo configurarlo en pocos pasos.',
        ),
        disableBeacon: true,
      },
      {
        target: '[data-tour="va-new"]',
        title: t('virtualArtists.tour.newTitle', 'Crea un nuevo perfil'),
        content: t(
          'virtualArtists.tour.newContent',
          'Pulsa aquí para abrir el formulario y empezar a configurar un nuevo artista virtual.',
        ),
        disableBeacon: true,
      },
    ];

    if (typeof document !== 'undefined' && document.querySelector('[data-tour="va-name"]')) {
      steps.push(
        {
          target: '[data-tour="va-name"]',
          title: t('virtualArtists.tour.nameTitle', 'Pon nombre a tu artista'),
          content: t(
            'virtualArtists.tour.nameContent',
            'Elige un nombre que represente tu proyecto musical. Te servirá para identificarlo al generar nuevas canciones.',
          ),
          disableBeacon: true,
        },
        {
          target: '[data-tour="va-voice"]',
          title: t('virtualArtists.tour.voiceTitle', 'Elige una voz'),
          content: t(
            'virtualArtists.tour.voiceContent',
            'Selecciona la voz predefinida que mejor encaje con tu artista. Puedes escuchar una muestra antes de elegir.',
          ),
          disableBeacon: true,
        },
        {
          target: '[data-tour="va-genre"]',
          title: t('virtualArtists.tour.genreTitle', 'Género y mood'),
          content: t(
            'virtualArtists.tour.genreContent',
            'Selecciona el género y el mood que definen el sonido de tu artista. Se aplicarán por defecto en cada generación.',
          ),
          disableBeacon: true,
        },
        {
          target: '[data-tour="va-notes"]',
          title: t('virtualArtists.tour.notesTitle', 'Notas de estilo'),
          content: t(
            'virtualArtists.tour.notesContent',
            'Describe referencias musicales, idioma habitual, atmósfera y elementos distintivos.\n\n💡 Usa "Generar con IA" para que te proponga un texto a partir de tus elecciones.',
          ),
          disableBeacon: true,
        },
        {
          target: '[data-tour="va-save"]',
          title: t('virtualArtists.tour.saveTitle', 'Guarda tu artista 🚀'),
          content: t(
            'virtualArtists.tour.saveContent',
            'Cuando esté todo listo, guarda el perfil. Podrás reutilizarlo cada vez que generes música en el AI Studio.',
          ),
          disableBeacon: true,
        },
      );
    }

    return steps;
  }, [t]);
}

function CustomTooltip({
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

export function VirtualArtistsTour() {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const steps = useSteps();

  useEffect(() => {
    const handler = () => {
      setStepIndex(0);
      setRun(true);
    };
    window.addEventListener('musicdibs:start-virtual-artists-tour', handler);
    return () => window.removeEventListener('musicdibs:start-virtual-artists-tour', handler);
  }, []);

  const handleCallback = useCallback((data: CallBackProps) => {
    const { status, action, index, type } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      setStepIndex(0);
      return;
    }

    if (type === 'step:after') {
      if (action === ACTIONS.PREV) {
        setStepIndex(index - 1);
      } else {
        setStepIndex(index + 1);
      }
    }
  }, []);

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
