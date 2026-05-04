import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Eye, EyeOff } from "lucide-react";

interface GuestEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (email: string, password: string, name: string) => Promise<void>;
}

const COPY = {
  es: {
    title: "Tu correo para continuar",
    description: "Te enviamos la factura y el acceso a tu cuenta para que puedas gestionar tus créditos después de la compra.",
    nameLabel: "Nombre",
    namePlaceholder: "Tu nombre",
    emailLabel: "Correo electrónico",
    placeholder: "tu@email.com",
    passwordLabel: "Contraseña",
    passwordPlaceholder: "Mínimo 8 caracteres",
    passwordTooShort: "La contraseña debe tener al menos 8 caracteres.",
    legal: "Acepto los Términos y la Política de Privacidad de MusicDibs.",
    cta: "Continuar al pago",
    loading: "Creando cuenta…",
    invalid: "Introduce un correo válido.",
    accept: "Debes aceptar los términos para continuar.",
  },
  en: {
    title: "Your email to continue",
    description: "We'll send your invoice and account access so you can manage your credits after purchase.",
    nameLabel: "Name",
    namePlaceholder: "Your name",
    emailLabel: "Email",
    placeholder: "you@email.com",
    passwordLabel: "Password",
    passwordPlaceholder: "At least 8 characters",
    passwordTooShort: "Password must be at least 8 characters.",
    legal: "I accept MusicDibs' Terms and Privacy Policy.",
    cta: "Continue to payment",
    loading: "Creating account…",
    invalid: "Please enter a valid email.",
    accept: "You must accept the terms to continue.",
  },
  pt: {
    title: "Seu email para continuar",
    description: "Enviaremos sua fatura e acesso à sua conta para gerenciar seus créditos após a compra.",
    nameLabel: "Nome",
    namePlaceholder: "Seu nome",
    emailLabel: "Email",
    placeholder: "voce@email.com",
    passwordLabel: "Senha",
    passwordPlaceholder: "Mínimo 8 caracteres",
    passwordTooShort: "A senha deve ter pelo menos 8 caracteres.",
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

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
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
    if (password.length < 8) {
      setError(t.passwordTooShort);
      return;
    }
    if (!accepted) {
      setError(t.accept);
      return;
    }
    setLoading(true);
    try {
      await onConfirm(trimmed, password, name.trim());
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
            <label htmlFor="guest-name" className="text-sm font-medium">{t.nameLabel}</label>
            <Input
              id="guest-name"
              type="text"
              autoFocus
              placeholder={t.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="guest-email" className="text-sm font-medium">{t.emailLabel}</label>
            <Input
              id="guest-email"
              type="email"
              required
              placeholder={t.placeholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="guest-password" className="text-sm font-medium">{t.passwordLabel}</label>
            <div className="relative">
              <Input
                id="guest-password"
                type={showPw ? "text" : "password"}
                required
                minLength={8}
                placeholder={t.passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
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
