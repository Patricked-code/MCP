import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { basename, extname, join, relative, sep } from 'node:path';
import { inflateRawSync } from 'node:zlib';

const repoRoot = process.cwd();
const outputDir = join(repoRoot, 'Migration', 'index');
const registryPath = join(outputDir, 'SOURCE_REGISTRY.json');
const statusPath = join(outputDir, 'SOURCE_INGESTION_STATUS.md');
const downloadsMigrationZip = process.env.MCP_DOWNLOADS_MIGRATION_ZIP;

const sourceRoots = [
  {
    label: 'workspace-ressources',
    kind: 'external_workspace',
    path: join(repoRoot, '..', '..', 'Ressources'),
    recursive: false
  },
  ...(downloadsMigrationZip ? [{
    label: 'downloads-migration-zip',
    kind: 'external_download',
    path: downloadsMigrationZip,
    recursive: false,
    singleFile: true
  }] : []),
  {
    label: 'repo-migration',
    kind: 'repository',
    path: join(repoRoot, 'Migration'),
    recursive: true
  },
  {
    label: 'repo-memory',
    kind: 'repository',
    path: join(repoRoot, 'memory'),
    recursive: true
  }
];

const generatedRelativePaths = new Set([
  'Migration/index/SOURCE_REGISTRY.json',
  'Migration/index/SOURCE_INGESTION_STATUS.md',
  'Migration/index/PDF_TEXT_AUDIT.json',
  'Migration/index/PDF_TEXT_AUDIT_STATUS.md',
  'Migration/index/ARCHIVE_TEXT_AUDIT.json',
  'Migration/index/ARCHIVE_TEXT_AUDIT_STATUS.md',
  'Migration/index/OBJECTIVE_TRACEABILITY_MATRIX.json',
  'Migration/index/OBJECTIVE_TRACEABILITY_MATRIX.md',
  'Migration/index/MCP_EXECUTION_TASKS.json',
  'Migration/index/MCP_EXECUTION_TASKS.md',
  'Migration/index/BLOCKER_RESOLUTION_RUNBOOK.json',
  'Migration/index/BLOCKER_RESOLUTION_RUNBOOK.md',
  'Migration/index/COMPLETION_AUDIT.json',
  'Migration/index/COMPLETION_AUDIT.md',
  'Migration/index/OPERATOR_ACTION_PACK.json',
  'Migration/index/OPERATOR_ACTION_PACK.md',
  'Migration/index/OPERATOR_ACTION_ISSUE_LOG.json',
  'Migration/index/OPERATOR_ACTION_ISSUE_LOG.md',
  'Migration/index/RESUME_GATE.json',
  'Migration/index/RESUME_GATE.md',
  'Migration/index/EXECUTION_RUNWAY.json',
  'Migration/index/EXECUTION_RUNWAY.md',
  'Migration/serveur/PRIVATE_SERVER_INVENTORY_TASK_CARDS.json',
  'Migration/serveur/PRIVATE_SERVER_INVENTORY_TASK_CARDS.md'
]);

const textExtensions = new Set(['.md', '.txt', '.csv', '.json']);

