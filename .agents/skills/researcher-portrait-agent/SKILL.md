---
name: researcher-portrait-agent
description: Build an evidence-grounded research portrait from a scholar's corpus of academic PDFs or OCR-converted Markdown files. Use when Codex needs to inventory dozens of papers, detect local GPU/CPU capabilities, route conversion through Marker in a Conda environment or a direct-PDF fallback, create one validated structured card per paper, identify chronological research stages, synthesize an author portrait, and export the portrait plus all cards as one verified PDF. Also use to resume or audit a partially completed corpus run.
---

# Researcher Portrait Agent

Turn a large paper corpus into resumable, traceable artifacts instead of one long chat response. Keep one JSON card per paper as the factual source of truth; render Markdown and PDF only after validation.

## Required inputs

Obtain:

- the scholar's name;
- a source directory containing PDFs, Markdown files, or both;
- the existing converter script's exact command-line interface when PDFs still need conversion;
- the Conda environment name or Python executable for an existing Marker installation, when available;
- the desired output language, defaulting to Chinese.

Do not guess converter flags. If Markdown already exists, skip conversion. Do not require a manual inventory confirmation unless unresolved duplicates or ambiguous authorship would materially change the corpus.

## 1. Initialize or resume

Set paths without moving the user's source files:

```bash
SKILL_DIR="<this skill directory>"
RUN_DIR="<user-selected output directory>"
python3 "$SKILL_DIR/scripts/corpus.py" inventory \
  --source-dir "<paper directory>" \
  --run-dir "$RUN_DIR" \
  --author "<scholar name>"
python3 "$SKILL_DIR/scripts/corpus.py" status --manifest "$RUN_DIR/manifest.json"
```

The manifest is resumable. A changed source hash invalidates only that paper's old card. Never delete valid cards during a rerun.

Review `inventory.md` before reading papers. Resolve likely duplicate working-paper/published versions. Prefer the final published version, but record excluded versions in `corpus_notes.md`; never silently count both as separate intellectual contributions.

## 2. Choose the PDF route

Read [hardware-routing.md](references/hardware-routing.md). Probe the same Python or Conda environment that would run Marker:

```bash
python3 "$SKILL_DIR/scripts/hardware_probe.py" --output "$RUN_DIR/hardware.json"
# Existing Conda environment:
conda run -n "<env>" python "$SKILL_DIR/scripts/hardware_probe.py" \
  --output "$RUN_DIR/hardware.json"
```

Do not infer CUDA compatibility from the GPU model alone. Do not download a CUDA toolkit, replace PyTorch, create an environment, or download Marker model weights without explicit user approval.

Route according to the probe:

- If `accelerator_ready` is true, use Marker with the reported `preferred_device`.
- If NVIDIA hardware is visible but the current PyTorch cannot use CUDA, explain the environment mismatch and ask before changing the Conda environment.
- If only CPU is ready, require the user to choose either CPU Marker conversion or direct PDF analysis. Never choose silently.

### Marker route

Read [converter-config.md](references/converter-config.md). Create `converter.json` using `marker_worker.py` and the user's known-working Python/Conda environment, then run:

```bash
python3 "$SKILL_DIR/scripts/corpus.py" convert \
  --manifest "$RUN_DIR/manifest.json" \
  --config "$RUN_DIR/converter.json"
```

Re-run `status`. Inspect at least one beginning, middle, and ending portion of every generated Markdown file. Mark empty, truncated, garbled, or sectionless OCR for reconversion instead of summarizing it.

For CPU mode, convert one representative paper first, report its elapsed time, and obtain confirmation before starting a large batch.

### Direct PDF route

Use only after the user chooses lower-fidelity direct analysis:

```bash
python3 "$SKILL_DIR/scripts/corpus.py" select-direct-pdf \
  --manifest "$RUN_DIR/manifest.json" --all
```

Do not create fake Markdown. Keep the PDF hash as the source of truth.

