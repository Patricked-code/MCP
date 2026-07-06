#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path.cwd()
INDEX_DIR = REPO_ROOT / "Migration" / "index"
SERVER_DIR = REPO_ROOT / "Migration" / "serveur"

SOURCE_REGISTRY_PATH = INDEX_DIR / "SOURCE_REGISTRY.json"
PDF_TEXT_AUDIT_PATH = INDEX_DIR / "PDF_TEXT_AUDIT.json"
ARCHIVE_TEXT_AUDIT_PATH = INDEX_DIR / "ARCHIVE_TEXT_AUDIT.json"
OBJECTIVE_MATRIX_PATH = INDEX_DIR / "OBJECTIVE_TRACEABILITY_MATRIX.json"
TASKS_PATH = INDEX_DIR / "MCP_EXECUTION_TASKS.json"
SERVER_CARDS_PATH = SERVER_DIR / "PRIVATE_SERVER_INVENTORY_TASK_CARDS.json"
BLOCKERS_PATH = INDEX_DIR / "BLOCKER_RESOLUTION_RUNBOOK.json"
EVIDENCE_GATE_PATH = INDEX_DIR / "BLOCKER_EVIDENCE_GATE.json"
OUTPUT_JSON_PATH = INDEX_DIR / "COMPLETION_AUDIT.json"
OUTPUT_MD_PATH = INDEX_DIR / "COMPLETION_AUDIT.md"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_evidence_gate(blockers: dict[str, Any]) -> dict[str, Any]:
    if EVIDENCE_GATE_PATH.exists():
        return load_json(EVIDENCE_GATE_PATH)

    blocker_ids = list(blockers.get("summary", {}).get("blockerIds", []))
    return {
        "version": 1,
        "generatedAt": None,
        "generator": "scripts/build-completion-audit.py:fallback",
        "summary": {
            "blockerCount": len(blocker_ids),
            "resolutionReadyCount": 0,
            "unresolvedBlockerCount": len(blocker_ids),
            "allBlockersEvidenceReady": False,
            "resolutionReadyBlockerIds": [],
            "unresolvedBlockerIds": blocker_ids,
        },
        "blockers": [],
    }


def sha256_file(path: Path) -> str | None:
    if not path.exists() or not path.is_file():
        return None
    return hashlib.sha256(path.read_bytes()).hexdigest()


def evidence(path: str, note: str) -> dict[str, Any]:
    absolute = REPO_ROOT / path
    return {
        "path": path,
        "exists": absolute.exists(),
        "sha256": sha256_file(absolute),
        "note": note,
    }


def number(value: Any, key: str) -> int:
    if not isinstance(value, dict):
        return 0
    item = value.get(key)
    return int(item) if isinstance(item, (int, float)) else 0


def requirement(
    requirement_id: str,
    title: str,
    status: str,
    acceptance_criteria: list[str],
    proof: list[dict[str, Any]],
    blockers: list[str],
    next_actions: list[str],
) -> dict[str, Any]:
    return {
        "id": requirement_id,
        "title": title,
        "status": status,
        "acceptanceCriteria": acceptance_criteria,
        "evidence": proof,
        "blockedBy": blockers,
        "nextActions": next_actions,
    }


def is_complete(status: str) -> bool:
    return status.startswith("verified_complete") or status.startswith("implemented_current_scope")


def is_blocked(status: str) -> bool:
    return status.startswith("blocked")


def is_partial(status: str) -> bool:
    return status.startswith("partial") or status.startswith("in_progress")


