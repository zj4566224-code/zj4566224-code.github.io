# Hardware and fallback routing

Run `scripts/hardware_probe.py` in the exact environment intended to run Marker. Hardware visible to another Python or another machine is irrelevant.

## Decision table

| Probe result | Action |
|---|---|
| `cuda-ready` | Run one Marker PDF with `--device cuda`, inspect output, then batch. |
| `apple-mps-ready` | Run one Marker PDF with `--device mps`; fall back if the installed Marker release does not support it. |
| `nvidia-driver-visible-but-current-torch-cannot-use-cuda` | Do not install CUDA automatically. Explain that the NVIDIA driver is visible but the current PyTorch build/environment is incompatible. Ask before repairing or creating a Conda environment. |
| `cpu-only` | Ask the user to choose CPU Marker or direct PDF analysis. |
| `torch-not-installed` / `marker-not-installed` | Prefer the user's known-working Conda environment. Ask before installing anything. |

## Why not download CUDA by GPU model

CUDA compatibility depends on the NVIDIA driver, operating system, Python version, PyTorch build, Marker version, and compute capability. Modern PyTorch Conda/pip builds usually include the CUDA runtime they need; a separately installed CUDA Toolkit is often unnecessary. AMD and Apple GPUs cannot use NVIDIA CUDA.

Never mutate a working environment solely because `nvidia-smi` reports a CUDA version. If installation is approved, use the current official PyTorch compatibility selector and Marker requirements, create a separate environment, and retain the old environment for rollback.

## CPU Marker option

State clearly that model loading and page conversion may be much slower. Convert one representative PDF, record elapsed time, validate Markdown quality, and extrapolate cautiously before starting the batch. Preserve completed outputs for resume.

## Direct PDF option

Record the choice with `corpus.py select-direct-pdf`. Use the PDF skill to combine text extraction and visual page inspection. Do not pretend OCR occurred. In every resulting card:

- add a note that direct PDF analysis was used;
- set content confidence to `medium` or `low`;
- avoid verbatim abstract text when extraction is unreliable;
- identify missing tables, equations, figures, or scanned pages as limitations.

Direct analysis is reasonable for digitally generated PDFs with clean text layers. It is a poor fallback for scans, complex equations, multi-column reading order, or image-heavy papers.
