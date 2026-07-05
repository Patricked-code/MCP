import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type ArchiveTextAuditStatus =
  | 'archive_text_read'
  | 'archive_text_empty'
  | 'archive_text_error'
  | 'archive_duplicate'
  | 'archive_nested_zip_indexed'
  | 'archive_pdf_delegated_to_pdf_audit'
  | 'archive_binary_indexed'
  | 'archive_entry_error'
  | 'archive_open_error';

export type ArchiveTextAuditEntry = {
  archiveEntryAuditId: string;
  sourceRoot: string;
  sourcePath: string;
  sourceId: string;
  archivePath: string;
  archivePathSha256: string;
  archiveDepth: number;
  fileName: string;
  extension: string;
  sizeBytes: number;
  sha256: string | null;
  duplicateOf: string | null;
  archiveTextAuditStatus: ArchiveTextAuditStatus;
  error?: string;
  extraction: Record<string, unknown>;
};

export type ArchiveTextAudit = {
  version: number;
  generatedAt: string;
  generator: string;
  sourceRegistry: Record<string, unknown>;
  purpose: string;
  safety: {
    rawArchiveTextStored: boolean;
    rawSecretsStored: boolean;
    publicationMode: string;
  };
  totals: Record<string, unknown>;
  archives: Array<Record<string, unknown>>;
  entries: ArchiveTextAuditEntry[];
};

export type ArchiveTextAuditSummary = {
  generatedAt: string;
  archiveDocumentCount: number;
  archiveDocumentsScanned: number;
  archiveDocumentsMissing: number;
  archiveEntryCount: number;
  uniqueArchiveEntryCount: number;
  duplicateArchiveEntryCount: number;
  textEntryCount: number;
  textReadEntryCount: number;
  pdfDelegatedEntryCount: number;
  nestedZipEntryCount: number;
  binaryIndexedEntryCount: number;
  errorEntryCount: number;
  secretSignalEntryCount: number;
  totalWordsExtracted: number;
  totalCharsExtracted: number;
  byStatus: Record<string, number>;
  byExtension: Record<string, number>;
  rawArchiveTextStored: boolean;
  rawSecretsStored: boolean;
};

const DEFAULT_ARCHIVE_TEXT_AUDIT_PATH = join(process.cwd(), 'Migration', 'index', 'ARCHIVE_TEXT_AUDIT.json');

function assertArchiveTextAudit(value: unknown): asserts value is ArchiveTextAudit {
  if (!value || typeof value !== 'object') {
    throw new Error('Archive text audit is not an object.');
  }

  const candidate = value as Partial<ArchiveTextAudit>;
  if (!Array.isArray(candidate.entries)) {
    throw new Error('Archive text audit entries are missing.');
  }
  if (!Array.isArray(candidate.archives)) {
    throw new Error('Archive text audit archives are missing.');
  }
  if (!candidate.safety || typeof candidate.safety !== 'object') {
    throw new Error('Archive text audit safety block is missing.');
  }
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

export async function loadArchiveTextAudit(
  auditPath = DEFAULT_ARCHIVE_TEXT_AUDIT_PATH
): Promise<ArchiveTextAudit> {
  const raw = await readFile(auditPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  assertArchiveTextAudit(parsed);
  return parsed;
}

export function summarizeArchiveTextAudit(audit: ArchiveTextAudit): ArchiveTextAuditSummary {
  const byStatus = recordFromTotals(audit.totals, 'byStatus');
  const byExtension = recordFromTotals(audit.totals, 'byExtension');

  return {
    generatedAt: audit.generatedAt,
    archiveDocumentCount: numberFromTotals(audit.totals, 'archiveDocumentCount'),
    archiveDocumentsScanned: numberFromTotals(audit.totals, 'archiveDocumentsScanned'),
    archiveDocumentsMissing: numberFromTotals(audit.totals, 'archiveDocumentsMissing'),
    archiveEntryCount: audit.entries.length,
    uniqueArchiveEntryCount: numberFromTotals(audit.totals, 'uniqueArchiveEntryCount'),
    duplicateArchiveEntryCount: numberFromTotals(audit.totals, 'duplicateArchiveEntryCount'),
    textEntryCount: numberFromTotals(audit.totals, 'textEntryCount'),
    textReadEntryCount: numberFromTotals(audit.totals, 'textReadEntryCount'),
    pdfDelegatedEntryCount: numberFromTotals(audit.totals, 'pdfDelegatedEntryCount'),
    nestedZipEntryCount: numberFromTotals(audit.totals, 'nestedZipEntryCount'),
    binaryIndexedEntryCount: numberFromTotals(audit.totals, 'binaryIndexedEntryCount'),
    errorEntryCount: numberFromTotals(audit.totals, 'errorEntryCount'),
    secretSignalEntryCount: numberFromTotals(audit.totals, 'secretSignalEntryCount'),
    totalWordsExtracted: numberFromTotals(audit.totals, 'totalWordsExtracted'),
    totalCharsExtracted: numberFromTotals(audit.totals, 'totalCharsExtracted'),
    byStatus,
    byExtension,
    rawArchiveTextStored: audit.safety.rawArchiveTextStored,
    rawSecretsStored: audit.safety.rawSecretsStored
  };
}
