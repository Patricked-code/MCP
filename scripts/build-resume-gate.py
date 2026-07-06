#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path.cwd()
INDEX_DIR = REPO_ROOT / "Migration" / "index"

BLOCKERS_PATH = INDEX_DIR / "BLOCKER_RESOLUTION_RUNBOOK.json"
COMPLETION_AUDIT_PATH = INDEX_DIR / "COMPLETION_AUDIT.json"
TASKS_PATH = INDEX_DIR / "MCP_EXECUTION_TASKS.json"
OPERATOR_ACTION_PACK_PATH = INDEX_DIR / "OPERATOR_ACTION_PACK.json"
OPERATOR_ISSUE_LOG_PATH = INDEX_DIR / "OPERATOR_ACTION_ISSUE_LOG.json"
OUTPUT_JSON_PATH = INDEX_DIR / "RESUME_GATE.json"
OUTPUT_MD_PATH = INDEX_DIR / "RESUME_GATE.md"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def open_issues(issue_log: dict[str, Any]) -> list[dict[str, Any]]:
    return [issue for issue in issue_log.get("issues", []) if issue.get("state") == "open"]


def closed_issues(issue_log: dict[str, Any]) -> list[dict[str, Any]]:
    return [issue for issue in issue_log.get("issues", []) if issue.get("state") == "closed"]


