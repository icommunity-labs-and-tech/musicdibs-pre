const getValuePreview = (value: string | null) => (value ? `${value.slice(0, 4)}…` : "(none)");

const getAuthorizationToken = (req: Request) => {
  const authHeader = req.headers.get("authorization")?.trim();

  if (!authHeader) return null;
  if (/^bearer\s+/i.test(authHeader)) {
    const token = authHeader.replace(/^bearer\s+/i, "").trim();
    return token || null;
  }

  return authHeader;
};

export function validateIbsWebhookAuth(req: Request, logPrefix: string) {
  const webhookSecret = Deno.env.get("IBS_WEBHOOK_SECRET");

  if (!webhookSecret) {
    console.warn(`[${logPrefix}] IBS_WEBHOOK_SECRET not configured, skipping validation`);
    return true;
  }

  const url = new URL(req.url);
  const secretParam = url.searchParams.get("secret");
  const authorizationToken = getAuthorizationToken(req);
  const queryMatch = secretParam === webhookSecret;
  const authorizationMatch = authorizationToken === webhookSecret;
  const matchedVia = queryMatch ? "query" : authorizationMatch ? "authorization" : "none";

  console.log(
    `[${logPrefix}] Secret check — expected starts: "${getValuePreview(webhookSecret)}", query starts: "${getValuePreview(secretParam)}", auth starts: "${getValuePreview(authorizationToken)}", matched_via: ${matchedVia}`,
  );

  return queryMatch || authorizationMatch;
}