## 3. Create paper cards

Read [card-schema.md](references/card-schema.md) completely before writing cards.

Process one paper at a time and batches of five. Read the complete Markdown, using headings to inspect the abstract, introduction, methods/model, results/propositions, robustness, conclusion, and appendices where relevant. Do not infer a result from the abstract alone.

For each manifest entry with `state: markdown_ready` or `state: pdf_direct`:

1. Write `$RUN_DIR/cards/<paper_id>.json` atomically.
2. Preserve the source abstract verbatim in `abstract_original` when recoverable; otherwise use `null` and explain why in `notes`.
3. Ground every core claim in an evidence summary plus a section/page/table/proposition locator. Never invent a page number when OCR lacks page markers.
4. Distinguish empirical, theoretical, methodological, review, and essay/commentary papers. Follow the type-specific rules in the schema.
5. Separate what the paper establishes from the agent's interpretation.
6. Treat coauthored work as evidence about the scholar's research agenda, not proof that every idea belongs solely to that scholar.
7. For `pdf_direct`, follow the PDF skill to inspect extracted text and relevant rendered pages; disclose the fallback in `notes` and set content confidence to `medium` or `low`.
8. Run validation after each batch:

```bash
python3 "$SKILL_DIR/scripts/corpus.py" validate --manifest "$RUN_DIR/manifest.json"
python3 "$SKILL_DIR/scripts/corpus.py" render-cards --manifest "$RUN_DIR/manifest.json"
```

Continue automatically after successful batches. On validation failure, repair only the named cards. Do not proceed to portrait synthesis with invalid cards.

## 4. Synthesize the corpus

After every included paper has a valid card, create synthesis packets:

```bash
python3 "$SKILL_DIR/scripts/corpus.py" make-packets \
  --manifest "$RUN_DIR/manifest.json" --packet-size 8
```

Read each packet and write a corresponding `synthesis/packet-NNN-analysis.md`. Each analysis must identify recurring questions, methods, claims, tensions, and plausible transitions, citing paper IDs. Then read all packet analyses plus `cards/index.md` and write `$RUN_DIR/author_portrait.md` according to [portrait-framework.md](references/portrait-framework.md).

Stage breaks must reflect real changes in question, unit of analysis, methods, audience, or intellectual direction. Do not force three stages. Label inference explicitly when a transition is interpretive rather than stated by the papers.

## 5. Assemble and export

Build one Markdown report containing the author portrait, stage analysis, methodology note, corpus limitations, and every paper card:

```bash
python3 "$SKILL_DIR/scripts/corpus.py" assemble \
  --manifest "$RUN_DIR/manifest.json" \
  --portrait "$RUN_DIR/author_portrait.md" \
  --output "$RUN_DIR/researcher_portrait_report.md"
```

Render with the bundled Codex Python runtime when ordinary `python3` lacks ReportLab:

```bash
python3 "$SKILL_DIR/scripts/render_pdf.py" \
  --input "$RUN_DIR/researcher_portrait_report.md" \
  --output "$RUN_DIR/researcher_portrait_report.pdf"
```

Follow the PDF skill's verification workflow: use `pdfinfo`, render all pages with `pdftoppm`, inspect representative pages from the cover, portrait, stage transitions, and cards, and run a text extraction check. Do not deliver a PDF with missing Chinese glyphs, clipped text, blank pages, or broken headings.

## Completion gate

Deliver only when all conditions hold:

- `status` reports zero `needs_conversion` papers and zero invalid cards for included papers;
- all source hashes in cards match the manifest;
- duplicates and exclusions are documented;
- portrait claims can be traced to paper IDs or are labeled as interpretation;
- Markdown and PDF contain the portrait and the full card appendix;
- the latest rendered PDF inspection is clean.

Report the included paper count, excluded version count, direct-PDF fallback count, year range, low-confidence fields, and final file paths.
