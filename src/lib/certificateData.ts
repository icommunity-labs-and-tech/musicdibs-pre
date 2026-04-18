import type { CertificateData } from '@/lib/generateCertificate';
import { pollEvidenceStatus } from '@/services/dashboardApi';

type UnknownRecord = Record<string, unknown>;

export interface CertificateBuildInput {
  title: string;
  authorName: string;
  ibsEvidenceId: string;
  locale: string;
  filename?: string;
  filesize?: number | string;
  fileType?: string;
  description?: string;
  authorDocId?: string;
  certifiedAt?: string;
  network?: string;
  txHash?: string;
  checkerUrl?: string;
  fallbackFingerprint?: string;
  fallbackAlgorithm?: string;
  sourceFile?: File | null;
}

interface EvidenceCertificateDetail {
  title?: string;
  description?: string;
  fileName?: string;
  fileSize?: number | string;
  metadata?: string;
  externalContent?: string;
  txHash?: string;
  network?: string;
  certifiedAt?: string;
  checkerUrl?: string;
  ibsUrl?: string;
  explorerUrl?: string;
  blockNumber?: string;
  blockHash?: string;
  contractAddress?: string;
  fingerprint?: string;
  algorithm?: string;
}

const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null;

const toDisplayString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value) || isRecord(value)) {
    const serialized = JSON.stringify(value);
    return serialized === '{}' || serialized === '[]' ? undefined : serialized;
  }

  return undefined;
};

const toCheckerNetworkSlug = (network?: string) => {
  const normalized = (network || 'polygon').toLowerCase();
  return ['fantom_opera_mainnet', 'fantom', 'opera'].includes(normalized) ? 'opera' : normalized;
};

export const buildBlockchainExplorerUrl = (network?: string, txHash?: string): string | undefined => {
  if (!txHash) return undefined;
  const normalized = (network || '').toLowerCase();

  if (['fantom_opera_mainnet', 'fantom', 'opera'].includes(normalized)) {
    return `https://explorer.fantom.network/tx/${txHash}`;
  }

  return undefined;
};

const formatFilesize = (value: number | string | undefined, locale: string): string => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${value.toLocaleString(locale)} bytes`;
  }

  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  return 'N/A';
};

const formatCertificateDate = (value: string | undefined, locale: string): string => {
  if (!value) return 'N/A';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
};

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
};

const computeSha512Base64 = async (file?: File | null): Promise<string | undefined> => {
  if (!file) return undefined;

  const buffer = await file.arrayBuffer();
  const sha512Buffer = await crypto.subtle.digest('SHA-512', buffer);
  return bytesToBase64(new Uint8Array(sha512Buffer));
};

const normalizeEvidenceDetail = (value: unknown): EvidenceCertificateDetail | null => {
  if (!isRecord(value)) return null;

  const detail = isRecord(value.detail) ? value.detail : value;

  return {
    title: toDisplayString(detail.title),
    description: toDisplayString(detail.description),
    fileName: toDisplayString(detail.fileName),
    fileSize: typeof detail.fileSize === 'number' || typeof detail.fileSize === 'string' ? detail.fileSize : undefined,
    metadata: toDisplayString(detail.metadata),
    externalContent: toDisplayString(detail.externalContent),
    txHash: toDisplayString(detail.txHash),
    network: toDisplayString(detail.network),
    certifiedAt: toDisplayString(detail.certifiedAt),
    checkerUrl: toDisplayString(detail.checkerUrl),
    ibsUrl: toDisplayString(detail.ibsUrl),
    explorerUrl: toDisplayString(detail.explorerUrl),
    blockNumber: toDisplayString(detail.blockNumber),
    blockHash: toDisplayString(detail.blockHash),
    contractAddress: toDisplayString(detail.contractAddress),
    fingerprint: toDisplayString(detail.fingerprint),
    algorithm: toDisplayString(detail.algorithm),
  };
};

export async function buildCertificateData(input: CertificateBuildInput): Promise<CertificateData> {
  let evidenceDetail: EvidenceCertificateDetail | null = null;

  try {
    evidenceDetail = normalizeEvidenceDetail(await pollEvidenceStatus(input.ibsEvidenceId));
  } catch (error) {
    console.warn('[certificateData] Unable to load evidence detail', error);
  }

  const fallbackFingerprint = input.fallbackFingerprint || await computeSha512Base64(input.sourceFile);
  const txHash = evidenceDetail?.txHash || input.txHash || '';
  const network = evidenceDetail?.network || input.network || 'Polygon';
  const checkerUrl = evidenceDetail?.checkerUrl || input.checkerUrl || (txHash
    ? `https://checker.icommunitylabs.com/check/${toCheckerNetworkSlug(network)}/${txHash}`
    : 'https://musicdibs.com');

  return {
    title: evidenceDetail?.title || input.title,
    filename: evidenceDetail?.fileName || input.filename || `${input.title}.mp3`,
    filesize: formatFilesize(evidenceDetail?.fileSize ?? input.filesize, input.locale),
    fileType: input.fileType || 'Audio',
    description: evidenceDetail?.description || input.description,
    authorName: input.authorName,
    authorDocId: input.authorDocId,
    certifiedAt: formatCertificateDate(evidenceDetail?.certifiedAt || input.certifiedAt, input.locale),
    network,
    txHash,
    fingerprint: evidenceDetail?.fingerprint || fallbackFingerprint || 'N/A',
    algorithm: evidenceDetail?.algorithm || input.fallbackAlgorithm || 'SHA-512',
    checkerUrl,
    ibsUrl: evidenceDetail?.ibsUrl || `https://app.icommunitylabs.com/evidences/${input.ibsEvidenceId}`,
    evidenceId: input.ibsEvidenceId,
    metadata: evidenceDetail?.metadata,
    externalContent: evidenceDetail?.externalContent,
    explorerUrl: evidenceDetail?.explorerUrl || buildBlockchainExplorerUrl(network, txHash),
    blockNumber: evidenceDetail?.blockNumber,
    blockHash: evidenceDetail?.blockHash,
    contractAddress: evidenceDetail?.contractAddress,
  };
}