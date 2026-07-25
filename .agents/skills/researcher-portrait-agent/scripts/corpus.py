#!/usr/bin/env python3
"""Resumable corpus inventory, conversion, card validation, and report assembly."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SCHEMA_VERSION = 1
PAPER_TYPES = {"empirical", "theoretical", "methodological", "review", "essay-commentary"}
CONFIDENCE = {"high", "medium", "low"}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def slugify(value: str) -> str:
    ascii_part = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    if not ascii_part:
        ascii_part = "paper"
    return ascii_part[:48]


def normalized_stem(path: Path) -> str:
    value = path.stem.casefold()
    value = re.sub(r"^[12][0-9]{3}[\s_.-]+", "", value)
    return re.sub(r"[^\w]+", "", value, flags=re.UNICODE)


def title_key(value: str) -> str:
    return re.sub(r"[^\w]+", "", value.casefold(), flags=re.UNICODE)


def year_guess(name: str) -> int | None:
    match = re.search(r"(?<!\d)((?:19|20)\d{2})(?!\d)", name)
    return int(match.group(1)) if match else None


def atomic_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(path)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def inside(path: Path, parent: Path) -> bool:
    try:
        path.resolve().relative_to(parent.resolve())
        return True
    except ValueError:
        return False


def discover(source_dir: Path, run_dir: Path) -> tuple[list[Path], list[Path]]:
    pdfs: list[Path] = []
    markdown: list[Path] = []
    for path in source_dir.rglob("*"):
        if not path.is_file() or inside(path, run_dir):
            continue
        suffix = path.suffix.casefold()
        if suffix == ".pdf":
            pdfs.append(path.resolve())
        elif suffix in {".md", ".markdown"}:
            markdown.append(path.resolve())
    return sorted(pdfs), sorted(markdown)


def pair_sources(pdfs: list[Path], markdown: list[Path]) -> list[tuple[Path | None, Path | None]]:
    pdf_by_key: dict[str, list[Path]] = {}
    md_by_key: dict[str, list[Path]] = {}
    for path in pdfs:
        pdf_by_key.setdefault(normalized_stem(path), []).append(path)
    for path in markdown:
        md_by_key.setdefault(normalized_stem(path), []).append(path)

    pairs: list[tuple[Path | None, Path | None]] = []
    for key in sorted(set(pdf_by_key) | set(md_by_key)):
        key_pdfs = pdf_by_key.get(key, [])
        key_md = md_by_key.get(key, [])
        while key_pdfs and key_md:
            pairs.append((key_pdfs.pop(0), key_md.pop(0)))
        pairs.extend((path, None) for path in key_pdfs)
        pairs.extend((None, path) for path in key_md)
    return pairs


def paper_id(pdf: Path | None, markdown: Path | None) -> str:
    # Anchor IDs to the PDF when present so adding converter output never renames a paper.
    primary = pdf or markdown
    assert primary is not None
    suffix = hashlib.sha1(str(primary).encode("utf-8")).hexdigest()[:8]
    return f"{slugify(primary.stem)}-{suffix}"


def write_inventory(manifest: dict[str, Any], path: Path) -> None:
    rows = [
        f"# Corpus inventory: {manifest['author']}",
        "",
        f"Generated: {manifest['updated_at']}",
        "",
        "| # | Include | Year | Title guess | Source mode | PDF | Card |",
        "|---:|:---:|---:|---|---|:---:|:---:|",
    ]
    for index, paper in enumerate(manifest["papers"], 1):
        title = paper["title_guess"].replace("|", "\\|")
        rows.append(
            f"| {index} | {'yes' if paper['include'] else 'no'} | "
            f"{paper['year_guess'] or '?'} | {title} | {paper['state']} | "
            f"{'yes' if paper.get('pdf_path') else 'no'} | {paper.get('card_status', 'missing')} |"
        )
    rows += [
        "",
        "Review likely preprint/published duplicates before card generation. Set `include` to false and add an `exclusion_reason` in manifest.json for excluded versions.",
    ]
    path.write_text("\n".join(rows) + "\n", encoding="utf-8")


def inventory(args: argparse.Namespace) -> None:
    source_dir = Path(args.source_dir).expanduser().resolve()
    run_dir = Path(args.run_dir).expanduser().resolve()
    if not source_dir.is_dir():
        raise SystemExit(f"Source directory does not exist: {source_dir}")
    run_dir.mkdir(parents=True, exist_ok=True)
    for subdir in ("cards", "markdown", "synthesis/packets"):
        (run_dir / subdir).mkdir(parents=True, exist_ok=True)

    manifest_path = run_dir / "manifest.json"
    old_by_id: dict[str, dict[str, Any]] = {}
    created_at = utc_now()
    if manifest_path.exists():
        old = load_json(manifest_path)
        old_by_id = {paper["id"]: paper for paper in old.get("papers", [])}
        created_at = old.get("created_at", created_at)

    pdfs, markdown = discover(source_dir, run_dir)
    generated_markdown = sorted((run_dir / "markdown").rglob("*.md"))
    markdown = sorted(set(markdown + [path.resolve() for path in generated_markdown]))
    papers: list[dict[str, Any]] = []

    for pdf, md in pair_sources(pdfs, markdown):
        pid = paper_id(pdf, md)
        primary = md or pdf
        assert primary is not None
        source_hash = sha256_file(primary)
        old_paper = old_by_id.get(pid, {})
        old_hash = old_paper.get("source_sha256")
        card_status = old_paper.get("card_status", "missing") if old_hash == source_hash else "stale"
        if md:
            state = "markdown_ready"
        elif old_hash == source_hash and old_paper.get("state") == "pdf_direct":
            state = "pdf_direct"
        else:
            state = "needs_conversion"
        record = {
            "id": pid,
            "title_guess": primary.stem,
            "year_guess": year_guess(primary.name),
            "pdf_path": str(pdf) if pdf else None,
            "markdown_path": str(md) if md else None,
            "source_sha256": source_hash,
            "state": state,
            "include": old_paper.get("include", True),
            "exclusion_reason": old_paper.get("exclusion_reason"),
            "card_path": str(run_dir / "cards" / f"{pid}.json"),
            "card_status": card_status,
        }
        papers.append(record)

    papers.sort(key=lambda p: (p["year_guess"] is None, p["year_guess"] or 9999, p["title_guess"].casefold()))
    manifest = {
        "schema_version": SCHEMA_VERSION,
        "author": args.author,
        "source_dir": str(source_dir),
        "run_dir": str(run_dir),
        "created_at": created_at,
        "updated_at": utc_now(),
        "papers": papers,
    }
    atomic_json(manifest_path, manifest)
    write_inventory(manifest, run_dir / "inventory.md")
    print(f"Inventory: {len(papers)} papers ({len(pdfs)} PDFs, {len(markdown)} Markdown files)")
    print(manifest_path)


def substitute(command: list[str], values: dict[str, str]) -> list[str]:
    result = []
    for item in command:
        for key, value in values.items():
            item = item.replace("{" + key + "}", value)
        result.append(item)
    return result


def convert(args: argparse.Namespace) -> None:
    manifest_path = Path(args.manifest).resolve()
    manifest = load_json(manifest_path)
    config = load_json(Path(args.config).resolve())
    mode = config.get("mode")
    command = config.get("command")
    if mode not in {"per_file", "batch"} or not isinstance(command, list) or not all(isinstance(v, str) for v in command):
        raise SystemExit("converter.json requires mode=per_file|batch and command as a string array")
    timeout = int(config.get("timeout_seconds", 1800))
    env = os.environ.copy()
    env_update = config.get("environment", {})
    if not isinstance(env_update, dict) or not all(isinstance(k, str) and isinstance(v, str) for k, v in env_update.items()):
        raise SystemExit("converter environment must be a string-to-string object")
    env.update(env_update)
    run_dir = Path(manifest["run_dir"])
    output_dir = run_dir / "markdown"
    output_dir.mkdir(parents=True, exist_ok=True)

    pending = [paper for paper in manifest["papers"] if paper["include"] and paper["state"] == "needs_conversion"]
    if mode == "batch":
        cmd = substitute(command, {"input_dir": manifest["source_dir"], "output_dir": str(output_dir)})
        print("Running batch converter:", json.dumps(cmd, ensure_ascii=False))
        subprocess.run(cmd, check=True, timeout=timeout, env=env)
    else:
        for index, paper in enumerate(pending, 1):
            pdf_path = Path(paper["pdf_path"])
            output_path = output_dir / f"{pdf_path.stem}.md"
            cmd = substitute(command, {"input": str(pdf_path), "output": str(output_path)})
            print(f"[{index}/{len(pending)}] {pdf_path.name}")
            subprocess.run(cmd, check=True, timeout=timeout, env=env)
            if not output_path.exists() or output_path.stat().st_size < 100:
                raise SystemExit(f"Converter did not create usable Markdown: {output_path}")

    generated = list(output_dir.rglob("*.md"))
    by_key: dict[str, list[Path]] = {}
    for path in generated:
        by_key.setdefault(normalized_stem(path), []).append(path.resolve())
    matched = 0
    for paper in pending:
        pdf_path = Path(paper["pdf_path"])
        candidates = by_key.get(normalized_stem(pdf_path), [])
        if len(candidates) == 1 and candidates[0].stat().st_size >= 100:
            md_path = candidates[0]
            paper["markdown_path"] = str(md_path)
            paper["source_sha256"] = sha256_file(md_path)
            paper["state"] = "markdown_ready"
            paper["card_status"] = "stale"
            matched += 1
    manifest["updated_at"] = utc_now()
    atomic_json(manifest_path, manifest)
    write_inventory(manifest, run_dir / "inventory.md")
    print(f"Converted and matched: {matched}/{len(pending)}")


def select_direct_pdf(args: argparse.Namespace) -> None:
    manifest_path = Path(args.manifest).resolve()
    manifest = load_json(manifest_path)
    selected_ids = set(args.paper_id or [])
    changed = 0
    for paper in manifest["papers"]:
        selected = args.all or paper["id"] in selected_ids
        if not selected or not paper["include"]:
            continue
        if not paper.get("pdf_path"):
            raise SystemExit(f"Direct PDF mode requires a PDF source: {paper['id']}")
        if paper["state"] == "markdown_ready":
            raise SystemExit(f"Paper already has Markdown; do not downgrade it: {paper['id']}")
        paper["state"] = "pdf_direct"
        if paper.get("card_status") == "valid":
            paper["card_status"] = "stale"
        changed += 1
    if not changed:
        raise SystemExit("No papers selected for direct PDF mode")
    manifest["updated_at"] = utc_now()
    atomic_json(manifest_path, manifest)
    write_inventory(manifest, Path(manifest["run_dir"]) / "inventory.md")
    print(f"Direct PDF mode selected for {changed} paper(s)")


def nonempty(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def validate_card(card: Any, paper: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if not isinstance(card, dict):
        return ["card root must be an object"]
    if card.get("schema_version") != SCHEMA_VERSION:
        errors.append(f"schema_version must be {SCHEMA_VERSION}")
    if card.get("paper_id") != paper["id"]:
        errors.append("paper_id does not match manifest")
    if card.get("source_sha256") != paper["source_sha256"]:
        errors.append("source_sha256 does not match current source")

    bibliography = card.get("bibliography")
    if not isinstance(bibliography, dict):
        errors.append("bibliography must be an object")
    else:
        if not nonempty(bibliography.get("title")):
            errors.append("bibliography.title is required")
        authors = bibliography.get("authors")
        if not isinstance(authors, list) or not authors or not all(nonempty(v) for v in authors):
            errors.append("bibliography.authors must be a non-empty string array")
        year = bibliography.get("year")
        if year is not None and (not isinstance(year, int) or not 1800 <= year <= 2100):
            errors.append("bibliography.year must be null or an integer from 1800 to 2100")
        for key in ("venue", "doi"):
            if bibliography.get(key) is not None and not nonempty(bibliography.get(key)):
                errors.append(f"bibliography.{key} must be null or a non-empty string")

    if card.get("paper_type") not in PAPER_TYPES:
        errors.append("paper_type is invalid")
    if card.get("abstract_original") is not None and not nonempty(card.get("abstract_original")):
        errors.append("abstract_original must be null or non-empty")
    for key in ("abstract_zh", "core_question_zh"):
        if not nonempty(card.get(key)):
            errors.append(f"{key} is required")

    claims = card.get("core_claims")
    if not isinstance(claims, list) or not claims:
        errors.append("core_claims must contain at least one claim")
    else:
        for index, claim in enumerate(claims):
            if not isinstance(claim, dict) or not all(nonempty(claim.get(k)) for k in ("claim_zh", "evidence_zh", "locator")):
                errors.append(f"core_claims[{index}] requires claim_zh, evidence_zh, and locator")

    chain = card.get("argument_chain_zh")
    if not isinstance(chain, list) or len(chain) < 4 or not all(nonempty(v) for v in chain):
        errors.append("argument_chain_zh must contain at least four non-empty steps")
    method = card.get("method")
    method_keys = ("design_zh", "data_zh", "sample_zh", "identification_or_model_zh")
    if not isinstance(method, dict) or not all(nonempty(method.get(k)) for k in method_keys):
        errors.append("method requires design_zh, data_zh, sample_zh, and identification_or_model_zh")
    type_specific = card.get("type_specific")
    if not isinstance(type_specific, dict) or not all(nonempty(type_specific.get(k)) for k in ("label_zh", "content_zh")):
        errors.append("type_specific requires label_zh and content_zh")

    limitations = card.get("limitations_zh")
    if not isinstance(limitations, list) or not limitations or not all(nonempty(v) for v in limitations):
        errors.append("limitations_zh must contain at least one item")
    keywords = card.get("keywords")
    if not isinstance(keywords, list) or len(keywords) < 2 or not all(nonempty(v) for v in keywords):
        errors.append("keywords must contain at least two items")
    confidence = card.get("confidence")
    if not isinstance(confidence, dict) or confidence.get("bibliography") not in CONFIDENCE or confidence.get("content") not in CONFIDENCE:
        errors.append("confidence requires bibliography/content values of high, medium, or low")
    notes = card.get("notes")
    if not isinstance(notes, list) or not all(nonempty(v) for v in notes):
        errors.append("notes must be a string array")
    if paper.get("state") == "pdf_direct":
        if not notes:
            errors.append("pdf_direct cards must disclose the direct-PDF fallback in notes")
        if isinstance(confidence, dict) and confidence.get("content") == "high":
            errors.append("pdf_direct cards cannot claim high content confidence")
    return errors


def validate(args: argparse.Namespace) -> None:
    manifest_path = Path(args.manifest).resolve()
    manifest = load_json(manifest_path)
    failures = 0
    title_seen: dict[str, str] = {}
    doi_seen: dict[str, str] = {}
    warnings: list[str] = []
    for paper in manifest["papers"]:
        if not paper["include"]:
            paper["card_status"] = "excluded"
            continue
        card_path = Path(paper["card_path"])
        if not card_path.exists():
            paper["card_status"] = "missing"
            print(f"FAIL {paper['id']}: card missing")
            failures += 1
            continue
        try:
            card = load_json(card_path)
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            paper["card_status"] = "invalid"
            print(f"FAIL {paper['id']}: invalid JSON: {exc}")
            failures += 1
            continue
        errors = validate_card(card, paper)
        if errors:
            paper["card_status"] = "invalid"
            failures += 1
            for error in errors:
                print(f"FAIL {paper['id']}: {error}")
            continue
        paper["card_status"] = "valid"
        bibliography = card["bibliography"]
        normalized_title = title_key(bibliography["title"])
        if normalized_title in title_seen:
            warnings.append(f"duplicate title: {title_seen[normalized_title]} and {paper['id']}")
        title_seen[normalized_title] = paper["id"]
        doi = bibliography.get("doi")
        if doi:
            doi_key = doi.casefold().removeprefix("https://doi.org/").removeprefix("doi:")
            if doi_key in doi_seen:
                warnings.append(f"duplicate DOI: {doi_seen[doi_key]} and {paper['id']}")
            doi_seen[doi_key] = paper["id"]

    manifest["updated_at"] = utc_now()
    atomic_json(manifest_path, manifest)
    write_inventory(manifest, Path(manifest["run_dir"]) / "inventory.md")
    for warning in warnings:
        print("WARN", warning)
    valid = sum(p.get("card_status") == "valid" for p in manifest["papers"])
    print(f"Validation: {valid} valid, {failures} failed, {len(warnings)} warnings")
    if failures:
        raise SystemExit(1)


def sorted_valid_cards(manifest: dict[str, Any], require_all: bool = True) -> list[tuple[dict[str, Any], dict[str, Any]]]:
    result = []
    missing = []
    for paper in manifest["papers"]:
        if not paper["include"]:
            continue
        if paper.get("card_status") != "valid" or not Path(paper["card_path"]).exists():
            missing.append(paper["id"])
            continue
        result.append((paper, load_json(Path(paper["card_path"]))))
    if missing and require_all:
        raise SystemExit("Cards must validate before synthesis: " + ", ".join(missing))
    result.sort(key=lambda pair: (
        pair[1]["bibliography"].get("year") is None,
        pair[1]["bibliography"].get("year") or 9999,
        pair[1]["bibliography"]["title"].casefold(),
    ))
    return result


def render_card(card: dict[str, Any]) -> str:
    bibliography = card["bibliography"]
    year = bibliography.get("year") or "年份待确认"
    authors = ", ".join(bibliography["authors"])
    venue = bibliography.get("venue") or "未确认"
    doi = bibliography.get("doi") or "未确认"
    claims = "\n".join(
        f"- **观点**：{item['claim_zh']}  \n  **论据**：{item['evidence_zh']}  \n  **定位**：{item['locator']}"
        for item in card["core_claims"]
    )
    chain = "\n".join(f"{index}. {item}" for index, item in enumerate(card["argument_chain_zh"], 1))
    limitations = "\n".join(f"- {item}" for item in card["limitations_zh"])
    notes = "\n".join(f"- {item}" for item in card["notes"]) if card["notes"] else "- 无"
    abstract_original = card["abstract_original"] or "原文中未可靠识别。"
    return f"""### {year} - {bibliography['title']}

