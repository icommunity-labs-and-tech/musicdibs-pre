const getValuePreview = (value: string | null) => (value ? `${value.slice(0, 4)}…` : "(none)");

/**
 * Valida la autenticación de los webhooks de iBS.
 *
 * iBS puede enviar el secret de dos formas (cualquiera de ellas es válida):
 *   1. Query string:  ?secret=<IBS_WEBHOOK_SECRET>
 *   2. Cabecera HTTP: Authorization: Bearer <IBS_WEBHOOK_SECRET>
 *
 * Por eso webhooks configurados en el dashboard de iBS sin `?secret=` en la URL
 * pueden seguir devolviendo 200: están autenticando vía cabecera Authorization.
 */
export function validateIbsWebhookAuth(req: Request, logPrefix: string) {
  const webhookSecret = Deno.env.get("IBS_WEBHOOK_SECRET");

  if (!webhookSecret) {
    // SECURITY: reject all requests if secret is not configured — never allow open access
    console.error(`[${logPrefix}] IBS_WEBHOOK_SECRET not configured — rejecting request`);
    return false;
  }

  const url = new URL(req.url);
  const secretParam = url.searchParams.get("secret");

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const authToken = bearerMatch ? bearerMatch[1].trim() : null;

  const matchedQuery = secretParam !== null && secretParam === webhookSecret;
  const matchedAuth = authToken !== null && authToken === webhookSecret;
  const matched = matchedQuery || matchedAuth;
  const matchedVia = matchedQuery ? "query" : matchedAuth ? "authorization" : "none";

  console.log(
    `[${logPrefix}] Secret check — expected starts: "${getValuePreview(webhookSecret)}", query starts: "${getValuePreview(secretParam)}", auth starts: "${getValuePreview(authToken)}", matched_via: ${matchedVia}`,
  );

  return matched;
}
