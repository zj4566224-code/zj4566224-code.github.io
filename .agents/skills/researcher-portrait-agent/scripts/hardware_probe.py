#!/usr/bin/env python3
"""Inspect local acceleration and Marker dependencies without changing the system."""

from __future__ import annotations

import argparse
import importlib.metadata
import json
import os
import platform
import shutil
import subprocess
import sys
from typing import Any


def package_version(*names: str) -> str | None:
    for name in names:
        try:
            return importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            continue
    return None


def nvidia_smi() -> dict[str, Any]:
    executable = shutil.which("nvidia-smi")
    result: dict[str, Any] = {"available": False, "path": executable, "gpus": [], "error": None}
    if not executable:
        return result
    command = [
        executable,
        "--query-gpu=name,driver_version,memory.total",
        "--format=csv,noheader,nounits",
    ]
    try:
        completed = subprocess.run(command, capture_output=True, text=True, timeout=15, check=True)
        result["available"] = True
        for line in completed.stdout.splitlines():
            parts = [part.strip() for part in line.split(",")]
            if len(parts) >= 3:
                result["gpus"].append(
                    {"name": parts[0], "driver_version": parts[1], "memory_mib": parts[2]}
                )
    except (OSError, subprocess.SubprocessError) as exc:
        result["error"] = str(exc)
    return result


def torch_status() -> dict[str, Any]:
    result: dict[str, Any] = {
        "installed": False,
        "version": package_version("torch"),
        "cuda_build": None,
        "cuda_available": False,
        "cuda_devices": [],
        "mps_available": False,
        "error": None,
    }
    try:
        import torch

        result["installed"] = True
        result["version"] = torch.__version__
        result["cuda_build"] = torch.version.cuda
        result["cuda_available"] = bool(torch.cuda.is_available())
        if result["cuda_available"]:
            for index in range(torch.cuda.device_count()):
                properties = torch.cuda.get_device_properties(index)
                result["cuda_devices"].append(
                    {
                        "index": index,
                        "name": torch.cuda.get_device_name(index),
                        "memory_mib": round(properties.total_memory / 1024 / 1024),
                        "capability": list(torch.cuda.get_device_capability(index)),
                    }
                )
        mps = getattr(torch.backends, "mps", None)
        result["mps_available"] = bool(mps and mps.is_available())
    except Exception as exc:
        result["error"] = str(exc)
    return result


def build_report() -> dict[str, Any]:
    nvidia = nvidia_smi()
    torch = torch_status()
    marker_version = package_version("marker-pdf", "marker_pdf")
    if torch["cuda_available"]:
        preferred = "cuda"
    elif torch["mps_available"]:
        preferred = "mps"
    else:
        preferred = "cpu"

    marker_ready = marker_version is not None and torch["installed"]
    accelerator_ready = marker_ready and preferred in {"cuda", "mps"}
    if nvidia["available"] and not torch["cuda_available"]:
        diagnosis = "nvidia-driver-visible-but-current-torch-cannot-use-cuda"
    elif preferred == "cuda":
        diagnosis = "cuda-ready"
    elif preferred == "mps":
        diagnosis = "apple-mps-ready"
    elif not torch["installed"]:
        diagnosis = "torch-not-installed"
    elif marker_version is None:
        diagnosis = "marker-not-installed"
    else:
        diagnosis = "cpu-only"

    recommendations = []
    if diagnosis == "nvidia-driver-visible-but-current-torch-cannot-use-cuda":
        recommendations.append(
            "Do not install a CUDA toolkit by GPU name alone. Create or repair a Conda environment using a PyTorch CUDA build supported by the installed NVIDIA driver and Marker version."
        )
    if not marker_ready:
        recommendations.append("Use the user's known-working Conda environment or install Marker and PyTorch there after explicit approval.")
    if preferred == "cpu":
        recommendations.append("Ask the user to choose CPU Marker conversion or direct PDF analysis before processing the corpus.")
    recommendations.append("Run one representative PDF before starting a large batch.")

    return {
        "schema_version": 1,
        "platform": {
            "system": platform.system(),
            "release": platform.release(),
            "machine": platform.machine(),
            "python": sys.version.split()[0],
            "executable": sys.executable,
            "conda_environment": os.environ.get("CONDA_DEFAULT_ENV"),
            "conda_prefix": os.environ.get("CONDA_PREFIX"),
        },
        "nvidia_smi": nvidia,
        "torch": torch,
        "marker": {"installed": marker_version is not None, "version": marker_version},
        "preferred_device": preferred,
        "marker_ready": marker_ready,
        "accelerator_ready": accelerator_ready,
        "diagnosis": diagnosis,
        "recommendations": recommendations,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", help="Optional JSON output path")
    args = parser.parse_args()
    report = build_report()
    rendered = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        output = os.path.abspath(os.path.expanduser(args.output))
        os.makedirs(os.path.dirname(output), exist_ok=True)
        with open(output, "w", encoding="utf-8") as handle:
            handle.write(rendered)
    print(rendered, end="")


if __name__ == "__main__":
    main()