def build_requirements(inputs: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    source = inputs["sourceRegistry"]
    pdf = inputs["pdfTextAudit"]
    archive = inputs["archiveTextAudit"]
    objectives = inputs["objectiveMatrix"]
    tasks = inputs["executionTasks"]
    server_cards = inputs["serverCards"]
    blockers = inputs["blockerRunbook"]
    evidence_gate = inputs["blockerEvidenceGate"]

    source_totals = source.get("totals", {})
    pdf_totals = pdf.get("totals", {})
    archive_totals = archive.get("totals", {})
    objective_summary = objectives.get("summary", {})
    task_summary = tasks.get("summary", {})
    card_summary = server_cards.get("summary", {})
    blocker_summary = blockers.get("summary", {})
    blocker_ids = list(blocker_summary.get("blockerIds", []))
    evidence_summary = evidence_gate.get("summary", {})
    unresolved_blocker_ids = list(evidence_summary.get("unresolvedBlockerIds", blocker_ids))

    github_blocker_id = "github_connector_not_authorized_on_target_org"
    server_blocker_id = "production_actions_require_private_inventory_and_approval"
    github_blocker_unresolved = github_blocker_id in unresolved_blocker_ids
    server_blocker_unresolved = server_blocker_id in unresolved_blocker_ids

    return [
        requirement(
            "understand_documented_objectives",
            "Understand the objectives requested by the migration corpus",
            "verified_complete_current_scope",
            [
                f"{number(objective_summary, 'objectiveCount')} objectives are derived from the audited corpus.",
                f"{len(objective_summary.get('objectivesWithMissingCurrentEvidence', []))} objectives have missing local evidence.",
                "Objective matrix stores evidence paths and hashes, not raw source text.",
            ],
            [
                evidence("Migration/index/OBJECTIVE_TRACEABILITY_MATRIX.json", "Generated objective matrix."),
                evidence("Migration/index/OBJECTIVE_TRACEABILITY_MATRIX.md", "Human-readable objective matrix."),
            ],
            [],
            [
                "Keep the objective matrix regenerated after any source or connector visibility change.",
            ],
        ),
        requirement(
            "read_complete_supplied_corpus",
            "Read and index all supplied direct and archived documents",
            "verified_complete_current_scope",
            [
                f"{number(source_totals, 'sourceFileCount')} source files are inventoried.",
                f"{number(source_totals, 'textReadFiles')} direct text/doc files are text-read.",
                f"{number(pdf_totals, 'pdfDocumentCount')} PDF documents are audited with {number(pdf_totals, 'errorDocumentCount')} PDF errors.",
                f"{number(archive_totals, 'archiveDocumentCount')} ZIP archives are scanned with {number(archive_totals, 'errorEntryCount')} archive entry errors.",
                "Raw source text, raw PDF text and raw archive text are not committed.",
            ],
            [
                evidence("Migration/index/SOURCE_REGISTRY.json", "Direct source inventory."),
                evidence("Migration/index/PDF_TEXT_AUDIT.json", "PDF text extraction audit."),
                evidence("Migration/index/ARCHIVE_TEXT_AUDIT.json", "ZIP archive text audit."),
            ],
            [],
            [
                "Regenerate source, PDF and archive audits whenever sources change.",
            ],
        ),
        requirement(
            "public_bootstrap_chainsolutions_org",
            "Apply the public chainsolutions-wealthtech organization bootstrap",
            "verified_complete_current_scope",
            [
                "Organization description was applied directly via GitHub API/CLI.",
                "Organization-level 2FA requirement was verified disabled for the first integration.",
                "chainsolutions-wealthtech/.github profile PR was merged.",
            ],
            [
                evidence("Migration/github/chainsolutions-wealthtech/DIRECT_CONFIGURATION_LOG.md", "Direct organization configuration evidence."),
                evidence("Migration/index/CHAINSOLUTIONS_WEALTHTECH_FIRST_INTEGRATION.md", "First integration status."),
                evidence("Migration/github/chainsolutions-wealthtech/ORG_BOOTSTRAP_PACKAGE.json", "Public bootstrap package."),
            ],
            [],
            [
                "Keep future organization changes audited and branch/PR based.",
            ],
        ),
        requirement(
            "authorize_connector_on_target_org",
            "Link chainsolutions-wealthtech to the Codex/MCP GitHub connector",
            "blocked_external_action_required" if github_blocker_unresolved else "verified_complete_operator_evidenced",
            [
                "Connector installed accounts must include chainsolutions-wealthtech.",
                "MCP onboarding must no longer report target organization access as blocked.",
                "GET /git/repos must be able to include organization repositories after authentication.",
                "BLOCKER_EVIDENCE_GATE must mark github_connector_not_authorized_on_target_org ready for completion audit.",
            ],
            [
                evidence("Migration/index/BLOCKER_RESOLUTION_RUNBOOK.json", "External connector authorization blocker."),
                evidence("Migration/index/BLOCKER_EVIDENCE_GATE.json", "Public-safe blocker evidence gate."),
                evidence("Migration/github/chainsolutions-wealthtech/ORG_ACTIVATION_RUNBOOK.md", "Owner action runbook."),
            ],
            [github_blocker_id] if github_blocker_unresolved else [],
            [
                "Install or authorize the Codex/MCP GitHub app on chainsolutions-wealthtech." if github_blocker_unresolved else "Keep connector evidence public-safe and regenerate indexes after repository visibility changes.",
                "Regenerate all source/objective/task/blocker/evidence/completion indexes after connector visibility changes.",
            ],
        ),
        requirement(
            "construct_mcp_governance_engine",
            "Construct the MCP governance engine, routes, agents and safeguards",
            "implemented_current_scope_recurring_gate_required",
            [
                "Onboarding modules, routes, roles, audits, source/objective/task endpoints and tests exist.",
                "SuperAdmin creation and unsafe write choices are guarded.",
                "Branch and pull-request workflow is enforced for generated repository bootstraps.",
            ],
            [
                evidence("src/onboarding/index.ts", "MCP onboarding engine entrypoint."),
                evidence("src/server.ts", "Protected web/API routes."),
                evidence("tests/onboarding.test.ts", "Onboarding safeguard tests."),
                evidence("docs/MCP_ONBOARDING_ENGINE.md", "Onboarding engine documentation."),
            ],
            [],
            [
                "Run the no-regression gate before every push or production-affecting change.",
            ],
        ),
        requirement(
            "bootstrap_visible_org_repositories",
            "Bootstrap all visible organization repositories through branch and PR workflow",
            "blocked_external_action_required" if github_blocker_unresolved else "pending_repository_bootstrap_after_connector_evidence",
            [
                "Connector must list chainsolutions-wealthtech repositories.",
                "Each visible repository missing MCP files must receive a dedicated onboarding branch and PR.",
                "No direct main writes are allowed.",
            ],
            [
                evidence("Migration/index/MCP_EXECUTION_TASKS.json", "Repository bootstrap task is blocked by connector visibility."),
                evidence(".mcp/permissions.json", "Branch and PR safety policy."),
            ],
            [github_blocker_id] if github_blocker_unresolved else [],
            [
                "Authorize connector access, then call repository bootstrap preparation for every visible target repo." if github_blocker_unresolved else "Call repository bootstrap preparation for every visible target repo.",
            ],
        ),
        requirement(
            "prepare_server_mapping_without_exposing_private_inventory",
            "Prepare repo-server mapping without exposing private server inventory",
            "partial_sensitive_server_paths_not_published" if server_blocker_unresolved else "verified_complete_private_evidence_summary_available",
            [
                "Public-safe server inventory cards exist.",
                "Protected domains, cleanup candidates and backup-review candidates are tracked without raw private paths.",
                "Private live inventory must stay outside Git.",
                "BLOCKER_EVIDENCE_GATE must mark production_actions_require_private_inventory_and_approval ready for completion audit.",
            ],
            [
                evidence("Migration/serveur/PRIVATE_SERVER_INVENTORY_TASK_CARDS.json", "Public-safe private inventory task cards."),
                evidence("Migration/index/BLOCKER_EVIDENCE_GATE.json", "Public-safe blocker evidence gate."),
                evidence("docs/MCP_SERVER_MAPPING.md", "Public-safe MCP server mapping documentation."),
                evidence(".mcp/server-map.json", "Repository-local server map template."),
            ],
            [server_blocker_id] if server_blocker_unresolved else [],
            [
                "Collect private S1/S2 inventory in an approved non-Git operational location." if server_blocker_unresolved else "Keep private inventory outside Git and publish only reviewed public-safe summaries.",
            ],
        ),
        requirement(
            "execute_migration_steps_with_operator_approval",
            "Apply migration/cleanup steps only after inventory, backup, rollback, tests and approval",
            "blocked_private_inventory_and_approval" if server_blocker_unresolved else "pending_operator_approved_execution",
            [
                "No production deletion, migration, vhost change, service stop or deployment is authorized by these public artifacts.",
                "Private inventory, backup/export reference, rollback plan and operator approval must exist first.",
                "Post-action tests are mandatory before cleanup or migration.",
            ],
            [
                evidence("Migration/index/BLOCKER_RESOLUTION_RUNBOOK.json", "Private inventory and approval blocker."),
                evidence("Migration/index/BLOCKER_EVIDENCE_GATE.json", "Public-safe blocker evidence gate."),
                evidence("Migration/serveur/PRIVATE_SERVER_INVENTORY_TASK_CARDS.md", "Server task cards and gates."),
                evidence("Migration/02_PLAN_MIGRATION_ET_SECURITE.md", "Migration and safety plan."),
            ],
            [server_blocker_id] if server_blocker_unresolved else [],
            [
                "Complete private operational evidence outside Git, then publish only public-safe summaries." if server_blocker_unresolved else "Execute only explicitly approved migration steps with rollback and post-action tests.",
            ],
        ),
        requirement(
            "preserve_no_regression_and_secret_safety",
            "Preserve no-regression gates and avoid secret/raw text exposure",
            "implemented_current_scope_recurring_gate_required",
            [
                f"{number(task_summary, 'taskCount')} executable tasks and {number(task_summary, 'blockedTaskCount')} blocked tasks are tracked.",
                f"{number(card_summary, 'cardCount')} server task cards and {number(card_summary, 'blockedCardCount')} private-inventory-blocked cards are tracked.",
                f"{number(blocker_summary, 'blockerCount')} global blockers remain explicit: {', '.join(blocker_ids)}.",
                "Generated registries store hashes, counts, statuses and safe metadata, not raw secrets or raw corpus text.",
            ],
            [
                evidence("scripts/check-no-secrets.mjs", "Secret scan gate."),
                evidence("scripts/check-docs.mjs", "Required docs/index gate."),
                evidence("Migration/index/MCP_EXECUTION_TASKS.json", "No-regression command list."),
                evidence("Migration/index/BLOCKER_RESOLUTION_RUNBOOK.json", "Remaining blockers and resume commands."),
                evidence("Migration/index/BLOCKER_EVIDENCE_GATE.json", "Public-safe blocker evidence gate."),
            ],
            [],
            [
                "Run tests, typecheck, build, docs check, secrets check and diff checks before every push.",
            ],
        ),
    ]


def summarize(
    requirements: list[dict[str, Any]],
    blockers: dict[str, Any],
    evidence_gate: dict[str, Any],
) -> dict[str, Any]:
    incomplete = [
        item["id"]
        for item in requirements
        if not is_complete(str(item["status"]))
    ]
    blocked = [
        item["id"]
        for item in requirements
        if is_blocked(str(item["status"])) or item.get("blockedBy")
    ]
    partial = [
        item["id"]
        for item in requirements
        if is_partial(str(item["status"]))
    ]
    missing_evidence = [
        {"requirementId": item["id"], "path": proof["path"]}
        for item in requirements
        for proof in item["evidence"]
        if not proof["exists"]
    ]
    blocker_ids = list(blockers.get("summary", {}).get("blockerIds", []))
    unresolved_blocker_ids = list(evidence_gate.get("summary", {}).get("unresolvedBlockerIds", blocker_ids))

    return {
        "requirementCount": len(requirements),
        "completeRequirementCount": sum(1 for item in requirements if is_complete(str(item["status"]))),
        "blockedRequirementCount": len(blocked),
        "partialRequirementCount": len(partial),
        "incompleteRequirementIds": incomplete,
        "blockedRequirementIds": blocked,
        "partialRequirementIds": partial,
        "missingEvidence": missing_evidence,
        "unresolvedBlockerIds": unresolved_blocker_ids,
        "fullObjectiveAchieved": len(incomplete) == 0 and len(missing_evidence) == 0 and len(unresolved_blocker_ids) == 0,
    }


def build_audit() -> dict[str, Any]:
    blocker_runbook = load_json(BLOCKERS_PATH)
    inputs = {
        "sourceRegistry": load_json(SOURCE_REGISTRY_PATH),
        "pdfTextAudit": load_json(PDF_TEXT_AUDIT_PATH),
        "archiveTextAudit": load_json(ARCHIVE_TEXT_AUDIT_PATH),
        "objectiveMatrix": load_json(OBJECTIVE_MATRIX_PATH),
        "executionTasks": load_json(TASKS_PATH),
        "serverCards": load_json(SERVER_CARDS_PATH),
        "blockerRunbook": blocker_runbook,
        "blockerEvidenceGate": load_evidence_gate(blocker_runbook),
    }
    requirements = build_requirements(inputs)
    summary = summarize(requirements, inputs["blockerRunbook"], inputs["blockerEvidenceGate"])
    unresolved = summary["unresolvedBlockerIds"]
    incomplete = summary["incompleteRequirementIds"]
    if unresolved:
        reason = "Public-safe blocker evidence gate still reports unresolved blockers: {items}.".format(
            items=", ".join(unresolved)
        )
    elif incomplete:
        reason = "Some full-objective requirements remain incomplete after blocker evidence: {items}.".format(
            items=", ".join(incomplete)
        )
    else:
        reason = "All requirements are evidenced and unblocked."
    decision_status = (
        "complete"
        if summary["fullObjectiveAchieved"]
        else "not_complete_blockers_remain"
        if unresolved
        else "not_complete_requirements_remain"
    )

    return {
        "version": 1,
        "generatedAt": now_iso(),
        "generator": "scripts/build-completion-audit.py",
        "purpose": "Requirement-by-requirement completion audit for the full WealthTech MCP migration objective.",
        "safety": {
            "rawSourceTextStored": False,
            "rawPdfTextStored": False,
            "rawArchiveTextStored": False,
            "rawServerInventoryStored": False,
            "rawSecretsStored": False,
            "productionActionExecuted": False,
            "publicationMode": "requirement_status_evidence_paths_hashes_and_blockers_only",
        },
        "inputs": {
            "sourceRegistry": {
                "path": "Migration/index/SOURCE_REGISTRY.json",
                "generatedAt": inputs["sourceRegistry"].get("generatedAt"),
                "totals": inputs["sourceRegistry"].get("totals", {}),
            },
            "pdfTextAudit": {
                "path": "Migration/index/PDF_TEXT_AUDIT.json",
                "generatedAt": inputs["pdfTextAudit"].get("generatedAt"),
                "totals": inputs["pdfTextAudit"].get("totals", {}),
            },
            "archiveTextAudit": {
                "path": "Migration/index/ARCHIVE_TEXT_AUDIT.json",
                "generatedAt": inputs["archiveTextAudit"].get("generatedAt"),
                "totals": inputs["archiveTextAudit"].get("totals", {}),
            },
            "objectiveMatrix": {
                "path": "Migration/index/OBJECTIVE_TRACEABILITY_MATRIX.json",
                "generatedAt": inputs["objectiveMatrix"].get("generatedAt"),
                "summary": inputs["objectiveMatrix"].get("summary", {}),
            },
            "executionTasks": {
                "path": "Migration/index/MCP_EXECUTION_TASKS.json",
                "generatedAt": inputs["executionTasks"].get("generatedAt"),
                "summary": inputs["executionTasks"].get("summary", {}),
            },
            "serverCards": {
                "path": "Migration/serveur/PRIVATE_SERVER_INVENTORY_TASK_CARDS.json",
                "generatedAt": inputs["serverCards"].get("generatedAt"),
                "summary": inputs["serverCards"].get("summary", {}),
            },
            "blockerRunbook": {
                "path": "Migration/index/BLOCKER_RESOLUTION_RUNBOOK.json",
                "generatedAt": inputs["blockerRunbook"].get("generatedAt"),
                "summary": inputs["blockerRunbook"].get("summary", {}),
            },
            "blockerEvidenceGate": {
                "path": "Migration/index/BLOCKER_EVIDENCE_GATE.json",
                "generatedAt": inputs["blockerEvidenceGate"].get("generatedAt"),
                "summary": inputs["blockerEvidenceGate"].get("summary", {}),
            },
        },
        "summary": summary,
        "completionDecision": {
            "fullObjectiveAchieved": summary["fullObjectiveAchieved"],
            "status": decision_status,
            "reason": reason,
        },
        "requirements": requirements,
    }


def render_list(values: list[str]) -> str:
    if not values:
        return "- None."
    return "\n".join(f"- {value}" for value in values)


def render_markdown(audit: dict[str, Any]) -> str:
    summary = audit["summary"]
    rows = "\n".join(
        "| {id} | {status} | {blocked} | {evidence} |".format(
            id=item["id"],
            status=item["status"],
            blocked=", ".join(item["blockedBy"]) if item["blockedBy"] else "-",
            evidence=sum(1 for proof in item["evidence"] if proof["exists"]),
        )
        for item in audit["requirements"]
    )
    details = "\n\n".join(
        f"""### {item['id']}

Status: `{item['status']}`

Blocked by:

{render_list(item['blockedBy'])}

Acceptance criteria:

{render_list(item['acceptanceCriteria'])}

Next actions:

{render_list(item['nextActions'])}
"""
        for item in audit["requirements"]
    )
    decision = audit["completionDecision"]
    return f"""# Completion audit - Migration WealthTech

Generated at: {audit["generatedAt"]}

This file is generated by `scripts/build-completion-audit.py`. It audits the full user objective requirement by requirement, using public-safe generated evidence only. It does not store raw source text, raw PDF text, raw archive text, raw server inventory, tokens, private keys, `.env` values, recovery codes or production action output.

## Completion decision

| Field | Value |
|---|---|
| Full objective achieved | {str(decision["fullObjectiveAchieved"]).lower()} |
| Status | {decision["status"]} |
| Reason | {decision["reason"]} |

## Summary

| Metric | Value |
|---|---:|
| Requirements | {summary["requirementCount"]} |
| Complete requirements | {summary["completeRequirementCount"]} |
| Blocked requirements | {summary["blockedRequirementCount"]} |
| Partial requirements | {summary["partialRequirementCount"]} |
| Missing evidence items | {len(summary["missingEvidence"])} |
| Unresolved blockers | {len(summary["unresolvedBlockerIds"])} |

## Requirement status

| Requirement | Status | Blocked by | Evidence items present |
|---|---|---|---:|
{rows}

## Unresolved blockers

{render_list(summary["unresolvedBlockerIds"])}

## Details

{details}

## No-regression rules

- Do not mark the full objective complete while `fullObjectiveAchieved=false`.
- Do not treat partial or blocked requirements as complete.
- Do not publish raw corpus text, raw PDF text, raw archive text, tokens, `.env` values, private keys or private server inventory.
- Do not execute production actions until private inventory, backups, rollback plan, tests and operator approval are evidenced.
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
    print(json.dumps(audit["summary"], indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
