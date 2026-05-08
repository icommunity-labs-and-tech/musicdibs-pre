import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_NAME = 'MusicDibs'
const ROOT_DOMAIN = 'musicdibs.com'
const FROM_EMAIL = `MusicDibs <noreply@notify.${ROOT_DOMAIN}>`

function normalizeLanguage(lang: string | null | undefined): string {
  if (!lang) return 'es'
  const l = lang.toLowerCase().trim()
  if (l.startsWith('pt')) return 'pt-BR'
  if (l.startsWith('en')) return 'en'
  if (l.startsWith('es')) return 'es'
  return 'es'
}

const SUBJECTS: Record<string, Record<string, string>> = {
  signup: {
    es: 'Confirma tu email en MusicDibs',
    en: 'Confirm your email on MusicDibs',
    'pt-BR': 'Confirme seu email no MusicDibs',
  },
  invite: {
    es: 'Te han invitado a MusicDibs',
    en: 'You have been invited to MusicDibs',
    'pt-BR': 'Você foi convidado para o MusicDibs',
  },
  magiclink: {
    es: 'Tu enlace de acceso a MusicDibs',
    en: 'Your access link to MusicDibs',
    'pt-BR': 'Seu link de acesso ao MusicDibs',
  },
  recovery: {
    es: 'Restablece tu contraseña en MusicDibs',
    en: 'Reset your password on MusicDibs',
    'pt-BR': 'Redefina sua senha no MusicDibs',
  },
  email_change: {
    es: 'Confirma tu nuevo email en MusicDibs',
    en: 'Confirm your new email on MusicDibs',
    'pt-BR': 'Confirme seu novo email no MusicDibs',
  },
  email_change_current: {
    es: 'Confirma el cambio de email desde tu cuenta actual',
    en: 'Confirm email change from your current account',
    'pt-BR': 'Confirme a alteração de email da sua conta atual',
  },
  email_change_new: {
    es: 'Confirma tu nuevo email en MusicDibs',
    en: 'Confirm your new email on MusicDibs',
    'pt-BR': 'Confirme seu novo email no MusicDibs',
  },
  reauthentication: {
    es: 'Tu código de verificación de MusicDibs',
    en: 'Your MusicDibs verification code',
    'pt-BR': 'Seu código de verificação do MusicDibs',
  },
}

function getSubject(emailType: string, lang: string): string {
  const map = SUBJECTS[emailType]
  if (!map) return 'Notification from MusicDibs'
  return map[lang] || map['es'] || 'Notification from MusicDibs'
}

const REDIRECTS: Record<string, string> = {
  recovery: `https://${ROOT_DOMAIN}/reset-password`,
  signup: `https://${ROOT_DOMAIN}/dashboard`,
  magiclink: `https://${ROOT_DOMAIN}/dashboard`,
  invite: `https://${ROOT_DOMAIN}/dashboard`,
  email_change: `https://${ROOT_DOMAIN}/dashboard/profile`,
  email_change_current: `https://${ROOT_DOMAIN}/dashboard/profile`,
  email_change_new: `https://${ROOT_DOMAIN}/dashboard/profile`,
  reauthentication: `https://${ROOT_DOMAIN}/dashboard`,
}

