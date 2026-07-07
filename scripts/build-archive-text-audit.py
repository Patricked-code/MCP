#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import html
import json
import os
import re
import zipfile
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any


REPO_ROOT = Path.cwd()
INDEX_DIR = REPO_ROOT / "Migration" / "index"
SOURCE_REGISTRY_PATH = INDEX_DIR / "SOURCE_REGISTRY.json"
OUTPUT_JSON_PATH = INDEX_DIR / "ARCHIVE_TEXT_AUDIT.json"
OUTPUT_MD_PATH = INDEX_DIR / "ARCHIVE_TEXT_AUDIT_STATUS.md"

DOCX_DOCUMENT_PATH = "word/document.xml"
MAX_ARCHIVE_DEPTH = 3
TEXT_EXTENSIONS = {".md", ".txt", ".csv", ".json"}
AUDITED_TEXT_EXTENSIONS = TEXT_EXTENSIONS | {".docx"}

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


def sha256_text(value: str) -> str:
    return sha256_bytes(value.encode("utf-8"))


def normalize_text(value: str) -> str:
    return value.replace("\r\n", "\n").replace("\r", "\n")


def count_secret_signals(text: str) -> int:
    return sum(len(pattern.findall(text)) for pattern in SECRET_PATTERNS)


def keyword_counts(text: str) -> dict[str, int]:
    return {
        keyword: len(re.findall(re.escape(keyword), text, flags=re.I))
        for keyword in KEYWORDS
    }


def decode_xml_entities(value: str) -> str:
    return html.unescape(value)


def docx_to_text(data: bytes) -> tuple[str, str | None]:
    try:
        with zipfile.ZipFile(BytesIO(data)) as archive:
            xml = archive.read(DOCX_DOCUMENT_PATH).decode("utf-8", errors="replace")
    except Exception as exc:
        return "", str(exc)

    text = re.sub(r"</w:p>", "\n", xml)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s+", "\n", text)
    return decode_xml_entities(text).strip(), None


def text_for_entry(extension: str, data: bytes) -> tuple[str, str, str | None]:
    if extension == ".docx":
        text, error = docx_to_text(data)
        return text, "docx_word_document_xml", error
    return data.decode("utf-8", errors="replace"), "utf8_archive_text_stats", None


