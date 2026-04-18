import { useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { generateCertificate } from '@/lib/generateCertificate'
import { buildCertificateData } from '@/lib/certificateData'
import { useTranslation } from 'react-i18next'

interface Props {
  work: {
    id: string
    title: string
    original_filename?: string
    file_size?: number
    type: string
    description?: string
    file_hash_sha512_b64?: string
    blockchain_hash: string
    blockchain_network: string
    checker_url?: string
    ibs_evidence_id: string
    certified_at?: string
    created_at: string
  }
  authorName: string
  authorDocId?: string
}

export function CertificateButton({ work, authorName, authorDocId }: Props) {
  const [generating, setGenerating] = useState(false)
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage === 'pt-BR' ? 'pt-BR' : (i18n.resolvedLanguage || i18n.language || 'es')

  // Solo visible si la obra está certificada
  if (!work.blockchain_hash || !work.ibs_evidence_id) return null

  const handleDownload = async () => {
    setGenerating(true)
    try {
      const certData = await buildCertificateData({
        title: work.title,
        filename: work.original_filename || `${work.title}.mp3`,
        filesize: work.file_size,
        fileType: work.type || t('dashboard.certificate.fileTypeFallback'),
        description: work.description || undefined,
        authorName,
        authorDocId,
        certifiedAt: work.certified_at || work.created_at,
        network: work.blockchain_network || 'Polygon',
        txHash: work.blockchain_hash,
        checkerUrl: work.checker_url,
        ibsEvidenceId: work.ibs_evidence_id,
        locale,
        fallbackFingerprint: work.file_hash_sha512_b64,
        fallbackAlgorithm: 'SHA-512',
      })
      await generateCertificate(certData, locale)
      toast.success(t('dashboard.certificate.downloadSuccess'))
    } catch (e) {
      console.error(e)
      toast.error(t('dashboard.certificate.generateError'))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={generating}
      className="gap-2"
    >
      {generating
        ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('dashboard.certificate.generating')}</>
        : <><FileText className="h-4 w-4" /> {t('dashboard.certificate.pdfLabel')}</>
      }
    </Button>
  )
}
