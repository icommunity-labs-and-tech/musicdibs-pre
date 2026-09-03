export type CertProofLang = "es" | "en" | "pt-BR";

export interface CertProofCopy {
  seoTitle: string;
  seoDesc: string;
  badge: string;
  h1a: string;
  h1b: string;
  heroSub: string;
  ctaPrimary: string;
  ctaSecondary: string;
  anatomyEyebrow: string;
  anatomyTitle: string;
  anatomyDesc: string;
  sampleLabel: string;
  certTitle: string;
  certVerified: string;
  certFields: { k: string; v: string }[];
  certCheckerLabel: string;
  certBerne: string;
  caseEyebrow: string;
  caseTitle: string;
  caseDisclaimer: string;
  caseParagraphs: string[];
  caseSteps: { t: string; d: string }[];
  caseConclusion: string;
  verifyEyebrow: string;
  verifyTitle: string;
  verifyDesc: string;
  verifySteps: { t: string; d: string }[];
  verifyCta: string;
  faqEyebrow: string;
  faqTitle: string;
  faq: { q: string; a: string }[];
  finalTitle: string;
  finalDesc: string;
  finalCta: string;
}

export const CERTIFICATE_PROOF_COPY: Record<CertProofLang, CertProofCopy> = {
  es: {
    seoTitle: "Certificado blockchain de tu música: cómo se prueba tu autoría",
    seoDesc:
      "Descubre qué contiene un certificado blockchain de Musicdibs, cómo cualquiera puede verificarlo y por qué sirve como prueba de autoría con sello de tiempo.",
    badge: "Prueba de autoría verificable",
    h1a: "Así se demuestra que",
    h1b: "tu música es tuya",
    heroSub:
      "Cada obra registrada en Musicdibs genera un certificado blockchain con huella digital, sello de tiempo y verificación pública. Aquí puedes ver exactamente qué contiene y cómo se comprueba.",
    ctaPrimary: "Registra tu 1ª canción gratis",
    ctaSecondary: "Verificar una obra",
    anatomyEyebrow: "Anatomía del certificado",
    anatomyTitle: "Qué contiene un certificado blockchain",
    anatomyDesc:
      "Este es un ejemplo del certificado que se emite al registrar una obra. Tu archivo nunca se publica: solo su huella criptográfica queda anclada en blockchain.",
    sampleLabel: "Ejemplo de certificado",
    certTitle: "Certificado de registro de obra",
    certVerified: "Verificado en blockchain",
    certFields: [
      { k: "Obra", v: "Medianoche en Gran Vía" },
      { k: "Autor", v: "A. Artista" },
      { k: "Huella digital", v: "SHA-512 · 9c2f…a41b" },
      { k: "Sello de tiempo", v: "14 de mayo de 2026, 18:42 (CET)" },
      { k: "Red blockchain", v: "Polygon" },
      { k: "Transacción", v: "0x7f3a…e9d2" },
    ],
    certCheckerLabel: "Verificación pública en iCommunity Checker",
    certBerne:
      "Prueba de autoría y fecha conforme al Convenio de Berna, válido en 181 países.",
    caseEyebrow: "Caso real de uso",
    caseTitle: "Un beat enviado por email que acabó publicado sin permiso",
    caseDisclaimer:
      "Caso ilustrativo basado en situaciones habituales entre creadores musicales. Los nombres y detalles se han generalizado por privacidad.",
    caseParagraphs: [
      "Un productor compuso un beat y lo envió por email a varios artistas con los que quería colaborar. Antes de enviarlo, registró el archivo en Musicdibs: el proceso le llevó unos minutos y generó un certificado blockchain con la huella digital del archivo y un sello de tiempo.",
      "Meses después descubrió que una de esas bases sonaba en una canción publicada en plataformas, sin su permiso ni crédito. Al reclamar, la otra parte alegó que la composición era suya.",
      "El productor presentó su certificado: la huella SHA-512 coincidía exactamente con el archivo original del beat y el sello de tiempo blockchain era anterior a la fecha de publicación de la canción. La prueba era verificable por cualquiera en el checker público, sin depender de su palabra.",
    ],
    caseSteps: [
      {
        t: "1. Registro previo",
        d: "Registró el beat en Musicdibs antes de compartirlo, generando huella digital y sello de tiempo en blockchain.",
      },
      {
        t: "2. Conflicto de autoría",
        d: "La base apareció publicada sin permiso. La otra parte reclamó la autoría.",
      },
      {
        t: "3. Prueba verificable",
        d: "El certificado demostró que el archivo existía, con esa huella exacta, antes de la publicación.",
      },
    ],
    caseConclusion:
      "Con una prueba de autoría y fecha verificable públicamente, la reclamación dejó de ser la palabra de uno contra la del otro.",
    verifyEyebrow: "Compruébalo tú mismo",
    verifyTitle: "Cómo verificar cualquier certificado",
    verifyDesc:
      "No necesitas confiar en nosotros: la verificación es pública e independiente.",
    verifySteps: [
      {
        t: "Sube el archivo original",
        d: "En nuestra página de verificación, selecciona el archivo que fue registrado.",
      },
      {
        t: "Comparación de huellas",
        d: "Se calcula su huella digital y se compara con los registros anclados en blockchain.",
      },
      {
        t: "Resultado al instante",
        d: "Si coincide, verás la fecha de registro y podrás consultar la transacción en el checker público.",
      },
    ],
    verifyCta: "Probar el verificador",
    faqEyebrow: "Preguntas frecuentes",
    faqTitle: "Dudas sobre el certificado blockchain",
    faq: [
      {
        q: "¿Qué es exactamente un certificado blockchain de una obra musical?",
        a: "Es un documento que acredita que un archivo concreto existía en una fecha determinada. Al registrar tu obra se calcula su huella criptográfica (SHA-512) y se ancla en la blockchain junto a un sello de tiempo. Ese registro es inmutable y verificable públicamente.",
      },
      {
        q: "¿Tiene validez legal?",
        a: "Sí. El Convenio de Berna (181 países) reconoce los derechos de autor desde la creación de la obra, sin registros obligatorios. El certificado blockchain aporta una prueba técnica de autoría y fecha admisible como evidencia, con la misma función probatoria que otros medios de prueba en sede judicial.",
      },
      {
        q: "¿Sustituye al registro de la propiedad intelectual?",
        a: "No lo sustituye: lo complementa. El registro administrativo es voluntario en la mayoría de países, y el certificado blockchain aporta una prueba inmediata, global y de bajo coste que puedes usar desde el primer minuto.",
      },
      {
        q: "¿Se publica mi canción o mi archivo en internet?",
        a: "No. En blockchain solo se ancla la huella criptográfica del archivo, una secuencia matemática de la que es imposible reconstruir tu obra. Tu archivo permanece privado y bajo tu control.",
      },
      {
        q: "¿Cómo puede un tercero comprobar mi certificado?",
        a: "Con el archivo original puede usar nuestro verificador público, y con el identificador de la transacción cualquiera puede consultar el anclaje en el checker independiente de iCommunity. No hace falta cuenta en Musicdibs.",
      },
      {
        q: "¿Cuánto tarda y cuánto cuesta?",
        a: "El registro se completa en unos minutos desde tu panel. Tu primera canción es gratis, sin tarjeta, y después puedes registrar obras con créditos o con cualquiera de los planes.",
      },
    ],
    finalTitle: "Tu próxima canción merece una prueba de autoría",
    finalDesc:
      "Regístrala antes de enseñarla a nadie. Tu primera obra certificada en blockchain es gratis.",
    finalCta: "Registrar mi primera canción gratis",
  },
  en: {
    seoTitle: "Blockchain certificate for your music: how your authorship is proven",
    seoDesc:
      "See what a Musicdibs blockchain certificate contains, how anyone can verify it, and why it works as timestamped proof of authorship.",
    badge: "Verifiable proof of authorship",
    h1a: "This is how you prove",
    h1b: "your music is yours",
    heroSub:
      "Every work registered on Musicdibs generates a blockchain certificate with a digital fingerprint, timestamp and public verification. Here you can see exactly what it contains and how it is checked.",
    ctaPrimary: "Register your 1st song free",
    ctaSecondary: "Verify a work",
    anatomyEyebrow: "Anatomy of the certificate",
    anatomyTitle: "What a blockchain certificate contains",
    anatomyDesc:
      "This is an example of the certificate issued when a work is registered. Your file is never published: only its cryptographic fingerprint is anchored on the blockchain.",
    sampleLabel: "Sample certificate",
    certTitle: "Work registration certificate",
    certVerified: "Verified on blockchain",
    certFields: [
      { k: "Work", v: "Midnight on Gran Vía" },
      { k: "Author", v: "A. Artist" },
      { k: "Digital fingerprint", v: "SHA-512 · 9c2f…a41b" },
      { k: "Timestamp", v: "14 May 2026, 18:42 (CET)" },
      { k: "Blockchain network", v: "Polygon" },
      { k: "Transaction", v: "0x7f3a…e9d2" },
    ],
    certCheckerLabel: "Public verification on iCommunity Checker",
    certBerne:
      "Proof of authorship and date under the Berne Convention, valid in 181 countries.",
    caseEyebrow: "Real-world use case",
    caseTitle: "A beat sent by email that ended up released without permission",
    caseDisclaimer:
      "Illustrative case based on situations that are common among music creators. Names and details have been generalised for privacy.",
    caseParagraphs: [
      "A producer composed a beat and emailed it to several artists he wanted to collaborate with. Before sending it, he registered the file on Musicdibs: the process took a few minutes and generated a blockchain certificate with the file's digital fingerprint and a timestamp.",
      "Months later he discovered that one of those beats could be heard in a song released on streaming platforms, without his permission or credit. When he complained, the other party claimed the composition was theirs.",
      "The producer presented his certificate: the SHA-512 fingerprint matched the original beat file exactly, and the blockchain timestamp predated the song's release date. The proof could be verified by anyone on the public checker, without relying on his word alone.",
    ],
    caseSteps: [
      {
        t: "1. Prior registration",
        d: "He registered the beat on Musicdibs before sharing it, generating a digital fingerprint and blockchain timestamp.",
      },
      {
        t: "2. Authorship dispute",
        d: "The beat appeared in a release without permission. The other party claimed authorship.",
      },
      {
        t: "3. Verifiable proof",
        d: "The certificate proved the file existed, with that exact fingerprint, before the release.",
      },
    ],
    caseConclusion:
      "With publicly verifiable proof of authorship and date, the dispute stopped being one person's word against another's.",
    verifyEyebrow: "Check it yourself",
    verifyTitle: "How to verify any certificate",
    verifyDesc:
      "You don't need to trust us: verification is public and independent.",
    verifySteps: [
      {
        t: "Upload the original file",
        d: "On our verification page, select the file that was registered.",
      },
      {
        t: "Fingerprint comparison",
        d: "Its digital fingerprint is calculated and compared with the records anchored on the blockchain.",
      },
      {
        t: "Instant result",
        d: "If it matches, you'll see the registration date and can inspect the transaction on the public checker.",
      },
    ],
    verifyCta: "Try the verifier",
    faqEyebrow: "Frequently asked questions",
    faqTitle: "Questions about the blockchain certificate",
    faq: [
      {
        q: "What exactly is a blockchain certificate for a musical work?",
        a: "It is a document proving that a specific file existed on a given date. When you register your work, its cryptographic fingerprint (SHA-512) is calculated and anchored on the blockchain together with a timestamp. That record is immutable and publicly verifiable.",
      },
      {
        q: "Is it legally valid?",
        a: "Yes. The Berne Convention (181 countries) recognises copyright from the moment a work is created, with no mandatory registration. The blockchain certificate provides technical evidence of authorship and date that is admissible as evidence, with the same probative function as other means of proof in court.",
      },
      {
        q: "Does it replace the intellectual property registry?",
        a: "It doesn't replace it: it complements it. Administrative registration is voluntary in most countries, and the blockchain certificate provides immediate, global, low-cost proof you can use from minute one.",
      },
      {
        q: "Is my song or file published on the internet?",
        a: "No. Only the file's cryptographic fingerprint is anchored on the blockchain — a mathematical sequence from which your work cannot be reconstructed. Your file stays private and under your control.",
      },
      {
        q: "How can a third party check my certificate?",
        a: "With the original file, anyone can use our public verifier, and with the transaction identifier anyone can inspect the anchoring on iCommunity's independent checker. No Musicdibs account is needed.",
      },
      {
        q: "How long does it take and how much does it cost?",
        a: "Registration is completed in a few minutes from your dashboard. Your first song is free, no card required, and afterwards you can register works with credits or with any of the plans.",
      },
    ],
    finalTitle: "Your next song deserves proof of authorship",
    finalDesc:
      "Register it before showing it to anyone. Your first blockchain-certified work is free.",
    finalCta: "Register my first song free",
  },
  "pt-BR": {
    seoTitle: "Certificado blockchain da sua música: como sua autoria é comprovada",
    seoDesc:
      "Veja o que contém um certificado blockchain da Musicdibs, como qualquer pessoa pode verificá-lo e por que ele serve como prova de autoria com carimbo de data e hora.",
    badge: "Prova de autoria verificável",
    h1a: "É assim que se prova que",
    h1b: "sua música é sua",
    heroSub:
      "Cada obra registrada na Musicdibs gera um certificado blockchain com impressão digital, carimbo de data/hora e verificação pública. Aqui você vê exatamente o que ele contém e como é verificado.",
    ctaPrimary: "Registre sua 1ª música grátis",
    ctaSecondary: "Verificar uma obra",
    anatomyEyebrow: "Anatomia do certificado",
    anatomyTitle: "O que contém um certificado blockchain",
    anatomyDesc:
      "Este é um exemplo do certificado emitido ao registrar uma obra. Seu arquivo nunca é publicado: apenas sua impressão criptográfica fica ancorada na blockchain.",
    sampleLabel: "Exemplo de certificado",
    certTitle: "Certificado de registro de obra",
    certVerified: "Verificado em blockchain",
    certFields: [
      { k: "Obra", v: "Meia-noite na Gran Vía" },
      { k: "Autor", v: "A. Artista" },
      { k: "Impressão digital", v: "SHA-512 · 9c2f…a41b" },
      { k: "Carimbo de data/hora", v: "14 de maio de 2026, 18:42 (CET)" },
      { k: "Rede blockchain", v: "Polygon" },
      { k: "Transação", v: "0x7f3a…e9d2" },
    ],
    certCheckerLabel: "Verificação pública no iCommunity Checker",
    certBerne:
      "Prova de autoria e data conforme a Convenção de Berna, válida em 181 países.",
    caseEyebrow: "Caso real de uso",
    caseTitle: "Um beat enviado por e-mail que acabou lançado sem permissão",
    caseDisclaimer:
      "Caso ilustrativo baseado em situações comuns entre criadores musicais. Nomes e detalhes foram generalizados por privacidade.",
    caseParagraphs: [
      "Um produtor compôs um beat e o enviou por e-mail a vários artistas com quem queria colaborar. Antes de enviar, registrou o arquivo na Musicdibs: o processo levou alguns minutos e gerou um certificado blockchain com a impressão digital do arquivo e um carimbo de data/hora.",
      "Meses depois, descobriu que uma daquelas bases aparecia em uma música lançada nas plataformas, sem sua permissão nem crédito. Ao reclamar, a outra parte alegou que a composição era dela.",
      "O produtor apresentou seu certificado: a impressão SHA-512 coincidia exatamente com o arquivo original do beat, e o carimbo de data/hora na blockchain era anterior à data de lançamento da música. A prova podia ser verificada por qualquer pessoa no verificador público, sem depender da palavra dele.",
    ],
    caseSteps: [
      {
        t: "1. Registro prévio",
        d: "Ele registrou o beat na Musicdibs antes de compartilhá-lo, gerando impressão digital e carimbo de data/hora na blockchain.",
      },
      {
        t: "2. Conflito de autoria",
        d: "A base apareceu lançada sem permissão. A outra parte reivindicou a autoria.",
      },
      {
        t: "3. Prova verificável",
        d: "O certificado provou que o arquivo existia, com aquela impressão exata, antes do lançamento.",
      },
    ],
    caseConclusion:
      "Com uma prova de autoria e data verificável publicamente, a disputa deixou de ser a palavra de um contra a do outro.",
    verifyEyebrow: "Verifique você mesmo",
    verifyTitle: "Como verificar qualquer certificado",
    verifyDesc:
      "Você não precisa confiar em nós: a verificação é pública e independente.",
    verifySteps: [
      {
        t: "Envie o arquivo original",
        d: "Na nossa página de verificação, selecione o arquivo que foi registrado.",
      },
      {
        t: "Comparação de impressões",
        d: "A impressão digital é calculada e comparada com os registros ancorados na blockchain.",
      },
      {
        t: "Resultado instantâneo",
        d: "Se coincidir, você verá a data de registro e poderá consultar a transação no verificador público.",
      },
    ],
    verifyCta: "Testar o verificador",
    faqEyebrow: "Perguntas frequentes",
    faqTitle: "Dúvidas sobre o certificado blockchain",
    faq: [
      {
        q: "O que é exatamente um certificado blockchain de uma obra musical?",
        a: "É um documento que comprova que um arquivo específico existia em uma determinada data. Ao registrar sua obra, a impressão criptográfica (SHA-512) é calculada e ancorada na blockchain junto com um carimbo de data/hora. Esse registro é imutável e publicamente verificável.",
      },
      {
        q: "Tem validade legal?",
        a: "Sim. A Convenção de Berna (181 países) reconhece os direitos autorais desde a criação da obra, sem registros obrigatórios. O certificado blockchain fornece uma prova técnica de autoria e data admissível como evidência, com a mesma função probatória de outros meios de prova em juízo.",
      },
      {
        q: "Substitui o registro de propriedade intelectual?",
        a: "Não substitui: complementa. O registro administrativo é voluntário na maioria dos países, e o certificado blockchain oferece uma prova imediata, global e de baixo custo que você pode usar desde o primeiro minuto.",
      },
      {
        q: "Minha música ou arquivo é publicado na internet?",
        a: "Não. Na blockchain só é ancorada a impressão criptográfica do arquivo, uma sequência matemática a partir da qual é impossível reconstruir sua obra. Seu arquivo permanece privado e sob seu controle.",
      },
      {
        q: "Como um terceiro pode verificar meu certificado?",
        a: "Com o arquivo original, qualquer pessoa pode usar nosso verificador público, e com o identificador da transação qualquer um pode consultar a ancoragem no verificador independente da iCommunity. Não é preciso ter conta na Musicdibs.",
      },
      {
        q: "Quanto tempo leva e quanto custa?",
        a: "O registro é concluído em alguns minutos no seu painel. Sua primeira música é grátis, sem cartão, e depois você pode registrar obras com créditos ou com qualquer um dos planos.",
      },
    ],
    finalTitle: "Sua próxima música merece uma prova de autoria",
    finalDesc:
      "Registre-a antes de mostrá-la a alguém. Sua primeira obra certificada em blockchain é grátis.",
    finalCta: "Registrar minha primeira música grátis",
  },
};