function toRepoRelative(absolutePath) {
  const rel = relative(repoRoot, absolutePath).split(sep).join('/');
  if (rel === '') return '';
  if (rel.startsWith('..') || rel.startsWith('/') || /^[A-Za-z]:/.test(rel)) return null;
  return rel;
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function textSha256(text) {
  return sha256(Buffer.from(text, 'utf8'));
}

function normalizeId(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

function walkDir(rootPath, recursive) {
  const files = [];
  for (const entry of readdirSync(rootPath, { withFileTypes: true })) {
    const absolutePath = join(rootPath, entry.name);
    if (entry.isDirectory()) {
      if (recursive) files.push(...walkDir(absolutePath, recursive));
      continue;
    }
    if (!entry.isFile()) continue;
    const repoRelative = toRepoRelative(absolutePath);
    if (repoRelative && generatedRelativePaths.has(repoRelative)) continue;
    files.push(absolutePath);
  }
  return files;
}

function collectFiles() {
  const sources = [];
  for (const root of sourceRoots) {
    if (!existsSync(root.path)) {
      sources.push({ root, files: [], available: false });
      continue;
    }

    if (root.singleFile) {
      sources.push({ root, files: [root.path], available: true });
      continue;
    }

    sources.push({
      root,
      files: walkDir(root.path, root.recursive),
      available: true
    });
  }
  return sources;
}

function readUInt32(buffer, offset) {
  return buffer.readUInt32LE(offset);
}

function readUInt16(buffer, offset) {
  return buffer.readUInt16LE(offset);
}

function findEndOfCentralDirectory(buffer) {
  const minOffset = Math.max(0, buffer.length - 0xffff - 22);
  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }
  return null;
}

function parseZipEntries(buffer) {
  const eocdOffset = findEndOfCentralDirectory(buffer);
  if (eocdOffset === null) return [];

  const totalEntries = readUInt16(buffer, eocdOffset + 10);
  const centralDirectoryOffset = readUInt32(buffer, eocdOffset + 16);
  const entries = [];
  let offset = centralDirectoryOffset;

  for (let index = 0; index < totalEntries; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;
    const compressionMethod = readUInt16(buffer, offset + 10);
    const compressedSize = readUInt32(buffer, offset + 20);
    const uncompressedSize = readUInt32(buffer, offset + 24);
    const fileNameLength = readUInt16(buffer, offset + 28);
    const extraFieldLength = readUInt16(buffer, offset + 30);
    const fileCommentLength = readUInt16(buffer, offset + 32);
    const localHeaderOffset = readUInt32(buffer, offset + 42);
    const fileName = buffer
      .subarray(offset + 46, offset + 46 + fileNameLength)
      .toString('utf8');

    entries.push({
      fileName,
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset
    });

    offset += 46 + fileNameLength + extraFieldLength + fileCommentLength;
  }

  return entries;
}

function extractZipEntry(buffer, entry) {
  const offset = entry.localHeaderOffset;
  if (buffer.readUInt32LE(offset) !== 0x04034b50) return null;

  const fileNameLength = readUInt16(buffer, offset + 26);
  const extraFieldLength = readUInt16(buffer, offset + 28);
  const dataStart = offset + 30 + fileNameLength + extraFieldLength;
  const compressed = buffer.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.compressionMethod === 0) return compressed;
  if (entry.compressionMethod === 8) return inflateRawSync(compressed);
  return null;
}

function decodeXmlEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function xmlToPlainText(xml) {
  return decodeXmlEntities(xml)
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();
}

function summarizeText(text) {
  const normalized = text.replace(/\r\n/g, '\n');
  const words = normalized.trim().split(/\s+/).filter(Boolean);
  return {
    textSha256: textSha256(normalized),
    charCount: normalized.length,
    lineCount: normalized.length === 0 ? 0 : normalized.split('\n').length,
    wordCount: words.length,
    secretSignalCount: countSecretSignals(normalized)
  };
}

