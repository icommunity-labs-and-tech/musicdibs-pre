import logoDark from "@/assets/landing/logo-dark.png";

export function Footer() {
  return (
    <footer className="relative border-t border-border mt-12">
      <div className="mx-auto max-w-7xl px-6 py-12 flex flex-col items-center gap-6">
        <img src={logoDark} alt="Musicdibs" className="h-10 w-auto" />

        <p className="text-xs text-white text-center">
          © {new Date().getFullYear()} Musicdibs · IA Music Studio. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