def blocker_issue_map(issue_log: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    output: dict[str, list[dict[str, Any]]] = {}
    for issue in issue_log.get("issues", []):
        blocker_id = str(issue.get("blockerId", ""))
        output.setdefault(blocker_id, []).append(issue)
    return output


def build_gate() -> dict[str, Any]:
    blockers = load_json(BLOCKERS_PATH)
    completion = load_json(COMPLETION_AUDIT_PATH)
    tasks = load_json(TASKS_PATH)
    actions = load_json(OPERATOR_ACTION_PACK_PATH)
    issue_log = load_json(OPERATOR_ISSUE_LOG_PATH)

    open_items = open_issues(issue_log)
    closed_items = closed_issues(issue_log)
    unresolved_blockers = list(completion.get("summary", {}).get("unresolvedBlockerIds", []))
    incomplete_requirements = list(completion.get("summary", {}).get("incompleteRequirementIds", []))
    blocked_tasks = list(tasks.get("summary", {}).get("blockedTaskIds", []))
    blocker_to_issues = blocker_issue_map(issue_log)

    checks = []
    for blocker_id in blockers.get("summary", {}).get("blockerIds", []):
        related = blocker_to_issues.get(blocker_id, [])
        related_open = [issue for issue in related if issue.get("state") == "open"]
        checks.append({
            "blockerId": blocker_id,
            "issueUrls": [issue.get("issueUrl") for issue in related if issue.get("issueUrl")],
            "issueStates": [issue.get("state") for issue in related],
            "acceptanceEvidenceStatus": "pending",
            "resumeStatus": "blocked" if blocker_id in unresolved_blockers or related_open else "review_required",
            "requiredBeforeResume": [
                "Complete the blocker acceptance criteria in the linked issue.",
                "Do not close the issue unless the acceptance criteria are evidenced.",
                "Run operator issue sync, regenerate operator actions, completion audit and this resume gate.",
                "Run the no-regression gate before any follow-up push or production-affecting action.",
            ],
        })

    reasons = []
    if open_items:
        reasons.append(f"{len(open_items)} operator blocker issue(s) are still open.")
    if unresolved_blockers:
        reasons.append(f"{len(unresolved_blockers)} completion blocker(s) remain unresolved.")
    if incomplete_requirements:
        reasons.append(f"{len(incomplete_requirements)} full-objective requirement(s) remain incomplete.")
    if blocked_tasks:
        reasons.append(f"{len(blocked_tasks)} executable MCP task(s) remain blocked.")

    resume_allowed = (
        not open_items
        and not unresolved_blockers
        and completion.get("completionDecision", {}).get("fullObjectiveAchieved") is True
    )

    status = "resume_allowed" if resume_allowed else "resume_blocked_operator_actions_pending"
    return {
        "version": 1,
        "generatedAt": now_iso(),
        "generator": "scripts/build-resume-gate.py",
        "purpose": "Public-safe gate that decides whether blocked WealthTech MCP migration work can resume.",
        "safety": {
            "rawSourceTextStored": False,
            "rawPdfTextStored": False,
            "rawArchiveTextStored": False,
            "rawServerInventoryStored": False,
            "rawSecretsStored": False,
            "productionActionExecuted": False,
            "publicationMode": "issue_states_blocker_ids_requirement_ids_and_resume_decision_only",
        },
        "inputs": {
            "blockerRunbook": {
                "path": "Migration/index/BLOCKER_RESOLUTION_RUNBOOK.json",
                "generatedAt": blockers.get("generatedAt"),
                "summary": blockers.get("summary", {}),
            },
            "completionAudit": {
                "path": "Migration/index/COMPLETION_AUDIT.json",
                "generatedAt": completion.get("generatedAt"),
                "summary": completion.get("summary", {}),
                "completionDecision": completion.get("completionDecision", {}),
            },
            "executionTasks": {
                "path": "Migration/index/MCP_EXECUTION_TASKS.json",
                "generatedAt": tasks.get("generatedAt"),
                "summary": tasks.get("summary", {}),
            },
            "operatorActionPack": {
                "path": "Migration/index/OPERATOR_ACTION_PACK.json",
                "generatedAt": actions.get("generatedAt"),
                "summary": actions.get("summary", {}),
            },
            "operatorActionIssueLog": {
                "path": "Migration/index/OPERATOR_ACTION_ISSUE_LOG.json",
                "updatedAt": issue_log.get("updatedAt"),
                "issueCount": len(issue_log.get("issues", [])),
            },
        },
        "summary": {
            "resumeAllowed": resume_allowed,
            "status": status,
            "reasonCount": len(reasons),
            "reasons": reasons,
            "openIssueCount": len(open_items),
            "closedIssueCount": len(closed_items),
            "unresolvedBlockerCount": len(unresolved_blockers),
            "incompleteRequirementCount": len(incomplete_requirements),
            "blockedTaskCount": len(blocked_tasks),
            "unresolvedBlockerIds": unresolved_blockers,
            "incompleteRequirementIds": incomplete_requirements,
            "blockedTaskIds": blocked_tasks,
        },
        "checks": checks,
        "resumeCommandsWhenUnblocked": [
            "node scripts/sync-operator-issue-log.mjs",
            "python scripts/build-operator-action-pack.py",
            "python scripts/build-completion-audit.py",
            "python scripts/build-resume-gate.py",
            "python scripts/build-execution-runway.py",
            "node node_modules/tsx/dist/cli.mjs --test tests/onboarding.test.ts",
            "node node_modules/typescript/lib/tsc.js --noEmit -p tsconfig.json",
            "node node_modules/typescript/lib/tsc.js -p tsconfig.json",
            "node scripts/check-docs.mjs",
            "node scripts/check-no-secrets.mjs",
            "git diff --check",
        ],
    }


def render_list(values: list[str]) -> str:
    if not values:
        return "- None."
    return "\n".join(f"- {value}" for value in values)


def render_markdown(gate: dict[str, Any]) -> str:
    summary = gate["summary"]
    rows = "\n".join(
        "| {blocker} | {status} | {issues} | {evidence} |".format(
            blocker=check["blockerId"],
            status=check["resumeStatus"],
            issues=", ".join(check["issueUrls"]) if check["issueUrls"] else "-",
            evidence=check["acceptanceEvidenceStatus"],
        )
        for check in gate["checks"]
    )
    return f"""# Resume gate - Migration WealthTech

Generated at: {gate["generatedAt"]}

This file is generated by `scripts/build-resume-gate.py`. It decides whether blocked MCP migration work can resume based on public-safe issue state, blocker state, task state and completion-audit state. It does not store raw source text, raw PDF text, raw archive text, raw server inventory, tokens, private keys, `.env` values, recovery codes or production action output.

## Decision

| Field | Value |
|---|---|
| Resume allowed | {str(summary["resumeAllowed"]).lower()} |
| Status | {summary["status"]} |
| Open issue count | {summary["openIssueCount"]} |
| Unresolved blockers | {summary["unresolvedBlockerCount"]} |
| Incomplete requirements | {summary["incompleteRequirementCount"]} |
| Blocked tasks | {summary["blockedTaskCount"]} |

## Reasons

{render_list(summary["reasons"])}

## Checks

| Blocker | Resume status | Issues | Acceptance evidence |
|---|---|---|---|
{rows}

## Resume commands when unblocked

{render_list(gate["resumeCommandsWhenUnblocked"])}

## No-regression rules

- Do not resume blocked MCP migration work while `resumeAllowed=false`.
- Do not close blocker issues unless acceptance criteria are evidenced.
- Do not execute production actions from this gate.
- Do not publish raw tokens, `.env` values, private keys, private server paths, raw corpus text or sensitive logs.
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
