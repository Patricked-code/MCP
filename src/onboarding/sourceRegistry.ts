import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type SourceReadStatus = 'text_read' | 'archive_indexed' | 'binary_indexed';

export type SourceRegistryDocument = {
  sourceId: string;
  sourceRoot: string;
  sourceRootKind: string;
  sourcePath: string;
  repoPath: string | null;
  fileName: string;
  roles: string[];
  sizeBytes: number;
  sha256: string;
  duplicateOf: string | null;
  extension: string;
  readStatus: SourceReadStatus;
  extraction: Record<string, unknown>;
};

export type SourceRegistry = {
  version: number;
  generatedAt: string;
  generator: string;
  purpose: string;
  safety: {
    rawSourceTextStored: boolean;
    rawSecretsStored: boolean;
    publicationMode: string;
  };
  roots: Array<{
    label: string;
    kind: string;
    available: boolean;
    recursive?: boolean;
    fileCount: number;
  }>;
  totals: Record<string, unknown>;
  documents: SourceRegistryDocument[];
};

export type SourceRegistrySummary = {
  generatedAt: string;
  sourceFileCount: number;
  uniqueContentFileCount: number;
  duplicateFileCount: number;
  totalBytes: number;
  byReadStatus: Record<string, number>;
  byExtension: Record<string, number>;
  rootsUnavailable: string[];
  pdfTextExtractionPending: string[];
  filesRequiringSecretReview: string[];
  rawSourceTextStored: boolean;
  rawSecretsStored: boolean;
};

export type PdfTextAuditStatus = 'pdf_text_read' | 'pdf_text_empty' | 'pdf_missing' | 'pdf_error' | 'pdf_duplicate';

export type PdfTextAuditDocument = {
  pdfAuditId: string;
  sourceKind: 'registry_pdf' | 'archive_pdf_entry';
  sourceId: string;
  sourceRoot: string;
  sourcePath: string;
  repoPath: string | null;
  fileName: string;
  sizeBytes: number;
  sha256: string;
  duplicateOf: string | null;
  pdfAuditStatus: PdfTextAuditStatus;
  extraction: Record<string, unknown>;
};

export type PdfTextAudit = {
  version: number;
  generatedAt: string;
  generator: string;
  sourceRegistry: string;
  purpose: string;
  safety: {
    rawPdfTextStored: boolean;
    rawSecretsStored: boolean;
    publicationMode: string;
  };
  totals: Record<string, unknown>;
  documents: PdfTextAuditDocument[];
};

export type PdfTextAuditSummary = {
  generatedAt: string;
  pdfDocumentCount: number;
  uniquePdfContentCount: number;
  duplicatePdfDocumentCount: number;
  registryPdfCount: number;
  archivePdfEntryCount: number;
  textReadDocumentCount: number;
  errorDocumentCount: number;
  secretSignalDocumentCount: number;
  totalPagesExtracted: number;
  totalWordsExtracted: number;
  totalCharsExtracted: number;
  byStatus: Record<string, number>;
  keywordTotals: Record<string, number>;
  rawPdfTextStored: boolean;
  rawSecretsStored: boolean;
};

export type SourceIngestionSnapshot = {
  summary: SourceRegistrySummary;
  registry: SourceRegistry;
  pdfTextAudit: {
    summary: PdfTextAuditSummary;
    audit: PdfTextAudit;
  } | null;
};

const DEFAULT_REGISTRY_PATH = join(process.cwd(), 'Migration', 'index', 'SOURCE_REGISTRY.json');
const DEFAULT_PDF_TEXT_AUDIT_PATH = join(process.cwd(), 'Migration', 'index', 'PDF_TEXT_AUDIT.json');

function assertRegistry(value: unknown): asserts value is SourceRegistry {
  if (!value || typeof value !== 'object') {
    throw new Error('Source registry is not an object.');
  }

  const candidate = value as Partial<SourceRegistry>;
  if (!Array.isArray(candidate.documents)) {
    throw new Error('Source registry documents are missing.');
  }
  if (!Array.isArray(candidate.roots)) {
    throw new Error('Source registry roots are missing.');
  }
  if (!candidate.safety || typeof candidate.safety !== 'object') {
    throw new Error('Source registry safety block is missing.');
  }
}

function assertPdfTextAudit(value: unknown): asserts value is PdfTextAudit {
  if (!value || typeof value !== 'object') {
    throw new Error('PDF text audit is not an object.');
  }

  const candidate = value as Partial<PdfTextAudit>;
  if (!Array.isArray(candidate.documents)) {
    throw new Error('PDF text audit documents are missing.');
  }
  if (!candidate.safety || typeof candidate.safety !== 'object') {
    throw new Error('PDF text audit safety block is missing.');
  }
}

