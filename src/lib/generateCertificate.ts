// jsPDF y QRCode se cargan dinámicamente dentro de generateCertificate()
// para no incluirlos en el bundle principal de las rutas que sólo enlazan al util.
import type { jsPDF as JsPDFType } from 'jspdf'
import logoMusicdibs from '@/assets/logo_musicdibs_black.jpg'

// ── Palette ──────────────────────────────────────────────────
const BLACK   = '#111111'
const GRAY_D  = '#444444'
const GRAY_M  = '#999999'
const RED_CORP = '#E8364E'
const WHITE   = '#FFFFFF'

export interface CertificateCoauthor {
  name: string
  roles?: string[]
  percentage?: number | null
}

export interface CertificateData {
  title: string
  filename: string
  filesize: string
  fileType: string
  description?: string
  authorName: string
  authorDocId?: string
  coauthors?: CertificateCoauthor[]
  certifiedAt: string
  network: string
  txHash: string
  fingerprint: string
  algorithm: string
  checkerUrl: string
  ibsUrl: string
  evidenceId: string
  metadata?: string
  externalContent?: string
  explorerUrl?: string
  blockNumber?: string
  blockHash?: string
  contractAddress?: string
}

// ── Labels per locale ────────────────────────────────────────
interface CertLabels {
  headerTitle: string
  headerIntro: string
  sectionContent: string
  titleLabel: string
  filenameLabel: string
  sizeLabel: string
  descriptionLabel: string
  sectionAuthor: string
  authorNameLabel: string
  authorDocLabel: string
  coauthorsLabel: string
  rolesLabel: string
  percentageLabel: string
  mainAuthorTag: string
  roleMap: Record<string, string>
  sectionTransaction: string
  txIdLabel: string
  fingerprintLabel: string
  algorithmLabel: string
  networkLabel: string
  dateLabel: string
  metadataLabel: string
  externalContentLabel: string
  explorerLabel: string
  blockNumberLabel: string
  blockHashLabel: string
  contractLabel: string
  verifyLabel: string
  footerPowered: string
  filePrefix: string
}

const ROLE_LABELS_ES: Record<string, string> = {
  autor: 'Autor', compositor: 'Compositor', cantante: 'Cantante',
  productor: 'Productor', arreglista: 'Arreglista', adaptador: 'Adaptador',
}
const ROLE_LABELS_EN: Record<string, string> = {
  autor: 'Author', compositor: 'Composer', cantante: 'Singer',
  productor: 'Producer', arreglista: 'Arranger', adaptador: 'Adapter',
}
const ROLE_LABELS_PT: Record<string, string> = {
  autor: 'Autor', compositor: 'Compositor', cantante: 'Cantor',
  productor: 'Produtor', arreglista: 'Arranjador', adaptador: 'Adaptador',
}

