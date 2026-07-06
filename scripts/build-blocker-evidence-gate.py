#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path.cwd()
INDEX_DIR = REPO_ROOT / "Migration" / "index"
EVIDENCE_DIR = REPO_ROOT / "Migration" / "evidence"

BLOCKERS_PATH = INDEX_DIR / "BLOCKER_RESOLUTION_RUNBOOK.json"
ISSUE_LOG_PATH = INDEX_DIR / "OPERATOR_ACTION_ISSUE_LOG.json"
PUBLIC_EVIDENCE_PATH = EVIDENCE_DIR / "PUBLIC_SAFE_BLOCKER_EVIDENCE.json"
OUTPUT_JSON_PATH = INDEX_DIR / "BLOCKER_EVIDENCE_GATE.json"
OUTPUT_MD_PATH = INDEX_DIR / "BLOCKER_EVIDENCE_GATE.md"


PRIVATE_BLOCKER_IDS = {
    "production_actions_require_private_inventory_and_approval",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def load_optional_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"version": 1, "evidenceRecords": []}
    return load_json(path)


def issue_by_blocker(issue_log: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        str(issue.get("blockerId")): issue
        for issue in issue_log.get("issues", [])
        if issue.get("blockerId")
    }


def evidence_by_blocker(evidence: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        str(record.get("blockerId")): record
        for record in evidence.get("evidenceRecords", [])
        if record.get("blockerId")
    }


def is_private_blocker(blocker_id: str) -> bool:
    return blocker_id in PRIVATE_BLOCKER_IDS


def blocker_gate(
    blocker: dict[str, Any],
    issue: dict[str, Any] | None,
    evidence_record: dict[str, Any] | None,
) -> dict[str, Any]:
    blocker_id = str(blocker.get("id"))
    acceptance_count = len(blocker.get("acceptanceCriteria", []))
    issue_state = str(issue.get("state")) if issue else "missing"
    issue_closed = issue_state == "closed"
    has_record = evidence_record is not None
    criteria_evidence = evidence_record.get("criteriaEvidence", []) if evidence_record else []
    criteria_evidence_count = len(criteria_evidence) if isinstance(criteria_evidence, list) else 0
    criteria_evidence_complete = (
        has_record
        and evidence_record.get("evidenceStatus") == "public_safe_evidence_complete"
        and criteria_evidence_count >= acceptance_count
    )
    no_secrets_published = bool(evidence_record and evidence_record.get("noSecretsPublished") is True)
    production_action_executed = bool(evidence_record and evidence_record.get("productionActionExecuted") is True)
    private_material_outside_git = (
        not is_private_blocker(blocker_id)
        or bool(evidence_record and evidence_record.get("privateMaterialStoredOutsideGit") is True)
    )

    missing_reasons = []
    if not issue_closed:
        missing_reasons.append("linked_issue_not_closed")
    if not has_record:
        missing_reasons.append("public_safe_evidence_record_missing")
    if has_record and not criteria_evidence_complete:
        missing_reasons.append("acceptance_criteria_evidence_incomplete")
    if has_record and not no_secrets_published:
        missing_reasons.append("no_secrets_published_flag_missing")
    if has_record and production_action_executed:
        missing_reasons.append("production_action_executed_before_gate")
    if has_record and not private_material_outside_git:
        missing_reasons.append("private_material_outside_git_flag_missing")

    resolution_ready = (
        issue_closed
        and criteria_evidence_complete
        and no_secrets_published
        and not production_action_executed
        and private_material_outside_git
    )

    return {
        "blockerId": blocker_id,
        "title": blocker.get("title"),
        "ownerRoleRequired": blocker.get("ownerRoleRequired"),
        "issueNumber": issue.get("issueNumber") if issue else None,
        "issueUrl": issue.get("issueUrl") if issue else None,
        "issueState": issue_state,
        "issueClosed": issue_closed,
        "publicEvidenceRecordPath": "Migration/evidence/PUBLIC_SAFE_BLOCKER_EVIDENCE.json",
        "publicEvidenceRecordPresent": has_record,
        "publicEvidenceStatus": evidence_record.get("evidenceStatus") if evidence_record else "missing",
        "acceptanceCriteriaCount": acceptance_count,
        "criteriaEvidenceCount": criteria_evidence_count,
        "criteriaEvidenceComplete": criteria_evidence_complete,
        "noSecretsPublished": no_secrets_published,
        "privateMaterialStoredOutsideGit": private_material_outside_git,
        "productionActionExecuted": production_action_executed,
        "resolutionReadyForCompletionAudit": resolution_ready,
        "status": "ready_for_completion_audit" if resolution_ready else "waiting_for_public_safe_evidence",
        "missingReasons": missing_reasons,
        "acceptanceCriteria": list(blocker.get("acceptanceCriteria", [])),
        "verificationCommands": list(blocker.get("verificationCommands", [])),
        "blockedTasks": list(blocker.get("blockedTasks", [])),
        "blockedObjectives": list(blocker.get("blockedObjectives", [])),
        "blockedServerCards": list(blocker.get("blockedServerCards", [])),
    }


