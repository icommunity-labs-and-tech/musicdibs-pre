// Ruta localizada de la página de testimonios.
// Es la fuente única para Navbar, Footer, TestimonialsSection y cualquier CTA.
// Tolerante a códigos regionales ('en-US', 'pt-PT', ...) y a valores aún no resueltos.
export const testimonialsPath = (lang?: string | null): string => {
  const l = (lang || '').toLowerCase();
  if (l.startsWith('pt')) return '/pt/depoimentos';
  if (l.startsWith('en')) return '/en/testimonials';
  return '/testimonios';
};