const labelsMap: Record<string, CertLabels> = {
  es: {
    headerTitle: 'Comprobante de certificación',
    headerIntro: 'Musicdibs certifica que el siguiente documento ha sido registrado en blockchain',
    sectionContent: 'Datos del contenido',
    titleLabel: 'Título de la certificación:',
    filenameLabel: 'Nombre del fichero:',
    sizeLabel: 'Tamaño del fichero:',
    descriptionLabel: 'Descripción:',
    sectionAuthor: 'Datos del autor',
    authorNameLabel: 'Nombre:',
    authorDocLabel: 'Documento:',
    coauthorsLabel: 'Coautores y participación:',
    rolesLabel: 'Roles:',
    percentageLabel: '% de propiedad:',
    mainAuthorTag: 'Autor principal',
    roleMap: ROLE_LABELS_ES,
    sectionTransaction: 'Datos de la transacción',
    txIdLabel: 'Identificador de la transacción:',
    fingerprintLabel: 'Huella digital del archivo:',
    algorithmLabel: 'Algoritmo de huella digital:',
    networkLabel: 'Red de blockchain:',
    dateLabel: 'Fecha:',
    metadataLabel: 'Metadatos:',
    externalContentLabel: 'Contenido externo:',
    explorerLabel: 'Enlace blockchain:',
    blockNumberLabel: 'Número de bloque:',
    blockHashLabel: 'Hash del bloque:',
    contractLabel: 'Contrato:',
    verifyLabel: 'Verificar',
    footerPowered: 'powered by',
    filePrefix: 'certificado-musicdibs',
  },
  en: {
    headerTitle: 'Certification receipt',
    headerIntro: 'Musicdibs certifies that the following document has been registered on blockchain',
    sectionContent: 'Content data',
    titleLabel: 'Certification title:',
    filenameLabel: 'File name:',
    sizeLabel: 'File size:',
    descriptionLabel: 'Description:',
    sectionAuthor: 'Author data',
    authorNameLabel: 'Name:',
    authorDocLabel: 'Document:',
    coauthorsLabel: 'Co-authors and ownership:',
    rolesLabel: 'Roles:',
    percentageLabel: 'Ownership %:',
    mainAuthorTag: 'Main author',
    roleMap: ROLE_LABELS_EN,
    sectionTransaction: 'Transaction data',
    txIdLabel: 'Transaction identifier:',
    fingerprintLabel: 'File digital fingerprint:',
    algorithmLabel: 'Fingerprint algorithm:',
    networkLabel: 'Blockchain network:',
    dateLabel: 'Date:',
    metadataLabel: 'Metadata:',
    externalContentLabel: 'External content:',
    explorerLabel: 'Blockchain link:',
    blockNumberLabel: 'Block number:',
    blockHashLabel: 'Block hash:',
    contractLabel: 'Contract:',
    verifyLabel: 'Verify',
    footerPowered: 'powered by',
    filePrefix: 'certificate-musicdibs',
  },
  'pt-BR': {
    headerTitle: 'Comprovante de certificação',
    headerIntro: 'Musicdibs certifica que o seguinte documento foi registrado em blockchain',
    sectionContent: 'Dados do conteúdo',
    titleLabel: 'Título da certificação:',
    filenameLabel: 'Nome do arquivo:',
    sizeLabel: 'Tamanho do arquivo:',
    descriptionLabel: 'Descrição:',
    sectionAuthor: 'Dados do autor',
    authorNameLabel: 'Nome:',
    authorDocLabel: 'Documento:',
    coauthorsLabel: 'Coautores e participação:',
    rolesLabel: 'Funções:',
    percentageLabel: '% de propriedade:',
    mainAuthorTag: 'Autor principal',
    roleMap: ROLE_LABELS_PT,
    sectionTransaction: 'Dados da transação',
    txIdLabel: 'Identificador da transação:',
    fingerprintLabel: 'Impressão digital do arquivo:',
    algorithmLabel: 'Algoritmo de impressão digital:',
    networkLabel: 'Rede de blockchain:',
    dateLabel: 'Data:',
    metadataLabel: 'Metadados:',
    externalContentLabel: 'Conteúdo externo:',
    explorerLabel: 'Link blockchain:',
    blockNumberLabel: 'Número do bloco:',
    blockHashLabel: 'Hash do bloco:',
    contractLabel: 'Contrato:',
    verifyLabel: 'Verificar',
    footerPowered: 'powered by',
    filePrefix: 'certificado-musicdibs',
  },
}

function getLabels(locale?: string): CertLabels {
  if (!locale) return labelsMap.es
  if (labelsMap[locale]) return labelsMap[locale]
  const base = locale.split('-')[0]
  if (labelsMap[base]) return labelsMap[base]
  return labelsMap.es
}

// ── Helpers ──────────────────────────────────────────────────

async function imgToBase64(src: string): Promise<string> {
  const res = await fetch(src)
  const blob = await res.blob()
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}

