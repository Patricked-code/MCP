#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path.cwd()
INDEX_DIR = REPO_ROOT / "Migration" / "index"
BLOCKERS_PATH = INDEX_DIR / "BLOCKER_RESOLUTION_RUNBOOK.json"
TASKS_PATH = INDEX_DIR / "MCP_EXECUTION_TASKS.json"
COMPLETION_AUDIT_PATH = INDEX_DIR / "COMPLETION_AUDIT.json"
OUTPUT_JSON_PATH = INDEX_DIR / "OPERATOR_ACTION_PACK.json"
OUTPUT_MD_PATH = INDEX_DIR / "OPERATOR_ACTION_PACK.md"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def blocker_by_id(runbook: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {blocker["id"]: blocker for blocker in runbook.get("blockers", [])}


def blocked_requirements_by_blocker(completion: dict[str, Any], blocker_id: str) -> list[str]:
    return [
        item["id"]
        for item in completion.get("requirements", [])
        if blocker_id in item.get("blockedBy", [])
    ]


def tasks_by_blocker(tasks: dict[str, Any], blocker_id: str) -> list[str]:
    return [
        task["id"]
        for task in tasks.get("tasks", [])
        if blocker_id in task.get("blockedBy", [])
    ]


def issue_body(
    title: str,
    blocker_id: str,
    owner_role: str,
    context: str,
    blocked_tasks: list[str],
    blocked_requirements: list[str],
    checklist: list[str],
    acceptance: list[str],
    verification: list[str],
    safety: list[str],
) -> str:
    return f"""## Context

{context}

## Blocker

`{blocker_id}`

## Owner role

{owner_role}

## Blocked tasks

{render_list(blocked_tasks)}

## Blocked full-objective requirements

{render_list(blocked_requirements)}

## Checklist

{render_checklist(checklist)}

## Acceptance criteria

{render_checklist(acceptance)}

## Verification

{render_checklist(verification)}

## Safety

{render_checklist(safety)}
"""


def build_actions(runbook: dict[str, Any], tasks: dict[str, Any], completion: dict[str, Any]) -> list[dict[str, Any]]:
    blockers = blocker_by_id(runbook)
    common_safety = [
        "No raw token, `.env` value, private key, recovery code or private server inventory is pasted into the issue.",
        "No production action is executed from this public tracking issue.",
        "After evidence changes, regenerate source/PDF/archive/objective/task/blocker/completion/operator-action artifacts and run the no-regression gate.",
    ]

    definitions = [
        {
            "id": "authorize_github_connector_issue",
            "blockerId": "github_connector_not_authorized_on_target_org",
            "title": "Authorize GitHub/Codex/MCP connector on chainsolutions-wealthtech",
            "issueTitle": "[MCP blocker] Authorize GitHub/Codex/MCP connector on chainsolutions-wealthtech",
            "labels": ["mcp-blocker", "external-action", "github-connector"],
            "actionType": "external_github_owner_action",
            "context": "The public organization bootstrap is applied, but the Codex/MCP GitHub connector still cannot list or manage chainsolutions-wealthtech repositories directly.",
            "checklist": [
                "Open the chainsolutions-wealthtech organization settings as an owner/admin.",
                "Install or authorize the GitHub app/connector used by Codex/MCP on the organization.",
                "Grant only repository visibility, branch write and pull request permissions required by the MCP workflow.",
                "Verify the connector sees chainsolutions-wealthtech as an installed or visible organization.",
                "Verify MCP onboarding no longer reports target organization access as blocked.",
            ],
        },
        {
            "id": "private_server_inventory_issue",
            "blockerId": "production_actions_require_private_inventory_and_approval",
            "title": "Collect private server inventory, backup, rollback and approval evidence",
            "issueTitle": "[MCP blocker] Collect private server inventory and operator approval evidence",
            "labels": ["mcp-blocker", "private-inventory", "operator-approval"],
            "actionType": "private_operator_action",
            "context": "Server cleanup, migration and deployment actions are intentionally blocked until private S1/S2 inventory, backup, rollback, tests and operator approval exist outside Git.",
            "checklist": [
                "Use `Migration/serveur/PRIVATE_SERVER_INVENTORY_TASK_CARDS.md` as the public-safe template.",
                "Collect live S1/S2 inventory in an approved private operational location outside Git.",
                "Record backup/export references outside Git.",
                "Record rollback plan references outside Git.",
                "Record operator approval scope and date without secrets.",
                "Prepare post-action tests before any cleanup, migration, vhost change or service stop.",
                "Publish only reviewed public-safe summaries back to Git.",
            ],
        },
    ]

    actions = []
    for definition in definitions:
        blocker = blockers.get(definition["blockerId"], {})
        blocked_tasks = tasks_by_blocker(tasks, definition["blockerId"]) or list(blocker.get("blockedTasks", []))
        blocked_requirements = blocked_requirements_by_blocker(completion, definition["blockerId"])
        acceptance = list(blocker.get("acceptanceCriteria", []))
        verification = list(blocker.get("verificationCommands", []))
        owner_role = str(blocker.get("ownerRoleRequired") or "operator")
        body = issue_body(
            definition["issueTitle"],
            definition["blockerId"],
            owner_role,
            definition["context"],
            blocked_tasks,
            blocked_requirements,
            definition["checklist"],
            acceptance,
            verification,
            common_safety,
        )
        actions.append({
            "id": definition["id"],
            "title": definition["title"],
            "actionType": definition["actionType"],
            "blockerId": definition["blockerId"],
            "ownerRoleRequired": owner_role,
            "status": "ready_for_operator_tracking",
            "issueTitle": definition["issueTitle"],
            "labels": definition["labels"],
            "blockedTasks": blocked_tasks,
            "blockedRequirements": blocked_requirements,
            "checklist": definition["checklist"],
            "acceptanceCriteria": acceptance,
            "verificationCommands": verification,
            "safetyRules": common_safety,
            "issueBodyMarkdown": body,
        })
    return actions


def render_list(values: list[str]) -> str:
    if not values:
        return "- None."
    return "\n".join(f"- {value}" for value in values)


def render_checklist(values: list[str]) -> str:
    if not values:
        return "- [ ] None."
    return "\n".join(f"- [ ] {value}" for value in values)


def render_markdown(pack: dict[str, Any]) -> str:
    summary = pack["summary"]
    rows = "\n".join(
        "| {id} | {kind} | {blocker} | {tasks} | {requirements} |".format(
            id=action["id"],
            kind=action["actionType"],
            blocker=action["blockerId"],
            tasks=len(action["blockedTasks"]),
            requirements=len(action["blockedRequirements"]),
        )
        for action in pack["actions"]
    )
    bodies = "\n\n".join(
        f"""### {action['id']}

Issue title: `{action['issueTitle']}`

Labels: {", ".join(action['labels'])}

{action['issueBodyMarkdown']}
"""
        for action in pack["actions"]
    )
    return f"""# Operator action pack - Migration WealthTech

Generated at: {pack["generatedAt"]}

This file is generated by `scripts/build-operator-action-pack.py`. It converts unresolved MCP migration blockers into public-safe operator tracking actions and issue-ready checklists. It does not store raw source text, raw PDF text, raw archive text, raw server inventory, tokens, private keys, `.env` values, recovery codes or production action output.

## Summary

| Metric | Value |
|---|---:|
| Operator actions | {summary["operatorActionCount"]} |
| External GitHub actions | {summary["externalGithubActionCount"]} |
| Private operator actions | {summary["privateOperatorActionCount"]} |
| Issue-ready actions | {summary["issueReadyActionCount"]} |
| Unresolved blockers | {summary["unresolvedBlockerCount"]} |

## Actions

| Action | Type | Blocker | Blocked tasks | Blocked requirements |
|---|---|---|---:|---:|
{rows}

## Issue-ready bodies

{bodies}

## No-regression rules

- Keep this pack generated, not hand-edited.
- Do not paste raw tokens, `.env` values, private keys, private server paths or sensitive logs into public issues.
- Do not execute production actions from these issue bodies; they only track prerequisites and verification.
"""


def build_pack() -> dict[str, Any]:
    runbook = load_json(BLOCKERS_PATH)
    tasks = load_json(TASKS_PATH)
    completion = load_json(COMPLETION_AUDIT_PATH)
    actions = build_actions(runbook, tasks, completion)
    unresolved = list(runbook.get("summary", {}).get("blockerIds", []))
    return {
        "version": 1,
        "generatedAt": now_iso(),
        "generator": "scripts/build-operator-action-pack.py",
        "purpose": "Public-safe operator tracking actions for unresolved WealthTech MCP migration blockers.",
        "safety": {
            "rawSourceTextStored": False,
            "rawPdfTextStored": False,
            "rawArchiveTextStored": False,
            "rawServerInventoryStored": False,
            "rawSecretsStored": False,
            "productionActionExecuted": False,
            "publicationMode": "operator_checklists_issue_bodies_and_acceptance_criteria_only",
        },
        "inputs": {
            "blockerRunbook": {
                "path": "Migration/index/BLOCKER_RESOLUTION_RUNBOOK.json",
                "generatedAt": runbook.get("generatedAt"),
                "summary": runbook.get("summary", {}),
            },
            "executionTasks": {
                "path": "Migration/index/MCP_EXECUTION_TASKS.json",
                "generatedAt": tasks.get("generatedAt"),
                "summary": tasks.get("summary", {}),
            },
            "completionAudit": {
                "path": "Migration/index/COMPLETION_AUDIT.json",
                "generatedAt": completion.get("generatedAt"),
                "summary": completion.get("summary", {}),
            },
        },
        "summary": {
            "operatorActionCount": len(actions),
            "externalGithubActionCount": sum(1 for action in actions if action["actionType"] == "external_github_owner_action"),
            "privateOperatorActionCount": sum(1 for action in actions if action["actionType"] == "private_operator_action"),
            "issueReadyActionCount": len(actions),
            "unresolvedBlockerCount": len(unresolved),
            "unresolvedBlockerIds": unresolved,
            "actionIds": [action["id"] for action in actions],
        },
        "actions": actions,
    }


def main() -> int:
    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    pack = build_pack()
    with OUTPUT_JSON_PATH.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(json.dumps(pack, indent=2, ensure_ascii=False) + "\n")
    with OUTPUT_MD_PATH.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(render_markdown(pack))
    print(f"Wrote {OUTPUT_JSON_PATH.relative_to(REPO_ROOT)}")
    print(f"Wrote {OUTPUT_MD_PATH.relative_to(REPO_ROOT)}")
    print(json.dumps(pack["summary"], indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
