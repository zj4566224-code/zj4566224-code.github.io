# Paper card schema

Write UTF-8 JSON. Use this exact top-level shape so `corpus.py validate` can enforce completeness.

```json
{
  "schema_version": 1,
  "paper_id": "manifest-id",
  "source_sha256": "sha256-from-manifest",
  "bibliography": {
    "title": "Full title",
    "authors": ["Author One", "Author Two"],
    "year": 2024,
    "venue": "Journal or working paper series",
    "doi": null
  },
  "paper_type": "empirical",
  "abstract_original": "Verbatim source abstract or null",
  "abstract_zh": "Faithful Chinese summary or translation in 2-4 sentences",
  "core_question_zh": "One plain-language sentence",
  "core_claims": [
    {
      "claim_zh": "What the paper establishes",
      "evidence_zh": "The result, proposition, comparison, or reasoning supporting it",
      "locator": "Results, Table 3 / Proposition 2 / Conclusion"
    }
  ],
  "argument_chain_zh": ["Question or premise", "Method or mechanism", "Evidence or derivation", "Conclusion"],
  "method": {
    "design_zh": "Research design or model class",
    "data_zh": "Data sources, or not applicable",
    "sample_zh": "Coverage and sample, or not applicable",
    "identification_or_model_zh": "Identification strategy, causal caveat, or key model assumptions"
  },
  "type_specific": {
    "label_zh": "识别策略 / 核心机制 / 方法论贡献 / 综述框架 / 论述路径",
    "content_zh": "Type-specific explanation"
  },
  "limitations_zh": ["A limitation stated by the paper or a clearly labeled scope boundary"],
  "keywords": ["keyword"],
  "confidence": {
    "bibliography": "high",
    "content": "high"
  },
  "notes": []
}
```

## Allowed values

`paper_type`: `empirical`, `theoretical`, `methodological`, `review`, or `essay-commentary`.

Confidence values: `high`, `medium`, or `low`.

Use JSON `null` for an unknown year, venue, DOI, or abstract. Do not use strings such as `N/A`, `unknown`, or `待确认` for missing values.

## Type-specific rule

- `empirical`: explain the identification strategy or explicitly state that evidence is predictive/descriptive rather than causal.
- `theoretical`: state the core mechanism as assumptions -> mechanism -> prediction.
- `methodological`: name the new tool, its baseline, and the gap it fills.
- `review`: state the organizing framework and selection boundary.
- `essay-commentary`: state the argument path and distinguish evidence from normative judgment.

## Evidence and attribution

Include at least one `core_claims` item, four `argument_chain_zh` steps, one limitation or scope boundary, and two keywords. A locator may name a section, table, figure, proposition, theorem, or OCR page marker. Use `Abstract only; full-text support unavailable` only when the source is genuinely incomplete, and lower `content` confidence.

Do not turn author rhetoric into an established fact. Keep causal language proportional to the design. For coauthored papers, describe what "the paper" argues or finds.
