#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path.cwd()
INDEX_DIR = REPO_ROOT / "Migration" / "index"
SERVER_DIR = REPO_ROOT / "Migration" / "serveur"

TASKS_PATH = INDEX_DIR / "MCP_EXECUTION_TASKS.json"
COMPLETION_AUDIT_PATH = INDEX_DIR / "COMPLETION_AUDIT.json"
OPERATOR_ACTION_PACK_PATH = INDEX_DIR / "OPERATOR_ACTION_PACK.json"
RESUME_GATE_PATH = INDEX_DIR / "RESUME_GATE.json"
BLOCKER_EVIDENCE_GATE_PATH = INDEX_DIR / "BLOCKER_EVIDENCE_GATE.json"
SERVER_CARDS_PATH = SERVER_DIR / "PRIVATE_SERVER_INVENTORY_TASK_CARDS.json"
OUTPUT_JSON_PATH = INDEX_DIR / "EXECUTION_RUNWAY.json"
OUTPUT_MD_PATH = INDEX_DIR / "EXECUTION_RUNWAY.md"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def by_id(items: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {str(item.get("id")): item for item in items}


def action_by_blocker(actions: dict[str, Any]) -> dict[str, dict[str, Any]]:
    output: dict[str, dict[str, Any]] = {}
    for action in actions.get("actions", []):
        blocker_id = str(action.get("blockerId", ""))
        if blocker_id:
            output[blocker_id] = action
    return output


def task_lookup(tasks: dict[str, Any], task_ids: list[str]) -> list[dict[str, Any]]:
    lookup = by_id(tasks.get("tasks", []))
    return [lookup[task_id] for task_id in task_ids if task_id in lookup]


def task_commands(tasks: dict[str, Any], task_ids: list[str]) -> list[str]:
    commands: list[str] = []
    for task in task_lookup(tasks, task_ids):
        for command in task.get("verificationCommands", []):
            if command not in commands:
                commands.append(command)
    return commands


def issue_ref(action: dict[str, Any] | None) -> dict[str, Any] | None:
    if not action:
        return None
    return {
        "issueNumber": action.get("issueNumber"),
        "issueUrl": action.get("issueUrl"),
        "issueState": action.get("issueState"),
        "actionId": action.get("id"),
    }


def phase(
    phase_id: str,
    title: str,
    status: str,
    requirement_ids: list[str],
    task_ids: list[str],
    blocked_by: list[str],
    linked_issues: list[dict[str, Any]],
    entry_criteria: list[str],
    actions: list[str],
    exit_evidence: list[str],
    verification_commands: list[str],
    safe_to_execute_now: bool,
) -> dict[str, Any]:
    return {
        "id": phase_id,
        "title": title,
        "status": status,
        "requirementIds": requirement_ids,
        "taskIds": task_ids,
        "blockedBy": blocked_by,
        "linkedIssues": [item for item in linked_issues if item],
        "entryCriteria": entry_criteria,
        "actions": actions,
        "exitEvidence": exit_evidence,
        "verificationCommands": verification_commands,
        "safeToExecuteNow": safe_to_execute_now,
        "productionActionAllowed": False,
        "noRegressionRequiredBeforePromotion": True,
    }


def build_runway() -> dict[str, Any]:
    tasks = load_json(TASKS_PATH)
    completion = load_json(COMPLETION_AUDIT_PATH)
    actions = load_json(OPERATOR_ACTION_PACK_PATH)
    resume_gate = load_json(RESUME_GATE_PATH)
    evidence_gate = load_json(BLOCKER_EVIDENCE_GATE_PATH)
    server_cards = load_json(SERVER_CARDS_PATH)

    action_lookup = action_by_blocker(actions)
    task_summary = tasks.get("summary", {})
    completion_summary = completion.get("summary", {})
    resume_summary = resume_gate.get("summary", {})
    server_summary = server_cards.get("summary", {})

    github_issue = issue_ref(action_lookup.get("github_connector_not_authorized_on_target_org"))
    server_issue = issue_ref(action_lookup.get("production_actions_require_private_inventory_and_approval"))

    phases = [
        phase(
            "current_public_safe_review",
            "Review public-safe objectives, tasks and server templates",
            "ready_now",
            [
                "understand_documented_objectives",
                "read_complete_supplied_corpus",
                "construct_mcp_governance_engine",
                "preserve_no_regression_and_secret_safety",
            ],
            [
                "review_objective_traceability_matrix",
                "prepare_private_server_inventory_cards",
                "execute_no_regression_gate",
                "promote_approved_tasks_to_prs_or_issues",
            ],
            [],
            [],
            [
                "Generated source, PDF, archive, objective, task, blocker, completion, operator-action and resume-gate artifacts exist.",
                "Operator may review public-safe summaries without exposing raw corpus text or private inventory.",
            ],
            [
                "Review OBJECTIVE_TRACEABILITY_MATRIX.md, MCP_EXECUTION_TASKS.md, PRIVATE_SERVER_INVENTORY_TASK_CARDS.md and RESUME_GATE.md.",
                "Promote only unblocked work to PRs or issues.",
                "Keep the no-regression gate green before each push.",
            ],
            [
                "Operator review decision or PR/issue references for promoted safe tasks.",
                "Passing no-regression command output.",
            ],
            task_commands(tasks, [
                "review_objective_traceability_matrix",
                "prepare_private_server_inventory_cards",
                "execute_no_regression_gate",
            ]),
            True,
        ),
        phase(
            "authorize_github_connector",
            "Authorize chainsolutions-wealthtech in the Codex/MCP GitHub connector",
            "blocked_external_action_required",
            ["authorize_connector_on_target_org"],
            ["authorize_github_connector_on_chainsolutions"],
            ["github_connector_not_authorized_on_target_org"],
            [github_issue],
            [
                "A chainsolutions-wealthtech organization owner/admin is available.",
                "The Codex/MCP GitHub app or connector authorization UI is accessible to that owner/admin.",
            ],
            [
                "Install or authorize the connector for chainsolutions-wealthtech.",
                "Grant only the repository visibility and branch/PR permissions needed for MCP onboarding.",
                "Do not paste raw tokens, recovery codes or private inventory into GitHub issues.",
            ],
            [
                "Issue #2 acceptance criteria are evidenced and the issue is closed by the operator.",
                "Connector-visible installed accounts include chainsolutions-wealthtech.",
                "GET /git/repos can include chainsolutions-wealthtech repositories after MCP authentication.",
            ],
            task_commands(tasks, ["authorize_github_connector_on_chainsolutions"]),
            False,
        ),
        phase(
            "regenerate_after_connector_access",
            "Regenerate indexes and bootstrap visible organization repositories",
            "blocked_by_connector_visibility",
            ["bootstrap_visible_org_repositories"],
            [
                "regenerate_ingestion_after_connector_access",
                "bootstrap_visible_org_repositories",
            ],
            ["github_connector_not_authorized_on_target_org"],
            [github_issue],
            [
                "The GitHub connector can list chainsolutions-wealthtech repositories.",
                "Resume gate has been regenerated after connector visibility changed.",
            ],
            [
                "Regenerate source, PDF, archive, objective, task, blocker, completion, operator-action, issue-log and resume-gate artifacts.",
                "Prepare onboarding branches and PRs for each visible repository missing MCP files.",
                "Preserve branch/PR-only workflow; do not write directly to default branches.",
            ],
            [
                "Updated generated artifacts show connector visibility no longer blocked.",
                "Repository onboarding PR references exist for each eligible visible repository.",
            ],
            task_commands(tasks, [
                "regenerate_ingestion_after_connector_access",
                "bootstrap_visible_org_repositories",
            ]),
            False,
        ),
        phase(
            "collect_private_server_evidence",
            "Collect private server inventory, backup, rollback and approval evidence outside Git",
            "blocked_private_inventory_and_approval",
            [
                "prepare_server_mapping_without_exposing_private_inventory",
                "execute_migration_steps_with_operator_approval",
            ],
            ["collect_private_server_inventory"],
            ["production_actions_require_private_inventory_and_approval"],
            [server_issue],
            [
                "A server operator has approved the inventory scope.",
                "Private operational storage exists outside Git for inventory, backup and rollback references.",
            ],
            [
                "Use PRIVATE_SERVER_INVENTORY_TASK_CARDS.md as the public-safe template.",
                "Collect live inventory, backup/export references, rollback references and post-action tests outside Git.",
                "Publish only public-safe evidence summaries back to this repository.",
            ],
            [
                "Issue #3 acceptance criteria are evidenced and the issue is closed by the operator.",
                "Public-safe summary confirms private inventory, backup, rollback and approval evidence exist.",
                "No production deletion, migration, service stop, vhost change or deployment occurred before approval.",
            ],
            task_commands(tasks, ["collect_private_server_inventory"]),
            False,
        ),
        phase(
            "resume_full_migration_execution",
            "Resume full MCP migration execution after blockers are evidenced",
            "blocked_by_resume_gate",
            list(completion_summary.get("incompleteRequirementIds", [])),
            list(task_summary.get("blockedTaskIds", [])),
            list(resume_summary.get("unresolvedBlockerIds", [])),
            [github_issue, server_issue],
            [
                "RESUME_GATE.json reports resumeAllowed=true.",
                "No operator blocker issues remain open.",
                "Completion audit reports fullObjectiveAchieved=true.",
            ],
            [
                "Run the resume commands listed by RESUME_GATE.md.",
                "Confirm BLOCKER_EVIDENCE_GATE.json reports allBlockersEvidenceReady=true.",
                "Regenerate all public-safe indexes after external/private evidence changes.",
                "Run no-regression tests before each PR update, merge or production-affecting action.",
            ],
            [
                "RESUME_GATE.json shows resumeAllowed=true.",
                "COMPLETION_AUDIT.json shows fullObjectiveAchieved=true.",
                "No-regression gate output is captured in the PR body.",
            ],
            list(resume_gate.get("resumeCommandsWhenUnblocked", [])),
            bool(resume_summary.get("resumeAllowed") is True),
        ),
    ]

    ready_phases = [item for item in phases if item["safeToExecuteNow"]]
    blocked_phases = [item for item in phases if not item["safeToExecuteNow"]]

    return {
        "version": 1,
        "generatedAt": now_iso(),
        "generator": "scripts/build-execution-runway.py",
        "purpose": "Public-safe execution runway for applying the WealthTech MCP migration objective step by step without regression.",
        "safety": {
            "rawSourceTextStored": False,
            "rawPdfTextStored": False,
            "rawArchiveTextStored": False,
            "rawServerInventoryStored": False,
            "rawSecretsStored": False,
            "productionActionExecuted": False,
            "publicationMode": "phase_ids_task_ids_requirement_ids_issue_refs_and_public_safe_gates_only",
        },
        "inputs": {
            "executionTasks": {
                "path": "Migration/index/MCP_EXECUTION_TASKS.json",
                "generatedAt": tasks.get("generatedAt"),
                "summary": task_summary,
            },
            "completionAudit": {
                "path": "Migration/index/COMPLETION_AUDIT.json",
                "generatedAt": completion.get("generatedAt"),
                "summary": completion_summary,
                "completionDecision": completion.get("completionDecision", {}),
            },
            "operatorActionPack": {
                "path": "Migration/index/OPERATOR_ACTION_PACK.json",
                "generatedAt": actions.get("generatedAt"),
                "summary": actions.get("summary", {}),
            },
            "resumeGate": {
                "path": "Migration/index/RESUME_GATE.json",
                "generatedAt": resume_gate.get("generatedAt"),
                "summary": resume_summary,
            },
            "blockerEvidenceGate": {
                "path": "Migration/index/BLOCKER_EVIDENCE_GATE.json",
                "generatedAt": evidence_gate.get("generatedAt"),
                "summary": evidence_gate.get("summary", {}),
            },
            "serverCards": {
                "path": "Migration/serveur/PRIVATE_SERVER_INVENTORY_TASK_CARDS.json",
                "generatedAt": server_cards.get("generatedAt"),
                "summary": server_summary,
            },
        },
        "summary": {
            "phaseCount": len(phases),
            "readyPhaseCount": len(ready_phases),
            "blockedPhaseCount": len(blocked_phases),
            "safeNowPhaseCount": len(ready_phases),
            "productionActionAllowed": False,
            "resumeAllowed": bool(resume_summary.get("resumeAllowed") is True),
            "openIssueCount": int(resume_summary.get("openIssueCount", 0)),
            "unresolvedBlockerCount": int(resume_summary.get("unresolvedBlockerCount", 0)),
            "incompleteRequirementCount": int(resume_summary.get("incompleteRequirementCount", 0)),
            "blockedTaskCount": int(resume_summary.get("blockedTaskCount", 0)),
            "readyTaskIds": list(task_summary.get("readyTaskIds", [])),
            "blockedTaskIds": list(task_summary.get("blockedTaskIds", [])),
            "currentRecommendedPhaseIds": [item["id"] for item in ready_phases],
        },
        "phases": phases,
        "noRegressionGate": {
            "requiredBeforeEveryPromotion": True,
            "commands": list(tasks.get("noRegressionGate", {}).get("commands", [])),
        },
    }


def render_list(values: list[str]) -> str:
    if not values:
        return "- None."
    return "\n".join(f"- {value}" for value in values)


def render_markdown(runway: dict[str, Any]) -> str:
    summary = runway["summary"]
    phase_rows = "\n".join(
        "| {id} | {status} | {safe} | {blocked} |".format(
            id=item["id"],
            status=item["status"],
            safe=str(item["safeToExecuteNow"]).lower(),
            blocked=", ".join(item["blockedBy"]) if item["blockedBy"] else "-",
        )
        for item in runway["phases"]
    )
    details = []
    for item in runway["phases"]:
        issue_urls = [issue.get("issueUrl") for issue in item["linkedIssues"] if issue.get("issueUrl")]
        details.append(f"""### {item["id"]}

Status: `{item["status"]}`

Safe to execute now: `{str(item["safeToExecuteNow"]).lower()}`

Production action allowed: `false`

Linked issues:

{render_list(issue_urls)}

Actions:

{render_list(item["actions"])}

Exit evidence:

{render_list(item["exitEvidence"])}
""")

    return f"""# Execution runway - Migration WealthTech

Generated at: {runway["generatedAt"]}

This file is generated by `scripts/build-execution-runway.py`. It turns the public-safe task, completion, operator-action and resume-gate artifacts into a step-by-step execution runway. It does not store raw source text, raw PDF text, raw archive text, raw server inventory, tokens, private keys, `.env` values, recovery codes or production action output.

## Summary

| Field | Value |
|---|---:|
| Phases | {summary["phaseCount"]} |
| Safe-now phases | {summary["safeNowPhaseCount"]} |
| Blocked phases | {summary["blockedPhaseCount"]} |
| Resume allowed | {str(summary["resumeAllowed"]).lower()} |
| Open issues | {summary["openIssueCount"]} |
| Unresolved blockers | {summary["unresolvedBlockerCount"]} |
| Incomplete requirements | {summary["incompleteRequirementCount"]} |
| Blocked tasks | {summary["blockedTaskCount"]} |

## Phase table

| Phase | Status | Safe now | Blocked by |
|---|---|---|---|
{phase_rows}

## Current recommended phases

{render_list(summary["currentRecommendedPhaseIds"])}

## Phase details

{chr(10).join(details)}

## No-regression gate

{render_list(runway["noRegressionGate"]["commands"])}

## No-regression rules

- Do not execute blocked phases while `safeToExecuteNow=false`.
- Do not execute production actions from this runway.
- Do not resume full migration execution while `resumeAllowed=false`.
- Do not publish raw tokens, `.env` values, private keys, private server paths, raw corpus text or sensitive logs.
"""


def main() -> int:
    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    runway = build_runway()
    with OUTPUT_JSON_PATH.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(json.dumps(runway, indent=2, ensure_ascii=False) + "\n")
    with OUTPUT_MD_PATH.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(render_markdown(runway))
    print(f"Wrote {OUTPUT_JSON_PATH.relative_to(REPO_ROOT)}")
    print(f"Wrote {OUTPUT_MD_PATH.relative_to(REPO_ROOT)}")
    print(json.dumps(runway["summary"], indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
