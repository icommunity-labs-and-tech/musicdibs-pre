// Ruta localizada de la página de testimonios.
// Es la fuente única para Navbar, Footer, TestimonialsSection y cualquier CTA.
export const testimonialsPath = (lang?: string | null): string =>
  lang === 'pt-BR' ? '/pt/depoimentos' : lang === 'en' ? '/en/testimonials' : '/testimonios';
