# STATUS — MusicDibs (musicdibs-pre)

_Última actualización: 2026-09-24 23:15 UTC_

---

## Estado actual

- Acabamos de publicar (via Lovable) dos fixes de Core Web Vitals: diferir GTM fuera de la primera interacción (mejora INP móvil) y separar el bundle principal en chunks vendor cacheables (React/Supabase/Radix), que redujo el chunk principal de 622KB a 218KB. Pendiente de confirmar el impacto real en Search Console/PageSpeed en los próximos días (CrUX tarda ~28 días en reflejar cambios completos).
- Investigación abierta sin resolver: al menos 3 usuarios (todos plan Monthly, patrón estadísticamente muy significativo) reportan "Error subiendo archivo: new row violates row-level security policy" al registrar una obra. Reproducir con una sesión nueva generada por nosotros SIEMPRE funciona bien -- el problema no se ha logrado reproducir desde el backend. Se instrumentó un reporte de diagnóstico (tabla `rls_upload_debug_reports`, función `debug-report-rls-upload`) que captura los claims del JWT real en el momento del fallo -- esperando que vuelva a ocurrir para tener datos reales.
- Detectado un patrón preocupante repetido varias veces esta sesión: commits hechos localmente que nunca llegaban a `origin/main` (quedaban "ahead by 1 commit" sin que el push se ejecutara realmente). Pasó con al menos 3 fixes distintos (aniversario sin plan, fix de GTM, manualChunks) -- cada vez que se investigó algo y "ya estaba corregido en el código", había que verificar con `git fetch origin main` + comparar si el fix REALMENTE estaba en remoto antes de asumir que estaba desplegado.

## Última sesión

Sesión muy larga y variada. Bloques principales:

1. **Auditoría de modelos de IA**: actualizados Suno V5→V6, Kling v2.5→v3, ElevenLabs Music v1→v2. Pendiente: Flux imágenes (fal.ai), Runway.
2. **Marca/legal**: descartado usar "Powered by Suno" (términos de Suno prohíben uso de marca sin permiso, KIE no es partner oficial).
3. **Bugs de facturación corregidos**: mensaje de renovación con "simplifica el prompt" cuando era error de KIE; IVA no aplicado en 51 suscripciones migradas de WooCommerce (42 corregidas, 9 pendientes por dirección incompleta); auto-corrector de "doble asignación de créditos" que sobre-corregía (triplicaba reversiones); auditor de integridad contaminado por cargos de otros negocios (ICOM, Certyfile) que comparten la cuenta Stripe; bug crítico de facturación: usuarios YA suscritos veían botón "Get Artist Pro" tras registrar canción y en landing, sin verificar plan activo -- riesgo real de suscripción duplicada, corregido y verificado que no hubo víctimas.
4. **Automatización MailerLite**: creadas automatizaciones faltantes de "Carrito abandonado" EN/BR (solo existía ES), y separado el segmento "Bono sin usar" (nunca usó ningún crédito, necesita mensaje de activación) de "Pocos créditos" (ya usó algo, necesita mensaje de recompra) -- 1.839 usuarios afectados por esta mezcla.
5. **Storage cleanup**: corregido bug real por el que el cron semanal de limpieza de storage nunca completaba nada ("Too many connections issued to the database" al recorrer buckets grandes). Liberados ~11GB de auphonic-temp, 286 usuarios notificados en ai-generations (proceso gradual de avisos en curso). ai-generations sigue necesitando ejecución manual por lotes (parámetro `firstChars`) hasta implementar paginación automática.
6. **Cambio de nombres de planes**: Annual 100-1000 → "Artist Pro", Annual 20 → "Creator", Monthly → "Starter". Casi todo el código ya lo tenía aplicado; solo faltaba el filtro de `/admin/users`, ya corregido.
7. **Core Web Vitals** (musicdibs.com/news/best-suno-ai-alternative y sitio general): INP móvil "Poor" (656ms) causado por GTM cargándose en la primera interacción del usuario -- corregido. CLS elevado en desktop -- corregido (según confirmación del usuario). Bundle principal de 622KB cargado en cada página -- corregido con manualChunks (ver "Estado actual").
8. **Corrección de datos puntuales**: reconciliación de perfiles huérfanos (auth.users sin profile), reembolsos de créditos por bugs de doble-clic en registro (varios casos), certificación manual de evidencias de compra con `user_id` NULL en el momento del webhook.