function getContent(emailType: string, confirmationUrl: string, token: string, lang: string): string {
  const contents: Record<string, Record<string, string>> = {
    signup: {
      es: `<h1>🎵 Confirma tu email</h1>
      <p>¡Gracias por registrarte en MusicDibs! Confirma tu dirección de email haciendo clic en el botón:</p>
      <a href="${confirmationUrl}" class="btn">Verificar email →</a>
      <p class="note">Si no creaste una cuenta, puedes ignorar este email.</p>`,
      en: `<h1>🎵 Confirm your email</h1>
      <p>Thank you for signing up for MusicDibs! Confirm your email address by clicking the button:</p>
      <a href="${confirmationUrl}" class="btn">Verify email →</a>
      <p class="note">If you did not create an account, you can ignore this email.</p>`,
      'pt-BR': `<h1>🎵 Confirme seu email</h1>
      <p>Obrigado por se cadastrar no MusicDibs! Confirme seu endereço de email clicando no botão:</p>
      <a href="${confirmationUrl}" class="btn">Verificar email →</a>
      <p class="note">Se você não criou uma conta, pode ignorar este email.</p>`,
    },
    recovery: {
      es: `<h1>🔑 Restablece tu contraseña</h1>
      <p>Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el botón para elegir una nueva:</p>
      <a href="${confirmationUrl}" class="btn">Restablecer contraseña →</a>
      <p class="note">Si no solicitaste este cambio, puedes ignorar este email.</p>`,
      en: `<h1>🔑 Reset your password</h1>
      <p>We have received a request to reset your password. Click the button to choose a new one:</p>
      <a href="${confirmationUrl}" class="btn">Reset password →</a>
      <p class="note">If you did not request this change, you can ignore this email.</p>`,
      'pt-BR': `<h1>🔑 Redefina sua senha</h1>
      <p>Recebemos uma solicitação para redefinir sua senha. Clique no botão para escolher uma nova:</p>
      <a href="${confirmationUrl}" class="btn">Redefinir senha →</a>
      <p class="note">Se você não solicitou esta mudança, pode ignorar este email.</p>`,
    },
    magiclink: {
      es: `<h1>✨ Tu enlace de acceso</h1>
      <p>Haz clic en el botón para acceder a MusicDibs. Este enlace caduca en breve.</p>
      <a href="${confirmationUrl}" class="btn">Acceder a MusicDibs →</a>
      <p class="note">Si no solicitaste este enlace, puedes ignorar este email.</p>`,
      en: `<h1>✨ Your access link</h1>
      <p>Click the button to access MusicDibs. This link expires shortly.</p>
      <a href="${confirmationUrl}" class="btn">Access MusicDibs →</a>
      <p class="note">If you did not request this link, you can ignore this email.</p>`,
      'pt-BR': `<h1>✨ Seu link de acesso</h1>
      <p>Clique no botão para acessar o MusicDibs. Este link expira em breve.</p>
      <a href="${confirmationUrl}" class="btn">Acessar MusicDibs →</a>
      <p class="note">Se você não solicitou este link, pode ignorar este email.</p>`,
    },
    invite: {
      es: `<h1>🎶 Te han invitado</h1>
      <p>Has sido invitado a unirte a MusicDibs. Haz clic para aceptar la invitación:</p>
      <a href="${confirmationUrl}" class="btn">Aceptar invitación →</a>
      <p class="note">Si no esperabas esta invitación, puedes ignorar este email.</p>`,
      en: `<h1>🎶 You have been invited</h1>
      <p>You have been invited to join MusicDibs. Click to accept the invitation:</p>
      <a href="${confirmationUrl}" class="btn">Accept invitation →</a>
      <p class="note">If you were not expecting this invitation, you can ignore this email.</p>`,
      'pt-BR': `<h1>🎶 Você foi convidado</h1>
      <p>Você foi convidado para se juntar ao MusicDibs. Clique para aceitar o convite:</p>
      <a href="${confirmationUrl}" class="btn">Aceitar convite →</a>
      <p class="note">Se você não esperava este convite, pode ignorar este email.</p>`,
    },
    email_change: {
      es: `<h1>📧 Confirma tu nuevo email</h1>
      <p>Has solicitado cambiar tu email en MusicDibs. Haz clic para confirmar:</p>
      <a href="${confirmationUrl}" class="btn">Confirmar cambio →</a>
      <p class="note">Si no solicitaste este cambio, protege tu cuenta de inmediato.</p>`,
      en: `<h1>📧 Confirm your new email</h1>
      <p>You have requested to change your email on MusicDibs. Click to confirm:</p>
      <a href="${confirmationUrl}" class="btn">Confirm change →</a>
      <p class="note">If you did not request this change, please secure your account immediately.</p>`,
      'pt-BR': `<h1>📧 Confirme seu novo email</h1>
      <p>Você solicitou alterar seu email no MusicDibs. Clique para confirmar:</p>
      <a href="${confirmationUrl}" class="btn">Confirmar alteração →</a>
      <p class="note">Se você não solicitou esta mudança, proteja sua conta imediatamente.</p>`,
    },
    email_change_current: {
      es: `<h1>📧 Confirmación desde tu email actual</h1>
      <p>Has solicitado cambiar el email de tu cuenta MusicDibs. Confirma desde esta dirección haciendo clic:</p>
      <a href="${confirmationUrl}" class="btn">Confirmar desde email actual →</a>
      <p class="note">Para completar el cambio también deberás confirmar desde tu nuevo email. Si no solicitaste este cambio, protege tu cuenta de inmediato.</p>`,
      en: `<h1>📧 Confirmation from your current email</h1>
      <p>You have requested to change the email on your MusicDibs account. Please confirm from this address by clicking:</p>
      <a href="${confirmationUrl}" class="btn">Confirm from current email →</a>
      <p class="note">To complete the change you will also need to confirm from your new email address. If you did not request this change, please secure your account immediately.</p>`,
      'pt-BR': `<h1>📧 Confirmação do seu email atual</h1>
      <p>Você solicitou alterar o email da sua conta MusicDibs. Confirme deste endereço clicando:</p>
      <a href="${confirmationUrl}" class="btn">Confirmar do email atual →</a>
      <p class="note">Para completar a alteração, você também precisará confirmar do seu novo email. Se não solicitou esta mudança, proteja sua conta imediatamente.</p>`,
    },
    email_change_new: {
      es: `<h1>📧 Confirma tu nuevo email</h1>
      <p>Esta dirección ha sido propuesta como nuevo email para tu cuenta de MusicDibs. Haz clic para confirmarla:</p>
      <a href="${confirmationUrl}" class="btn">Confirmar nuevo email →</a>
      <p class="note">Si no esperabas este email, puedes ignorarlo.</p>`,
      en: `<h1>📧 Confirm your new email</h1>
      <p>This address has been proposed as the new email for your MusicDibs account. Click to confirm it:</p>
      <a href="${confirmationUrl}" class="btn">Confirm new email →</a>
      <p class="note">If you were not expecting this email, you can ignore it.</p>`,
      'pt-BR': `<h1>📧 Confirme seu novo email</h1>
      <p>Este endereço foi proposto como novo email para sua conta MusicDibs. Clique para confirmá-lo:</p>
      <a href="${confirmationUrl}" class="btn">Confirmar novo email →</a>
      <p class="note">Se você não esperava este email, pode ignorá-lo.</p>`,
    },
    reauthentication: {
      es: `<h1>🔒 Código de verificación</h1>
      <p>Usa el siguiente código para confirmar tu identidad:</p>
      <div class="code">${token}</div>
      <p class="note">Este código caduca en breve. Si no lo solicitaste, ignora este email.</p>`,
      en: `<h1>🔒 Verification code</h1>
      <p>Use the following code to confirm your identity:</p>
      <div class="code">${token}</div>
      <p class="note">This code expires shortly. If you did not request it, please ignore this email.</p>`,
      'pt-BR': `<h1>🔒 Código de verificação</h1>
      <p>Use o seguinte código para confirmar sua identidade:</p>
      <div class="code">${token}</div>
      <p class="note">Este código expira em breve. Se você não o solicitou, ignore este email.</p>`,
    },
  }

  const map = contents[emailType]
  if (!map) return `<h1>MusicDibs Notification</h1><a href="${confirmationUrl}" class="btn">Continue →</a>`
  return map[lang] || map['es'] || `<h1>MusicDibs Notification</h1><a href="${confirmationUrl}" class="btn">Continue →</a>`
}