/** Draw a vinyl-disc + checkmark watermark matching the reference PDF */
function makeWatermark(W: number, H: number): string {
  const scale = 3
  const canvas = document.createElement('canvas')
  canvas.width = W * scale
  canvas.height = H * scale
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // ── Vinyl disc (center-right, lower half) ──
  const cx = canvas.width * 0.52
  const cy = canvas.height * 0.58
  const maxR = 90 * scale

  // Draw concentric rings
  ctx.globalAlpha = 0.04
  for (let i = 0; i < 8; i++) {
    const r = maxR - i * 10 * scale
    if (r <= 0) break
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = '#888888'
    ctx.lineWidth = 1.5 * scale
    ctx.stroke()
  }

  // Center hole
  ctx.beginPath()
  ctx.arc(cx, cy, 6 * scale, 0, Math.PI * 2)
  ctx.fillStyle = '#888888'
  ctx.globalAlpha = 0.03
  ctx.fill()

  // ── Large checkmark (pink, low opacity) ──
  ctx.globalAlpha = 0.06
  ctx.strokeStyle = RED_CORP
  ctx.lineWidth = 12 * scale
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  const checkX = canvas.width * 0.42
  const checkY = canvas.height * 0.62
  ctx.moveTo(checkX - 30 * scale, checkY)
  ctx.lineTo(checkX, checkY + 28 * scale)
  ctx.lineTo(checkX + 50 * scale, checkY - 40 * scale)
  ctx.stroke()

  ctx.globalAlpha = 1
  return canvas.toDataURL('image/png')
}

// ── Main generator ───────────────────────────────────────────