def build_gate() -> dict[str, Any]:
    runbook = load_json(BLOCKERS_PATH)
    issue_log = load_json(ISSUE_LOG_PATH) if ISSUE_LOG_PATH.exists() else {"issues": []}
    public_evidence = load_optional_json(PUBLIC_EVIDENCE_PATH)
    issue_lookup = issue_by_blocker(issue_log)
    evidence_lookup = evidence_by_blocker(public_evidence)
    blockers = [
        blocker_gate(
            blocker,
            issue_lookup.get(str(blocker.get("id"))),
            evidence_lookup.get(str(blocker.get("id"))),
        )
        for blocker in runbook.get("blockers", [])
    ]
    ready = [item for item in blockers if item["resolutionReadyForCompletionAudit"]]
    unresolved = [item for item in blockers if not item["resolutionReadyForCompletionAudit"]]
    open_issue_blockers = [item for item in blockers if not item["issueClosed"]]
    missing_record_blockers = [item for item in blockers if not item["publicEvidenceRecordPresent"]]
    incomplete_criteria_blockers = [item for item in blockers if not item["criteriaEvidenceComplete"]]

    return {
        "version": 1,
        "generatedAt": now_iso(),
        "generator": "scripts/build-blocker-evidence-gate.py",
        "purpose": "Public-safe evidence gate for deciding whether unresolved WealthTech MCP blockers can be treated as resolved by the completion audit.",
        "safety": {
            "rawSourceTextStored": False,
            "rawPdfTextStored": False,
            "rawArchiveTextStored": False,
            "rawServerInventoryStored": False,
            "rawSecretsStored": False,
            "productionActionExecuted": False,
            "publicationMode": "issue_states_evidence_counts_acceptance_counts_and_resolution_flags_only",
        },
        "inputs": {
            "blockerRunbook": {
                "path": "Migration/index/BLOCKER_RESOLUTION_RUNBOOK.json",
                "generatedAt": runbook.get("generatedAt"),
                "summary": runbook.get("summary", {}),
            },
            "operatorActionIssueLog": {
                "path": "Migration/index/OPERATOR_ACTION_ISSUE_LOG.json",
                "updatedAt": issue_log.get("updatedAt"),
                "issueCount": len(issue_log.get("issues", [])),
            },
            "publicEvidenceRecord": {
                "path": "Migration/evidence/PUBLIC_SAFE_BLOCKER_EVIDENCE.json",
                "exists": PUBLIC_EVIDENCE_PATH.exists(),
                "recordCount": len(public_evidence.get("evidenceRecords", [])),
            },
        },
        "summary": {
            "blockerCount": len(blockers),
            "resolutionReadyCount": len(ready),
            "unresolvedBlockerCount": len(unresolved),
            "openIssueBlockerCount": len(open_issue_blockers),
            "missingEvidenceRecordCount": len(missing_record_blockers),
            "incompleteAcceptanceEvidenceCount": len(incomplete_criteria_blockers),
            "allBlockersEvidenceReady": len(unresolved) == 0,
            "resolutionReadyBlockerIds": [item["blockerId"] for item in ready],
            "unresolvedBlockerIds": [item["blockerId"] for item in unresolved],
            "openIssueBlockerIds": [item["blockerId"] for item in open_issue_blockers],
            "missingEvidenceRecordBlockerIds": [item["blockerId"] for item in missing_record_blockers],
        },
        "blockers": blockers,
        "publicEvidenceSchema": {
            "path": "Migration/evidence/PUBLIC_SAFE_BLOCKER_EVIDENCE.json",
            "requiredTopLevelKeys": ["version", "evidenceRecords"],
            "requiredRecordKeys": [
                "blockerId",
                "evidenceStatus",
                "criteriaEvidence",
                "noSecretsPublished",
                "productionActionExecuted",
            ],
            "privateBlockerAdditionalRequiredKeys": [
                "privateMaterialStoredOutsideGit",
            ],
            "allowedEvidenceStatusForResolution": "public_safe_evidence_complete",
            "doNotStore": [
                "raw tokens",
                ".env values",
                "private keys",
                "private server paths",
                "raw inventory",
                "raw command logs",
                "recovery codes",
            ],
        },
    }