function increment(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

function hasPositiveNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export async function loadSourceRegistry(registryPath = DEFAULT_REGISTRY_PATH): Promise<SourceRegistry> {
  const raw = await readFile(registryPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  assertRegistry(parsed);
  return parsed;
}

export async function loadPdfTextAudit(auditPath = DEFAULT_PDF_TEXT_AUDIT_PATH): Promise<PdfTextAudit> {
  const raw = await readFile(auditPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  assertPdfTextAudit(parsed);
  return parsed;
}

export function summarizeSourceRegistry(registry: SourceRegistry): SourceRegistrySummary {
  const byReadStatus: Record<string, number> = {};
  const byExtension: Record<string, number> = {};
  let totalBytes = 0;
  let duplicateFileCount = 0;
  const pdfTextExtractionPending: string[] = [];
  const filesRequiringSecretReview: string[] = [];

  for (const document of registry.documents) {
    totalBytes += document.sizeBytes;
    if (document.duplicateOf) duplicateFileCount += 1;
    increment(byReadStatus, document.readStatus);
    increment(byExtension, document.extension);

    if (document.extension === '.pdf' && document.readStatus === 'binary_indexed') {
      pdfTextExtractionPending.push(`${document.sourceRoot}/${document.sourcePath}`);
    }

    if (
      hasPositiveNumber(document.extraction.secretSignalCount) ||
      hasPositiveNumber(document.extraction.archiveSensitiveNameSignals)
    ) {
      filesRequiringSecretReview.push(`${document.sourceRoot}/${document.sourcePath}`);
    }
  }

  return {
    generatedAt: registry.generatedAt,
    sourceFileCount: registry.documents.length,
    uniqueContentFileCount: registry.documents.length - duplicateFileCount,
    duplicateFileCount,
    totalBytes,
    byReadStatus,
    byExtension,
    rootsUnavailable: registry.roots.filter((root) => !root.available).map((root) => root.label),
    pdfTextExtractionPending,
    filesRequiringSecretReview,
    rawSourceTextStored: registry.safety.rawSourceTextStored,
    rawSecretsStored: registry.safety.rawSecretsStored
  };
}

function numberFromTotals(totals: Record<string, unknown>, key: string): number {
  const value = totals[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function recordFromTotals(totals: Record<string, unknown>, key: string): Record<string, number> {
  const value = totals[key];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  const output: Record<string, number> = {};
  for (const [entryKey, entryValue] of Object.entries(value)) {
    if (typeof entryValue === 'number' && Number.isFinite(entryValue)) {
      output[entryKey] = entryValue;
    }
  }
  return output;
}

export function summarizePdfTextAudit(audit: PdfTextAudit): PdfTextAuditSummary {
  const byStatus = recordFromTotals(audit.totals, 'byStatus');
  const bySourceKind = recordFromTotals(audit.totals, 'bySourceKind');
  const keywordTotals = recordFromTotals(audit.totals, 'keywordTotals');

  return {
    generatedAt: audit.generatedAt,
    pdfDocumentCount: numberFromTotals(audit.totals, 'pdfDocumentCount'),
    uniquePdfContentCount: numberFromTotals(audit.totals, 'uniquePdfContentCount'),
    duplicatePdfDocumentCount: numberFromTotals(audit.totals, 'duplicatePdfDocumentCount'),
    registryPdfCount: bySourceKind.registry_pdf ?? 0,
    archivePdfEntryCount: bySourceKind.archive_pdf_entry ?? 0,
    textReadDocumentCount: numberFromTotals(audit.totals, 'textReadDocumentCount'),
    errorDocumentCount: numberFromTotals(audit.totals, 'errorDocumentCount'),
    secretSignalDocumentCount: numberFromTotals(audit.totals, 'secretSignalDocumentCount'),
    totalPagesExtracted: numberFromTotals(audit.totals, 'totalPagesExtracted'),
    totalWordsExtracted: numberFromTotals(audit.totals, 'totalWordsExtracted'),
    totalCharsExtracted: numberFromTotals(audit.totals, 'totalCharsExtracted'),
    byStatus,
    keywordTotals,
    rawPdfTextStored: audit.safety.rawPdfTextStored,
    rawSecretsStored: audit.safety.rawSecretsStored
  };
}

export async function buildSourceIngestionSnapshot(): Promise<SourceIngestionSnapshot> {
  const registry = await loadSourceRegistry();
  const summary = summarizeSourceRegistry(registry);

  try {
    const audit = await loadPdfTextAudit();
    return {
      summary,
      registry,
      pdfTextAudit: {
        summary: summarizePdfTextAudit(audit),
        audit
      }
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      throw error;
    }
    return {
      summary,
      registry,
      pdfTextAudit: null
    };
  }
}
