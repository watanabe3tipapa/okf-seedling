# okf-seedling

A Quarto template tool for authoring, rendering, validating, and publishing **OKF v0.2-compliant knowledge bundles** that are readable by both agents and humans.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v0.3.0-blue.svg)](https://github.com/watanabe3tipapa/okf-seedling/releases)
[![OKF](https://img.shields.io/badge/OKF-v0.2-8b5cf6.svg)](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-live-blue.svg)](https://watanabe3tipapa.github.io/okf-seedling/)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare%20Pages-live-orange.svg)](https://okf-seedling.pages.dev/)
[![GitHub](https://img.shields.io/github/issues/watanabe3tipapa/okf-seedling.svg)](https://github.com/watanabe3tipapa/okf-seedling/issues)

[English](README_en.md) | [日本語](README.md)

## Features

- Author knowledge bundles in `.qmd`, a format readable by both agents and humans, as a single source of truth
- Generate a bundle skeleton in one command with `quarto use template`
- Render two outputs from one source: **human-readable HTML** and a **machine-readable OKF bundle** (`okf/` with `index.md` / `log.md` / `concepts/*.md`)
- Structure knowledge by concept — API / Playbook / Metric / Attested Computation — one concept per file
- **Linter for knowledge bundles**: conformance checks (required frontmatter, internal links) plus quality warnings (stale_after expiry, missing title/description, empty body)
- Registry-driven validation: `tools/okf-types.json` is the single source of truth and drives schema generation, required-frontmatter / provenance / heading checks, and link-resolution checks
- Deploy in parallel to GitHub Pages and Cloudflare Pages
- Optional Playwright-based learning pipeline that extracts HTML into structured JSON per concept

## Installation

```bash
# Generate a new knowledge bundle from the template
quarto use template watanabe3tipapa/okf-seedling
```

## Usage

```bash
# Render both the human HTML (_site/) and the machine OKF bundle (okf/)
quarto render

# Check the generated schema is in sync with the registry
node tools/gen-schema.mjs --check

# Validate the OKF bundle against the version rules
node tools/validate-okf.mjs

# (Optional) learn each concept from the rendered HTML
cd pipeline && npm install && npm run learn
```

For more detailed usage, see the [tutorial](/tutorial/00-what-is-okf.qmd) (OKF primer and glossary) and [DEV-MEMO](DEV-MEMO.md).

## Concept Types

| Type | Purpose |
|------|---------|
| API Overview | Overall API overview (auth, versioning, errors) |
| API Endpoint | Specification of a single endpoint |
| API Schema | Input/output types and JSON schema |
| Playbook | Procedures and runbooks |
| Metric | Definition of a metric |
| Attested Computation | Verifiable computation definitions |

## Contributing

Contributions are welcome! Please open an [issue](https://github.com/watanabe3tipapa/okf-seedling/issues) to discuss significant changes before working on them.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Contact

GitHub: [https://github.com/watanabe3tipapa/okf-seedling](https://github.com/watanabe3tipapa/okf-seedling)

Live site: [https://watanabe3tipapa.github.io/okf-seedling/](https://watanabe3tipapa.github.io/okf-seedling/)

## License

MIT License — see the [LICENSE](LICENSE) file for details.