def render_list(values: list[str]) -> str:
    if not values:
        return "- None."
    return "\n".join(f"- {value}" for value in values)


def render_markdown(gate: dict[str, Any]) -> str:
    summary = gate["summary"]
    rows = "\n".join(
        "| {blocker} | {status} | {issue} | {record} | {criteria} |".format(
            blocker=item["blockerId"],
            status=item["status"],
            issue=item["issueState"],
            record=str(item["publicEvidenceRecordPresent"]).lower(),
            criteria=f"{item['criteriaEvidenceCount']}/{item['acceptanceCriteriaCount']}",
        )
        for item in gate["blockers"]
    )
    details = "\n\n".join(
        f"""### {item['blockerId']}

Issue: {item.get('issueUrl') or '-'}

Issue state: `{item['issueState']}`

Resolution ready for completion audit: `{str(item['resolutionReadyForCompletionAudit']).lower()}`

Missing reasons:

{render_list(item['missingReasons'])}

Acceptance criteria:

{render_list(item['acceptanceCriteria'])}
"""
        for item in gate["blockers"]
    )
    return f"""# Blocker evidence gate - Migration WealthTech

Generated at: {gate["generatedAt"]}

This file is generated by `scripts/build-blocker-evidence-gate.py`. It decides whether unresolved MCP blockers have enough public-safe evidence to be considered resolved by the completion audit. It does not store raw source text, raw PDF text, raw archive text, raw server inventory, tokens, private keys, `.env` values, recovery codes or production action output.

## Summary

| Field | Value |
|---|---:|
| Blockers | {summary["blockerCount"]} |
| Resolution-ready blockers | {summary["resolutionReadyCount"]} |
| Unresolved blockers | {summary["unresolvedBlockerCount"]} |
| Open issue blockers | {summary["openIssueBlockerCount"]} |
| Missing evidence records | {summary["missingEvidenceRecordCount"]} |
| Incomplete acceptance evidence | {summary["incompleteAcceptanceEvidenceCount"]} |
| All blockers evidence ready | {str(summary["allBlockersEvidenceReady"]).lower()} |

## Gate table

| Blocker | Status | Issue state | Evidence record present | Criteria evidence |
|---|---|---|---|---:|
{rows}

## Details

{details}

## Public-safe evidence record

Expected optional evidence path: `Migration/evidence/PUBLIC_SAFE_BLOCKER_EVIDENCE.json`

Do not store raw tokens, `.env` values, private keys, private server paths, raw inventory, raw command logs or recovery codes in that file. For private server work, store only a reviewed public-safe summary and keep the real inventory, backup references, rollback references and approval evidence outside Git.

## No-regression rules

- Do not mark a blocker resolved while `resolutionReadyForCompletionAudit=false`.
- Do not close blocker issues unless all acceptance criteria are evidenced.
- Do not execute production actions from this gate.
- Do not publish raw private evidence in Git.
"""


def main() -> int:
    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    gate = build_gate()
    with OUTPUT_JSON_PATH.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(json.dumps(gate, indent=2, ensure_ascii=False) + "\n")
    with OUTPUT_MD_PATH.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(render_markdown(gate))
    print(f"Wrote {OUTPUT_JSON_PATH.relative_to(REPO_ROOT)}")
    print(f"Wrote {OUTPUT_MD_PATH.relative_to(REPO_ROOT)}")
    print(json.dumps(gate["summary"], indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
