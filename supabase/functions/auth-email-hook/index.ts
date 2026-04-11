// auth-email-hook/index.ts — Pre-production (External Supabase + Resend)
// No Lovable Cloud dependencies. Uses Supabase Auth Hook format + pgmq queue.

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
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: 'Confirm your email',
  invite: "You've been invited",
  magiclink: 'Your login link',
  recovery: 'Reset your password',
  email_change: 'Confirm your new email',
  reauthentication: 'Your verification code',
}

const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

// Configuration — adjust to your pre-production domain
const SITE_NAME = 'MusicDibs'
const ROOT_DOMAIN = 'musicdibs.com'
const FROM_EMAIL = `MusicDibs <noreply@notify.${ROOT_DOMAIN}>`

// ------------------------------------------------------------------
// Supabase Auth Hook payload format (Database or HTTP Hook)
// ------------------------------------------------------------------
interface AuthHookPayload {
  user: {
    id: string
    email: string
    [key: string]: unknown
  }
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

// ------------------------------------------------------------------
// Auth: verify the request comes from Supabase (SEND_EMAIL_HOOK_SECRET)
// ------------------------------------------------------------------
function verifyHookSecret(req: Request): boolean {
  const secret = Deno.env.get('SEND_EMAIL_HOOK_SECRET')
  if (!secret) {
    console.warn('SEND_EMAIL_HOOK_SECRET not set — skipping auth check')
    return true // allow in dev; in prod, set the secret
  }
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // --- Auth check ---
  if (!verifyHookSecret(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body: AuthHookPayload = await req.json()
    const emailType = body.email_data.email_action_type
    const recipientEmail = body.user.email

    console.log('Auth hook received', { emailType, email: recipientEmail })

    const EmailTemplate = EMAIL_TEMPLATES[emailType]
    if (!EmailTemplate) {
      console.error('Unknown email type', { emailType })
      return new Response(
        JSON.stringify({ error: `Unknown email type: ${emailType}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build confirmation URL from token_hash + redirect_to
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

    // Render
    const html = await renderAsync(React.createElement(EmailTemplate, templateProps))
    const text = await renderAsync(React.createElement(EmailTemplate, templateProps), {
      plainText: true,
    })

    // Enqueue to pgmq for async sending via process-email-queue → Resend
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
        subject: EMAIL_SUBJECTS[emailType] || 'Notification',
        html,
        text,
        label: emailType,
        queued_at: new Date().toISOString(),
      },
    })

    if (enqueueError) {
      console.error('Failed to enqueue', { error: enqueueError, emailType })
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: emailType,
        recipient_email: recipientEmail,
        status: 'failed',
        error_message: 'Enqueue failed',
      })
      return new Response(JSON.stringify({ error: 'Failed to enqueue email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Auth email enqueued', { emailType, email: recipientEmail, messageId })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Hook error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})