function countSecretSignals(text) {
  const patterns = [
    /gh[pousr]_[A-Za-z0-9_]{20,}/g,
    /BEGIN (?:RSA|OPENSSH|EC|PRIVATE) KEY/g,
    /\b(?:password|passwd|secret|token|api[_-]?key)\s*[:=]\s*['"]?[A-Za-z0-9._/-]{12,}/gi
  ];
  return patterns.reduce((count, pattern) => count + [...text.matchAll(pattern)].length, 0);
}

function estimatePdfPages(buffer) {
  const latin = buffer.toString('latin1');
  const matches = latin.match(/\/Type\s*\/Page\b/g);
  return matches ? matches.length : null;
}

function classifyArchiveEntries(entries) {
  const extensions = {};
  let sensitiveNameSignals = 0;

  for (const entry of entries) {
    const lower = entry.fileName.toLowerCase();
    const extension = extname(lower) || '[none]';
    extensions[extension] = (extensions[extension] ?? 0) + 1;
    if (
      lower.includes('.env') ||
      lower.includes('private') ||
      lower.includes('secret') ||
      lower.includes('token') ||
      lower.includes('key')
    ) {
      sensitiveNameSignals += 1;
    }
  }

  return { extensions, sensitiveNameSignals };
}

function readDocx(buffer) {
  const entries = parseZipEntries(buffer);
  const documentXml = entries.find((entry) => entry.fileName === 'word/document.xml');
  if (!documentXml) {
    return {
      readStatus: 'archive_indexed',
      extraction: {
        method: 'zip_central_directory',
        archiveEntryCount: entries.length,
        archiveEntriesSample: entries.map((entry) => entry.fileName).slice(0, 80)
      }
    };
  }

  const xmlBuffer = extractZipEntry(buffer, documentXml);
  const text = xmlBuffer ? xmlToPlainText(xmlBuffer.toString('utf8')) : '';
  return {
    readStatus: text ? 'text_read' : 'archive_indexed',
    extraction: {
      method: text ? 'docx_word_document_xml' : 'zip_central_directory',
      archiveEntryCount: entries.length,
      archiveEntriesSample: entries.map((entry) => entry.fileName).slice(0, 80),
      ...summarizeText(text)
    }
  };
}

function readZip(buffer) {
  const entries = parseZipEntries(buffer);
  const archive = classifyArchiveEntries(entries);
  return {
    readStatus: 'archive_indexed',
    extraction: {
      method: 'zip_central_directory',
      archiveEntryCount: entries.length,
      archiveExtensions: archive.extensions,
      archiveSensitiveNameSignals: archive.sensitiveNameSignals,
      archiveEntriesSample: entries.map((entry) => entry.fileName).slice(0, 120)
    }
  };
}

function readFileForRegistry(absolutePath) {
  const buffer = readFileSync(absolutePath);
  const extension = extname(absolutePath).toLowerCase();
  const base = {
    sizeBytes: buffer.length,
    sha256: sha256(buffer),
    extension: extension || '[none]'
  };

  if (textExtensions.has(extension)) {
    const text = buffer.toString('utf8');
    const summary = summarizeText(text);
    const extraction = {
      method: extension === '.csv' ? 'utf8_csv_stats' : 'utf8_text_stats',
      ...summary
    };

    if (extension === '.csv') {
      const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
      extraction.csvColumns = firstLine.split(',').map((value) => value.trim()).filter(Boolean);
    }

    return { ...base, readStatus: 'text_read', extraction };
  }

  if (extension === '.docx') {
    return { ...base, ...readDocx(buffer) };
  }

  if (extension === '.zip') {
    return { ...base, ...readZip(buffer) };
  }

  if (extension === '.pdf') {
    return {
      ...base,
      readStatus: 'binary_indexed',
      extraction: {
        method: 'sha256_pdf_binary_index',
        pageCountEstimate: estimatePdfPages(buffer),
        note: 'PDF text is not stored in Git by this registry. Use a dedicated local PDF extractor before publishing raw text.'
      }
    };
  }

  return {
    ...base,
    readStatus: 'binary_indexed',
    extraction: {
      method: 'sha256_binary_index'
    }
  };
}

function sourcePathFor(root, absolutePath) {
  if (root.singleFile) return basename(absolutePath);
  return relative(root.path, absolutePath).split(sep).join('/');
}

function roleForFile(fileName) {
  const lower = fileName.toLowerCase();
  const roles = [];
  if (lower.includes('audit')) roles.push('audit');
  if (lower.includes('migration')) roles.push('migration');
  if (lower.includes('github') || lower.includes('branch')) roles.push('github_mapping');
  if (lower.includes('source')) roles.push('source_corpus');
  if (lower.includes('conversation')) roles.push('conversation_memory');
  if (lower.includes('loop')) roles.push('loop_engineering');
  if (lower.includes('serveur') || lower.includes('server')) roles.push('server_mapping');
  if (roles.length === 0) roles.push('reference');
  return roles;
}

function buildRegistry() {
  const collected = collectFiles();
  const documents = [];
  const seenSha = new Map();
  const roots = [];

  for (const group of collected) {
    roots.push({
      label: group.root.label,
      kind: group.root.kind,
      available: group.available,
      recursive: group.root.recursive,
      fileCount: group.files.length
    });

    for (const absolutePath of group.files.sort((a, b) => a.localeCompare(b))) {
      const sourcePath = sourcePathFor(group.root, absolutePath);
      const file = readFileForRegistry(absolutePath);
      const sourceId = `${normalizeId(group.root.label)}-${normalizeId(sourcePath)}-${file.sha256.slice(0, 12)}`;
      const duplicateOf = seenSha.get(file.sha256) ?? null;
      if (!duplicateOf) seenSha.set(file.sha256, sourceId);

      documents.push({
        sourceId,
        sourceRoot: group.root.label,
        sourceRootKind: group.root.kind,
        sourcePath,
        repoPath: toRepoRelative(absolutePath),
        fileName: basename(absolutePath),
        roles: roleForFile(sourcePath),
        sizeBytes: file.sizeBytes,
        sha256: file.sha256,
        duplicateOf,
        extension: file.extension,
        readStatus: file.readStatus,
        extraction: file.extraction
      });
    }
  }

  const totals = summarizeDocuments(documents);
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    generator: 'scripts/build-source-registry.mjs',
    purpose: 'MCP source inventory and safe ingestion evidence for the WealthTech migration corpus.',
    safety: {
      rawSourceTextStored: false,
      rawSecretsStored: false,
      publicationMode: 'hashes_stats_and_archive_names_only'
    },
    roots,
    totals,
    documents
  };
}

