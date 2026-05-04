import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

interface GuestEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (email: string) => Promise<void>;
}

const COPY = {
  es: {
    title: "Tu correo para continuar",
    description: "Te enviamos la factura y el acceso a tu cuenta para que puedas gestionar tus créditos después de la compra.",
    emailLabel: "Correo electrónico",
    placeholder: "tu@email.com",
    legal: "Acepto los Términos y la Política de Privacidad de MusicDibs.",
    cta: "Continuar al pago",
    loading: "Creando cuenta…",
    invalid: "Introduce un correo válido.",
    accept: "Debes aceptar los términos para continuar.",
  },
  en: {
    title: "Your email to continue",
    description: "We'll send your invoice and account access so you can manage your credits after purchase.",
    emailLabel: "Email",
    placeholder: "you@email.com",
    legal: "I accept MusicDibs' Terms and Privacy Policy.",
    cta: "Continue to payment",
    loading: "Creating account…",
    invalid: "Please enter a valid email.",
    accept: "You must accept the terms to continue.",
  },
  pt: {
    title: "Seu email para continuar",
    description: "Enviaremos sua fatura e acesso à sua conta para gerenciar seus créditos após a compra.",
    emailLabel: "Email",
    placeholder: "voce@email.com",
    legal: "Aceito os Termos e a Política de Privacidade da MusicDibs.",
    cta: "Continuar ao pagamento",
    loading: "Criando conta…",
    invalid: "Insira um email válido.",
    accept: "Você precisa aceitar os termos para continuar.",
  },
};

export const GuestEmailModal = ({ open, onOpenChange, onConfirm }: GuestEmailModalProps) => {
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage || i18n.language || "es").slice(0, 2).toLowerCase();
  const t = COPY[(lang === "en" ? "en" : lang === "pt" ? "pt" : "es") as keyof typeof COPY];

  const [email, setEmail] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError(t.invalid);
      return;
    }
    if (!accepted) {
      setError(t.accept);
      return;
    }
    setLoading(true);
    try {
      await onConfirm(trimmed);
    } catch (err: any) {
      setError(err?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="guest-email" className="text-sm font-medium">{t.emailLabel}</label>
            <Input
              id="guest-email"
              type="email"
              required
              autoFocus
              placeholder={t.placeholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="guest-legal"
              checked={accepted}
              onCheckedChange={(c) => setAccepted(c === true)}
              disabled={loading}
            />
            <label htmlFor="guest-legal" className="text-sm leading-tight cursor-pointer">
              {t.legal}
            </label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.loading}
              </>
            ) : (
              t.cta
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
