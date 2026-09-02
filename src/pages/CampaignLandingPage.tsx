import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2, ShieldCheck, Sparkles, Timer, Send } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Landing de captación para las campañas de pago (/registro-gratis).
 *
 * Objetivo: medir cuántos visitantes dejan sus datos ANTES de pagar por clic.
 * El formulario no crea cuenta: envía el lead a info@musicdibs.com (Edge
 * Function `submit-landing-lead`) y lo deja contabilizado para el panel de
 * Campañas del admin.
 */

const PATH = "/registro-gratis";

type Lang = "es" | "en" | "pt";

const COPY: Record<Lang, {
  seoTitle: string;
  seoDesc: string;
  badge: string;
  h1: string;
  sub: string;
  bullets: string[];
  formTitle: string;
  formDesc: string;
  name: string;
  email: string;
  profile: string;
  profileHint: string;
  profiles: { value: string; label: string }[];
  message: string;
  messagePlaceholder: string;
  submit: string;
  sending: string;
  privacy: string;
  successTitle: string;
  successBody: string;
  successCta: string;
  errorInvalid: string;
  errorGeneric: string;
  altCta: string;
}> = {
  es: {
    seoTitle: "Registra tu primera canción gratis",
    seoDesc: "Deja tus datos y te contamos cómo registrar tu música en blockchain con certificado legal. Primera obra gratis, sin comisiones sobre tus royalties.",
    badge: "Primera obra gratis",
    h1: "Protege tu música antes de publicarla",
    sub: "Déjanos tus datos y te enviamos cómo registrar tu primera canción en blockchain, con certificado con validez legal. Sin comisiones sobre tus royalties.",
    bullets: [
      "Certificado blockchain con validez legal en más de 180 países",
      "Registro en minutos: subes el archivo y listo",
      "0% de comisión sobre tus royalties de streaming",
      "IA Music Studio incluido: música, voz, portadas y vídeo",
    ],
    formTitle: "Quiero registrar mi música",
    formDesc: "Te respondemos por email en menos de 24 h laborables.",
    name: "Nombre",
    email: "Email",
    profile: "¿Qué perfil tienes?",
    profileHint: "Nos ayuda a enviarte la información adecuada",
    profiles: [
      { value: "Músico / Artista", label: "Músico / Artista" },
      { value: "Productor", label: "Productor" },
      { value: "Manager / Agencia", label: "Manager / Agencia" },
      { value: "Sello / Discográfica", label: "Sello / Discográfica" },
      { value: "Otro", label: "Otro" },
    ],
    message: "Cuéntanos algo más (opcional)",
    messagePlaceholder: "Cuántas obras quieres registrar, dudas, etc.",
    submit: "Enviar y empezar",
    sending: "Enviando...",
    privacy: "Al enviar aceptas nuestra política de privacidad. Usaremos tus datos solo para responderte.",
    successTitle: "¡Recibido!",
    successBody: "Hemos recibido tus datos. Te escribimos en breve a tu email con los siguientes pasos.",
    successCta: "Crear mi cuenta ahora",
    errorInvalid: "Revisa el nombre y el email.",
    errorGeneric: "No hemos podido enviar tus datos. Inténtalo de nuevo en unos minutos.",
    altCta: "¿Prefieres ir directo? Crea tu cuenta gratis",
  },
  en: {
    seoTitle: "Register your first song for free",
    seoDesc: "Leave your details and we will show you how to register your music on blockchain with a legally valid certificate. First work free, no commission on your royalties.",
    badge: "First work free",
    h1: "Protect your music before you release it",
    sub: "Leave us your details and we will send you how to register your first song on blockchain, with a legally valid certificate. No commission on your royalties.",
    bullets: [
      "Blockchain certificate with legal validity in over 180 countries",
      "Register in minutes: upload the file and you are done",
      "0% commission on your streaming royalties",
      "AI Music Studio included: music, voice, covers and video",
    ],
    formTitle: "I want to register my music",
    formDesc: "We reply by email within 24 working hours.",
    name: "Name",
    email: "Email",
    profile: "What best describes you?",
    profileHint: "It helps us send you the right information",
    profiles: [
      { value: "Musician / Artist", label: "Musician / Artist" },
      { value: "Producer", label: "Producer" },
      { value: "Manager / Agency", label: "Manager / Agency" },
      { value: "Label", label: "Label" },
      { value: "Other", label: "Other" },
    ],
    message: "Tell us more (optional)",
    messagePlaceholder: "How many works you want to register, questions, etc.",
    submit: "Send and get started",
    sending: "Sending...",
    privacy: "By submitting you accept our privacy policy. We will only use your details to reply to you.",
    successTitle: "Got it!",
    successBody: "We have received your details. We will email you shortly with the next steps.",
    successCta: "Create my account now",
    errorInvalid: "Please check your name and email.",
    errorGeneric: "We could not send your details. Please try again in a few minutes.",
    altCta: "Rather go straight in? Create your free account",
  },
  pt: {
    seoTitle: "Registre a sua primeira música grátis",
    seoDesc: "Deixe os seus dados e mostramos como registrar a sua música em blockchain com certificado de validade legal. Primeira obra grátis, sem comissões sobre os seus royalties.",
    badge: "Primeira obra grátis",
    h1: "Proteja a sua música antes de lançar",
    sub: "Deixe os seus dados e enviamos como registrar a sua primeira música em blockchain, com certificado de validade legal. Sem comissões sobre os seus royalties.",
    bullets: [
      "Certificado blockchain com validade legal em mais de 180 países",
      "Registro em minutos: envie o arquivo e pronto",
      "0% de comissão sobre os seus royalties de streaming",
      "IA Music Studio incluído: música, voz, capas e vídeo",
    ],
    formTitle: "Quero registrar a minha música",
    formDesc: "Respondemos por email em menos de 24 h úteis.",
    name: "Nome",
    email: "Email",
    profile: "Qual é o seu perfil?",
    profileHint: "Ajuda-nos a enviar a informação certa",
    profiles: [
      { value: "Músico / Artista", label: "Músico / Artista" },
      { value: "Produtor", label: "Produtor" },
      { value: "Manager / Agência", label: "Manager / Agência" },
      { value: "Gravadora", label: "Gravadora" },
      { value: "Outro", label: "Outro" },
    ],
    message: "Conte-nos mais (opcional)",
    messagePlaceholder: "Quantas obras quer registrar, dúvidas, etc.",
    submit: "Enviar e começar",
    sending: "A enviar...",
    privacy: "Ao enviar aceita a nossa política de privacidade. Usaremos os seus dados apenas para lhe responder.",
    successTitle: "Recebido!",
    successBody: "Recebemos os seus dados. Escrevemos em breve para o seu email com os próximos passos.",
    successCta: "Criar a minha conta agora",
    errorInvalid: "Verifique o nome e o email.",
    errorGeneric: "Não conseguimos enviar os seus dados. Tente novamente dentro de alguns minutos.",
    altCta: "Prefere ir direto? Crie a sua conta grátis",
  },
};