**论文 ID**：`{card['paper_id']}`  
**作者**：{authors}  
**类型**：{card['paper_type']}  
**期刊/来源**：{venue}  
**DOI**：{doi}

**核心问题**：{card['core_question_zh']}

**Abstract（原文）**：{abstract_original}

**Abstract（中文）**：{card['abstract_zh']}

**核心观点与论据**：

{claims}

**论证链条**：

{chain}

**研究设计**：{card['method']['design_zh']}  
**数据**：{card['method']['data_zh']}  
**样本**：{card['method']['sample_zh']}  
**识别/模型**：{card['method']['identification_or_model_zh']}

**{card['type_specific']['label_zh']}**：{card['type_specific']['content_zh']}

**局限与边界**：

{limitations}

**关键词**：{', '.join(card['keywords'])}  
**置信度**：书目信息 {card['confidence']['bibliography']}；内容 {card['confidence']['content']}

**备注**：

{notes}

---
"""


def render_cards(args: argparse.Namespace) -> None:
    manifest = load_json(Path(args.manifest).resolve())
    cards = sorted_valid_cards(manifest, require_all=False)
    run_dir = Path(manifest["run_dir"])
    sections = [
        "# 论文卡片",
        "",
        f"作者：{manifest['author']}  ",
        f"已验证论文：{len(cards)} 篇",
        "",
    ]
    index_rows = ["# 论文卡片索引", "", "| 年份 | 标题 | 论文 ID | 类型 |", "|---:|---|---|---|"]
    for _, card in cards:
        bibliography = card["bibliography"]
        escaped_title = bibliography["title"].replace("|", "\\|")
        index_rows.append(
            f"| {bibliography.get('year') or '?'} | {escaped_title} | "
            f"`{card['paper_id']}` | {card['paper_type']} |"
        )
        sections.append(render_card(card))
    (run_dir / "paper_cards.md").write_text("\n".join(sections), encoding="utf-8")
    (run_dir / "cards" / "index.md").write_text("\n".join(index_rows) + "\n", encoding="utf-8")
    print(f"Rendered {len(cards)} cards: {run_dir / 'paper_cards.md'}")


def make_packets(args: argparse.Namespace) -> None:
    manifest = load_json(Path(args.manifest).resolve())
    cards = sorted_valid_cards(manifest)
    packet_size = args.packet_size
    if packet_size < 1 or packet_size > 20:
        raise SystemExit("packet-size must be between 1 and 20")
    packet_dir = Path(manifest["run_dir"]) / "synthesis" / "packets"
    packet_dir.mkdir(parents=True, exist_ok=True)
    for offset in range(0, len(cards), packet_size):
        packet_no = offset // packet_size + 1
        chunk = cards[offset : offset + packet_size]
        lines = [f"# Synthesis packet {packet_no:03d}", ""]
        for _, card in chunk:
            bibliography = card["bibliography"]
            lines += [
                f"## {bibliography.get('year') or '?'} - {bibliography['title']}",
                "",
                f"- ID: `{card['paper_id']}`",
                f"- Type: {card['paper_type']}",
                f"- Question: {card['core_question_zh']}",
                f"- Claims: {' | '.join(item['claim_zh'] for item in card['core_claims'])}",
                f"- Method: {card['method']['design_zh']}; {card['method']['identification_or_model_zh']}",
                f"- Keywords: {', '.join(card['keywords'])}",
                f"- Limits: {' | '.join(card['limitations_zh'])}",
                "",
            ]
        output = packet_dir / f"packet-{packet_no:03d}.md"
        output.write_text("\n".join(lines), encoding="utf-8")
        print(output)


def assemble(args: argparse.Namespace) -> None:
    manifest = load_json(Path(args.manifest).resolve())
    cards = sorted_valid_cards(manifest)
    portrait_path = Path(args.portrait).resolve()
    if not portrait_path.exists():
        raise SystemExit(f"Portrait not found: {portrait_path}")
    portrait = portrait_path.read_text(encoding="utf-8").strip()
    years = [card["bibliography"]["year"] for _, card in cards if card["bibliography"].get("year")]
    year_range = f"{min(years)}-{max(years)}" if years else "年份待确认"
    excluded = [paper for paper in manifest["papers"] if not paper["include"]]
    report = [
        f"# {manifest['author']} 学术研究画像与论文卡片",
        "",
        f"收录论文：{len(cards)} 篇  ",
        f"时间范围：{year_range}  ",
        f"排除版本：{len(excluded)} 个  ",
        f"生成时间：{datetime.now().astimezone().strftime('%Y-%m-%d')}",
        "",
        "---",
        "",
        "## 第一部分：作者研究画像",
        "",
        portrait,
        "",
        "---",
        "",
        "## 第二部分：逐篇论文卡片",
        "",
    ]
    report.extend(render_card(card) for _, card in cards)
    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\n".join(report).rstrip() + "\n", encoding="utf-8")
    print(output)


def status(args: argparse.Namespace) -> None:
    manifest = load_json(Path(args.manifest).resolve())
    included = [paper for paper in manifest["papers"] if paper["include"]]
    summary = {
        "author": manifest["author"],
        "papers_total": len(manifest["papers"]),
        "papers_included": len(included),
        "papers_excluded": len(manifest["papers"]) - len(included),
        "needs_conversion": sum(p["state"] == "needs_conversion" for p in included),
        "markdown_ready": sum(p["state"] == "markdown_ready" for p in included),
        "pdf_direct": sum(p["state"] == "pdf_direct" for p in included),
        "cards_valid": sum(p.get("card_status") == "valid" for p in included),
        "cards_invalid": sum(p.get("card_status") == "invalid" for p in included),
        "cards_missing_or_stale": sum(p.get("card_status") in {"missing", "stale"} for p in included),
        "run_dir": manifest["run_dir"],
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description=__doc__)
    commands = root.add_subparsers(dest="command", required=True)

    command = commands.add_parser("inventory", help="scan PDFs/Markdown and create or refresh a manifest")
    command.add_argument("--source-dir", required=True)
    command.add_argument("--run-dir", required=True)
    command.add_argument("--author", required=True)
    command.set_defaults(func=inventory)

    command = commands.add_parser("convert", help="run the configured existing PDF-to-Markdown converter")
    command.add_argument("--manifest", required=True)
    command.add_argument("--config", required=True)
    command.set_defaults(func=convert)

    command = commands.add_parser("status", help="show resumable pipeline status")
    command.add_argument("--manifest", required=True)
    command.set_defaults(func=status)

    command = commands.add_parser("select-direct-pdf", help="record the user's choice to analyze PDFs without OCR")
    command.add_argument("--manifest", required=True)
    selection = command.add_mutually_exclusive_group(required=True)
    selection.add_argument("--all", action="store_true")
    selection.add_argument("--paper-id", action="append")
    command.set_defaults(func=select_direct_pdf)

    command = commands.add_parser("validate", help="validate all included paper cards")
    command.add_argument("--manifest", required=True)
    command.set_defaults(func=validate)

    command = commands.add_parser("render-cards", help="render valid JSON cards to Markdown")
    command.add_argument("--manifest", required=True)
    command.set_defaults(func=render_cards)

    command = commands.add_parser("make-packets", help="make bounded context packets for portrait synthesis")
    command.add_argument("--manifest", required=True)
    command.add_argument("--packet-size", type=int, default=8)
    command.set_defaults(func=make_packets)

    command = commands.add_parser("assemble", help="assemble portrait and cards into one Markdown report")
    command.add_argument("--manifest", required=True)
    command.add_argument("--portrait", required=True)
    command.add_argument("--output", required=True)
    command.set_defaults(func=assemble)
    return root


def main() -> None:
    args = parser().parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
