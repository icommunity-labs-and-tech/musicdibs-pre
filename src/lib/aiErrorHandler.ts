/**
 * Maps AI provider error responses to user-friendly messages.
 * Used across all AI Studio pages for consistent error handling.
 */

const FRIENDLY_MESSAGES: Record<string, { title: string; description: string }> = {
  provider_unavailable: {
    title: 'Servicio no disponible',
    description: 'El servicio de IA no está disponible en este momento. Por favor, inténtalo de nuevo más tarde.',
  },
  rate_limit_exceeded: {
    title: 'Demasiadas solicitudes',
    description: 'Has realizado muchas solicitudes en poco tiempo. Espera unos segundos e inténtalo de nuevo.',
  },
  insufficient_credits: {
    title: 'Créditos insuficientes',
    description: 'No tienes suficientes créditos para esta operación. Recarga tus créditos para continuar.',
  },
  provider_rate_limit: {
    title: 'Servicio temporalmente saturado',
    description: 'El servicio está procesando muchas solicitudes. Inténtalo de nuevo en unos minutos.',
  },
  content_filtered: {
    title: 'Contenido no permitido',
    description: 'El contenido ha sido filtrado por las políticas de seguridad. Intenta modificar tu descripción.',
  },
};

const DEFAULT_ERROR = {
  title: 'Error al procesar tu solicitud',
  description: 'Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo más tarde.',
};

export interface AiErrorResult {
  title: string;
  description: string;
}

/**
 * Parses an error from an AI edge function call and returns a friendly message.
 */
export function parseAiError(error: any, data?: any): AiErrorResult {
  const errorCode = data?.error || error?.error || error?.message || '';

  // Check known error codes first
  if (typeof errorCode === 'string') {
    const match = FRIENDLY_MESSAGES[errorCode];
    if (match) return match;
  }

  // Check for provider-specific patterns in error messages or details
  const errorText = JSON.stringify({ error: errorCode, details: data?.details || error?.details || '' }).toLowerCase();

  if (errorText.includes('payment_required') || errorText.includes('paid_plan_required') || errorText.includes('billing')) {
    return FRIENDLY_MESSAGES.provider_unavailable;
  }

  if (errorText.includes('rate_limit') || errorText.includes('too many requests') || errorText.includes('429')) {
    return FRIENDLY_MESSAGES.provider_rate_limit;
  }

  if (errorText.includes('content_policy') || errorText.includes('safety') || errorText.includes('nsfw')) {
    return FRIENDLY_MESSAGES.content_filtered;
  }

  if (errorText.includes('unauthorized') || errorText.includes('forbidden') || errorText.includes('401') || errorText.includes('403')) {
    return FRIENDLY_MESSAGES.provider_unavailable;
  }

  if (errorText.includes('timeout') || errorText.includes('503') || errorText.includes('502') || errorText.includes('504')) {
    return {
      title: 'Servicio temporalmente no disponible',
      description: 'El servicio está experimentando problemas. Por favor, inténtalo de nuevo en unos minutos.',
    };
  }

  return DEFAULT_ERROR;
}
