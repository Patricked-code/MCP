#!/usr/bin/env python3
"""Read-only exhaustive GitHub MCP history exporter. Requires GITHUB_TOKEN.
Usage: GITHUB_TOKEN=... python3 scripts/export_merge_traceability.py
Output: CSV files in artifacts/merge-traceability (no repository mutation).
"""
import csv, json, os, pathlib, re, time, urllib.parse, urllib.request
TOKEN=os.environ.get("GITHUB_TOKEN")
if not TOKEN: raise SystemExit("GITHUB_TOKEN required (read-only token)")
REPO=os.environ.get("GITHUB_REPOSITORY","Patricked-code/MCP")
ROOT="https://api.github.com/repos/"+REPO
OUT=pathlib.Path(os.environ.get("OUTPUT_DIR","artifacts/merge-traceability"))
OUT.mkdir(parents=True,exist_ok=True)
def request(path):
    req=urllib.request.Request(path if path.startswith("https://") else ROOT+path,headers={
        "Authorization":"Bearer "+TOKEN,"Accept":"application/vnd.github+json",
        "X-GitHub-Api-Version":"2022-11-28","User-Agent":"mcp-audit-read-only"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req,timeout=40) as res:return json.load(res)
        except Exception as e:
            if attempt==3:raise
            time.sleep(2**attempt)
def pages(path):
    page=1
    while True:
        sep="&" if "?" in path else "?"
        payload=request(path+sep+"per_page=100&page="+str(page))
        if not isinstance(payload,list):raise ValueError("Unexpected paginated response")
        if not payload:break
        yield from payload
        if len(payload)<100:break
        page+=1
def write_csv(name,rows,fields):
    with (OUT/name).open("w",newline="",encoding="utf-8") as f:
        w=csv.DictWriter(f,fieldnames=fields,extrasaction="ignore");w.writeheader();w.writerows(rows)
prs=list(pages("/pulls?state=all&sort=created&direction=asc"))
# GitHub /pulls responses cover OPEN and CLOSED, including MERGED.
pr_rows=[];by_merge={}
for p in prs:
    n=p["number"]
    if not p.get("merged_at"):continue
    sha=p.get("merge_commit_sha") or ""
    row={"pr":n,"title":p.get("title",""),"merged_at":p["merged_at"],
         "merge_sha":sha,"head_sha":p.get("head",{}).get("sha",""),
         "base":p.get("base",{}).get("ref",""),"url":p.get("html_url",""),
         "continuity_id":"","mandate":"","task":"","classification":"UNCLASSIFIED",
         "ci_main_run":"","deploy_run":"","runtime_sha":"","evidence_status":"TO_ENRICH"}
    pr_rows.append(row)
    if sha:by_merge.setdefault(sha,[]).append(n)
commits=list(pages("/commits?sha=main"))
commit_rows=[]
for c in reversed(commits):
    sha=c["sha"];msg=c.get("commit",{}).get("message","")
    associated=by_merge.get(sha,[])
    ids=re.findall(r"(?:CONT|CONTINUITY)[-_:][A-Z0-9_-]+",msg,re.I)
    commit_rows.append({"sha":sha,"date":c.get("commit",{}).get("committer",{}).get("date",""),
        "title":msg.splitlines()[0],"pr_ids":";".join(map(str,associated)),
        "continuity_ids":";".join(sorted(set(ids))),"html_url":c.get("html_url",""),
        "pr_relation":"MERGE_SHA" if associated else "UNRESOLVED",
        "ci_main_run":"","deploy_run":"","runtime_sha":""})
# GitHub Actions history is independent evidence, not inferred from a merge.
runs=[]
for r in pages("/actions/runs"):
    runs.append({"run_id":r.get("id"),"name":r.get("name"),
       "head_sha":r.get("head_sha"),"head_branch":r.get("head_branch"),
       "event":r.get("event"),"status":r.get("status"),
       "conclusion":r.get("conclusion"),"created_at":r.get("created_at"),
       "url":r.get("html_url")})
write_csv("merged_prs.csv",pr_rows,["pr","title","merged_at","merge_sha","head_sha","base","url","continuity_id","mandate","task","classification","ci_main_run","deploy_run","runtime_sha","evidence_status"])
write_csv("main_commits.csv",commit_rows,["sha","date","title","pr_ids","continuity_ids","html_url","pr_relation","ci_main_run","deploy_run","runtime_sha"])
write_csv("action_runs.csv",runs,["run_id","name","head_sha","head_branch","event","status","conclusion","created_at","url"])
manifest={"repository":REPO,"read_only":True,"counts":{"merged_prs":len(pr_rows),"main_commits":len(commit_rows),"action_runs":len(runs)},"limitations":[
"GitHub Actions run is not itself a deployment attestation.",
"Runtime SHA and governed deploy receipt require matching independently verified S1/MCP evidence.",
"Squash/rebase merges are taken from PR merge_commit_sha, not guessed from commit text.",
"Mandate, task and Continuity ID are not inferred when no authoritative proof is available.",
"GitHub REST pagination must finish without errors; rate-limit or permission errors stop export."]}
(OUT/"manifest.json").write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+"\n")
print(json.dumps(manifest,indent=2))
