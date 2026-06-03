const getValuePreview = (value: string | null) => (value ? `${value.slice(0, 4)}…` : "(none)");

export function validateIbsWebhookAuth(req: Request, logPrefix: string) {
  const webhookSecret = Deno.env.get("IBS_WEBHOOK_SECRET");

  if (!webhookSecret) {
    // SECURITY: reject all requests if secret is not configured — never allow open access
    console.error(`[${logPrefix}] IBS_WEBHOOK_SECRET not configured — rejecting request`);
    return false;
  }

  const url = new URL(req.url);
  const secretParam = url.searchParams.get("secret");
  const matched = secretParam === webhookSecret;

  console.log(
    `[${logPrefix}] Secret check — expected starts: "${getValuePreview(webhookSecret)}", query starts: "${getValuePreview(secretParam)}", matched: ${matched}`,
  );

  return matched;
}