def summarize_text(text: str, method: str) -> dict[str, Any]:
    normalized = normalize_text(text)
    words = re.findall(r"\S+", normalized)
    return {
        "method": method,
        "charCount": len(normalized),
        "lineCount": 0 if not normalized else normalized.count("\n") + 1,
        "wordCount": len(words),
        "textSha256": sha256_text(normalized),
        "secretSignalCount": count_secret_signals(normalized),
        "keywordCounts": keyword_counts(normalized),
        "rawArchiveTextStored": False,
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


def increment(map_value: dict[str, int], key: str, amount: int = 1) -> None:
    map_value[key] = map_value.get(key, 0) + amount


def archive_entry_id(document: dict[str, Any], archive_path: str, data_sha: str) -> str:
    source_id = str(document.get("sourceId", "unknown"))
    path_hash = sha256_text(archive_path)[:16]
    return f"archive:{source_id}:{path_hash}:{data_sha[:12]}"


def entry_base(
    document: dict[str, Any],
    archive_path: str,
    data: bytes,
    depth: int,
    seen_entries: dict[str, str],
) -> tuple[dict[str, Any], str | None, str]:
    data_sha = sha256_bytes(data)
    duplicate_of = seen_entries.get(data_sha)
    if duplicate_of is None:
        seen_entries[data_sha] = archive_entry_id(document, archive_path, data_sha)

    return {
        "archiveEntryAuditId": archive_entry_id(document, archive_path, data_sha),
        "sourceRoot": document.get("sourceRoot"),
        "sourcePath": document.get("sourcePath"),
        "sourceId": document.get("sourceId"),
        "archivePath": archive_path,
        "archivePathSha256": sha256_text(archive_path),
        "archiveDepth": depth,
        "fileName": Path(archive_path).name,
        "extension": Path(archive_path).suffix.lower() or "[none]",
        "sizeBytes": len(data),
        "sha256": data_sha,
        "duplicateOf": duplicate_of,
    }, duplicate_of, data_sha


def audit_zip_bytes(
    document: dict[str, Any],
    data: bytes,
    archive_prefix: str,
    depth: int,
    seen_entries: dict[str, str],
) -> tuple[list[dict[str, Any]], dict[str, int]]:
    entries: list[dict[str, Any]] = []
    local_counts = {
        "directEntryCount": 0,
        "recursiveEntryCount": 0,
        "textEntryCount": 0,
        "pdfDelegatedEntryCount": 0,
        "nestedZipEntryCount": 0,
        "binaryEntryCount": 0,
        "secretSignalEntryCount": 0,
        "errorEntryCount": 0,
    }

    try:
        with zipfile.ZipFile(BytesIO(data)) as archive:
            members = sorted(
                (member for member in archive.infolist() if not member.is_dir()),
                key=lambda member: member.filename,
            )
            for member in members:
                local_counts["directEntryCount"] += 1
                local_counts["recursiveEntryCount"] += 1
                archive_path = f"{archive_prefix}::{member.filename}" if archive_prefix else member.filename
                extension = Path(member.filename).suffix.lower()
                try:
                    entry_data = archive.read(member)
                except Exception as exc:
                    local_counts["errorEntryCount"] += 1
                    entries.append({
                        "archiveEntryAuditId": f"archive-error:{sha256_text(archive_path)[:16]}",
                        "sourceRoot": document.get("sourceRoot"),
                        "sourcePath": document.get("sourcePath"),
                        "sourceId": document.get("sourceId"),
                        "archivePath": archive_path,
                        "archivePathSha256": sha256_text(archive_path),
                        "archiveDepth": depth,
                        "fileName": Path(archive_path).name,
                        "extension": extension or "[none]",
                        "sizeBytes": 0,
                        "sha256": None,
                        "duplicateOf": None,
                        "archiveTextAuditStatus": "archive_entry_error",
                        "error": str(exc),
                        "extraction": {"rawArchiveTextStored": False},
                    })
                    continue

                base, duplicate_of, _data_sha = entry_base(document, archive_path, entry_data, depth, seen_entries)

                if duplicate_of:
                    entries.append({
                        **base,
                        "archiveTextAuditStatus": "archive_duplicate",
                        "extraction": {
                            "method": "sha256_duplicate_archive_entry",
                            "rawArchiveTextStored": False,
                        },
                    })
                    continue

                if extension in AUDITED_TEXT_EXTENSIONS:
                    text, method, error = text_for_entry(extension, entry_data)
                    if error:
                        local_counts["errorEntryCount"] += 1
                        entries.append({
                            **base,
                            "archiveTextAuditStatus": "archive_text_error",
                            "error": error,
                            "extraction": {"method": method, "rawArchiveTextStored": False},
                        })
                        continue

                    extraction = summarize_text(text, method)
                    local_counts["textEntryCount"] += 1
                    if extraction["secretSignalCount"] > 0:
                        local_counts["secretSignalEntryCount"] += 1
                    entries.append({
                        **base,
                        "archiveTextAuditStatus": "archive_text_read" if extraction["charCount"] > 0 else "archive_text_empty",
                        "extraction": extraction,
                    })
                    continue

                if extension == ".zip":
                    local_counts["nestedZipEntryCount"] += 1
                    entries.append({
                        **base,
                        "archiveTextAuditStatus": "archive_nested_zip_indexed",
                        "extraction": {
                            "method": "recursive_zip_central_directory",
                            "maxArchiveDepth": MAX_ARCHIVE_DEPTH,
                            "rawArchiveTextStored": False,
                        },
                    })
                    if depth + 1 <= MAX_ARCHIVE_DEPTH:
                        nested_entries, nested_counts = audit_zip_bytes(
                            document,
                            entry_data,
                            archive_path,
                            depth + 1,
                            seen_entries,
                        )
                        entries.extend(nested_entries)
                        for key, value in nested_counts.items():
                            if key == "directEntryCount":
                                continue
                            local_counts[key] = local_counts.get(key, 0) + value
                    continue

                if extension == ".pdf":
                    local_counts["pdfDelegatedEntryCount"] += 1
                    entries.append({
                        **base,
                        "archiveTextAuditStatus": "archive_pdf_delegated_to_pdf_audit",
                        "extraction": {
                            "method": "pdf_text_handled_by_pdf_text_audit",
                            "rawArchiveTextStored": False,
                        },
                    })
                    continue

                local_counts["binaryEntryCount"] += 1
                entries.append({
                    **base,
                    "archiveTextAuditStatus": "archive_binary_indexed",
                    "extraction": {
                        "method": "sha256_binary_archive_entry",
                        "rawArchiveTextStored": False,
                    },
                })
    except Exception as exc:
        local_counts["errorEntryCount"] += 1
        entries.append({
            "archiveEntryAuditId": f"archive-open-error:{sha256_text(archive_prefix)[:16]}",
            "sourceRoot": document.get("sourceRoot"),
            "sourcePath": document.get("sourcePath"),
            "sourceId": document.get("sourceId"),
            "archivePath": archive_prefix,
            "archivePathSha256": sha256_text(archive_prefix),
            "archiveDepth": depth,
            "fileName": Path(archive_prefix).name,
            "extension": ".zip",
            "sizeBytes": len(data),
            "sha256": sha256_bytes(data),
            "duplicateOf": None,
            "archiveTextAuditStatus": "archive_open_error",
            "error": str(exc),
            "extraction": {"rawArchiveTextStored": False},
        })

    return entries, local_counts


def audit_archive_document(
    document: dict[str, Any],
    seen_entries: dict[str, str],
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    path = resolve_registry_document_path(document)
    archive_summary = {
        "sourceRoot": document.get("sourceRoot"),
        "sourcePath": document.get("sourcePath"),
        "sourceId": document.get("sourceId"),
        "repoPath": document.get("repoPath"),
        "sizeBytes": document.get("sizeBytes"),
        "sha256": document.get("sha256"),
        "archiveAuditStatus": "archive_missing",
        "directEntryCount": 0,
        "recursiveEntryCount": 0,
        "textEntryCount": 0,
        "pdfDelegatedEntryCount": 0,
        "nestedZipEntryCount": 0,
        "binaryEntryCount": 0,
        "secretSignalEntryCount": 0,
        "errorEntryCount": 0,
    }

    if path is None or not path.exists():
        return archive_summary, []

    data = path.read_bytes()
    entries, counts = audit_zip_bytes(document, data, "", 0, seen_entries)
    archive_summary.update(counts)
    archive_summary["archiveAuditStatus"] = "archive_scanned" if counts["errorEntryCount"] == 0 else "archive_scanned_with_errors"
    return archive_summary, entries


def summarize_entries(archives: list[dict[str, Any]], entries: list[dict[str, Any]]) -> dict[str, Any]:
    by_status: dict[str, int] = {}
    by_extension: dict[str, int] = {}
    by_source_archive: dict[str, int] = {}
    total_words = 0
    total_chars = 0
    duplicate_entries = 0
    secret_signal_entries = 0
    keyword_totals = {keyword: 0 for keyword in KEYWORDS}

    for entry in entries:
        status = str(entry.get("archiveTextAuditStatus"))
        extension = str(entry.get("extension"))
        increment(by_status, status)
        increment(by_extension, extension)
        increment(by_source_archive, f"{entry.get('sourceRoot')}/{entry.get('sourcePath')}")
        if entry.get("duplicateOf"):
            duplicate_entries += 1

        extraction = entry.get("extraction", {})
        if isinstance(extraction, dict):
            if isinstance(extraction.get("wordCount"), int):
                total_words += int(extraction["wordCount"])
            if isinstance(extraction.get("charCount"), int):
                total_chars += int(extraction["charCount"])
            if isinstance(extraction.get("secretSignalCount"), int) and extraction["secretSignalCount"] > 0:
                secret_signal_entries += 1
            counts = extraction.get("keywordCounts", {})
            if isinstance(counts, dict):
                for keyword in KEYWORDS:
                    value = counts.get(keyword, 0)
                    if isinstance(value, int):
                        keyword_totals[keyword] += value

    return {
        "archiveDocumentCount": len(archives),
        "archiveDocumentsScanned": sum(1 for archive in archives if str(archive.get("archiveAuditStatus")).startswith("archive_scanned")),
        "archiveDocumentsMissing": sum(1 for archive in archives if archive.get("archiveAuditStatus") == "archive_missing"),
        "archiveEntryCount": len(entries),
        "uniqueArchiveEntryCount": len(entries) - duplicate_entries,
        "duplicateArchiveEntryCount": duplicate_entries,
        "textEntryCount": sum(1 for entry in entries if entry.get("archiveTextAuditStatus") in {"archive_text_read", "archive_text_empty"}),
        "textReadEntryCount": sum(1 for entry in entries if entry.get("archiveTextAuditStatus") == "archive_text_read"),
        "textEmptyEntryCount": sum(1 for entry in entries if entry.get("archiveTextAuditStatus") == "archive_text_empty"),
        "pdfDelegatedEntryCount": sum(1 for entry in entries if entry.get("archiveTextAuditStatus") == "archive_pdf_delegated_to_pdf_audit"),
        "nestedZipEntryCount": sum(1 for entry in entries if entry.get("archiveTextAuditStatus") == "archive_nested_zip_indexed"),
        "binaryIndexedEntryCount": sum(1 for entry in entries if entry.get("archiveTextAuditStatus") == "archive_binary_indexed"),
        "errorEntryCount": sum(1 for entry in entries if str(entry.get("archiveTextAuditStatus")).endswith("_error")),
        "secretSignalEntryCount": secret_signal_entries,
        "totalWordsExtracted": total_words,
        "totalCharsExtracted": total_chars,
        "byStatus": by_status,
        "byExtension": by_extension,
        "bySourceArchive": by_source_archive,
        "keywordTotals": keyword_totals,
    }


def build_audit() -> dict[str, Any]:
    registry = load_source_registry()
    archives: list[dict[str, Any]] = []
    entries: list[dict[str, Any]] = []
    seen_entries: dict[str, str] = {}

    for document in registry.get("documents", []):
        if document.get("extension") != ".zip":
            continue
        archive_summary, archive_entries = audit_archive_document(document, seen_entries)
        archives.append(archive_summary)
        entries.extend(archive_entries)

    return {
        "version": 1,
        "generatedAt": now_iso(),
        "generator": "scripts/build-archive-text-audit.py",
        "sourceRegistry": {
            "path": "Migration/index/SOURCE_REGISTRY.json",
            "generatedAt": registry.get("generatedAt"),
            "totals": registry.get("totals", {}),
        },
        "purpose": "Public-safe text audit for ZIP archive entries in the WealthTech migration corpus.",
        "safety": {
            "rawArchiveTextStored": False,
            "rawSecretsStored": False,
            "publicationMode": "archive_entry_hashes_stats_keywords_and_status_only",
        },
        "totals": summarize_entries(archives, entries),
        "archives": archives,
        "entries": entries,
    }


def render_table_rows(values: dict[str, int]) -> str:
    if not values:
        return "| None | 0 |"
    return "\n".join(f"| {key} | {value} |" for key, value in sorted(values.items()))


def render_markdown(audit: dict[str, Any]) -> str:
    totals = audit["totals"]
    return f"""# Archive text audit - Migration WealthTech

Generated at: {audit["generatedAt"]}

This file is generated by `scripts/build-archive-text-audit.py`. It proves that text-like entries inside ZIP archives are read and summarized without committing raw archive text, tokens, private keys, `.env` values, recovery codes or private server inventory.

## Summary

| Metric | Value |
|---|---:|
| Archive documents | {totals["archiveDocumentCount"]} |
| Archive documents scanned | {totals["archiveDocumentsScanned"]} |
| Archive documents missing | {totals["archiveDocumentsMissing"]} |
| Archive entries audited | {totals["archiveEntryCount"]} |
| Unique archive entries | {totals["uniqueArchiveEntryCount"]} |
| Duplicate archive entries | {totals["duplicateArchiveEntryCount"]} |
| Text entries | {totals["textEntryCount"]} |
| Text entries read | {totals["textReadEntryCount"]} |
| PDF entries delegated to PDF audit | {totals["pdfDelegatedEntryCount"]} |
| Nested ZIP entries indexed | {totals["nestedZipEntryCount"]} |
| Binary entries indexed | {totals["binaryIndexedEntryCount"]} |
| Error entries | {totals["errorEntryCount"]} |
| Entries with secret signals | {totals["secretSignalEntryCount"]} |
| Words extracted from archive text | {totals["totalWordsExtracted"]} |
| Characters extracted from archive text | {totals["totalCharsExtracted"]} |

## Status counts

| Status | Entries |
|---|---:|
{render_table_rows(totals["byStatus"])}

## Extension counts

| Extension | Entries |
|---|---:|
{render_table_rows(totals["byExtension"])}

## Source archive counts

| Source archive | Entries |
|---|---:|
{render_table_rows(totals["bySourceArchive"])}

## No-regression rules

- Keep this audit generated, not hand-edited.
- Do not commit raw archive text, tokens, private keys, raw `.env` values, recovery codes or private server inventory.
- Treat entries with secret signals as review-required before publication.
- PDF entries are delegated to `PDF_TEXT_AUDIT`, not duplicated here.
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
