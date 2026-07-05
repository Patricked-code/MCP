#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import zipfile
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any

try:
    from pypdf import PdfReader
except Exception as exc:  # pragma: no cover - exercised only when runtime is missing pypdf
    print(f"pypdf is required for PDF text audit: {exc}", file=sys.stderr)
    sys.exit(2)


REPO_ROOT = Path.cwd()
INDEX_DIR = REPO_ROOT / "Migration" / "index"
SOURCE_REGISTRY_PATH = INDEX_DIR / "SOURCE_REGISTRY.json"
OUTPUT_JSON_PATH = INDEX_DIR / "PDF_TEXT_AUDIT.json"
OUTPUT_MD_PATH = INDEX_DIR / "PDF_TEXT_AUDIT_STATUS.md"

SECRET_PATTERNS = [
    re.compile(r"gh[pousr]_[A-Za-z0-9_]{20,}"),
    re.compile(r"BEGIN (?:RSA|OPENSSH|EC|PRIVATE) KEY"),
    re.compile(r"\b(?:password|passwd|secret|token|api[_-]?key)\s*[:=]\s*['\"]?[A-Za-z0-9._/-]{12,}", re.I),
]

KEYWORDS = [
    "MCP",
    "chainsolutions-wealthtech",
    "GitHub",
    "migration",
    "serveur",
    "server",
    "agent",
    "audit",
    "regression",
    "Claude",
    "Codex",
    "ChatGPT",
    "branche",
    "branch",
    "deploiement",
    "deployment",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_text(text: str) -> str:
    return sha256_bytes(text.encode("utf-8"))


def normalize_text(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n")


def count_secret_signals(text: str) -> int:
    return sum(len(pattern.findall(text)) for pattern in SECRET_PATTERNS)


def keyword_counts(text: str) -> dict[str, int]:
    return {
        keyword: len(re.findall(re.escape(keyword), text, flags=re.I))
        for keyword in KEYWORDS
    }


def objective_signals(counts: dict[str, int]) -> dict[str, bool]:
    return {
        "mentionsMcp": counts.get("MCP", 0) > 0,
        "mentionsTargetOrganization": counts.get("chainsolutions-wealthtech", 0) > 0,
        "mentionsGitHub": counts.get("GitHub", 0) > 0,
        "mentionsMigration": counts.get("migration", 0) > 0,
        "mentionsAgents": counts.get("agent", 0) > 0,
        "mentionsAudit": counts.get("audit", 0) > 0,
        "mentionsNoRegression": counts.get("regression", 0) > 0,
        "mentionsServerMapping": counts.get("server", 0) > 0 or counts.get("serveur", 0) > 0,
    }


def summarize_pages(page_texts: list[str]) -> dict[str, Any]:
    normalized_pages = [normalize_text(text) for text in page_texts]
    combined_text = "\n\n".join(normalized_pages)
    words = re.findall(r"\S+", combined_text)
    counts = keyword_counts(combined_text)
    page_stats = []
    secret_signal_count = 0

    for index, page_text in enumerate(normalized_pages, start=1):
        page_words = re.findall(r"\S+", page_text)
        page_secret_signals = count_secret_signals(page_text)
        secret_signal_count += page_secret_signals
        page_stats.append({
            "page": index,
            "charCount": len(page_text),
            "wordCount": len(page_words),
            "textSha256": sha256_text(page_text),
            "secretSignalCount": page_secret_signals,
        })

    return {
        "method": "pypdf_page_extract_text",
        "pageCount": len(page_texts),
        "pagesWithText": sum(1 for text in normalized_pages if text.strip()),
        "emptyPages": sum(1 for text in normalized_pages if not text.strip()),
        "charCount": len(combined_text),
        "lineCount": 0 if not combined_text else combined_text.count("\n") + 1,
        "wordCount": len(words),
        "textSha256": sha256_text(combined_text),
        "secretSignalCount": secret_signal_count,
        "keywordCounts": counts,
        "objectiveSignals": objective_signals(counts),
        "perPageStats": page_stats,
    }


def load_source_registry() -> dict[str, Any]:
    with SOURCE_REGISTRY_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def source_root_base(source_root: str) -> Path | None:
    if source_root == "workspace-ressources":
        return REPO_ROOT.parents[1] / "Ressources"
    if source_root == "repo-migration":
        return REPO_ROOT / "Migration"
    if source_root == "repo-memory":
        return REPO_ROOT / "memory"
    if source_root == "downloads-migration-zip":
        value = os.environ.get("MCP_DOWNLOADS_MIGRATION_ZIP")
        return Path(value).parent if value else None
    return None


def resolve_registry_document_path(document: dict[str, Any]) -> Path | None:
    repo_path = document.get("repoPath")
    if isinstance(repo_path, str) and repo_path:
        return REPO_ROOT / repo_path

    base = source_root_base(str(document.get("sourceRoot", "")))
    source_path = document.get("sourcePath")
    if base is None or not isinstance(source_path, str):
        return None
    return base / source_path


def extract_pdf_text_from_reader(reader: PdfReader) -> dict[str, Any]:
    page_texts = []
    for page in reader.pages:
        try:
            page_texts.append(page.extract_text() or "")
        except Exception:
            page_texts.append("")
    return summarize_pages(page_texts)


def audit_pdf_bytes(source: dict[str, Any], data: bytes, seen_by_sha: dict[str, str]) -> dict[str, Any]:
    pdf_sha = sha256_bytes(data)
    duplicate_of = seen_by_sha.get(pdf_sha)
    if duplicate_of:
        return {
            **source,
            "sha256": pdf_sha,
            "duplicateOf": duplicate_of,
            "pdfAuditStatus": "pdf_duplicate",
            "extraction": {
                "method": "sha256_duplicate_pdf",
                "rawPdfTextStored": False,
            },
        }

    seen_by_sha[pdf_sha] = str(source["pdfAuditId"])

    try:
        reader = PdfReader(BytesIO(data))
        if reader.is_encrypted:
            try:
                reader.decrypt("")
            except Exception:
                return {
                    **source,
                    "sha256": pdf_sha,
                    "duplicateOf": None,
                    "pdfAuditStatus": "pdf_error",
                    "error": "encrypted_pdf_could_not_be_decrypted_with_empty_password",
                    "extraction": {"rawPdfTextStored": False},
                }

        extraction = extract_pdf_text_from_reader(reader)
        status = "pdf_text_read" if extraction["charCount"] > 0 else "pdf_text_empty"
        return {
            **source,
            "sha256": pdf_sha,
            "duplicateOf": None,
            "pdfAuditStatus": status,
            "extraction": {
                **extraction,
                "rawPdfTextStored": False,
            },
        }
    except Exception as exc:
        return {
            **source,
            "sha256": pdf_sha,
            "duplicateOf": None,
            "pdfAuditStatus": "pdf_error",
            "error": str(exc),
            "extraction": {"rawPdfTextStored": False},
        }


def audit_pdf_file(document: dict[str, Any], seen_by_sha: dict[str, str]) -> dict[str, Any]:
    path = resolve_registry_document_path(document)
    source = {
        "pdfAuditId": f"registry:{document.get('sourceId')}",
        "sourceKind": "registry_pdf",
        "sourceId": document.get("sourceId"),
        "sourceRoot": document.get("sourceRoot"),
        "sourcePath": document.get("sourcePath"),
        "repoPath": document.get("repoPath"),
        "fileName": document.get("fileName"),
        "sizeBytes": document.get("sizeBytes"),
    }

    if path is None or not path.exists():
        return {
            **source,
            "sha256": document.get("sha256"),
            "duplicateOf": document.get("duplicateOf"),
            "pdfAuditStatus": "pdf_missing",
            "extraction": {"rawPdfTextStored": False},
        }

    data = path.read_bytes()
    return audit_pdf_bytes(source, data, seen_by_sha)


def archive_pdf_jobs(document: dict[str, Any]) -> list[tuple[dict[str, Any], bytes]]:
    path = resolve_registry_document_path(document)
    if path is None or not path.exists():
        return []

    jobs: list[tuple[dict[str, Any], bytes]] = []
    try:
        with zipfile.ZipFile(path) as archive:
            for member in archive.infolist():
                if member.is_dir() or not member.filename.lower().endswith(".pdf"):
                    continue
                data = archive.read(member)
                source = {
                    "pdfAuditId": f"archive:{document.get('sourceId')}::{member.filename}",
                    "sourceKind": "archive_pdf_entry",
                    "sourceId": document.get("sourceId"),
                    "sourceRoot": document.get("sourceRoot"),
                    "sourcePath": f"{document.get('sourcePath')}::{member.filename}",
                    "repoPath": document.get("repoPath"),
                    "fileName": Path(member.filename).name,
                    "archivePath": document.get("sourcePath"),
                    "archiveEntry": member.filename,
                    "sizeBytes": len(data),
                }
                jobs.append((source, data))
    except Exception:
        return []

    return jobs


def increment(map_value: dict[str, int], key: str, amount: int = 1) -> None:
    map_value[key] = map_value.get(key, 0) + amount


def totals_for(documents: list[dict[str, Any]]) -> dict[str, Any]:
    by_status: dict[str, int] = {}
    by_source_kind: dict[str, int] = {}
    keyword_totals: dict[str, int] = {}
    total_pages = 0
    total_chars = 0
    total_words = 0
    duplicate_documents = 0
    secret_signal_documents = 0

    for document in documents:
        status = str(document.get("pdfAuditStatus", "unknown"))
        source_kind = str(document.get("sourceKind", "unknown"))
        increment(by_status, status)
        increment(by_source_kind, source_kind)
        if document.get("duplicateOf"):
            duplicate_documents += 1

        extraction = document.get("extraction", {})
        if isinstance(extraction, dict):
            total_pages += int(extraction.get("pageCount", 0) or 0)
            total_chars += int(extraction.get("charCount", 0) or 0)
            total_words += int(extraction.get("wordCount", 0) or 0)
            if int(extraction.get("secretSignalCount", 0) or 0) > 0:
                secret_signal_documents += 1
            counts = extraction.get("keywordCounts", {})
            if isinstance(counts, dict):
                for key, value in counts.items():
                    keyword_totals[str(key)] = keyword_totals.get(str(key), 0) + int(value or 0)

    return {
        "pdfDocumentCount": len(documents),
        "uniquePdfContentCount": len(documents) - duplicate_documents,
        "duplicatePdfDocumentCount": duplicate_documents,
        "textReadDocumentCount": by_status.get("pdf_text_read", 0),
        "textEmptyDocumentCount": by_status.get("pdf_text_empty", 0),
        "errorDocumentCount": by_status.get("pdf_error", 0) + by_status.get("pdf_missing", 0),
        "secretSignalDocumentCount": secret_signal_documents,
        "totalPagesExtracted": total_pages,
        "totalCharsExtracted": total_chars,
        "totalWordsExtracted": total_words,
        "byStatus": by_status,
        "bySourceKind": by_source_kind,
        "keywordTotals": keyword_totals,
    }


def build_audit() -> dict[str, Any]:
    registry = load_source_registry()
    seen_by_sha: dict[str, str] = {}
    documents: list[dict[str, Any]] = []

    registry_documents = registry.get("documents", [])
    for document in registry_documents:
        if document.get("extension") == ".pdf":
            documents.append(audit_pdf_file(document, seen_by_sha))

    for document in registry_documents:
        if document.get("extension") == ".zip":
            for source, data in archive_pdf_jobs(document):
                documents.append(audit_pdf_bytes(source, data, seen_by_sha))

    return {
        "version": 1,
        "generatedAt": now_iso(),
        "generator": "scripts/build-pdf-text-audit.py",
        "sourceRegistry": "Migration/index/SOURCE_REGISTRY.json",
        "purpose": "Safe PDF text extraction audit for the WealthTech migration corpus.",
        "safety": {
            "rawPdfTextStored": False,
            "rawSecretsStored": False,
            "publicationMode": "hashes_counts_page_stats_and_keyword_counts_only",
        },
        "totals": totals_for(documents),
        "documents": documents,
    }


def render_markdown(audit: dict[str, Any]) -> str:
    totals = audit["totals"]
    status_rows = "\n".join(
        f"| {status} | {count} |"
        for status, count in sorted(totals["byStatus"].items())
    )
    kind_rows = "\n".join(
        f"| {kind} | {count} |"
        for kind, count in sorted(totals["bySourceKind"].items())
    )
    keyword_rows = "\n".join(
        f"| {keyword} | {count} |"
        for keyword, count in sorted(totals["keywordTotals"].items())
        if count
    )
    document_rows = "\n".join(
        "| {source} | {status} | {pages} | {words} | {duplicate} |".format(
            source=str(document.get("sourcePath", "")).replace("|", "\\|"),
            status=document.get("pdfAuditStatus", "unknown"),
            pages=document.get("extraction", {}).get("pageCount", 0),
            words=document.get("extraction", {}).get("wordCount", 0),
            duplicate=document.get("duplicateOf") or "",
        )
        for document in audit["documents"]
    )

    return f"""# PDF text audit status - Migration WealthTech

Generated at: {audit["generatedAt"]}

This file is generated by `scripts/build-pdf-text-audit.py`. It proves local PDF text extraction without committing raw PDF text, raw tokens, private keys, `.env` content, or recovery codes.

## Summary

| Metric | Value |
|---|---:|
| PDF documents audited | {totals["pdfDocumentCount"]} |
| Unique PDF contents | {totals["uniquePdfContentCount"]} |
| Duplicate PDF documents | {totals["duplicatePdfDocumentCount"]} |
| PDF documents with extracted text | {totals["textReadDocumentCount"]} |
| Empty-text PDF documents | {totals["textEmptyDocumentCount"]} |
| Missing/error PDF documents | {totals["errorDocumentCount"]} |
| Documents with secret signals | {totals["secretSignalDocumentCount"]} |
| Pages extracted | {totals["totalPagesExtracted"]} |
| Words extracted | {totals["totalWordsExtracted"]} |
| Characters extracted | {totals["totalCharsExtracted"]} |

## By status

| Status | Documents |
|---|---:|
{status_rows}

## By source kind

| Source kind | Documents |
|---|---:|
{kind_rows}

## Objective keyword counts

| Keyword | Count |
|---|---:|
{keyword_rows or "| none | 0 |"}

## Documents

| Source | Status | Pages | Words | Duplicate of |
|---|---|---:|---:|---|
{document_rows}

## No-regression rules

- Keep this audit generated, not hand-edited.
- Do not commit raw extracted PDF text unless a separate secret review explicitly approves it.
- Treat any secret signal as review-required before publication.
- Use branch and pull request workflow for updates.
"""


def main() -> int:
    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    audit = build_audit()
    with OUTPUT_JSON_PATH.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(json.dumps(audit, indent=2, ensure_ascii=False) + "\n")
    with OUTPUT_MD_PATH.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(render_markdown(audit))
    print(f"Wrote {OUTPUT_JSON_PATH.relative_to(REPO_ROOT)}")
    print(f"Wrote {OUTPUT_MD_PATH.relative_to(REPO_ROOT)}")
    print(json.dumps(audit["totals"], indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
