#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path.cwd()
SERVER_DIR = REPO_ROOT / "Migration" / "serveur"
TASKS_PATH = REPO_ROOT / "Migration" / "index" / "MCP_EXECUTION_TASKS.json"
OUTPUT_JSON_PATH = SERVER_DIR / "PRIVATE_SERVER_INVENTORY_TASK_CARDS.json"
OUTPUT_MD_PATH = SERVER_DIR / "PRIVATE_SERVER_INVENTORY_TASK_CARDS.md"


S1_WHITELIST = [
    "niakara.com",
    "www.niakara.com",
    "api.niakara.com",
    "wealthtechinnovations.com",
    "api.wealthtechinnovations.com",
    "stablecoin.wealthtechinnovations.com",
    "api.stablecoin.wealthtechinnovations.com",
    "blockchain.wealthtechinnovations.com",
    "tokenfactory.wealthtechinnovations.com",
    "wealthtechinnovation.com",
    "berebytours.com",
]

S2_PROTECTED = [
    "africafunds.chainsolutions.fr",
    "api.africafunds.chainsolutions.fr",
    "api.stablecoin.chainsolutions.fr",
    "stablecoin.chainsolutions.fr",
    "brvm.chainsolutions.fr",
    "bvmac.chainsolutions.fr",
    "chainsolutions.fr",
    "Funds.chainsolutions.fr",
    "api.funds.chainsolutions.fr",
]

S2_CLEANUP_CANDIDATES = [
    "api.pccet.wealthtechinnovations.ci",
    "api.wealthtechinnovations.ci",
    "evote.wealthtechinnovations.ci",
    "pccet.wealthtechinnovations.ci",
    "wealthtechinnovations.ci",
    "opcvm.chainsolutions.fr",
]

S2_BACKUP_CANDIDATES = [
    "fantokenafrica.club",
    "api.fantokenafrica.club",
    "lysfc.fantokenafrica.club",
    "iso20022.chainsolutions.fr",
    "mutualfunds.chainsolutions.fr",
    "opcvm.chainsolutions.fr",
    "robot.funds.chainsolutions.fr",
    "api-mutualfunds.chainsolutions.fr",
]

COMMON_INVENTORY_FIELDS = [
    "domain_or_subdomain",
    "public_url",
    "repository_url_or_unknown",
    "branch_or_unknown",
    "runtime_node_passenger_docker_php_other",
    "server_path_private_do_not_commit",
    "vhost_private_do_not_commit",
    "pm2_or_process_name_private_do_not_commit",
    "docker_service_private_do_not_commit",
    "port_private_do_not_commit",
    "database_name_private_do_not_commit",
    "env_file_presence_without_values",
    "cron_presence_without_command_secrets",
    "ssl_certificate_status",
    "backup_location_private_do_not_commit",
    "rollback_plan_private_do_not_commit",
    "post_action_test_result",
    "operator_approval_reference",
]

