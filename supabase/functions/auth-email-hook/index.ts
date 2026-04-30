import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_NAME = 'MusicDibs'
const ROOT_DOMAIN = 'musicdibs.com'
const FROM_EMAIL = `MusicDibs <noreply@notify.${ROOT_DOMAIN}>`

const SUBJECTS: Record<string, string> = {
  signup: 'Confirma tu email en MusicDibs',
  invite: 'Te han invitado a MusicDibs',
  magiclink: 'Tu enlace de acceso a MusicDibs',
  recovery: 'Restablece tu contraseña en MusicDibs',
  email_change: 'Confirma tu nuevo email en MusicDibs',
  reauthentication: 'Tu código de verificación de MusicDibs',
}

const REDIRECTS: Record<string, string> = {
  recovery: `https://${ROOT_DOMAIN}/reset-password`,
  signup: `https://${ROOT_DOMAIN}/dashboard`,
  magiclink: `https://${ROOT_DOMAIN}/dashboard`,
  invite: `https://${ROOT_DOMAIN}/dashboard`,
  email_change: `https://${ROOT_DOMAIN}/dashboard`,
  reauthentication: `https://${ROOT_DOMAIN}/dashboard`,
}

function buildHtml(emailType: string, confirmationUrl: string, token: string, recipient: string): string {
  const s = `
    body{background:#0d0618;font-family:'Segoe UI',Roboto,Arial,sans-serif;margin:0;padding:0}
    .wrap{max-width:600px;margin:0 auto;padding:40px 20px}
    .logo{text-align:center;margin-bottom:28px}
    .logo-text{color:#a855f7;font-size:22px;font-weight:800;letter-spacing:1px;margin:0}
    .tagline{color:#9ca3af;font-size:11px;margin:4px 0 0}
    .card{background:#1a0a2e;border-radius:16px;padding:40px 36px;text-align:center}
    h1{font-size:24px;font-weight:700;color:#f3f4f6;margin:0 0 16px}
    p{font-size:15px;color:#d1d5db;line-height:1.7;margin:0 0 20px}
    .btn{display:inline-block;background:#a855f7;color:#fff;font-size:15px;font-weight:600;border-radius:10px;padding:14px 40px;text-decoration:none;margin:8px 0 24px}
    .code{font-family:monospace;font-size:32px;font-weight:800;color:#a855f7;letter-spacing:6px;margin:16px 0 28px}
    .note{font-size:12px;color:#6b7280;margin:20px 0 0}
    .footer{font-size:11px;color:#6b7280;text-align:center;margin-top:28px}
  `

  const contents: Record<string, string> = {
    signup: `<h1>🎵 Confirma tu email</h1>
      <p>¡Gracias por registrarte en MusicDibs! Confirma tu dirección de email haciendo clic en el botón:</p>
      <a href="${confirmationUrl}" class="btn">Verificar email →</a>
      <p class="note">Si no creaste una cuenta, puedes ignorar este email.</p>`,
    recovery: `<h1>🔑 Restablece tu contraseña</h1>
      <p>Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el botón para elegir una nueva:</p>
      <a href="${confirmationUrl}" class="btn">Restablecer contraseña →</a>
      <p class="note">Si no solicitaste este cambio, puedes ignorar este email.</p>`,
    magiclink: `<h1>✨ Tu enlace de acceso</h1>
      <p>Haz clic en el botón para acceder a MusicDibs. Este enlace caduca en breve.</p>
      <a href="${confirmationUrl}" class="btn">Acceder a MusicDibs →</a>
      <p class="note">Si no solicitaste este enlace, puedes ignorar este email.</p>`,
    invite: `<h1>🎶 Te han invitado</h1>
      <p>Has sido invitado a unirte a MusicDibs. Haz clic para aceptar la invitación:</p>
      <a href="${confirmationUrl}" class="btn">Aceptar invitación →</a>
      <p class="note">Si no esperabas esta invitación, puedes ignorar este email.</p>`,
    email_change: `<h1>📧 Confirma tu nuevo email</h1>
      <p>Has solicitado cambiar tu email en MusicDibs. Haz clic para confirmar:</p>
      <a href="${confirmationUrl}" class="btn">Confirmar cambio →</a>
      <p class="note">Si no solicitaste este cambio, protege tu cuenta de inmediato.</p>`,
    reauthentication: `<h1>🔒 Código de verificación</h1>
      <p>Usa el siguiente código para confirmar tu identidad:</p>
      <div class="code">${token}</div>
      <p class="note">Este código caduca en breve. Si no lo solicitaste, ignora este email.</p>`,
  }

  const content = contents[emailType] || `<h1>Notificación de MusicDibs</h1><a href="${confirmationUrl}" class="btn">Continuar →</a>`

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${s}</style></head>
<body><div class="wrap">
  <div class="logo"><p class="logo-text">MUSICDIBS</p><p class="tagline">by iCommunity · Registro de Propiedad Intelectual</p></div>
  <div class="card">${content}</div>
  <p class="footer">musicdibs.com · <a href="mailto:soporte@musicdibs.com" style="color:#a855f7">Soporte</a></p>
</div></body></html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const rawSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') ?? ''
    const hookSecret = rawSecret.replace('v1,whsec_', '')

    const payload = await req.text()
    const headers = Object.fromEntries(req.headers)

    let body: any
    try {
      const wh = new Webhook(hookSecret)
      body = wh.verify(payload, headers)
    } catch (err) {
      console.error('[AUTH-EMAIL-HOOK] Verification failed:', String(err))
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const emailType = body.email_data?.email_action_type
    const recipientEmail = body.user?.email
    const token = body.email_data?.token ?? ''

    if (!emailType || !recipientEmail) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Allowlist explícito: solo procesamos eventos transaccionales conocidos.
    // signInWithPassword NO dispara este hook, pero por seguridad ignoramos
    // cualquier tipo no soportado devolviendo 200 (no bloquea al usuario).
    const ALLOWED_TYPES = new Set([
      'signup', 'magiclink', 'recovery', 'invite', 'email_change', 'reauthentication',
    ])
    if (!ALLOWED_TYPES.has(emailType)) {
      return new Response(JSON.stringify({ success: true, skipped: emailType }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const siteUrl = body.email_data?.site_url || `https://${ROOT_DOMAIN}`
    const baseUrl = siteUrl.includes('/auth/v1') ? siteUrl.replace('/auth/v1', '') : siteUrl
    const appRedirect = REDIRECTS[emailType] ?? `https://${ROOT_DOMAIN}/dashboard`
    const confirmationUrl = `${baseUrl}/auth/v1/verify?token=${body.email_data.token_hash}&type=${emailType}&redirect_to=${encodeURIComponent(appRedirect)}`

    const html = buildHtml(emailType, confirmationUrl, token, recipientEmail)
    const subject = SUBJECTS[emailType] || 'Notificación de MusicDibs'

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured')

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to: [recipientEmail], subject, html }),
    })

    if (!resendRes.ok) {
      const errText = await resendRes.text()
      console.error('[AUTH-EMAIL-HOOK] Resend error:', resendRes.status, errText)
      throw new Error(`Resend error ${resendRes.status}`)
    }

    const resendData = await resendRes.json()

    // Log en BD (no crítico)
    try {
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      await supabase.from('email_send_log').insert({
        message_id: resendData.id || crypto.randomUUID(),
        template_name: emailType,
        recipient_email: recipientEmail,
        status: 'sent',
      })
    } catch (logErr) {
      console.warn('[AUTH-EMAIL-HOOK] Log error (non-critical):', String(logErr))
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('[AUTH-EMAIL-HOOK] Error:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
