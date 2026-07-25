# Researcher Portrait Agent

This repository includes a reusable Codex skill for turning a scholar's paper corpus into an evidence-grounded research portrait.

## Package

- Skill entrypoint: [`../.agents/skills/researcher-portrait-agent/SKILL.md`](../.agents/skills/researcher-portrait-agent/SKILL.md)
- Workflow guide: [`学者论文画像Agent_完整工作流程.docx`](学者论文画像Agent_完整工作流程.docx)
- Original paper-card skill archive: [`../.agents/skills/researcher-portrait-agent/original-skills/paper-cards-2.skill`](../.agents/skills/researcher-portrait-agent/original-skills/paper-cards-2.skill)
- Original portrait skill archive: [`../.agents/skills/researcher-portrait-agent/original-skills/portrait-synthesizer-2.skill`](../.agents/skills/researcher-portrait-agent/original-skills/portrait-synthesizer-2.skill)

## What it does

1. Inventories PDFs and Markdown files into a resumable manifest.
2. Probes the actual Marker environment for CUDA, Apple MPS, or CPU support.
3. Routes PDF conversion through Marker or an explicitly selected direct-PDF fallback.
4. Creates and validates one traceable JSON card per paper.
5. Synthesizes research stages and an author portrait from validated cards.
6. Assembles the portrait and full card appendix into Markdown and PDF.

The skill does not silently install CUDA, replace PyTorch, download model weights, or treat direct PDF analysis as equivalent to OCR-converted Markdown. CPU and direct-PDF routes require an explicit user choice where the workflow describes it.

## Main scripts

- `scripts/hardware_probe.py`: hardware and runtime detection
- `scripts/marker_worker.py`: single-paper and batch Marker conversion worker
- `scripts/corpus.py`: inventory, conversion, validation, packet creation, card rendering, and assembly
- `scripts/render_pdf.py`: Markdown-to-PDF rendering

The original `paper-cards-2.skill` and `portrait-synthesizer-2.skill` archives are preserved unchanged under `original-skills/`; the integrated skill adds the corpus, hardware-routing, resumability, and export workflow around them.
