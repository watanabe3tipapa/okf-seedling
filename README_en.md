# okf-seedling

**Knowledge is not made — it is grown.**

okf-seedling is a Quarto template tool that grows your documents into **OKF (Open Knowledge Format) compliant knowledge bundles**, readable by both agents and humans.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-v0.4.0-blue.svg)](https://github.com/watanabe3tipapa/okf-seedling/releases)
[![OKF](https://img.shields.io/badge/OKF-v0.2-8b5cf6.svg)](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-live-blue.svg)](https://watanabe3tipapa.github.io/okf-seedling/)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare%20Pages-live-orange.svg)](https://okf-seedling.pages.dev/)
[![GitHub](https://img.shields.io/github/issues/watanabe3tipapa/okf-seedling.svg)](https://github.com/watanabe3tipapa/okf-seedling/issues)

[English](README_en.md) | [日本語](README.md)

## Concept

### Why "seedling" (育苗箱)?

A seedling box is a small container that **guards and raises seeds until they are ready to be transplanted into the field**. It is not a warehouse for finished goods — it is a waypoint in growth.

This tool is the same. Documents are not "created and abandoned" — **we water the sprout, thin the weak, and stay until it bears fruit.** Your knowledge grows in this box, then is transplanted into the "field": public sites, RAG pipelines, and agents. ([Vision article](https://watanabe3tipapa.github.io/okf-seedling/tutorial/why-seedling.html))

| Seedling-box activity | okf-seedling equivalent |
|---|---|
| Sow seeds | `quarto use template` generates a bundle skeleton |
| Nurture in the box | `okf/` bundle + OKF-formatted managed environment |
| Water, thin, inspect | `validate-okf` linter (conformance + freshness/completeness warnings) |
| Keep growth records | `status` / `generated` / `verified` / `stale_after` |
| Two cotyledons open | Dual output from one source: human HTML + machine OKF bundle |
| Transplant to the field | Deploy to GitHub Pages / Cloudflare Pages, hand to RAG / agents |

### OKF and RAG are not competitors

OKF is a **data-expression standard**; RAG is a **consumption-side reasoning architecture**. They live on different layers, so they are not competing choices.

- **OKF** = data-side foundation: how knowledge is held, exchanged, and updated
- **RAG** = consumption-side foundation: retrieving that knowledge to generate answers

Structuring knowledge in OKF stabilizes RAG's filter, ranking, and context design. **RAG accuracy is governed by "the quality of the fragments,"** and OKF guarantees that quality by spec. ([OKF × RAG Synergy article](https://watanabe3tipapa.github.io/okf-seedling/tutorial/okf-rag.html), with real bundle examples)

### A linter for knowledge bundles

This tool does not only "build" — it checks that things are **properly formed**. Just as ESLint watches code, this tool ships a linter aimed at information bundles.

- **Conformance (errors = fail)**: frontmatter presence, required `type`, per-type required fields, internal link resolution
- **Quality (warnings)**: `stale_after` expiry, missing `title` / `description`, empty body, unregistered type, missing recommended headings

## Features

- Author `.qmd` — readable by both agents and humans — as a single source of truth
- Generate a bundle skeleton in one command with `quarto use template`
- Render two outputs from one source: **human-readable HTML** and a **machine-readable OKF bundle** (`okf/` with `index.md` / `log.md` / `concepts/*.md`)
- Structure knowledge by concept — API / Playbook / Metric / Attested Computation — one concept per file
- Registry-driven validation: `tools/okf-types.json` is the single source of truth and drives schema generation, required-frontmatter / provenance / heading checks, and link-resolution checks
- Deploy in parallel to GitHub Pages and Cloudflare Pages
- Optional Playwright-based learning pipeline that extracts HTML into structured JSON per concept
- Online editing: author and commit `.qmd` concepts from the browser (Quarto Editor PE integration)

## Installation

### Prerequisites

| Tool | Required | Check |
|---|---|---|
| [Quarto](https://quarto.org/docs/get-started/) | >= 1.3 | `quarto --version` |
| [Node.js](https://nodejs.org/) | >= 20 | `node --version` |
| Git | optional (deploy/contributing) | `git --version` |

On macOS both can be installed with `brew install quarto node`. On Windows / Linux use the official installers, or see [Quarto's install guide](https://quarto.org/docs/get-started/).

### 1. Create the bundle skeleton

```bash
quarto use template watanabe3tipapa/okf-seedling
```

Run it in an empty directory — it extracts just the skeleton (`concepts/`, `tools/`, `_quarto.yml`, …). The template is fetched from GitHub automatically, so **git clone is not required** (only clone for development/contributing — see [Contributing](#contributing)).

### 2. Render both the human HTML and the machine bundle

```bash
quarto render
```

- `_site/` … human-readable HTML (LP, tutorials)
- `okf/` … machine-readable OKF bundle (`index.md` / `log.md` / `concepts/*.md`)

### 3. Validate conformance (linter)

```bash
node tools/validate-okf.mjs
```

Checks OKF conformance and warns on quality signals (freshness, missing fields).

### 4. Publish the nurtured knowledge

See [3. Deploy](https://watanabe3tipapa.github.io/okf-seedling/tutorial/03-deploy.html). For writing concepts, see [1. Create a Bundle](https://watanabe3tipapa.github.io/okf-seedling/tutorial/01-create-bundle.html).

### Online editing (Quarto Editor PE)

No local Quarto required — edit and commit OKF concept files straight from the browser. [Quarto Editor PE](https://quarto-editor-pe.vercel.app/editor) accesses your repository via GitHub OAuth, so saving in the editor commits to GitHub, and GitHub Actions renders and deploys automatically.

- [Online editing room](https://okf-seedling.pages.dev/editor.html) on the public site
- Step-by-step guide: [4. Grow bundles with the Online Editor](https://okf-seedling.pages.dev/tutorial/04-online-editor.html)
- Generate deep links to the concept skeletons locally:

```bash
node tools/editor-link.mjs YOURNAME/my-knowledge-bundle
```

### (Optional) Playwright learning pipeline

Extract concept-level structured JSON from the rendered HTML.

```bash
cd pipeline && npm install && npm run learn
```

## Concept Types

| Type | Purpose |
|------|---------|
| API Overview | Overall API overview (auth, versioning, errors) |
| API Endpoint | Specification of a single endpoint |
| API Schema | Input/output types and JSON schema |
| Playbook | Procedures and runbooks |
| Metric | Definition of a metric |
| Attested Computation | Verifiable computation definitions |

## Documentation

Beginners: read **in this order** for the full picture.

1. [0. What is OKF](https://watanabe3tipapa.github.io/okf-seedling/tutorial/00-what-is-okf.html) — OKF, bundles, and glossary basics
2. [1. Create a Bundle](https://watanabe3tipapa.github.io/okf-seedling/tutorial/01-create-bundle.html) — build one hands-on
3. [2. Concept Types](https://watanabe3tipapa.github.io/okf-seedling/tutorial/02-concept-type.html) — how to write each type
4. [3. Deploy](https://watanabe3tipapa.github.io/okf-seedling/tutorial/03-deploy.html) — publish it
5. [4. Online Editor](https://okf-seedling.pages.dev/tutorial/04-online-editor.html) — grow bundles in the browser
6. [OKF × RAG Synergy](https://watanabe3tipapa.github.io/okf-seedling/tutorial/okf-rag.html) — why it works for agents
7. [Vision](https://watanabe3tipapa.github.io/okf-seedling/tutorial/why-seedling.html) — the thought behind "seedling"

Development notes: [DEV-MEMO](DEV-MEMO.md).

## Contributing

Contributions are welcome! Please open an [issue](https://github.com/watanabe3tipapa/okf-seedling/issues) to discuss significant changes before working on them.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Contact

GitHub: [https://github.com/watanabe3tipapa/okf-seedling](https://github.com/watanabe3tipapa/okf-seedling)

Live site: [https://watanabe3tipapa.github.io/okf-seedling/](https://watanabe3tipapa.github.io/okf-seedling/) / [Cloudflare Pages](https://okf-seedling.pages.dev/)

## License

MIT License — see the [LICENSE](LICENSE) file for details.
