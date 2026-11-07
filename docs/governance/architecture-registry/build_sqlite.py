#!/usr/bin/env python3
"""Rebuild a disposable SQLite index from immutable Git architectural snapshots.

Source-of-truth: JSON/JSONL + Git SHA; never serves as MCP runtime authority.
Stdlib only. No network, no deployment, no runtime MCP interactions.
"""
from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))



def _main_directory_rows(root: Path, index: dict, snapshot: str):
    """Validate the frozen 145 main tree objects before indexing. No Git writes."""
    import re
    raw = [json.loads(line) for line in (root / index["files"]["mainDirectories"]).read_text(
        encoding="utf-8").splitlines() if line.strip()]
    if len(raw) != index["mainDirectoryCount"]:
        raise ValueError("Directory count mismatch")
    paths = {item["path"] for item in raw}
    if len(paths) != len(raw):
        raise ValueError("Duplicate directory path")
    result = []
    for d in raw:
        parent = d["path"].rsplit("/", 1)[0] if "/" in d["path"] else None
        if (d["snapshotId"] != index["snapshotId"] or d["branch"] != "main"
            or d["commitSha"] != index["mainSha"] or d["gitMode"] != "040000"
            or not re.fullmatch(r"[a-f0-9]{40}", d["treeSha"])
            or d["parentPath"] != parent or (parent and parent not in paths)
            or d["depth"] != len(d["path"].split("/"))):
            raise ValueError("Invalid main directory row: " + d["path"])
        result.append((snapshot, "main", d["path"], parent, d["commitSha"],
            d["treeSha"], d["gitMode"], d["depth"], d["directFiles"],
            d["directDirectories"], d["descendantFiles"], d["descendantDirectories"]))
    return result



def _verified_file_relation_rows(root: Path, index: dict, snapshot: str):
    """Project selected source-anchored relations without semantic extrapolation."""
    evidence = read_json(root / index["files"]["sourceEvidenceBatch01"])
    if (evidence["mainCommitSha"] != index["mainSha"]
            or evidence["repository"] != index["repository"]):
        raise ValueError("Source evidence does not match main baseline")
    known = {}
    with (root / index["files"]["mainFiles"]).open(encoding="utf-8") as stream:
        for line in stream:
            if line.strip():
                item = json.loads(line)
                known[item["path"]] = item["blobSha"]
    rows = []
    for item in evidence["relations"]:
        from_path, to_path = item["from"], item["to"]
        src_sha, dst_sha = item["evidence"]["blobSha"], item["targetBlobSha"]
        if (item["status"] != "VERIFIED_SOURCE_REFERENCE"
            or known.get(from_path) != src_sha
            or known.get(to_path) != dst_sha
            or item["evidence"]["path"] != from_path
            or item["evidence"]["commitSha"] != index["mainSha"]
            or item["evidence"]["line"] <= 0):
            raise ValueError("Unverified file relation: " + item["id"])
        rows.append((snapshot, "main", item["id"], from_path, to_path,
                     item["predicate"], src_sha, dst_sha,
                     item["evidence"]["line"], item["status"]))
    return rows


