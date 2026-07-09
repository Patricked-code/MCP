#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path.cwd()
INDEX_DIR = REPO_ROOT / "Migration" / "index"
OBJECTIVES_PATH = INDEX_DIR / "OBJECTIVE_TRACEABILITY_MATRIX.json"
TASKS_PATH = INDEX_DIR / "MCP_EXECUTION_TASKS.json"
SERVER_CARDS_PATH = REPO_ROOT / "Migration" / "serveur" / "PRIVATE_SERVER_INVENTORY_TASK_CARDS.json"
OUTPUT_JSON_PATH = INDEX_DIR / "BLOCKER_RESOLUTION_RUNBOOK.json"
OUTPUT_MD_PATH = INDEX_DIR / "BLOCKER_RESOLUTION_RUNBOOK.md"


BLOCKER_STEPS = {
    "github_connector_not_authorized_on_target_org": {
        "title": "Authorize GitHub/Codex/MCP connector on chainsolutions-wealthtech",
        "ownerRoleRequired": "chainsolutions-wealthtech organization owner/admin",
        "resolutionStatus": "external_action_required",
        "resolutionSteps": [
            "Open chainsolutions-wealthtech organization settings in GitHub.",
            "Install or authorize the GitHub app/connector used by Codex/MCP on the organization.",
            "Grant only the permissions required for repository visibility, branch writes and pull request creation.",
            "Verify the connector sees chainsolutions-wealthtech as an installed/visible organization.",
            "Regenerate source registry, PDF audit, archive text audit, objective matrix, execution tasks and this blocker runbook.",
        ],
        "acceptanceCriteria": [
            "Connector installed accounts include chainsolutions-wealthtech.",
            "MCP onboarding no longer reports organization access as blocked.",
            "GET /git/repos can include organization repositories after authentication.",
            "No raw token was copied into Git, logs, screenshots or generated artifacts.",
        ],
        "verificationCommands": [
            "gh api /orgs/chainsolutions-wealthtech",
            "GET /git/onboarding",
            "GET /git/onboarding/tasks",
            "GET /git/onboarding/blockers",
        ],
    },
    "production_actions_require_private_inventory_and_approval": {
        "title": "Collect approved private server inventory, backup, rollback and test evidence",
        "ownerRoleRequired": "server operator with explicit human approval",
        "resolutionStatus": "private_inventory_required",
        "resolutionSteps": [
            "Use the public-safe server inventory cards as templates only.",
            "Collect live S1/S2 inventory in an approved private operational location outside Git.",
            "Record backups/exports, rollback plan and operator approval references outside Git.",
            "Run or prepare post-action tests before any cleanup, migration, vhost change or service stop.",
            "Publish only public-safe summaries after review.",
        ],
        "acceptanceCriteria": [
            "Private inventory exists outside Git.",
            "Backup or export reference exists outside Git.",
            "Rollback plan exists outside Git.",
            "Operator approval scope and date are recorded without secrets.",
            "No production deletion, migration, service stop or vhost change has occurred before approval.",
        ],
        "verificationCommands": [
            "GET /git/onboarding/server-cards",
            "GET /git/onboarding/tasks",
            "node scripts/check-no-secrets.mjs",
            "node scripts/check-docs.mjs",
        ],
    },
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def tasks_blocked_by(tasks: dict[str, Any], blocker_id: str) -> list[str]:
    return [
        task["id"]
        for task in tasks.get("tasks", [])
        if blocker_id in task.get("blockedBy", [])
    ]


def objectives_blocked_by(objectives: dict[str, Any], blocker_id: str) -> list[str]:
    for blocker in objectives.get("globalBlockers", []):
        if blocker.get("id") == blocker_id:
            return list(blocker.get("blocks", []))
    return []


def server_cards_blocked_by(cards: dict[str, Any], blocker_id: str) -> list[str]:
    return [
        card["id"]
        for card in cards.get("cards", [])
        if blocker_id in card.get("blockedBy", [])
    ]


def build_runbook() -> dict[str, Any]:
    objectives = load_json(OBJECTIVES_PATH)
    tasks = load_json(TASKS_PATH)
    server_cards = load_json(SERVER_CARDS_PATH)
    blockers = []

    all_blocker_ids = set(tasks.get("summary", {}).get("globalBlockerIds", []))
    all_blocker_ids.update(blocker.get("id") for blocker in objectives.get("globalBlockers", []))
    all_blocker_ids = {blocker_id for blocker_id in all_blocker_ids if blocker_id}

    for blocker_id in sorted(all_blocker_ids):
        definition = BLOCKER_STEPS.get(blocker_id, {
            "title": blocker_id,
            "ownerRoleRequired": "operator",
            "resolutionStatus": "review_required",
            "resolutionSteps": ["Review this blocker and add explicit resolution steps."],
            "acceptanceCriteria": ["Acceptance criteria must be defined before the blocker can be closed."],
            "verificationCommands": ["GET /git/onboarding/blockers"],
        })
        blockers.append({
            "id": blocker_id,
            **definition,
            "blockedObjectives": objectives_blocked_by(objectives, blocker_id),
            "blockedTasks": tasks_blocked_by(tasks, blocker_id),
            "blockedServerCards": server_cards_blocked_by(server_cards, blocker_id),
        })

    return {
        "version": 1,
        "generatedAt": now_iso(),
        "generator": "scripts/build-blocker-resolution-runbook.py",
        "purpose": "Public-safe resolution runbook for the remaining MCP migration blockers.",
        "safety": {
            "rawSourceTextStored": False,
            "rawPdfTextStored": False,
            "rawServerInventoryStored": False,
            "rawSecretsStored": False,
            "productionActionExecuted": False,
            "publicationMode": "blocker_steps_acceptance_criteria_and_verification_only",
        },
        "inputs": {
            "objectiveTraceabilityMatrix": {
                "path": "Migration/index/OBJECTIVE_TRACEABILITY_MATRIX.json",
                "generatedAt": objectives.get("generatedAt"),
                "summary": objectives.get("summary", {}),
            },
            "executionTasks": {
                "path": "Migration/index/MCP_EXECUTION_TASKS.json",
                "generatedAt": tasks.get("generatedAt"),
                "summary": tasks.get("summary", {}),
            },
            "serverInventoryCards": {
                "path": "Migration/serveur/PRIVATE_SERVER_INVENTORY_TASK_CARDS.json",
                "generatedAt": server_cards.get("generatedAt"),
                "summary": server_cards.get("summary", {}),
            },
        },
        "summary": {
            "blockerCount": len(blockers),
            "externalActionBlockerCount": sum(1 for blocker in blockers if blocker["resolutionStatus"] == "external_action_required"),
            "privateInventoryBlockerCount": sum(1 for blocker in blockers if blocker["resolutionStatus"] == "private_inventory_required"),
            "blockedTaskCount": sum(len(blocker["blockedTasks"]) for blocker in blockers),
            "blockedObjectiveCount": sum(len(blocker["blockedObjectives"]) for blocker in blockers),
            "blockedServerCardCount": sum(len(blocker["blockedServerCards"]) for blocker in blockers),
            "blockerIds": [blocker["id"] for blocker in blockers],
        },
        "blockers": blockers,
        "resumeCommandsAfterResolution": [
            "node scripts/run-migration-governance.mjs",
            "node scripts/build-source-registry.mjs",
            "python scripts/build-pdf-text-audit.py",
            "python scripts/build-archive-text-audit.py",
            "python scripts/build-objective-index.py",
            "python scripts/build-execution-tasks.py",
            "python scripts/build-server-inventory-cards.py",
            "python scripts/build-blocker-resolution-runbook.py",
            "python scripts/build-blocker-evidence-gate.py",
            "python scripts/build-completion-audit.py",
            "python scripts/build-operator-action-pack.py",
            "python scripts/build-resume-gate.py",
            "python scripts/build-execution-runway.py",
            "node node_modules/tsx/dist/cli.mjs --test tests/onboarding.test.ts",
            "node node_modules/typescript/lib/tsc.js --noEmit -p tsconfig.json",
            "node node_modules/typescript/lib/tsc.js -p tsconfig.json",
            "node scripts/check-docs.mjs",
            "node scripts/check-no-secrets.mjs",
            "node scripts/check-public-evidence.mjs",
            "git diff --check",
        ],
    }


def render_list(values: list[str]) -> str:
    if not values:
        return "- None."
    return "\n".join(f"- {value}" for value in values)


def render_markdown(runbook: dict[str, Any]) -> str:
    summary = runbook["summary"]
    rows = "\n".join(
        "| {id} | {status} | {tasks} | {objectives} | {cards} |".format(
            id=blocker["id"],
            status=blocker["resolutionStatus"],
            tasks=len(blocker["blockedTasks"]),
            objectives=len(blocker["blockedObjectives"]),
            cards=len(blocker["blockedServerCards"]),
        )
        for blocker in runbook["blockers"]
    )
    details = "\n\n".join(
        f"""### {blocker['id']}

Owner role: {blocker['ownerRoleRequired']}

Resolution status: `{blocker['resolutionStatus']}`

Blocked tasks:

{render_list(blocker['blockedTasks'])}

Blocked objectives:

{render_list(blocker['blockedObjectives'])}

Blocked server cards:

{render_list(blocker['blockedServerCards'])}

Resolution steps:

{render_list(blocker['resolutionSteps'])}

Acceptance criteria:

{render_list(blocker['acceptanceCriteria'])}
"""
        for blocker in runbook["blockers"]
    )
    return f"""# Blocker resolution runbook - Migration WealthTech

Generated at: {runbook["generatedAt"]}

This file is generated by `scripts/build-blocker-resolution-runbook.py`. It defines the public-safe resolution path for the remaining MCP migration blockers. It does not store raw source text, raw PDF text, raw server inventory, tokens, private keys, `.env` values, recovery codes or production action output.

## Summary

| Metric | Value |
|---|---:|
| Blockers | {summary["blockerCount"]} |
| External-action blockers | {summary["externalActionBlockerCount"]} |
| Private-inventory blockers | {summary["privateInventoryBlockerCount"]} |
| Blocked tasks | {summary["blockedTaskCount"]} |
| Blocked objectives | {summary["blockedObjectiveCount"]} |
| Blocked server cards | {summary["blockedServerCardCount"]} |

## Blockers

| Blocker | Resolution status | Tasks | Objectives | Server cards |
|---|---|---:|---:|---:|
{rows}

## Details

{details}

## Resume commands after resolution

{render_list(runbook["resumeCommandsAfterResolution"])}

## No-regression rules

- Do not mark a blocker resolved until its acceptance criteria are evidenced.
- Do not publish raw tokens, `.env` values, private keys, private server paths or sensitive logs.
- Do not execute production actions from this runbook; it only describes prerequisites and verification.
"""


def main() -> int:
    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    runbook = build_runbook()
    with OUTPUT_JSON_PATH.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(json.dumps(runbook, indent=2, ensure_ascii=False) + "\n")
    with OUTPUT_MD_PATH.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(render_markdown(runbook))
    print(f"Wrote {OUTPUT_JSON_PATH.relative_to(REPO_ROOT)}")
    print(f"Wrote {OUTPUT_MD_PATH.relative_to(REPO_ROOT)}")
    print(json.dumps(runbook["summary"], indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
