#!/usr/bin/env python3
"""Convert one PDF or a directory of PDFs to Markdown with Marker."""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import traceback
from pathlib import Path
from typing import Any


def choose_device(requested: str) -> tuple[str, dict[str, Any]]:
    try:
        import torch
    except ImportError as exc:
        raise RuntimeError("PyTorch is not installed in this Python environment") from exc

    capabilities = {
        "cuda": bool(torch.cuda.is_available()),
        "mps": bool(getattr(torch.backends, "mps", None) and torch.backends.mps.is_available()),
        "cpu": True,
    }
    if requested == "auto":
        selected = "cuda" if capabilities["cuda"] else "mps" if capabilities["mps"] else "cpu"
    else:
        selected = requested
    if not capabilities[selected]:
        raise RuntimeError(f"Requested device '{selected}' is not available: {capabilities}")
    return selected, capabilities


def output_pairs(args: argparse.Namespace) -> list[tuple[Path, Path]]:
    if args.input:
        input_path = Path(args.input).expanduser().resolve()
        output_path = Path(args.output).expanduser().resolve()
        if not input_path.is_file() or input_path.suffix.casefold() != ".pdf":
            raise RuntimeError(f"Input must be a PDF file: {input_path}")
        return [(input_path, output_path)]

    input_dir = Path(args.input_dir).expanduser().resolve()
    output_dir = Path(args.output_dir).expanduser().resolve()
    if not input_dir.is_dir():
        raise RuntimeError(f"Input directory not found: {input_dir}")
    pdfs = sorted(path for path in input_dir.rglob("*") if path.is_file() and path.suffix.casefold() == ".pdf")
    if not pdfs:
        raise RuntimeError(f"No PDF files found in: {input_dir}")
    return [(path, output_dir / f"{path.stem}.md") for path in pdfs]


def write_status(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(path)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--input", help="One PDF file")
    source.add_argument("--input-dir", help="Directory containing PDFs")
    parser.add_argument("--output", help="Markdown output for --input")
    parser.add_argument("--output-dir", help="Markdown directory for --input-dir")
    parser.add_argument("--device", choices=("auto", "cuda", "mps", "cpu"), default="auto")
    parser.add_argument("--overwrite", action="store_true")
    parser.add_argument("--status", help="Optional JSON status file")
    args = parser.parse_args()
    if bool(args.input) != bool(args.output) or bool(args.input_dir) != bool(args.output_dir):
        parser.error("--input requires --output; --input-dir requires --output-dir")

    started = time.time()
    status_path = Path(args.status).expanduser().resolve() if args.status else None
    status: dict[str, Any] = {"state": "starting", "started_at_epoch": started, "files": []}
    try:
        device, capabilities = choose_device(args.device)
        status.update({"device": device, "capabilities": capabilities, "state": "loading_model"})
        if status_path:
            write_status(status_path, status)

        # Marker reads TORCH_DEVICE during import/configuration in supported releases.
        os.environ["TORCH_DEVICE"] = device
        from marker.converters.pdf import PdfConverter
        from marker.models import create_model_dict

        converter = PdfConverter(artifact_dict=create_model_dict())
        pairs = output_pairs(args)
        status["state"] = "converting"
        for index, (input_path, output_path) in enumerate(pairs, 1):
            item = {"input": str(input_path), "output": str(output_path), "state": "running"}
            status["files"].append(item)
            if status_path:
                write_status(status_path, status)
            if output_path.exists() and not args.overwrite:
                item["state"] = "skipped_existing"
                continue
            print(f"[{index}/{len(pairs)}] {input_path.name}", flush=True)
            try:
                rendered = converter(str(input_path))
                markdown = getattr(rendered, "markdown", None)
                if not isinstance(markdown, str) or len(markdown.strip()) < 100:
                    raise RuntimeError("Marker returned empty or implausibly short Markdown")
                output_path.parent.mkdir(parents=True, exist_ok=True)
                temp = output_path.with_suffix(output_path.suffix + ".tmp")
                temp.write_text(markdown, encoding="utf-8")
                temp.replace(output_path)
                item.update({"state": "complete", "characters": len(markdown)})
            except Exception as exc:
                item.update({"state": "failed", "error": str(exc)})
            if status_path:
                write_status(status_path, status)

        failed = sum(item["state"] == "failed" for item in status["files"])
        status.update(
            {
                "state": "failed" if failed else "complete",
                "failed_files": failed,
                "elapsed_seconds": round(time.time() - started, 2),
            }
        )
        if status_path:
            write_status(status_path, status)
        if failed:
            raise SystemExit(1)
    except Exception as exc:
        status.update(
            {
                "state": "failed",
                "error": str(exc),
                "traceback": traceback.format_exc(),
                "elapsed_seconds": round(time.time() - started, 2),
            }
        )
        if status_path:
            write_status(status_path, status)
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