## Decisiones tomadas

- [2026-09-24] manualChunks en vite.config.ts: separar React, Supabase y Radix UI en chunks vendor propios para mejorar cacheo entre despliegues.
- [2026-09-24] GTM se carga solo tras `load` + `requestIdleCallback`, nunca en la primera interacción del usuario (pointerdown/keydown/scroll/touchstart quitados como triggers).
- [2026-09-21] `works-files` (archivos originales de obras subidos por el usuario) NO debe estar en la lista `PROTECTED` de `cleanup-storage-assets` -- MusicDibs no es almacén permanente del archivo original, solo de la evidencia (certificado PDF + registro blockchain). Es responsabilidad del usuario conservar su propia copia.
- [2026-09-20] Al reconciliar perfiles de cuentas eliminadas y recreadas, NO asumir automáticamente que corresponde un nuevo bono de bienvenida -- verificar si hay suscripción o compra vigente real primero.
- [2026-09-16] No usar el nombre "Powered by Suno" ni similar en ningún lugar de MusicDibs -- riesgo legal real (términos de Suno + KIE no es partner oficial confirmado).
- Ley 10/2025 (aviso 15 días antes de renovación) NO aplica a iCommunity Labs -- no alcanza ninguno de los 3 umbrales de tamaño de empresa (250 empleados / 50M€ facturación / 43M€ balance).

## Bloqueantes

- Ninguno crítico activo ahora mismo. El caso de RLS en registro (3 usuarios, plan Monthly) sigue sin causa confirmada, pero no bloquea nada más allá de esos usuarios específicos -- a la espera de que vuelva a ocurrir con el diagnóstico ya instrumentado.

## Próximos pasos

1. Revisar `rls_upload_debug_reports` la próxima vez que un usuario reporte el error de RLS al registrar -- comparar los claims del JWT capturados contra una sesión normal para encontrar la causa real.
2. Confirmar en unos días (Search Console / PageSpeed) el impacto real de los fixes de Core Web Vitals de hoy (INP, CLS, tamaño de bundle) una vez que CrUX incorpore los cambios.
3. Completar el proceso gradual de limpieza de `ai-generations` en Supabase Storage (286 usuarios ya notificados, seguirá avanzando solo, pero revisar que las siguientes fases -- aviso final, mover a trash -- se ejecuten correctamente).
4. Investigar el hallazgo de seguridad que señaló Lovable: cualquier usuario con sesión puede leer la tabla `platform_config` (quedó pendiente, no se llegó a investigar en esta sesión).
5. Implementar paginación automática en `cleanup-storage-assets` para que `ai-generations` no siga necesitando ejecución manual por lotes cada vez.

## Contexto importante

- **Patrón crítico a vigilar**: verificar siempre `git fetch origin main` + comparar contra el commit local antes de asumir que un fix "ya está en producción" solo porque el código local lo tiene -- varias veces esta sesión el commit existía localmente pero nunca se había pusheado, dejando el fix sin desplegar durante días.
- **Lovable puede quedarse sin créditos**: si `send_message` falla con "workspace is out of credits", es un bloqueante real para publicar cualquier cambio de frontend -- avisar de inmediato, no es algo que se resuelva reintentando.
- **Patrón de reembolso de créditos por doble-clic en registro**: varios usuarios distintos esta sesión registraron la misma obra 2-4 veces en menos de 1-6 segundos, pagando de más. Podría valer la pena investigar si hace falta una protección de doble-submit en el frontend del wizard de registro (no se investigó la causa técnica raíz, solo se corrigieron los casos puntuales con reembolso).
- El resto de contexto de negocio de largo plazo (stack, pricing, contactos de Stripe/Supabase/Lovable, principios de seguridad en facturación) sigue vigente tal como está documentado en la memoria de usuario de Claude -- este STATUS.md complementa esa memoria con el detalle técnico de esta sesión concreta, no lo sustituye.