POST_ACTION_TESTS = [
    "HTTP/HTTPS response check for every preserved domain.",
    "Critical API endpoint smoke test.",
    "Runtime status check for PM2, Docker, Passenger or equivalent.",
    "Port/listener check in private context.",
    "Error log check without publishing sensitive log content.",
    "Disk usage check.",
    "Documentation update check.",
    "Rollback readiness check.",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_tasks() -> dict[str, Any]:
    with TASKS_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def base_card(
    card_id: str,
    title: str,
    server_scope: str,
    status: str,
    purpose: str,
    protected_domains: list[str],
    cleanup_candidates: list[str],
    backup_candidates: list[str],
    blocked_by: list[str],
    actions: list[str],
) -> dict[str, Any]:
    return {
        "id": card_id,
        "title": title,
        "serverScope": server_scope,
        "status": status,
        "purpose": purpose,
        "blockedBy": blocked_by,
        "allowedActions": actions,
        "forbiddenActions": [
            "delete_without_inventory",
            "publish_env_values",
            "publish_private_keys",
            "publish_raw_server_paths",
            "stop_runtime_without_approval",
            "modify_vhost_without_rollback",
            "run_rm_rf_without_confirmed_scope",
            "merge_databases_without_explicit_plan",
        ],
        "protectedDomains": protected_domains,
        "cleanupCandidates": cleanup_candidates,
        "backupReviewCandidates": backup_candidates,
        "requiredInventoryFields": COMMON_INVENTORY_FIELDS,
        "requiredPrivateEvidence": [
            "operator_approval",
            "private_live_inventory",
            "backup_or_export_reference",
            "rollback_plan",
            "post_action_test_results",
        ],
        "publicEvidenceAllowed": [
            "domain name",
            "repository name or URL",
            "runtime family",
            "public-safe status",
            "test status without secret output",
            "approval reference without secret material",
        ],
        "postActionTests": POST_ACTION_TESTS,
    }


def build_cards(tasks: dict[str, Any]) -> list[dict[str, Any]]:
    blocker = "production_actions_require_private_inventory_and_approval"
    return [
        base_card(
            "s1_preservation_inventory",
            "S1 preservation and cleanup inventory card",
            "S1",
            "template_ready_private_inventory_required",
            "Inventory S1 while preserving the official whitelist and identifying cleanup candidates only after evidence review.",
            S1_WHITELIST,
            ["all_non_whitelisted_domains_after_inventory_only"],
            [],
            [blocker],
            [
                "Inventory Plesk domains, subdomains, vhosts, web roots, runtimes, databases, certs, crons and backups.",
                "Classify each item as preserve, review, cleanup-candidate or unknown.",
                "Do not delete or stop services during inventory.",
            ],
        ),
        base_card(
            "s2_protected_domains_inventory",
            "S2 protected domains inventory card",
            "S2",
            "template_ready_private_inventory_required",
            "Inventory S2 while explicitly protecting the domains that must not be modified.",
            S2_PROTECTED,
            [],
            [],
            [blocker],
            [
                "Inventory protected domains and confirm runtime health.",
                "Record public-safe mapping to repositories when available.",
                "Do not modify stablecoin, funds, BRVM/BVMAC or chainsolutions.fr protected surfaces.",
            ],
        ),
        base_card(
            "s2_cleanup_candidates_inventory",
            "S2 cleanup candidates inventory card",
            "S2",
            "template_ready_private_inventory_required",
            "Review cleanup and backup candidates without deleting anything before approval and rollback evidence.",
            S2_PROTECTED,
            S2_CLEANUP_CANDIDATES,
            S2_BACKUP_CANDIDATES,
            [blocker],
            [
                "Inventory cleanup candidates and backup candidates.",
                "Confirm repository and data ownership before any cleanup proposal.",
                "Prepare cleanup proposal only after backup and rollback references exist.",
            ],
        ),
        base_card(
            "s2_to_s1_migration_candidate",
            "S2 to S1 migration candidate card",
            "S2_to_S1",
            "template_ready_private_inventory_required",
            "Prepare migration only after source inventory, Git alignment, backup/export, destination preparation, copy, tests and documentation.",
            S2_PROTECTED,
            [],
            [],
            [blocker],
            [
                "Identify source application, repo, runtime, domain, database and private env presence.",
                "Confirm source remains intact during copy.",
                "Prepare destination and post-copy tests before cleanup discussion.",
                "Keep stablecoin.chainsolutions.fr and api.stablecoin.chainsolutions.fr on S2.",
            ],
        ),
        {
            "id": "server_no_regression_gate",
            "title": "Server no-regression gate",
            "serverScope": "S1_S2",
            "status": "ready_recurring_gate",
            "purpose": "Reusable gate before any server-affecting action.",
            "blockedBy": [],
            "allowedActions": [
                "Verify approval.",
                "Verify inventory.",
                "Verify backup/export.",
                "Verify rollback.",
                "Run post-action tests.",
                "Update documentation.",
            ],
            "forbiddenActions": [
                "execute_production_change_without_all_gate_evidence",
            ],
            "protectedDomains": S1_WHITELIST + S2_PROTECTED,
            "cleanupCandidates": S2_CLEANUP_CANDIDATES,
            "backupReviewCandidates": S2_BACKUP_CANDIDATES,
            "requiredInventoryFields": COMMON_INVENTORY_FIELDS,
            "requiredPrivateEvidence": [
                "operator_approval",
                "backup_or_export_reference",
                "rollback_plan",
                "test_results",
            ],
            "publicEvidenceAllowed": [
                "pass_fail_gate_status",
                "domain name",
                "public-safe service family",
            ],
            "postActionTests": POST_ACTION_TESTS,
        },
        {
            "id": "operator_approval_record",
            "title": "Operator approval record card",
            "serverScope": "S1_S2",
            "status": "template_ready",
            "purpose": "Capture human approval references without storing secrets or private operational details in Git.",
            "blockedBy": [],
            "allowedActions": [
                "Record approver role, date, scope and public-safe approval reference.",
                "Link to private approval evidence outside Git.",
                "Confirm exact forbidden actions remain forbidden until explicitly approved.",
            ],
            "forbiddenActions": [
                "store_password",
                "store_token",
                "store_private_key",
                "store_private_server_path",
                "store_raw_env",
            ],
            "protectedDomains": S1_WHITELIST + S2_PROTECTED,
            "cleanupCandidates": [],
            "backupReviewCandidates": [],
            "requiredInventoryFields": [
                "approval_reference_public_safe",
                "approver_role",
                "approved_scope",
                "approval_date",
                "linked_private_evidence_location_not_in_git",
            ],
            "requiredPrivateEvidence": [
                "human_approval",
            ],
            "publicEvidenceAllowed": [
                "approval reference",
                "scope label",
                "date",
            ],
            "postActionTests": [],
        },
    ]


def summarize(cards: list[dict[str, Any]]) -> dict[str, Any]:
    by_status: dict[str, int] = {}
    by_scope: dict[str, int] = {}
    blocked = []
    ready = []
    for card in cards:
        by_status[card["status"]] = by_status.get(card["status"], 0) + 1
        by_scope[card["serverScope"]] = by_scope.get(card["serverScope"], 0) + 1
        if card["blockedBy"]:
            blocked.append(card["id"])
        if card["status"].startswith("template_ready") or card["status"].startswith("ready"):
            ready.append(card["id"])
    return {
        "cardCount": len(cards),
        "readyCardCount": len(ready),
        "blockedCardCount": len(blocked),
        "byStatus": by_status,
        "byScope": by_scope,
        "readyCardIds": ready,
        "blockedCardIds": blocked,
        "protectedDomainCount": len(set(S1_WHITELIST + S2_PROTECTED)),
        "cleanupCandidateCount": len(set(S2_CLEANUP_CANDIDATES)),
        "backupReviewCandidateCount": len(set(S2_BACKUP_CANDIDATES)),
    }


def build_index() -> dict[str, Any]:
    tasks = load_tasks()
    cards = build_cards(tasks)
    return {
        "version": 1,
        "generatedAt": now_iso(),
        "generator": "scripts/build-server-inventory-cards.py",
        "purpose": "Public-safe private server inventory task-card templates for WealthTech MCP migration.",
        "safety": {
            "rawServerInventoryStored": False,
            "rawSecretsStored": False,
            "productionActionExecuted": False,
            "publicationMode": "templates_domains_public_safe_fields_and_gates_only",
        },
        "inputs": {
            "executionTasks": {
                "path": "Migration/index/MCP_EXECUTION_TASKS.json",
                "generatedAt": tasks.get("generatedAt"),
                "summary": tasks.get("summary", {}),
            },
            "migrationSecurityPlan": {
                "path": "Migration/02_PLAN_MIGRATION_ET_SECURITE.md",
            },
        },
        "summary": summarize(cards),
        "cards": cards,
    }


def render_list(values: list[str]) -> str:
    if not values:
        return "- None."
    return "\n".join(f"- {value}" for value in values)


def render_markdown(index: dict[str, Any]) -> str:
    summary = index["summary"]
    status_rows = "\n".join(
        f"| {status} | {count} |" for status, count in sorted(summary["byStatus"].items())
    )
    scope_rows = "\n".join(
        f"| {scope} | {count} |" for scope, count in sorted(summary["byScope"].items())
    )
    card_rows = "\n".join(
        "| {id} | {scope} | {status} | {blocked} |".format(
            id=card["id"],
            scope=card["serverScope"],
            status=card["status"],
            blocked=", ".join(card["blockedBy"]) or "-",
        )
        for card in index["cards"]
    )
    return f"""# Private server inventory task cards - Migration WealthTech

Generated at: {index["generatedAt"]}

This file is generated by `scripts/build-server-inventory-cards.py`. It prepares public-safe templates for private server inventory, rollback and post-action tests. It does not store raw server inventory, passwords, tokens, private keys, `.env` values, private server paths or production action output.

## Summary

| Metric | Value |
|---|---:|
| Cards | {summary["cardCount"]} |
| Ready/template cards | {summary["readyCardCount"]} |
| Cards blocked by private approval/inventory | {summary["blockedCardCount"]} |
| Protected domains | {summary["protectedDomainCount"]} |
| Cleanup candidates | {summary["cleanupCandidateCount"]} |
| Backup-review candidates | {summary["backupReviewCandidateCount"]} |

## Status counts

| Status | Cards |
|---|---:|
{status_rows}

## Scope counts

| Scope | Cards |
|---|---:|
{scope_rows}

## Cards

| Card | Scope | Status | Blocked by |
|---|---|---|---|
{card_rows}

## Ready/template cards

{render_list(summary["readyCardIds"])}

## Blocked cards

{render_list(summary["blockedCardIds"])}

## No-regression rules

- These cards are templates only; they do not authorize production changes.
- Do not publish raw server paths, credentials, `.env` values, private keys, dumps or sensitive logs.
- Do not delete, migrate, stop services or modify vhosts until private inventory, backup, rollback and operator approval exist.
- Keep S1 whitelist and S2 protected domains visible during every review.
"""


def main() -> int:
    SERVER_DIR.mkdir(parents=True, exist_ok=True)
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