function increment(map, key, amount = 1) {
  map[key] = (map[key] ?? 0) + amount;
}

function summarizeDocuments(documents) {
  const byExtension = {};
  const byReadStatus = {};
  let totalBytes = 0;
  let duplicateFiles = 0;
  let textReadFiles = 0;
  let archiveIndexedFiles = 0;
  let binaryIndexedFiles = 0;
  let secretSignalFiles = 0;

  for (const document of documents) {
    totalBytes += document.sizeBytes;
    increment(byExtension, document.extension);
    increment(byReadStatus, document.readStatus);
    if (document.duplicateOf) duplicateFiles += 1;
    if (document.readStatus === 'text_read') textReadFiles += 1;
    if (document.readStatus === 'archive_indexed') archiveIndexedFiles += 1;
    if (document.readStatus === 'binary_indexed') binaryIndexedFiles += 1;
    if ((document.extraction.secretSignalCount ?? 0) > 0) secretSignalFiles += 1;
    if ((document.extraction.archiveSensitiveNameSignals ?? 0) > 0) secretSignalFiles += 1;
  }

  return {
    sourceFileCount: documents.length,
    uniqueContentFileCount: documents.length - duplicateFiles,
    duplicateFileCount: duplicateFiles,
    totalBytes,
    textReadFiles,
    archiveIndexedFiles,
    binaryIndexedFiles,
    secretSignalFiles,
    byExtension,
    byReadStatus
  };
}

function renderMarkdown(registry) {
  const pdfAudit = loadPdfAuditSummary();
  const totals = registry.totals;
  const rootsTable = registry.roots
    .map((root) => `| ${root.label} | ${root.kind} | ${root.available ? 'yes' : 'no'} | ${root.fileCount} |`)
    .join('\n');
  const statusTable = Object.entries(totals.byReadStatus)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([status, count]) => `| ${status} | ${count} |`)
    .join('\n');
  const extensionTable = Object.entries(totals.byExtension)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([extension, count]) => `| ${extension} | ${count} |`)
    .join('\n');
  const pdfAuditSection = renderPdfAuditSection(registry, pdfAudit);

  return `# Source ingestion status - Migration WealthTech

Generated at: ${registry.generatedAt}

This file is generated by \`scripts/build-source-registry.mjs\`. It proves that the MCP repository has a reproducible local inventory for the migration corpus without publishing raw source text, raw tokens, private keys, or environment secrets.

## Summary

| Metric | Value |
|---|---:|
| Source files | ${totals.sourceFileCount} |
| Unique content files | ${totals.uniqueContentFileCount} |
| Duplicate files | ${totals.duplicateFileCount} |
| Text-readable files | ${totals.textReadFiles} |
| Archive-indexed files | ${totals.archiveIndexedFiles} |
| Binary-indexed files | ${totals.binaryIndexedFiles} |
| Files with secret-name or secret-text signals | ${totals.secretSignalFiles} |
| Total bytes indexed | ${totals.totalBytes} |

## Source roots

| Root | Kind | Available | Files |
|---|---|---:|---:|
${rootsTable}

## Read status

| Status | Files |
|---|---:|
${statusTable}

## Extensions

| Extension | Files |
|---|---:|
${extensionTable}

## PDF text audit

${pdfAuditSection}

## No-regression rules

- Keep this registry generated, not hand-edited.
- Do not commit raw tokens, private keys, raw .env files, or recovery codes.
- Treat files with secret signals as review-required before any publication.
- Use branch and pull request workflow for updates.
`;
}