def build(root: Path, output: Path) -> dict:
    index = read_json(root / "index.json")
    links = index["files"]
    branch_catalog = read_json(root / links["branchHeads"])
    tree_summary = read_json(root / links["mainSummary"])
    relationships = read_json(root / links["componentLinks"])
    source_catalog = read_json(root / links["sourceReferences"])
    checkpoint = read_json(root / links["mainCheckpoint"])
    files_path = root / links["mainFiles"]
    schema_path = root / links["schema"]

    sid = index["snapshotId"]
    if not all(doc["observationId"] == sid for doc in
               (branch_catalog, tree_summary, relationships, source_catalog, checkpoint)):
        raise ValueError("Observation identifier mismatch")
    if tree_summary["truncated"] or tree_summary["commitSha"] != index["mainSha"]:
        raise ValueError("Invalid or truncated main Git tree")
    branches = branch_catalog["branches"]
    if len(branches) != index["branchCount"]:
        raise ValueError("Branch count mismatch")
    if len({b["name"] for b in branches}) != len(branches):
        raise ValueError("Duplicate branch names")
    if not any(b["name"] == "main" and b["headSha"] == index["mainSha"] for b in branches):
        raise ValueError("Main SHA mismatch in branch catalog")

    file_rows = []
    with files_path.open(encoding="utf-8") as stream:
        for line in stream:
            if not line.strip():
                continue
            f = json.loads(line)
            if f["snapshotId"] != sid:
                raise ValueError("File snapshot mismatch")
            file_rows.append((sid, "main", f["path"], f["blobSha"],
                              f["sizeBytes"], f["gitMode"], f["classification"]))
    if len(file_rows) != tree_summary["blobCount"] or len(file_rows) != index["mainFileCount"]:
        raise ValueError("File count mismatch")
    if len({row[2] for row in file_rows}) != len(file_rows):
        raise ValueError("Duplicate file path")

    tech = {}
    for line in (root / links["technicalClassification"]).read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        item = json.loads(line)
        if item["snapshotId"] != sid or item["branch"] != "main":
            raise ValueError("Technical record identity mismatch")
        if item["path"] in tech:
            raise ValueError("Duplicate technical record")
        tech[item["path"]] = item
    file_sha = {r[2]: r[3] for r in file_rows}
    if set(file_sha) != set(tech):
        raise ValueError("Technical classification coverage mismatch")
    if any(t["blobSha"] != file_sha[path] or t["commitSha"] != index["mainSha"]
           for path, t in tech.items()):
        raise ValueError("Technical Git SHA mismatch")
    tech_rows = [
        (sid, "main", path, t["blobSha"], t["formatType"],
         t["technicalFamily"], t["detectedBy"], t["signatureValidation"],
         t["functionalRoleStatus"])
        for path, t in sorted(tech.items())
    ]

    output = output.resolve()
    if output.exists():
        raise FileExistsError(f"Refusing to overwrite existing database: {output}")
    output.parent.mkdir(parents=True, exist_ok=True)

    try:
        with sqlite3.connect(output) as db:
            db.executescript(schema_path.read_text(encoding="utf-8"))
            with db:
                db.execute(
                    "INSERT INTO observations VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (sid, index["repository"], index["observedAt"], index["mainSha"],
                     len(branches), len(file_rows), tree_summary["directoryCount"]))
                db.executemany(
                    "INSERT INTO branches VALUES (?, ?, ?, ?, ?, ?)",
                    ((sid, b["name"], b["headSha"], int(b["protected"]),
                      b["prefix"], b["headUrl"]) for b in branches))
                db.executemany(
                    "INSERT INTO directories VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    _main_directory_rows(root, index, sid))
                db.executemany(
                    "INSERT INTO files VALUES (?, ?, ?, ?, ?, ?, ?)", file_rows)
                db.executemany(
                    "INSERT INTO file_technical_formats VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    tech_rows)
                db.executemany(
                    "INSERT INTO verified_file_relations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    _verified_file_relation_rows(root, index, sid))
                db.executemany(
                    "INSERT INTO components VALUES (?, ?, ?, ?, ?, ?)",
                    ((sid, c["id"], c["name"], c["kind"], c.get("purpose"),
                      c.get("runtimeStatus")) for c in relationships["components"]))
                db.executemany(
                    "INSERT INTO relations VALUES (?, ?, ?, ?, ?, ?, ?)",
                    ((sid, f"relation-{i:04d}", r["from"], r["predicate"],
                      r["to"], r["status"], r.get("evidence"))
                     for i, r in enumerate(relationships["relations"], 1)))
                db.executemany(
                    "INSERT INTO sources VALUES (?, ?, ?, ?, ?, ?)",
                    ((sid, s["id"], s["kind"], s["uri"], s.get("commitSha"),
                      s["role"]) for s in source_catalog["records"]))
                db.execute(
                    "INSERT INTO checkpoints VALUES (?, ?, ?, ?, ?, ?)",
                    (checkpoint["checkpointId"], sid, checkpoint["recordedAt"],
                     checkpoint["status"], checkpoint["nextAction"],
                     json.dumps(checkpoint, ensure_ascii=False, sort_keys=True)))
            problems = db.execute("PRAGMA foreign_key_check").fetchall()
            if problems:
                raise ValueError(f"Foreign key check failed: {problems}")
            integrity = db.execute("PRAGMA integrity_check").fetchone()[0]
            if integrity != "ok":
                raise ValueError(f"SQLite integrity failed: {integrity}")
    except BaseException:
        output.unlink(missing_ok=True)
        raise

    return {"database": str(output), "snapshot": sid, "branches": len(branches),
            "main_files": len(file_rows), "technical_classified": len(tech_rows), "components": len(relationships["components"]),
            "relations": len(relationships["relations"]), "sources": len(source_catalog["records"]),
            "integrity": "ok"}



def _format_from_name(path: str, taxonomy: dict):
    base = path.rsplit("/", 1)[-1]
    for entry in taxonomy["types"]:
        if entry.get("exactName") and base == entry["exactName"]:
            return entry
    for entry in taxonomy["types"]:
        if entry.get("extension") and base.endswith(entry["extension"]):
            return entry
    return None


def _v1_unregistered(path: str) -> str:
    base = path.rsplit("/", 1)[-1]
    suffix = "." + base.rsplit(".", 1)[-1] if "." in base else "(no-extension)"
    return "UNREGISTERED:" + suffix


def build_all_branches(root: Path, output: Path) -> dict:
    """Rebuild all branch-file rows from the frozen refs and complete JSONL batches."""
    import re
    from collections import Counter

    idx = read_json(root / "index.json")
    multi = idx["multiBranchInventory"]
    snap = multi["snapshotId"]
    frozen = read_json(root / multi["branchHeads"])
    manifest = read_json(root / multi["manifest"])
    summary = read_json(root / multi["summary"])
    tax2 = read_json(root / multi["taxonomyV2"])
    tax1 = read_json(root / idx["files"]["technicalTaxonomy"])
    checkpoint = read_json(root / multi["checkpoint"])
    if manifest["status"] != "COMPLETE" or manifest["successfulBranches"] != 190:
        raise ValueError("Multibranch inventory has not been finalized")
    if not (snap == frozen["snapshotId"] == manifest["snapshotId"]
            == summary["snapshotId"] == checkpoint["observationId"]):
        raise ValueError("Multibranch snapshot mismatch")
    refs = frozen["branchRefs"]
    if len(refs) != summary["branches"] or len(refs) != 190:
        raise ValueError("Branch reference count mismatch")
    if len({x["branch"] for x in refs}) != len(refs):
        raise ValueError("Duplicate branch reference names")
    summary_stats = {s["branch"]: s for s in summary["branchStats"]}
    if len(summary_stats) != len(refs):
        raise ValueError("Incomplete branch statistics")

    output = output.resolve()
    if output.exists():
        raise FileExistsError(f"Refusing to overwrite existing database: {output}")
    output.parent.mkdir(parents=True, exist_ok=True)
    count_files = 0
    total_types = Counter()
    batch_count = 0
    try:
        with sqlite3.connect(output) as db:
            db.executescript((root / idx["files"]["schema"]).read_text(encoding="utf-8"))
            with db:
                db.execute(
                    "INSERT INTO observations VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (snap, idx["repository"], frozen["capturedAt"], idx["mainSha"],
                     len(refs), idx["mainFileCount"], idx["mainDirectoryCount"]))
                db.executemany(
                    "INSERT INTO branches VALUES (?, ?, ?, ?, ?, ?)",
                    ((snap, b["branch"], b["headSha"], int(b["protected"]),
                      b["branch"].split("/", 1)[0] if "/" in b["branch"] else "(sans-prefixe)",
                      f'https://github.com/{idx["repository"]}/commit/{b["headSha"]}')
                     for b in refs))
                frozen_main = next((ref for ref in refs if ref["branch"] == "main"), None)
                if frozen_main is None or frozen_main["headSha"] != idx["mainSha"]:
                    raise ValueError("Frozen main branch differs from directory baseline")
                baseline_directories = {
                    row[2]: row for row in _main_directory_rows(root, idx, snap)
                }
                count_directories = 0
                for batch in manifest["batches"]:
                    path = root / multi["root"] / batch["filename"]
                    records = [json.loads(line) for line in path.read_text(
                        encoding="utf-8").splitlines() if line.strip()]
                    expected = refs[batch["from"]:batch["toExclusive"]]
                    if len(records) != len(expected) or len(records) != batch["branchCount"]:
                        raise ValueError(f"Missing entries in {batch['id']}")
                    batch_count += 1
                    sha_batch_filename = batch["filename"].replace("batches/", "tree-object-shas/", 1)
                    if sha_batch_filename == batch["filename"]:
                        raise ValueError("Unexpected subtree SHA batch name")
                    sha_records = [json.loads(line) for line in (root / multi["root"] /
                        sha_batch_filename).read_text(encoding="utf-8").splitlines() if line.strip()]
                    if len(sha_records) != len(records):
                        raise ValueError("Frozen subtree SHA batch coverage mismatch")
                    for record, target, sha_record in zip(records, expected, sha_records):
                        branch = record["branch"]
                        if (branch != target["branch"] or record["headSha"] != target["headSha"]
                                or record["truncated"] or not record["complete"]):
                            raise ValueError(f"Branch ref/tree mismatch: {branch}")
                        if sha_record["branch"] != branch or sha_record["headSha"] != target["headSha"]:
                            raise ValueError("Frozen subtree reference mismatch: " + branch)
                        raw_subtrees = sha_record["subtrees"]
                        if len(raw_subtrees) != record["directoryCount"]:
                            raise ValueError("Frozen subtree count mismatch: " + branch)
                        dir_sha = {}
                        for subtree in raw_subtrees:
                            if (not isinstance(subtree, list) or len(subtree) != 2
                                    or not isinstance(subtree[0], str)
                                    or not isinstance(subtree[1], str)
                                    or not re.fullmatch(r"[a-f0-9]{40}", subtree[1])
                                    or subtree[0] in dir_sha):
                                raise ValueError("Malformed or duplicate subtree: " + branch)
                            dir_sha[subtree[0]] = subtree[1]
                        dirs = {path: [0, 0, 0, 0] for path in dir_sha}
                        for directory in dir_sha:
                            parent = directory.rsplit("/", 1)[0] if "/" in directory else None
                            if parent is not None:
                                if parent not in dirs:
                                    raise ValueError("Orphan subtree: " + directory)
                                dirs[parent][1] += 1
                                ancestor = parent
                                while ancestor is not None:
                                    dirs[ancestor][3] += 1
                                    ancestor = ancestor.rsplit("/", 1)[0] if "/" in ancestor else None
                        for source_file in record["files"]:
                            filename = source_file[0]
                            parent = filename.rsplit("/", 1)[0] if "/" in filename else None
                            if parent is not None:
                                if parent not in dirs:
                                    raise ValueError("Orphan file: " + filename)
                                dirs[parent][0] += 1
                                ancestor = parent
                                while ancestor is not None:
                                    dirs[ancestor][2] += 1
                                    ancestor = ancestor.rsplit("/", 1)[0] if "/" in ancestor else None
                        directory_rows = []
                        for path_name, tree_sha in dir_sha.items():
                            parent = path_name.rsplit("/", 1)[0] if "/" in path_name else None
                            directory_rows.append((
                                snap, branch, path_name, parent, target["headSha"],
                                tree_sha, "040000", len(path_name.split("/")),
                                *dirs[path_name]
                            ))
                        if branch == "main":
                            if set(dir_sha) != set(baseline_directories):
                                raise ValueError("Main directory paths drift")
                            for row in directory_rows:
                                if row != baseline_directories[row[2]]:
                                    raise ValueError("Main directory tree SHA or hierarchy drift")
                        db.executemany(
                            "INSERT INTO directories VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                            directory_rows)
                        count_directories += len(directory_rows)
                        rows, technical = [], []
                        raw_counts = Counter()
                        normalized_counts = Counter()
                        for item in record["files"]:
                            if len(item) != 5:
                                raise ValueError(f"Malformed blob row: {branch}")
                            path_name, blob_sha, size_bytes, mode, saved_format = item
                            if not re.fullmatch(r"[a-f0-9]{40}", blob_sha):
                                raise ValueError(f"Malformed blob SHA: {branch} {path_name}")
                            v1 = _format_from_name(path_name, tax1)
                            expected_format = v1["id"] if v1 else _v1_unregistered(path_name)
                            if saved_format != expected_format:
                                raise ValueError(f"V1 format mismatch: {branch} {path_name}")
                            typ = _format_from_name(path_name, tax2)
                            if typ is None:
                                raise ValueError(f"V2 unclassified format: {branch} {path_name}")
                            raw_counts[saved_format] += 1
                            normalized_counts[typ["id"]] += 1
                            rows.append((snap, branch, path_name, blob_sha,
                                         size_bytes, mode, "UNREVIEWED"))
                            technical.append((snap, branch, path_name, blob_sha,
                                              typ["id"], typ["family"], typ["detectBy"],
                                              "NOT_PERFORMED", "UNREVIEWED"))
                        if len(rows) != record["fileCount"] or len(rows) != len(
                                {r[2] for r in rows}):
                            raise ValueError(f"Incomplete or duplicate branch files: {branch}")
                        if dict(raw_counts) != record["formatCounts"]:
                            raise ValueError(f"Raw format counts mismatch: {branch}")
                        branch_summary = summary_stats[branch]
                        if (branch_summary["headSha"] != target["headSha"]
                                or branch_summary["files"] != len(rows)
                                or dict(normalized_counts) != branch_summary["formatCounts"]):
                            raise ValueError(f"Normalized format counts mismatch: {branch}")
                        db.executemany(
                            "INSERT INTO files VALUES (?, ?, ?, ?, ?, ?, ?)", rows)
                        db.executemany(
                            "INSERT INTO file_technical_formats VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                            technical)
                        count_files += len(rows)
                        total_types.update(normalized_counts)
                if batch_count != len(manifest["batches"]) or len(manifest["batches"]) != 19:
                    raise ValueError("Incomplete batch coverage")
                if count_directories != summary["foldersAcrossBranches"] or count_directories != 17836:
                    raise ValueError("Aggregate directory count mismatch")
                if count_files != summary["filesAcrossBranches"] or count_files != 96689:
                    raise ValueError("Aggregate file count mismatch")
                if dict(total_types) != summary["formatCounts"]:
                    raise ValueError("Aggregate technical format counts mismatch")
                db.executemany(
                    "INSERT INTO verified_file_relations VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    _verified_file_relation_rows(root, idx, snap))
                db.execute(
                    "INSERT INTO checkpoints VALUES (?, ?, ?, ?, ?, ?)",
                    (checkpoint["checkpointId"], snap, checkpoint["recordedAt"],
                     checkpoint["status"], checkpoint["nextAction"],
                     json.dumps(checkpoint, sort_keys=True, ensure_ascii=False)))
            if db.execute("PRAGMA foreign_key_check").fetchall():
                raise ValueError("SQLite foreign key integrity failure")
            if db.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
                raise ValueError("SQLite database integrity failure")
            if db.execute("SELECT COUNT(*) FROM branches").fetchone()[0] != 190:
                raise ValueError("SQL branches count mismatch")
            if db.execute("SELECT COUNT(*) FROM file_technical_formats").fetchone()[0] != 96689:
                raise ValueError("SQL technical rows count mismatch")
            if db.execute("SELECT COUNT(*) FROM directories").fetchone()[0] != 17836:
                raise ValueError("SQL directory rows count mismatch")
    except BaseException:
        output.unlink(missing_ok=True)
        raise
    return {"database": str(output), "snapshot": snap, "branches": len(refs),
            "file_memberships": count_files, "technical_types": len(tax2["types"]),
            "batches": batch_count, "directories": count_directories, "integrity": "ok"}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parent)
    parser.add_argument("--output", type=Path, default=Path("architecture-registry.sqlite"))
    parser.add_argument("--mode", choices=("main", "all-branches"), default="main")
    args = parser.parse_args()
    fn = build_all_branches if args.mode == "all-branches" else build
    print(json.dumps(fn(args.root, args.output), indent=2, ensure_ascii=False))
