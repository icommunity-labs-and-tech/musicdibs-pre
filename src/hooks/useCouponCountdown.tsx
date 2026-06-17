import { useEffect, useState } from "react";

/**
 * Hook genérico para popups de cupón con cuenta atrás.
 * Regla global: cuando el contador llega a 00 (o la fecha ya pasó),
 * el popup queda desactivado para siempre.
 *
 * Devuelve:
 *  - days/hours/minutes/seconds: valores actuales del contador
 *  - expired: true si el deadline ya pasó (no debe mostrarse nunca más)
 */
export const useCouponCountdown = (deadline: Date) => {
  const calc = () => {
    const diff = Math.max(0, deadline.getTime() - Date.now());
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff / 3600000) % 24),
      minutes: Math.floor((diff / 60000) % 60),
      seconds: Math.floor((diff / 1000) % 60),
      expired: diff <= 0,
    };
  };

  const [time, setTime] = useState(calc);

  useEffect(() => {
    if (time.expired) return;
    const id = setInterval(() => {
      const next = calc();
      setTime(next);
      if (next.expired) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline.getTime()]);

  return time;
};
