#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import html
import json
import os
import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path.cwd()
INDEX_DIR = REPO_ROOT / "Migration" / "index"
SOURCE_REGISTRY_PATH = INDEX_DIR / "SOURCE_REGISTRY.json"
PDF_TEXT_AUDIT_PATH = INDEX_DIR / "PDF_TEXT_AUDIT.json"
OUTPUT_JSON_PATH = INDEX_DIR / "OBJECTIVE_TRACEABILITY_MATRIX.json"
OUTPUT_MD_PATH = INDEX_DIR / "OBJECTIVE_TRACEABILITY_MATRIX.md"

TEXT_EXTENSIONS = {".md", ".txt", ".csv", ".json"}
DOCX_DOCUMENT_PATH = "word/document.xml"

SECRET_PATTERNS = [
    re.compile(r"gh[pousr]_[A-Za-z0-9_]{20,}"),
    re.compile(r"BEGIN (?:RSA|OPENSSH|EC|PRIVATE) KEY"),
    re.compile(r"\b(?:password|passwd|secret|token|api[_-]?key)\s*[:=]\s*['\"]?[A-Za-z0-9._/-]{12,}", re.I),
]

OBJECTIVES = [
    {
        "id": "connect_chainsolutions_wealthtech_to_mcp",
        "title": "Link chainsolutions-wealthtech to MCP governance",
        "understanding": "The target organization must be managed as a first-class MCP governance target, not just documented externally.",
        "patterns": [r"chainsolutions-wealthtech", r"GitHub/MCP", r"\bMCP\b", r"organization", r"organisation"],
        "pdfKeywords": ["chainsolutions-wealthtech", "GitHub", "MCP"],
        "currentEvidence": [
            ".mcp/manifest.json",
            "Migration/github/chainsolutions-wealthtech/DIRECT_CONFIGURATION_LOG.md",
            "Migration/github/chainsolutions-wealthtech/ORG_BOOTSTRAP_PACKAGE.json",
            "Migration/index/CHAINSOLUTIONS_WEALTHTECH_FIRST_INTEGRATION.md",
        ],
        "status": "partial_external_connector_authorization_required",
        "blockers": [
            "The GitHub/Codex/MCP connector still needs to be installed or authorized on chainsolutions-wealthtech before the MCP connector can list and manage organization repositories directly.",
        ],
        "nextActions": [
            "Authorize the GitHub app/connector on chainsolutions-wealthtech.",
            "Re-run onboarding source/objective endpoints after connector access is visible.",
            "Bootstrap each visible organization repository through branch and PR workflow.",
        ],
    },
    {
        "id": "complete_corpus_ingestion",
        "title": "Read and index the complete migration corpus",
        "understanding": "All supplied PDFs, DOCX, Markdown, CSV, TXT and ZIP resources must be accounted for before execution decisions are treated as complete.",
        "patterns": [r"source", r"sources", r"document", r"corpus", r"lecture", r"conversation", r"archive"],
        "pdfKeywords": ["migration", "GitHub", "MCP", "ChatGPT", "Claude", "Codex"],
        "currentEvidence": [
            "Migration/index/SOURCE_REGISTRY.json",
            "Migration/index/SOURCE_INGESTION_STATUS.md",
            "Migration/index/PDF_TEXT_AUDIT.json",
            "Migration/index/PDF_TEXT_AUDIT_STATUS.md",
        ],
        "status": "inventory_and_pdf_text_audit_complete_semantic_extraction_in_progress",
        "blockers": [],
        "nextActions": [
            "Keep source registry, PDF audit and objective matrix regenerated after any source change.",
            "Review any future secret signal before publication.",
            "Convert objective matrix items into executable MCP tasks only after evidence review.",
        ],
    },
    {
        "id": "no_regression_and_safety",
        "title": "Guarantee no regression, no destructive action, no secret exposure",
        "understanding": "Every migration or cleanup step must preserve production services, protect secrets, and include rollback/test evidence.",
        "patterns": [r"regression", r"non[- ]?r[ée]gression", r"secret", r"token", r"private key", r"\.env", r"rollback", r"retour arri[èe]re", r"rm -rf", r"test"],
        "pdfKeywords": ["regression", "audit"],
        "currentEvidence": [
            ".mcp/permissions.json",
            "scripts/check-no-secrets.mjs",
            "scripts/check-docs.mjs",
            "tests/onboarding.test.ts",
            "Migration/02_PLAN_MIGRATION_ET_SECURITE.md",
            "docs/MCP_SECURITY_MODEL.md",
        ],
        "status": "implemented_as_policy_and_tests_more_runtime_gates_needed",
        "blockers": [],
        "nextActions": [
            "Keep all writes on dedicated branches and PRs.",
            "Run typecheck, build, onboarding tests, docs check and secrets check before each push.",
            "Add runtime smoke tests before any production server action.",
        ],
    },
    {
        "id": "branch_pr_only_workflow",
        "title": "Use branch and pull-request workflow for all writes",
        "understanding": "No direct main write is allowed; generated changes must be auditable and reviewable.",
        "patterns": [r"branch", r"branche", r"pull request", r"\bPR\b", r"main", r"direct", r"review", r"merge"],
        "pdfKeywords": ["branch", "branche", "GitHub"],
        "currentEvidence": [
            ".mcp/permissions.json",
            "Migration/github/chainsolutions-wealthtech/DIRECT_CONFIGURATION_LOG.md",
            "src/onboarding/repoFootprint.ts",
            "src/onboarding/organization.ts",
        ],
        "status": "implemented_for_current_pr_flow",
        "blockers": [],
        "nextActions": [
            "Keep future generated repository bootstraps on mcp/onboarding-setup branches.",
            "Open PRs for every repository touched by the MCP.",
        ],
    },
    {
        "id": "agents_roles_and_rights",
        "title": "Define agents, roles and controlled rights",
        "understanding": "ChatGPT, Claude, Codex, server agents, audit agents and SuperAdmin MCP roles must be explicit, limited and auditable.",
        "patterns": [r"agent", r"ChatGPT", r"Claude", r"Codex", r"SuperAdmin", r"rights", r"droits", r"permission"],
        "pdfKeywords": ["agent", "ChatGPT", "Claude", "Codex", "MCP"],
        "currentEvidence": [
            ".mcp/agents.json",
            "src/onboarding/agents.ts",
            "src/onboarding/rights.ts",
            "docs/MCP_AGENT_ROLES.md",
            "docs/AGENTS_ARCHITECTURE.md",
        ],
        "status": "implemented_for_governance_profiles",
        "blockers": [],
        "nextActions": [
            "Bind new external agents to explicit MCP roles before any write action.",
            "Reject SuperAdmin creation unless master MCP validation exists.",
        ],
    },
    {
        "id": "repo_server_mapping",
        "title": "Map repositories to servers, domains, runtimes and deployment gates",
        "understanding": "The MCP must know which GitHub repositories correspond to which server paths, domains, runtimes and deployment checks without publishing secrets.",
        "patterns": [r"server", r"serveur", r"S1", r"S2", r"domain", r"domaine", r"PM2", r"Docker", r"Passenger", r"vhost", r"deployment", r"d[ée]ploiement"],
        "pdfKeywords": ["server", "serveur", "deployment", "deploiement"],
        "currentEvidence": [
            ".mcp/server-map.json",
            "src/onboarding/serverMapping.ts",
            "docs/MCP_SERVER_MAPPING.md",
            "MCP_SERVER_MAPPING.md",
            "Migration/serveur/README.md",
            "Migration/02_PLAN_MIGRATION_ET_SECURITE.md",
        ],
        "status": "partial_sensitive_server_paths_not_published",
        "blockers": [
            "Exact production paths, credentials and private server inventories must stay in approved private operational context.",
            "Connector organization access is needed before all organization repositories can be bootstrapped and mapped.",
        ],
        "nextActions": [
            "Maintain public-safe mapping templates in Git.",
            "Complete private repo-server mapping from approved server inventory.",
            "Add smoke tests before any deployment or cleanup.",
        ],
    },
    {
        "id": "migration_execution_sequence",
        "title": "Apply migration steps only after inventory, backup, copy, test and documentation",
        "understanding": "Server cleanup and S2-to-S1 migration must follow the documented sequence with protected domains preserved.",
        "patterns": [r"migration", r"inventaire", r"sauvegarde", r"backup", r"copier", r"tester", r"nettoyage", r"S1", r"S2", r"domaine prot[ée]g[ée]"],
        "pdfKeywords": ["migration", "serveur", "server", "audit"],
        "currentEvidence": [
            "Migration/02_PLAN_MIGRATION_ET_SECURITE.md",
            "docs/MIGRATION.md",
            "docs/DEPLOYMENT_PRODUCTION.md",
            "memory/PLAN_EXECUTION_COMPLET_WEALTHTECH_ACTUALISE_20260702.md",
        ],
        "status": "documented_not_executed_on_production",
        "blockers": [
            "No production cleanup or migration should run until live inventory, backups, rollback and post-action tests are confirmed.",
        ],
        "nextActions": [
            "Convert the migration sequence into server-specific task cards.",
            "Require inventory and backup evidence before any cleanup.",
            "Preserve S2 protected domains and S1 whitelist domains.",
        ],
    },
    {
        "id": "audit_and_traceability",
        "title": "Audit every sensitive MCP, GitHub and server action",
        "understanding": "Every write, bootstrap, security assertion, agent creation and source-ingestion action must leave a trace without raw secret material.",
        "patterns": [r"audit", r"trace", r"log", r"journal", r"evidence", r"preuve", r"security", r"s[ée]curit[ée]"],
        "pdfKeywords": ["audit", "GitHub", "MCP"],
        "currentEvidence": [
            "src/onboarding/audit.ts",
            "docs/MCP_AUDIT_LOGS.md",
            "Migration/github/chainsolutions-wealthtech/DIRECT_CONFIGURATION_LOG.md",
            "Migration/index/SOURCE_REGISTRY.json",
            "Migration/index/PDF_TEXT_AUDIT.json",
        ],
        "status": "implemented_for_current_mcp_and_ingestion_flows",
        "blockers": [],
        "nextActions": [
            "Record future connector authorization and repository bootstraps as audit events.",
            "Keep generated source/objective matrices as reproducible audit evidence.",
        ],
    },
    {
        "id": "apply_documented_requirements",
        "title": "Turn documented requirements into executable MCP steps",
        "understanding": "The MCP must not merely summarize; it must progressively create the missing governance files, routes, indexes, docs and review artifacts requested by the corpus.",
        "patterns": [r"objectif", r"action", r"TODO", r"TASK", r"doit", r"must", r"apply", r"appliquer", r"cr[ée]er", r"construction", r"étape", r"etape"],
        "pdfKeywords": ["MCP", "migration", "audit", "agent"],
        "currentEvidence": [
            "src/onboarding/index.ts",
            "src/server.ts",
            "Migration/index/SOURCE_REGISTRY.json",
            "Migration/index/PDF_TEXT_AUDIT.json",
            "docs/MCP_ONBOARDING_ENGINE.md",
        ],
        "status": "in_progress_objective_matrix_added_this_turn",
        "blockers": [
            "The matrix still needs human/operator review before production-affecting actions are executed.",
        ],
        "nextActions": [
            "Review the objective matrix.",
            "Promote approved next actions into MCP tasks or GitHub issues/PRs.",
            "Keep no-regression gates mandatory for every implementation batch.",
        ],
    },
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def decode_xml_entities(value: str) -> str:
    return html.unescape(value)


def docx_to_text(data: bytes) -> str:
    try:
        with zipfile.ZipFile(PathLikeBytes(data)) as archive:
            xml = archive.read(DOCX_DOCUMENT_PATH).decode("utf-8", errors="replace")
    except Exception:
        return ""
    text = re.sub(r"</w:p>", "\n", xml)
    text = re.sub(r"<[^>]+>", " ", text)
    return decode_xml_entities(text)


class PathLikeBytes:
    def __init__(self, data: bytes):
        from io import BytesIO

        self._bytes = BytesIO(data)

    def read(self, *args: Any) -> bytes:
        return self._bytes.read(*args)

    def seek(self, *args: Any) -> int:
        return self._bytes.seek(*args)

    def tell(self) -> int:
        return self._bytes.tell()


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


def resolve_document_path(document: dict[str, Any]) -> Path | None:
    repo_path = document.get("repoPath")
    if isinstance(repo_path, str) and repo_path:
        return REPO_ROOT / repo_path

    base = source_root_base(str(document.get("sourceRoot", "")))
    source_path = document.get("sourcePath")
    if base is None or not isinstance(source_path, str):
        return None
    return base / source_path


def text_for_document(document: dict[str, Any]) -> str:
    path = resolve_document_path(document)
    if path is None or not path.exists():
        return ""

    extension = str(document.get("extension", "")).lower()
    try:
        data = path.read_bytes()
    except Exception:
        return ""

    if extension in TEXT_EXTENSIONS:
        return data.decode("utf-8", errors="replace")
    if extension == ".docx":
        return docx_to_text(data)
    return ""


def text_entries_for_zip(document: dict[str, Any]) -> list[dict[str, Any]]:
    path = resolve_document_path(document)
    if path is None or not path.exists():
        return []

    entries: list[dict[str, Any]] = []
    try:
        with zipfile.ZipFile(path) as archive:
            for member in archive.infolist():
                if member.is_dir():
                    continue
                extension = Path(member.filename).suffix.lower()
                if extension not in TEXT_EXTENSIONS and extension != ".docx":
                    continue
                data = archive.read(member)
                text = docx_to_text(data) if extension == ".docx" else data.decode("utf-8", errors="replace")
                entries.append({
                    "sourceRef": f"{document.get('sourceRoot')}/{document.get('sourcePath')}::{member.filename}",
                    "text": text,
                    "sizeBytes": len(data),
                    "sourceKind": "archive_text_entry",
                })
    except Exception:
        return []
    return entries


def compile_patterns(patterns: list[str]) -> list[re.Pattern[str]]:
    return [re.compile(pattern, re.I) for pattern in patterns]


def count_secret_signals(text: str) -> int:
    return sum(len(pattern.findall(text)) for pattern in SECRET_PATTERNS)


def count_hits(text: str, patterns: list[re.Pattern[str]]) -> int:
    return sum(len(pattern.findall(text)) for pattern in patterns)


def source_ref(document: dict[str, Any]) -> str:
    return f"{document.get('sourceRoot')}/{document.get('sourcePath')}"


def top_hits_for_objective(
    objective: dict[str, Any],
    registry: dict[str, Any],
    pdf_audit: dict[str, Any],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    patterns = compile_patterns(objective["patterns"])
    hit_map: dict[str, dict[str, Any]] = {}
    secret_signal_sources = 0
    text_units_scanned = 0

    for document in registry.get("documents", []):
        text = text_for_document(document)
        if text:
            text_units_scanned += 1
            hits = count_hits(text, patterns)
            if count_secret_signals(text) > 0:
                secret_signal_sources += 1
            if hits > 0:
                key = source_ref(document)
                hit_map[key] = {
                    "source": key,
                    "sourceKind": document.get("sourceRootKind"),
                    "hits": hit_map.get(key, {}).get("hits", 0) + hits,
                    "evidenceType": "text_source",
                }

        if document.get("extension") == ".zip":
            for entry in text_entries_for_zip(document):
                text_units_scanned += 1
                hits = count_hits(entry["text"], patterns)
                if count_secret_signals(entry["text"]) > 0:
                    secret_signal_sources += 1
                if hits > 0:
                    key = entry["sourceRef"]
                    hit_map[key] = {
                        "source": key,
                        "sourceKind": entry["sourceKind"],
                        "hits": hits,
                        "evidenceType": "archive_text_source",
                    }

    pdf_keywords = objective.get("pdfKeywords", [])
    for document in pdf_audit.get("documents", []):
        extraction = document.get("extraction", {})
        if not isinstance(extraction, dict):
            continue
        counts = extraction.get("keywordCounts", {})
        if not isinstance(counts, dict):
            continue
        hits = sum(int(counts.get(keyword, 0) or 0) for keyword in pdf_keywords)
        if hits <= 0:
            continue
        key = f"{document.get('sourceRoot')}/{document.get('sourcePath')}"
        hit_map[key] = {
            "source": key,
            "sourceKind": document.get("sourceKind"),
            "hits": hit_map.get(key, {}).get("hits", 0) + hits,
            "evidenceType": "pdf_text_audit_counts",
        }

    hits = sorted(hit_map.values(), key=lambda item: (-item["hits"], item["source"]))[:12]
    metrics = {
        "sourceHitCount": len(hit_map),
        "totalPatternHits": sum(item["hits"] for item in hit_map.values()),
        "textUnitsScanned": text_units_scanned,
        "secretSignalSourceCount": secret_signal_sources,
    }
    return hits, metrics


def evidence_for(paths: list[str]) -> list[dict[str, Any]]:
    output = []
    for path in paths:
        absolute = REPO_ROOT / path
        output.append({
            "path": path,
            "exists": absolute.exists(),
            "sha256": sha256_text(absolute.read_text(encoding="utf-8", errors="replace")) if absolute.exists() and absolute.is_file() else None,
        })
    return output


def status_counts(objectives: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for objective in objectives:
        status = str(objective["status"])
        counts[status] = counts.get(status, 0) + 1
    return counts


def build_index() -> dict[str, Any]:
    registry = load_json(SOURCE_REGISTRY_PATH)
    pdf_audit = load_json(PDF_TEXT_AUDIT_PATH)
    objective_entries = []

    for objective in OBJECTIVES:
        hits, metrics = top_hits_for_objective(objective, registry, pdf_audit)
        current_evidence = evidence_for(objective["currentEvidence"])
        objective_entries.append({
            "id": objective["id"],
            "title": objective["title"],
            "understanding": objective["understanding"],
            "status": objective["status"],
            "sourceSignals": metrics,
            "topEvidenceSources": hits,
            "currentEvidence": current_evidence,
            "missingCurrentEvidence": [item["path"] for item in current_evidence if not item["exists"]],
            "blockers": objective["blockers"],
            "nextActions": objective["nextActions"],
        })

    blockers = [
        {
            "id": "github_connector_not_authorized_on_target_org",
            "description": "Codex/MCP GitHub connector must be installed or authorized on chainsolutions-wealthtech before direct connector-managed repository bootstrapping can be complete.",
            "blocks": [
                "connect_chainsolutions_wealthtech_to_mcp",
                "repo_server_mapping",
            ],
        },
        {
            "id": "production_actions_require_private_inventory_and_approval",
            "description": "Server cleanup, migration and deployment actions require private live inventory, backups, rollback plan and post-action tests.",
            "blocks": [
                "repo_server_mapping",
                "migration_execution_sequence",
            ],
        },
    ]

    return {
        "version": 1,
        "generatedAt": now_iso(),
        "generator": "scripts/build-objective-index.py",
        "purpose": "Objective traceability matrix for the WealthTech MCP migration corpus.",
        "safety": {
            "rawSourceTextStored": False,
            "rawPdfTextStored": False,
            "rawSecretsStored": False,
            "publicationMode": "objective_status_counts_evidence_paths_and_hashes_only",
        },
        "inputs": {
            "sourceRegistry": {
                "path": "Migration/index/SOURCE_REGISTRY.json",
                "generatedAt": registry.get("generatedAt"),
                "totals": registry.get("totals", {}),
            },
            "pdfTextAudit": {
                "path": "Migration/index/PDF_TEXT_AUDIT.json",
                "generatedAt": pdf_audit.get("generatedAt"),
                "totals": pdf_audit.get("totals", {}),
            },
        },
        "summary": {
            "objectiveCount": len(objective_entries),
            "statusCounts": status_counts(objective_entries),
            "blockedObjectiveCount": sum(1 for objective in objective_entries if objective["blockers"]),
            "objectivesWithMissingCurrentEvidence": [
                objective["id"] for objective in objective_entries if objective["missingCurrentEvidence"]
            ],
        },
        "objectives": objective_entries,
        "globalBlockers": blockers,
        "nextExecutionOrder": [
            "Review OBJECTIVE_TRACEABILITY_MATRIX with the operator.",
            "Authorize the GitHub/Codex/MCP connector on chainsolutions-wealthtech.",
            "Regenerate source registry, PDF audit and objective matrix after connector visibility changes.",
            "Bootstrap organization repositories with .mcp files through branch and PR workflow.",
            "Convert migration/server objectives into private inventory-backed task cards.",
            "Run no-regression gates before every push or production-affecting action.",
        ],
    }


def render_markdown(index: dict[str, Any]) -> str:
    summary = index["summary"]
    status_rows = "\n".join(
        f"| {status} | {count} |"
        for status, count in sorted(summary["statusCounts"].items())
    )
    objective_rows = "\n".join(
        "| {id} | {status} | {signals} | {missing} | {blockers} |".format(
            id=objective["id"],
            status=objective["status"],
            signals=objective["sourceSignals"]["sourceHitCount"],
            missing=len(objective["missingCurrentEvidence"]),
            blockers=len(objective["blockers"]),
        )
        for objective in index["objectives"]
    )
    action_rows = "\n".join(
        f"{position}. {action}"
        for position, action in enumerate(index["nextExecutionOrder"], start=1)
    )
    blocker_rows = "\n".join(
        f"| {blocker['id']} | {blocker['description']} | {', '.join(blocker['blocks'])} |"
        for blocker in index["globalBlockers"]
    )

    return f"""# Objective traceability matrix - Migration WealthTech

Generated at: {index["generatedAt"]}

This file is generated by `scripts/build-objective-index.py`. It converts the audited migration corpus into public-safe MCP objectives, status, evidence paths, blockers and next actions without committing raw source text, raw PDF text, tokens, private keys, `.env` content, or recovery codes.

## Summary

| Metric | Value |
|---|---:|
| Objectives | {summary["objectiveCount"]} |
| Objectives with blockers | {summary["blockedObjectiveCount"]} |
| Objectives with missing local evidence | {len(summary["objectivesWithMissingCurrentEvidence"])} |

## Status counts

| Status | Objectives |
|---|---:|
{status_rows}

## Objectives

| Objective | Status | Source signals | Missing evidence | Blockers |
|---|---|---:|---:|---:|
{objective_rows}

## Global blockers

| Blocker | Description | Blocks |
|---|---|---|
{blocker_rows}

## Next execution order

{action_rows}

## No-regression rules

- Keep this matrix generated, not hand-edited.
- Do not treat partial or blocked objectives as complete.
- Do not execute server cleanup or deployment without private inventory, backup, rollback and tests.
- Use branch and pull request workflow for every repository write.
"""


def main() -> int:
    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    index = build_index()
    with OUTPUT_JSON_PATH.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(json.dumps(index, indent=2, ensure_ascii=False) + "\n")
    with OUTPUT_MD_PATH.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(render_markdown(index))
    print(f"Wrote {OUTPUT_JSON_PATH.relative_to(REPO_ROOT)}")
    print(f"Wrote {OUTPUT_MD_PATH.relative_to(REPO_ROOT)}")
    print(json.dumps(index["summary"], indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
