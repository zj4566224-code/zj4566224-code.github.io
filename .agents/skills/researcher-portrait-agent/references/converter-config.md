# Converter adapter

The agent must ask for the existing Python script's exact CLI. Do not edit the user's converter. Create a JSON adapter beside the run manifest.

For the bundled Marker adapter, run `hardware_probe.py` first and use the Python executable or Conda environment that already contains Marker and PyTorch.

## Bundled Marker worker with Conda

Single-file conversion through the user's existing environment:

```json
{
  "mode": "per_file",
  "command": [
    "conda",
    "run",
    "-n",
    "marker-env",
    "python",
    "/absolute/path/to/researcher-portrait-agent/scripts/marker_worker.py",
    "--input",
    "{input}",
    "--output",
    "{output}",
    "--device",
    "auto"
  ],
  "timeout_seconds": 3600
}
```

On Windows, use the full path to `conda.exe` if `conda` is not available to non-interactive processes. Set `--device` to `cpu` only after the user chooses CPU conversion.

## Per-file converter

Use when the script accepts one PDF and one output Markdown path:

```json
{
  "mode": "per_file",
  "command": [
    "python3",
    "/absolute/path/to/converter.py",
    "--input",
    "{input}",
    "--output",
    "{output}"
  ]
}
```

Supported placeholders are `{input}` and `{output}`. The runner never invokes a shell; each item is passed directly to `subprocess.run`.

## Batch converter

Use when the script accepts input and output directories:

```json
{
  "mode": "batch",
  "command": [
    "python3",
    "/absolute/path/to/converter.py",
    "--input-dir",
    "{input_dir}",
    "--output-dir",
    "{output_dir}"
  ]
}
```

Batch mode writes Markdown into `<run-dir>/markdown/`. Output filenames must retain the PDF stem so the runner can match them. If the converter creates a nested directory or changes filenames, run it separately and point `inventory` at the resulting Markdown directory.

Optional keys:

```json
{
  "timeout_seconds": 1800,
  "environment": {"API_KEY_ENV_NAME": "value"}
}
```

Do not place secrets directly in this file. Prefer inheriting already-set environment variables.

The first Marker run may download model weights. Treat that as a network and disk mutation requiring user approval. Never install or replace CUDA/PyTorch from this adapter.
