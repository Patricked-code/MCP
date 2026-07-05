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

const DEFAULT_REGISTRY_PATH = join(process.cwd(), 'Migration', 'index', 'SOURCE_REGISTRY.json');

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
