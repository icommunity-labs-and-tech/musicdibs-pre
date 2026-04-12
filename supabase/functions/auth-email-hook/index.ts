import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: 'Confirma tu email en MusicDibs',
  invite: 'Te han invitado a MusicDibs',
  magiclink: 'Tu enlace de acceso a MusicDibs',
  recovery: 'Restablece tu contraseña en MusicDibs',
  email_change: 'Confirma tu nuevo email en MusicDibs',
  reauthentication: 'Tu código de verificación',
}

const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

const SITE_NAME = 'MusicDibs'
const ROOT_DOMAIN = 'musicdibs.com'
const FROM_EMAIL = `MusicDibs <noreply@notify.${ROOT_DOMAIN}>`

interface AuthHookPayload {
  user: { id: string; email: string; [key: string]: unknown }
  email_data: {
    token: string
    token_hash: string
    redirect_to: string
    email_action_type: string
    site_url?: string
    token_new?: string
    new_email?: string
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    // Verificación con standardwebhooks — mismo método que usa Supabase Auth
    const rawSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') ?? ''
    const hookSecret = rawSecret.replace('v1,whsec_', '')

    const payload = await req.text()
    const headers = Object.fromEntries(req.headers)

    let body: AuthHookPayload
    try {
      const wh = new Webhook(hookSecret)
      body = wh.verify(payload, headers) as AuthHookPayload
    } catch (err) {
      console.error('[AUTH-EMAIL-HOOK] Verification failed:', String(err))
      console.error('[AUTH-EMAIL-HOOK] Secret length:', hookSecret.length)
      console.error('[AUTH-EMAIL-HOOK] Headers received:', JSON.stringify(Object.keys(headers)))
      return new Response(JSON.stringify({ error: 'Unauthorized', detail: String(err) }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const emailType = body.email_data?.email_action_type
    const recipientEmail = body.user?.email
    console.log('[AUTH-EMAIL-HOOK] Received', { emailType, email: recipientEmail })

    if (!emailType || !recipientEmail) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const EmailTemplate = EMAIL_TEMPLATES[emailType]
    if (!EmailTemplate) {
      console.error('[AUTH-EMAIL-HOOK] Unknown email type', { emailType })
      return new Response(JSON.stringify({ error: `Unknown email type: ${emailType}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const siteUrl = body.email_data.site_url || `https://${ROOT_DOMAIN}`
    const confirmationUrl = body.email_data.redirect_to
      ? `${siteUrl}/auth/v1/verify?token=${body.email_data.token_hash}&type=${emailType}&redirect_to=${encodeURIComponent(body.email_data.redirect_to)}`
      : `${siteUrl}/auth/v1/verify?token=${body.email_data.token_hash}&type=${emailType}`

    const templateProps = {
      siteName: SITE_NAME,
      siteUrl,
      recipient: recipientEmail,
      confirmationUrl,
      token: body.email_data.token,
      email: recipientEmail,
      newEmail: body.email_data.new_email,
    }

    const html = await renderAsync(React.createElement(EmailTemplate, templateProps))
    const text = await renderAsync(React.createElement(EmailTemplate, templateProps), { plainText: true })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const messageId = crypto.randomUUID()

    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: emailType,
      recipient_email: recipientEmail,
      status: 'pending',
    })

    const { error: enqueueError } = await supabase.rpc('enqueue_email', {
      queue_name: 'auth_emails',
      payload: {
        message_id: messageId,
        to: recipientEmail,
        from: FROM_EMAIL,
        subject: EMAIL_SUBJECTS[emailType] || 'Notificación de MusicDibs',
        html,
        text,
        label: emailType,
        queued_at: new Date().toISOString(),
      },
    })

    if (enqueueError) {
      console.error('[AUTH-EMAIL-HOOK] Enqueue error:', enqueueError)
      return new Response(JSON.stringify({ error: 'Failed to enqueue email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('[AUTH-EMAIL-HOOK] OK', { emailType, email: recipientEmail, messageId })
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('[AUTH-EMAIL-HOOK] Error:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