function loadPdfAuditSummary() {
  const path = join(outputDir, 'PDF_TEXT_AUDIT.json');
  if (!existsSync(path)) return null;
  try {
    const audit = JSON.parse(readFileSync(path, 'utf8'));
    return {
      generatedAt: audit.generatedAt,
      totals: audit.totals,
      documents: Array.isArray(audit.documents) ? audit.documents : []
    };
  } catch {
    return null;
  }
}

function renderPdfAuditSection(registry, pdfAudit) {
  if (!pdfAudit) {
    const pendingPdf = registry.documents
      .filter((document) => document.extension === '.pdf' && document.readStatus === 'binary_indexed')
      .map((document) => `- ${document.sourceRoot}/${document.sourcePath} (${document.extraction.pageCountEstimate ?? 'unknown'} pages estimated)`)
      .join('\n');
    return `The PDF files are safely indexed by hash and estimated page count. Their raw text is not committed in this registry. Before declaring the full corpus completely ingested, run \`scripts/build-pdf-text-audit.py\` and review the output for secrets.\n\n${pendingPdf || '- No pending PDF files.'}`;
  }

  const auditedRegistryPdfPaths = new Set(
    pdfAudit.documents
      .filter((document) => document.sourceKind === 'registry_pdf' && ['pdf_text_read', 'pdf_text_empty', 'pdf_duplicate'].includes(document.pdfAuditStatus))
      .map((document) => `${document.sourceRoot}/${document.sourcePath}`)
  );
  const pendingPdf = registry.documents
    .filter((document) => document.extension === '.pdf')
    .filter((document) => !auditedRegistryPdfPaths.has(`${document.sourceRoot}/${document.sourcePath}`))
    .map((document) => `- ${document.sourceRoot}/${document.sourcePath}`)
    .join('\n');

  return `PDF text audit generated at ${pdfAudit.generatedAt}.\n\n| Metric | Value |\n|---|---:|\n| PDF documents audited | ${pdfAudit.totals.pdfDocumentCount} |\n| Unique PDF contents | ${pdfAudit.totals.uniquePdfContentCount} |\n| Direct registry PDFs covered | ${auditedRegistryPdfPaths.size} |\n| Archive PDF entries covered | ${pdfAudit.totals.bySourceKind?.archive_pdf_entry ?? 0} |\n| PDF documents with extracted text | ${pdfAudit.totals.textReadDocumentCount} |\n| Missing/error PDF documents | ${pdfAudit.totals.errorDocumentCount} |\n| Documents with secret signals | ${pdfAudit.totals.secretSignalDocumentCount} |\n\nPending direct registry PDFs:\n\n${pendingPdf || '- None.'}`;
}

mkdirSync(outputDir, { recursive: true });
const registry = buildRegistry();
writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
writeFileSync(statusPath, renderMarkdown(registry));

console.log(`Wrote ${relative(repoRoot, registryPath)}`);
console.log(`Wrote ${relative(repoRoot, statusPath)}`);
console.log(JSON.stringify(registry.totals, null, 2));