function resolveLang(i18nLang?: string): Lang {
  const l = (i18nLang || "es").toLowerCase();
  if (l.startsWith("pt")) return "pt";
  if (l.startsWith("en")) return "en";
  return "es";
}

export default function CampaignLandingPage() {
  const { i18n } = useTranslation();
  const lang = resolveLang(i18n.language);
  const c = COPY[lang];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState(c.profiles[0].value);
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // El perfil por defecto debe seguir al idioma activo mientras no se toque.
  useEffect(() => {
    setProfile(c.profiles[0].value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const attribution = useMemo(() => {
    if (typeof window === "undefined") return {};
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get("utm_source") || undefined,
      utm_medium: params.get("utm_medium") || undefined,
      utm_campaign: params.get("utm_campaign") || undefined,
      gclid: params.get("gclid") || undefined,
      referrer: document.referrer || undefined,
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    if (!cleanName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error(c.errorInvalid);
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-landing-lead", {
        body: {
          name: cleanName,
          email: cleanEmail,
          profile,
          message: message.trim(),
          language: lang,
          website,
          ...attribution,
        },
      });
      if (error || !data?.ok) throw new Error(error?.message || "failed");

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "landing_lead_submitted",
        lead_source: "landing_registro_gratis",
        lead_profile: profile,
        lead_language: lang,
      });

      setSent(true);
    } catch {
      toast.error(c.errorGeneric);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={c.seoTitle}
        description={c.seoDesc}
        path={PATH}
        lang={lang === "pt" ? "pt-BR" : lang}
        noIndex
      />
      <Navbar />

      <main className="container mx-auto px-4 pt-28 pb-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-start max-w-6xl mx-auto">
          {/* Propuesta de valor */}
          <section className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {c.badge}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">{c.h1}</h1>
            <p className="text-base sm:text-lg text-muted-foreground">{c.sub}</p>

            <ul className="space-y-3">
              {c.bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm sm:text-base">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> iCommunity Blockchain</span>
              <span className="inline-flex items-center gap-1.5"><Timer className="h-4 w-4 text-primary" /> &lt; 5 min</span>
            </div>
          </section>

          {/* Formulario */}
          <section>
            <Card className="border-border/60 shadow-lg">
              <CardContent className="p-6 sm:p-8">
                {sent ? (
                  <div className="space-y-4 text-center py-6">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                      <CheckCircle2 className="h-7 w-7 text-success" />
                    </div>
                    <h2 className="text-xl font-semibold">{c.successTitle}</h2>
                    <p className="text-sm text-muted-foreground">{c.successBody}</p>
                    <Button asChild variant="hero" className="w-full">
                      <Link to="/login?tab=register">{c.successCta}</Link>
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-xl font-semibold">{c.formTitle}</h2>
                      <p className="text-sm text-muted-foreground">{c.formDesc}</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lead-name">{c.name}</Label>
                      <Input id="lead-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required maxLength={100} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lead-email">{c.email}</Label>
                      <Input id="lead-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required maxLength={255} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lead-profile">{c.profile}</Label>
                      <Select value={profile} onValueChange={setProfile}>
                        <SelectTrigger id="lead-profile"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {c.profiles.map((p) => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">{c.profileHint}</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lead-message">{c.message}</Label>
                      <Textarea id="lead-message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={c.messagePlaceholder} rows={3} maxLength={2000} />
                    </div>

                    {/* Honeypot anti-bots: invisible para usuarios reales */}
                    <input
                      type="text"
                      name="website"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                      className="absolute left-[-9999px] h-0 w-0 opacity-0"
                    />

                    <Button type="submit" variant="hero" className="w-full gap-2" disabled={sending}>
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {sending ? c.sending : c.submit}
                    </Button>

                    <p className="text-xs text-muted-foreground">{c.privacy}</p>
                    <p className="text-xs text-center">
                      <Link to="/login?tab=register" className="text-primary hover:underline">{c.altCta}</Link>
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