export async function generateCertificate(data: CertificateData, locale?: string): Promise<void> {
  const L = getLabels(locale)
  const [{ jsPDF }, QRCode] = await Promise.all([
    import('jspdf'),
    import('qrcode').then(m => m.default ?? m),
  ])
  const doc: JsPDFType = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, H = 297
  const ML = 18, MR = 18, MT = 20
  const contentW = W - ML - MR
  const qrSz = 30
  const qrX = W - MR - qrSz
  const qrY = H - 20 - qrSz
  const footerY = H - 18
  // A field's text can shrink into this narrower column (stopping short of
  // the QR) instead of jumping to a new page — see `field()` below.
  const narrowWidth = qrX - ML - 6
  // From this y downward, a full-width line could reach into the QR's own
  // column, so fields switch to the narrow column instead of overlapping it.
  const NARROW_FROM = qrY - 6
  // Absolute bottom for ANY text, narrow or not — below this is exclusively
  // the QR/footer's territory, so content always breaks to a new page rather
  // than crossing it.
  const HARD_BOTTOM = footerY - 3

  let y = MT

  // helpers
  const hex = (c: string) => doc.setTextColor(c)
  const font = (style: string, size: number, family = 'helvetica') => {
    doc.setFont(family, style)
    doc.setFontSize(size)
  }
  const redLine = (yy: number) => {
    doc.setDrawColor(RED_CORP)
    doc.setLineWidth(0.7)
    doc.line(ML, yy, W - MR, yy)
  }

  const newPage = () => {
    doc.addPage()
    doc.addImage(makeWatermark(W, H), 'PNG', 0, 0, W, H)
    y = MT
  }

  /**
   * For elements that can't shrink into the narrow column (section headers,
   * separators, the coauthor rows with a right-aligned %, the explorer URL
   * line — all either full-width or anchored to the right margin, which is
   * exactly where the QR sits): break to a new page as soon as they'd reach
   * the QR's row at all.
   */
  const ensureWide = (need: number) => {
    if (y + need > NARROW_FROM) newPage()
  }

  const sectionHeader = (title: string) => {
    ensureWide(12)
    font('bold', 12)
    hex(BLACK)
    doc.text(title, ML, y)
    y += 7
  }

  const separator = () => {
    ensureWide(10)
    redLine(y)
    y += 8
  }

  /**
   * Print a label + value block. Uses the full content width normally; if
   * that would reach into the QR's row, it re-wraps into the narrow column
   * instead of overlapping the QR. Only if it still wouldn't fit above the
   * footer does it finally start a new page (at full width again, since a
   * fresh page has plenty of room).
   */
  const field = (label: string, value: string, mono = false): void => {
    const family = mono ? 'courier' : 'helvetica'
    const measure = (w: number) => {
      font('normal', 9.5, family)
      const lines = doc.splitTextToSize(value, w)
      const visible = lines.slice(0, 6)
      return { visible, blockH: 4.3 + visible.length * 4.0 + 3 }
    }
    let { visible, blockH } = measure(contentW)
    if (y + blockH > NARROW_FROM) {
      ({ visible, blockH } = measure(narrowWidth))
    }
    if (y + blockH > HARD_BOTTOM) {
      newPage()
      ;({ visible, blockH } = measure(contentW))
    }
    font('normal', 9.5)
    hex(GRAY_D)
    doc.text(label, ML, y)
    y += 4.3
    font('normal', 9.5, family)
    hex(BLACK)
    doc.text(visible, ML, y)
    y += visible.length * 4.0 + 3
  }

  // ── Pre-generate assets ────────────────────────────────────
  const [qrDataUrl, logoDataUrl] = await Promise.all([
    QRCode.toDataURL(data.checkerUrl, {
      width: 300, margin: 1,
      color: { dark: BLACK, light: WHITE },
    }),
    imgToBase64(logoMusicdibs),
  ])
  const logoFmt = logoDataUrl.includes('image/png') ? 'PNG' : 'JPEG'

  // ── Watermark ──────────────────────────────────────────────
  const watermark = makeWatermark(W, H)
  doc.addImage(watermark, 'PNG', 0, 0, W, H)

  // ══════════════════════════════════════════════════════════
  // HEADER
  // ══════════════════════════════════════════════════════════

  // Logo top-right
  const logoAspect = 125 / 126
  const logoH = 16
  const logoW = logoH * logoAspect
  doc.addImage(logoDataUrl, logoFmt, W - MR - logoW, MT - 6, logoW, logoH)

  // Title
  font('bold', 20)
  hex(BLACK)
  doc.text(L.headerTitle, ML, y)
  y += 9

  // Intro line
  font('normal', 10)
  hex(GRAY_D)
  const introLines = doc.splitTextToSize(L.headerIntro, contentW - logoW - 5)
  doc.text(introLines, ML, y)
  y += introLines.length * 4.5 + 6

  // Red separator
  separator()

  // ══════════════════════════════════════════════════════════
  // SECTION 1: DATOS DEL CONTENIDO
  // ══════════════════════════════════════════════════════════

  sectionHeader(L.sectionContent)

  field(L.titleLabel, data.title)
  field(L.filenameLabel, data.filename)
  field(L.sizeLabel, data.filesize)
  if (data.metadata) {
    field(L.metadataLabel, data.metadata)
  }
  if (data.externalContent) {
    field(L.externalContentLabel, data.externalContent, true)
  }

  if (data.description) {
    field(L.descriptionLabel, data.description)
  }

  // ══════════════════════════════════════════════════════════
  // SECTION 2: DATOS DEL AUTOR
  // ══════════════════════════════════════════════════════════

  separator()
  sectionHeader(L.sectionAuthor)

  field(L.authorNameLabel, data.authorName)
  if (data.authorDocId) {
    field(L.authorDocLabel, data.authorDocId)
  }

  // Coautores y % de propiedad (si hay más de un creador o roles/% definidos)
  const coauthors = (data.coauthors || []).filter((c) => c && c.name && c.name.trim())
  const hasRichCreatorData = coauthors.length > 1
    || coauthors.some((c) => (c.roles && c.roles.length > 0) || (typeof c.percentage === 'number' && c.percentage > 0))

  if (hasRichCreatorData) {
    ensureWide(5.5)
    font('normal', 9.5)
    hex(GRAY_D)
    doc.text(L.coauthorsLabel, ML, y)
    y += 5.5

    const totalPct = coauthors.reduce((s, c) => s + (typeof c.percentage === 'number' ? c.percentage : 0), 0)
    const distributeEqually = totalPct === 0 && coauthors.length > 0

    coauthors.forEach((c, idx) => {
      const isMain = idx === 0
      const roleNames = (c.roles || []).map((r) => L.roleMap[r] || r).filter(Boolean).join(', ')
      const pct = typeof c.percentage === 'number' && c.percentage > 0
        ? c.percentage
        : (distributeEqually ? Math.round((100 / coauthors.length) * 100) / 100 : null)
      const roleLines = roleNames ? doc.splitTextToSize(roleNames, contentW - 4).slice(0, 2) : []

      ensureWide(4.3 + roleLines.length * 3.8 + 2.2)

      // Name + main tag
      font('bold', 9.5)
      hex(BLACK)
      const nameLine = isMain ? `${c.name}  ·  ${L.mainAuthorTag}` : c.name
      doc.text(nameLine, ML + 2, y)

      // Percentage (right aligned)
      if (pct !== null) {
        font('bold', 9.5)
        hex(RED_CORP)
        doc.text(`${pct}%`, W - MR, y, { align: 'right' })
      }
      y += 4.3

      if (roleLines.length) {
        font('normal', 8.5)
        hex(GRAY_D)
        doc.text(roleLines, ML + 2, y)
        y += roleLines.length * 3.8
      }
      y += 2.2
    })
    y += 1.5
  }

  // ══════════════════════════════════════════════════════════
  // SECTION 3: DATOS DE LA TRANSACCIÓN
  // ══════════════════════════════════════════════════════════

  separator()
  sectionHeader(L.sectionTransaction)

  if (data.explorerUrl) {
    ensureWide(4.3 + 4 + 3)
    // Label
    font('normal', 9.5)
    hex(GRAY_D)
    doc.text(L.explorerLabel, ML, y)
    y += 4.3
    // URL: shrink font to fit single line
    hex(BLACK)
    let urlSize = 9.5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(urlSize)
    while (doc.getTextWidth(data.explorerUrl) > contentW && urlSize > 5) {
      urlSize -= 0.5
      doc.setFontSize(urlSize)
    }
    doc.textWithLink(data.explorerUrl, ML, y, { url: data.explorerUrl })
    y += 4.0 + 3
  }
  field(L.txIdLabel, data.txHash, true)
  // The fingerprint is a long mono hash that can wrap to several lines; like
  // any other field, `field()` automatically re-wraps it into the narrow
  // column (or a new page) if it would otherwise reach the QR.
  field(L.fingerprintLabel, data.fingerprint, true)
  field(L.algorithmLabel, data.algorithm)
  field(L.networkLabel, data.network)
  if (data.blockNumber) {
    field(L.blockNumberLabel, data.blockNumber)
  }
  if (data.blockHash) {
    field(L.blockHashLabel, data.blockHash, true)
  }
  if (data.contractAddress) {
    field(L.contractLabel, data.contractAddress, true)
  }
  field(L.dateLabel, data.certifiedAt)

  // ══════════════════════════════════════════════════════════
  // QR CODE (bottom-right corner of the final page)
  // ══════════════════════════════════════════════════════════

  font('bold', 10)
  hex(BLACK)
  doc.text(L.verifyLabel, qrX + qrSz / 2, qrY - 3, { align: 'center' })
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSz, qrSz)

  // ══════════════════════════════════════════════════════════
  // FOOTER
  // ══════════════════════════════════════════════════════════

  // Short red accent line above footer (left)
  doc.setDrawColor(RED_CORP)
  doc.setLineWidth(1)
  doc.line(ML, footerY, ML + 18, footerY)

  // musicdibs.com
  font('normal', 8)
  hex(BLACK)
  doc.text('musicdibs.com', ML, footerY + 6)

  // powered by icommunity (right)
  font('normal', 7)
  hex(GRAY_M)
  doc.text(L.footerPowered, W - MR, footerY + 2, { align: 'right' })

  font('bold', 8)
  hex(BLACK)
  doc.text('icommunity', W - MR, footerY + 7, { align: 'right' })

  // ── Save ───────────────────────────────────────────────────
  const safeName = data.title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 40)
  doc.save(`${L.filePrefix}-${safeName}.pdf`)
}
