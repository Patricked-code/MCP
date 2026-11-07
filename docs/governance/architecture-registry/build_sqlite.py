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


def build(root: Path, output: Path) -> dict:
    index = read_json(root / "index.json")
    links = index["files"]
    branch_catalog = read_json(root / links["branchHeads"])
    tree_summary = read_json(root / links["mainSummary"])
    relationships = read_json(root / links["componentLinks"])
    source_catalog = read_json(root / links["sourceReferences"])
    checkpoint = read_json(root / links["checkpoint"])
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
                    "INSERT INTO files VALUES (?, ?, ?, ?, ?, ?, ?)", file_rows)
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
            "main_files": len(file_rows), "components": len(relationships["components"]),
            "relations": len(relationships["relations"]), "sources": len(source_catalog["records"]),
            "integrity": "ok"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parent)
    parser.add_argument("--output", type=Path, default=Path("architecture-registry.sqlite"))
    args = parser.parse_args()
    print(json.dumps(build(args.root, args.output), indent=2, ensure_ascii=False))