function buildHtml(emailType: string, confirmationUrl: string, token: string, recipient: string, lang: string): string {
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

  const content = getContent(emailType, confirmationUrl, token, lang)

  return `<!DOCTYPE html><html lang="${lang === 'pt-BR' ? 'pt' : lang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${s}</style></head>
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
    const newEmail = body.user?.new_email || body.email_data?.new_email
    // Para email_change_new el destinatario es el NUEVO email, no el actual
    const recipientEmail = emailType === 'email_change_new'
      ? (newEmail || body.user?.email)
      : body.user?.email
    const token = body.email_data?.token ?? ''
    const userId = body.user?.id

    if (!emailType || !recipientEmail) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Allowlist explícito: solo procesamos eventos transaccionales conocidos.
    const ALLOWED_TYPES = new Set([
      'signup', 'magiclink', 'recovery', 'invite',
      'email_change', 'email_change_current', 'email_change_new',
      'reauthentication',
    ])
    if (!ALLOWED_TYPES.has(emailType)) {
      return new Response(JSON.stringify({ success: true, skipped: emailType }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Detectar idioma del usuario desde profiles
    let userLang = 'es'
    try {
      if (userId) {
        const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
        const { data } = await supabase.from('profiles').select('language').eq('user_id', userId).maybeSingle()
        if (data?.language) {
          userLang = normalizeLanguage(data.language)
        }
      }
    } catch (langErr) {
      console.warn('[AUTH-EMAIL-HOOK] Language detection error (non-critical):', String(langErr))
    }

    const siteUrl = body.email_data?.site_url || `https://${ROOT_DOMAIN}`
    const baseUrl = siteUrl.includes('/auth/v1') ? siteUrl.replace('/auth/v1', '') : siteUrl
    const appRedirect = REDIRECTS[emailType] ?? `https://${ROOT_DOMAIN}/dashboard`
    // Supabase espera el tipo "email_change" en el endpoint /verify para ambas variantes
    const verifyType = emailType.startsWith('email_change') ? 'email_change' : emailType
    const confirmationUrl = `${baseUrl}/auth/v1/verify?token=${body.email_data.token_hash}&type=${verifyType}&redirect_to=${encodeURIComponent(appRedirect)}`

    const html = buildHtml(emailType, confirmationUrl, token, recipientEmail, userLang)
    const subject = getSubject(emailType, userLang)

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
        language: userLang,
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
