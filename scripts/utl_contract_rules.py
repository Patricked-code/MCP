"""Pure, fail-closed PR372 UTL v03 evidence projections.

These helpers inspect evidence dictionaries; they NEVER admit work to MCP P2,
grant permissions, select a runtime owner, create claims, submit PRs or deploy.
Only canonical runtime authorities may authorize an actual transition.
"""
from __future__ import annotations
import re

_SHA=re.compile(r"^[0-9a-f]{40}$")
_DEPLOY_JOB=re.compile(r"^mcp-s1-([0-9]+)-([0-9a-f]{12})$")

def project_unit_readiness(evidence:dict)->dict:
    """Return CANDIDATE_READY_FOR_AUTHORITY_RECHECK or BLOCKED, never ADMITTED."""
    required=("utl_ref","parent_work_ref","continuity_id","parent_authorized",
              "unit_defined","dependencies_attested","owner_allowed_for_operation",
              "no_collision","main_reobserved","safe_intermediate_delivery",
              "scope_bounded","acceptance_criteria_documented")
    blockers=[k for k in required if not evidence.get(k)]
    if evidence.get("already_satisfied"):
        blockers.append("UNIT_ALREADY_SATISFIED")
    if evidence.get("runtime_write_required") and not evidence.get("runtime_write_authority"):
        blockers.append("RUNTIME_WRITE_AUTHORITY_MISSING")
    profile=evidence.get("entry_profile")
    if profile not in ("E1","E2"):
        blockers.append("ENTRY_PROFILE_UNVERIFIED")
    if profile=="E1" and not evidence.get("existing_internal_task_ref"):
        blockers.append("E1_CANONICAL_TASK_REQUIRED")
    if profile=="E1" and not evidence.get("applicable_session_claim_lock_proof"):
        blockers.append("E1_GOVERNED_OWNERSHIP_UNPROVEN")
    if profile=="E2" and evidence.get("invented_internal_task_ref"):
        blockers.append("E2_FAKE_INTERNAL_TASK_FORBIDDEN")
    if profile=="E2" and not evidence.get("explicit_owner_selection"):
        blockers.append("E2_OWNER_SELECTION_UNVERIFIED")
    if evidence.get("head_moved"):
        blockers.append("HEAD_MOVED_RECONCILE_FIRST")
    return {"status":"BLOCKED" if blockers else "CANDIDATE_READY_FOR_AUTHORITY_RECHECK",
            "blockers":sorted(set(blockers)),"grants_runtime_permission":False,
            "automatically_creates_task_or_claim":False}

def project_delivery_attestation(evidence:dict)->dict:
    """Only trust an independent S1 attestation with identical SHA and health."""
    blockers=[]
    main=evidence.get("main_sha")
    requested=evidence.get("requested_sha")
    runtime=evidence.get("runtime_revision")
    if not isinstance(main,str) or not _SHA.fullmatch(main):
        blockers.append("MAIN_SHA_MISSING")
    if not (main==requested==runtime and isinstance(main,str) and _SHA.fullmatch(main)):
        blockers.append("EXACT_SHA_MISMATCH_OR_MISSING")
    if evidence.get("ci_main_conclusion")!="success":
        blockers.append("CI_MAIN_NOT_SUCCESS")
    if evidence.get("deployment_workflow_conclusion")!="success":
        blockers.append("WORKFLOW_NOT_SUCCESS")
    if evidence.get("server_status")!="succeeded" or evidence.get("phase")!="attested":
        blockers.append("S1_ATTESTATION_STATUS_MISSING")
    for flag in ("health_ok","oauth_ok","mcp_auth_ok"):
        if evidence.get(flag) is not True:
            blockers.append("HEALTH_PROOF_MISSING_"+flag.upper())
    run=evidence.get("deploy_workflow_run_id")
    job=evidence.get("deploy_job_id")
    match=_DEPLOY_JOB.fullmatch(job) if isinstance(job,str) else None
    if not match or not isinstance(run,int) or str(run)!=match.group(1) or (
          isinstance(main,str) and match.group(2)!=main[:12]):
        blockers.append("DEPLOY_JOB_RUN_SHA_CORRELATION_INVALID")
    if not evidence.get("independent_runtime_receipt_url"):
        blockers.append("INDEPENDENT_RUNTIME_RECEIPT_MISSING")
    if not evidence.get("verified_at_utc"):
        blockers.append("RUNTIME_OBSERVATION_TIME_MISSING")
    if evidence.get("rollback_status") not in ("not_needed","succeeded"):
        blockers.append("ROLLBACK_STATUS_UNVERIFIED")
    return {"status":"SOURCE_ATTESTED" if not blockers else "NOT_SOURCE_ATTESTED",
            "blockers":sorted(set(blockers)),"workflow_success_is_sufficient":False}

def project_parent_closure(evidence:dict)->dict:
    """Zero-UTL parent closure is allowed only with evidence of already satisfied."""
    required_units=evidence.get("required_utl_refs")
    attested=evidence.get("attested_utl_refs")
    blockers=[]
    if not isinstance(required_units,list) or not isinstance(attested,list):
        blockers.append("UTL_PLAN_MISSING")
        required_units=[];attested=[]
    if len(required_units)!=len(set(required_units)) or any(not x for x in required_units):
        blockers.append("UTL_PLAN_DUPLICATE_OR_INVALID")
    if required_units:
        for x in required_units:
            if x not in attested:blockers.append("UNATTESTED_REQUIRED_UTL:"+str(x))
    elif not evidence.get("already_satisfied_evidence_url"):
        blockers.append("ZERO_UTL_ALREADY_SATISFIED_EVIDENCE_MISSING")
    for key in ("final_integrated_sha","global_parent_acceptance_evidence_url",
                "parent_checkpoint_url","continuity_id","parent_work_ref"):
        if not evidence.get(key):blockers.append("MISSING_"+key.upper())
    sha=evidence.get("final_integrated_sha")
    if not isinstance(sha,str) or not _SHA.fullmatch(sha):
        blockers.append("FINAL_SHA_INVALID")
    if evidence.get("blocked_child_present"):
        blockers.append("BLOCKED_CHILD_PRESENT")
    return {"status":"CANDIDATE_PARENT_EVIDENCE_COMPLETE" if not blockers else "PARENT_NOT_ATTESTED",
            "blockers":sorted(set(blockers)),"closes_runtime_task":False,
            "updates_program_backlog":False}
