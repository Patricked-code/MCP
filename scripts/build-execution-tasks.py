#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path.cwd()
INDEX_DIR = REPO_ROOT / "Migration" / "index"
OBJECTIVE_MATRIX_PATH = INDEX_DIR / "OBJECTIVE_TRACEABILITY_MATRIX.json"
OUTPUT_JSON_PATH = INDEX_DIR / "MCP_EXECUTION_TASKS.json"
OUTPUT_MD_PATH = INDEX_DIR / "MCP_EXECUTION_TASKS.md"


NO_REGRESSION_COMMANDS = [
    "node node_modules/tsx/dist/cli.mjs --test tests/onboarding.test.ts",
    "node node_modules/typescript/lib/tsc.js --noEmit -p tsconfig.json",
    "node node_modules/typescript/lib/tsc.js -p tsconfig.json",
    "node scripts/check-docs.mjs",
    "node scripts/check-no-secrets.mjs",
    "git diff --check",
]


TASK_DEFINITIONS = [
    {
        "id": "review_objective_traceability_matrix",
        "title": "Review objective traceability matrix",
        "objectiveIds": ["apply_documented_requirements", "complete_corpus_ingestion"],
        "status": "ready_for_operator_review",
        "kind": "operator_review",
        "dependsOn": [],
        "blockedBy": [],
        "entryCriteria": [
            "OBJECTIVE_TRACEABILITY_MATRIX.json exists and has no missing local evidence.",
            "Source registry and PDF audit are generated.",
        ],
        "actions": [
            "Review all 9 objectives with the operator.",
            "Confirm which ready tasks may be promoted to repository changes or server-side preparation.",
            "Do not mark blocked objectives complete until blockers are removed.",
        ],
        "expectedEvidence": [
            "Migration/index/OBJECTIVE_TRACEABILITY_MATRIX.md",
            "Migration/index/MCP_EXECUTION_TASKS.md",
        ],
        "verificationCommands": [
            "node scripts/check-docs.mjs",
        ],
    },
    {
        "id": "authorize_github_connector_on_chainsolutions",
        "title": "Authorize Codex/MCP GitHub connector on chainsolutions-wealthtech",
        "objectiveIds": ["connect_chainsolutions_wealthtech_to_mcp", "repo_server_mapping"],
        "status": "blocked_external_authorization",
        "kind": "external_github_app_action",
        "dependsOn": ["review_objective_traceability_matrix"],
        "blockedBy": ["github_connector_not_authorized_on_target_org"],
        "entryCriteria": [
            "Organization owner can access chainsolutions-wealthtech settings.",
            "Codex/MCP GitHub app installation or connector authorization is available for the organization.",
        ],
        "actions": [
            "Install or authorize the GitHub connector/app on chainsolutions-wealthtech.",
            "Grant repository visibility required for governance onboarding.",
            "Re-check connector installed accounts and visible repositories after authorization.",
        ],
        "expectedEvidence": [
            "Connector installed accounts include chainsolutions-wealthtech.",
            "MCP onboarding snapshot no longer reports blocked_until_org_access for the target organization.",
        ],
        "verificationCommands": [
            "gh api /orgs/chainsolutions-wealthtech",
            "GET /git/onboarding",
            "GET /git/onboarding/objectives",
        ],
    },
    {
        "id": "regenerate_ingestion_after_connector_access",
        "title": "Regenerate source, PDF and objective indexes after connector access changes",
        "objectiveIds": ["complete_corpus_ingestion", "audit_and_traceability"],
        "status": "blocked_by_connector_visibility",
        "kind": "mcp_regeneration",
        "dependsOn": ["authorize_github_connector_on_chainsolutions"],
        "blockedBy": ["github_connector_not_authorized_on_target_org"],
        "entryCriteria": [
            "Connector can see chainsolutions-wealthtech.",
            "Local source corpus remains available.",
        ],
        "actions": [
            "Run source registry generation.",
            "Run PDF text audit.",
            "Run objective matrix generation.",
            "Run execution task generation.",
        ],
        "expectedEvidence": [
            "Migration/index/SOURCE_REGISTRY.json",
            "Migration/index/PDF_TEXT_AUDIT.json",
            "Migration/index/OBJECTIVE_TRACEABILITY_MATRIX.json",
            "Migration/index/MCP_EXECUTION_TASKS.json",
        ],
        "verificationCommands": [
            "node scripts/build-source-registry.mjs",
            "python scripts/build-pdf-text-audit.py",
            "python scripts/build-objective-index.py",
            "python scripts/build-execution-tasks.py",
        ],
    },
    {
        "id": "bootstrap_visible_org_repositories",
        "title": "Bootstrap visible organization repositories with .mcp governance files",
        "objectiveIds": ["connect_chainsolutions_wealthtech_to_mcp", "branch_pr_only_workflow", "repo_server_mapping"],
        "status": "blocked_by_connector_visibility",
        "kind": "repository_bootstrap",
        "dependsOn": ["authorize_github_connector_on_chainsolutions", "regenerate_ingestion_after_connector_access"],
        "blockedBy": ["github_connector_not_authorized_on_target_org"],
        "entryCriteria": [
            "MCP connector can list target organization repositories.",
            "Repository owner/maintainer approves branch and PR creation.",
        ],
        "actions": [
            "Call repo bootstrap preparation for each visible repository missing MCP governance files.",
            "Create branch mcp/onboarding-setup per repository.",
            "Open pull requests instead of writing to main.",
            "Keep generated server maps public-safe.",
        ],
        "expectedEvidence": [
            "Each target repository has a PR with .mcp/manifest.json, .mcp/permissions.json, .mcp/agents.json, .mcp/server-map.json and MCP docs.",
            "Audit events record bootstrap preparation without generated file contents.",
        ],
        "verificationCommands": [
            "GET /git/repos",
            "POST /git/repos/:owner/:repo/bootstrap",
            "GET /git/audit?type=onboarding.repo_bootstrap_prepared",
        ],
    },
    {
        "id": "prepare_private_server_inventory_cards",
        "title": "Prepare private inventory-backed server task cards",
        "objectiveIds": ["repo_server_mapping", "migration_execution_sequence", "no_regression_and_safety"],
        "status": "ready_to_prepare_templates",
        "kind": "server_preparation",
        "dependsOn": ["review_objective_traceability_matrix"],
        "blockedBy": [],
        "entryCriteria": [
            "No production change is executed.",
            "Public-safe templates avoid raw server paths, credentials and .env values.",
        ],
        "actions": [
            "Create task-card templates for S1/S2 inventory, backup, copy, test and documentation.",
            "Keep protected S2 domains and S1 whitelist visible in the task criteria.",
            "Require rollback and post-action checks before any future server action.",
        ],
        "expectedEvidence": [
            "Migration/index/MCP_EXECUTION_TASKS.md",
            "Migration/02_PLAN_MIGRATION_ET_SECURITE.md",
            "docs/MCP_SERVER_MAPPING.md",
        ],
        "verificationCommands": [
            "node scripts/check-docs.mjs",
        ],
    },
    {
        "id": "collect_private_server_inventory",
        "title": "Collect private live server inventory before cleanup or migration",
        "objectiveIds": ["repo_server_mapping", "migration_execution_sequence"],
        "status": "blocked_private_inventory_and_approval",
        "kind": "private_server_action",
        "dependsOn": ["prepare_private_server_inventory_cards"],
        "blockedBy": ["production_actions_require_private_inventory_and_approval"],
        "entryCriteria": [
            "Human operator approves server access and scope.",
            "Private inventory location is approved and not published in Git.",
            "Rollback plan and backup target are defined.",
        ],
        "actions": [
            "Inventory domains, vhosts, PM2/Passenger/Docker, ports, databases, .env presence, certs, crons and logs.",
            "Record only public-safe summaries in Git.",
            "Do not delete, migrate, stop services or modify production config during inventory.",
        ],
        "expectedEvidence": [
            "Private inventory exists in approved operational context.",
            "Public-safe server mapping summary exists without secrets.",
            "Operator approval is recorded.",
        ],
        "verificationCommands": [
            "GET /git/onboarding/objectives",
        ],
    },
    {
        "id": "execute_no_regression_gate",
        "title": "Run no-regression gate before every commit, PR update or production-affecting action",
        "objectiveIds": ["no_regression_and_safety", "audit_and_traceability", "branch_pr_only_workflow"],
        "status": "ready_recurring_gate",
        "kind": "quality_gate",
        "dependsOn": [],
        "blockedBy": [],
        "entryCriteria": [
            "Code, docs or generated index changed.",
        ],
        "actions": [
            "Run tests, typecheck, build, docs check, secrets check and diff whitespace check.",
            "Do not push when a gate fails.",
            "Record verification commands in the PR body.",
        ],
        "expectedEvidence": [
            "Passing command output before push.",
            "Updated PR verification section.",
        ],
        "verificationCommands": NO_REGRESSION_COMMANDS,
    },
    {
        "id": "promote_approved_tasks_to_prs_or_issues",
        "title": "Promote approved tasks to PRs or GitHub issues",
        "objectiveIds": ["apply_documented_requirements", "audit_and_traceability"],
        "status": "pending_operator_review",
        "kind": "planning_to_delivery",
        "dependsOn": ["review_objective_traceability_matrix"],
        "blockedBy": [],
        "entryCriteria": [
            "Operator has reviewed the objective and task matrices.",
            "Task is either unblocked or explicitly marked as an external/private prerequisite.",
        ],
        "actions": [
            "Convert approved ready tasks into branch/PR work.",
            "Convert external or private prerequisites into clearly labeled tracking issues or checklist items.",
            "Keep blocked tasks blocked until their evidence is present.",
        ],
        "expectedEvidence": [
            "Branch, PR or issue references for approved tasks.",
            "Updated MCP_EXECUTION_TASKS after task status changes.",
        ],
        "verificationCommands": [
            "gh pr view 1 --json state,isDraft,mergeable",
        ],
    },
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_matrix() -> dict[str, Any]:
    with OBJECTIVE_MATRIX_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def objective_map(matrix: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {objective["id"]: objective for objective in matrix.get("objectives", [])}


def task_status_counts(tasks: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for task in tasks:
        counts[task["status"]] = counts.get(task["status"], 0) + 1
    return counts


def task_kind_counts(tasks: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for task in tasks:
        counts[task["kind"]] = counts.get(task["kind"], 0) + 1
    return counts


def is_ready(status: str) -> bool:
    return status.startswith("ready")


def is_blocked(status: str) -> bool:
    return status.startswith("blocked")


def attach_objective_evidence(task: dict[str, Any], objectives: dict[str, dict[str, Any]]) -> dict[str, Any]:
    related = []
    missing_objectives = []
    for objective_id in task["objectiveIds"]:
        objective = objectives.get(objective_id)
        if not objective:
            missing_objectives.append(objective_id)
            continue
        related.append({
            "id": objective_id,
            "status": objective.get("status"),
            "sourceHitCount": objective.get("sourceSignals", {}).get("sourceHitCount", 0),
            "missingCurrentEvidence": objective.get("missingCurrentEvidence", []),
            "blockerCount": len(objective.get("blockers", [])),
        })

    return {
        **task,
        "objectiveEvidence": related,
        "missingObjectiveIds": missing_objectives,
        "noRegressionGateRequired": task["kind"] not in {"operator_review"},
    }


def build_index() -> dict[str, Any]:
    matrix = load_matrix()
    objectives = objective_map(matrix)
    tasks = [attach_objective_evidence(task, objectives) for task in TASK_DEFINITIONS]
    blocked_tasks = [task["id"] for task in tasks if is_blocked(task["status"])]
    ready_tasks = [task["id"] for task in tasks if is_ready(task["status"])]

    return {
        "version": 1,
        "generatedAt": now_iso(),
        "generator": "scripts/build-execution-tasks.py",
        "purpose": "Executable MCP task plan derived from the WealthTech objective traceability matrix.",
        "safety": {
            "rawSourceTextStored": False,
            "rawPdfTextStored": False,
            "rawSecretsStored": False,
            "productionActionExecuted": False,
            "publicationMode": "task_status_dependencies_gates_and_evidence_paths_only",
        },
        "inputs": {
            "objectiveTraceabilityMatrix": {
                "path": "Migration/index/OBJECTIVE_TRACEABILITY_MATRIX.json",
                "generatedAt": matrix.get("generatedAt"),
                "summary": matrix.get("summary", {}),
            }
        },
        "summary": {
            "taskCount": len(tasks),
            "readyTaskCount": len(ready_tasks),
            "blockedTaskCount": len(blocked_tasks),
            "statusCounts": task_status_counts(tasks),
            "kindCounts": task_kind_counts(tasks),
            "readyTaskIds": ready_tasks,
            "blockedTaskIds": blocked_tasks,
            "globalBlockerIds": [blocker["id"] for blocker in matrix.get("globalBlockers", [])],
        },
        "tasks": tasks,
        "globalBlockers": matrix.get("globalBlockers", []),
        "noRegressionGate": {
            "requiredFor": "Every commit, PR update and production-affecting action.",
            "commands": NO_REGRESSION_COMMANDS,
        },
        "nextRecommendedTaskIds": [
            "review_objective_traceability_matrix",
            "prepare_private_server_inventory_cards",
            "execute_no_regression_gate",
            "authorize_github_connector_on_chainsolutions",
        ],
    }


def render_list(values: list[str]) -> str:
    if not values:
        return "- None."
    return "\n".join(f"- {value}" for value in values)


def render_markdown(index: dict[str, Any]) -> str:
    summary = index["summary"]
    status_rows = "\n".join(
        f"| {status} | {count} |"
        for status, count in sorted(summary["statusCounts"].items())
    )
    task_rows = "\n".join(
        "| {id} | {status} | {kind} | {depends} | {blocked} |".format(
            id=task["id"],
            status=task["status"],
            kind=task["kind"],
            depends=", ".join(task["dependsOn"]) or "-",
            blocked=", ".join(task["blockedBy"]) or "-",
        )
        for task in index["tasks"]
    )
    blocker_rows = "\n".join(
        f"| {blocker['id']} | {blocker['description']} | {', '.join(blocker['blocks'])} |"
        for blocker in index["globalBlockers"]
    )

    return f"""# MCP execution tasks - Migration WealthTech

Generated at: {index["generatedAt"]}

This file is generated by `scripts/build-execution-tasks.py`. It converts the objective matrix into executable MCP tasks with dependencies, blockers, verification commands and no-regression gates. It does not store raw source text, raw PDF text, tokens, private keys, `.env` content, recovery codes or private server inventory.

## Summary

| Metric | Value |
|---|---:|
| Tasks | {summary["taskCount"]} |
| Ready tasks | {summary["readyTaskCount"]} |
| Blocked tasks | {summary["blockedTaskCount"]} |
| Global blockers | {len(summary["globalBlockerIds"])} |

## Status counts

| Status | Tasks |
|---|---:|
{status_rows}

## Tasks

| Task | Status | Kind | Depends on | Blocked by |
|---|---|---|---|---|
{task_rows}

## Ready tasks

{render_list(summary["readyTaskIds"])}

## Blocked tasks

{render_list(summary["blockedTaskIds"])}

## Global blockers

| Blocker | Description | Blocks |
|---|---|---|
{blocker_rows}

## No-regression gate

{render_list(index["noRegressionGate"]["commands"])}
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
