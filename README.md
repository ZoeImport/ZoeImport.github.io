# ZoeImport.github.io

A dependency-free, static personal homepage for [ZoeImport](https://github.com/ZoeImport).
The bilingual homepage presents an identity hero, profile, strengths, stack,
projects, and interests, then moves into evidence-backed case studies for
SearchX and Token Atlas. Looper keeps its existing frozen project page.

## Routes

- `/` — English personal homepage (Zihao Zheng / ZoeImport)
- `/zh/` — complete Chinese edition of the homepage
- `/interests/` — current interests
- `/skills/` — evidence-linked skills
- `/projects/` — public project index
- `/projects/looper/` — Looper case study (frozen)
- `/projects/search-x/` — SearchX architecture and technical-stack case study
- `/projects/token-atlas/` — Token Atlas local-first observability case study
- `/zh/projects/search-x/` — complete Chinese edition of the SearchX case study
- `/zh/projects/token-atlas/` — complete Chinese edition of the Token Atlas case study

## SearchX evidence contract

- **Repository:** [`ZoeImport/search-x`](https://github.com/ZoeImport/search-x)
- **System shape:** independently deployable WebSearch and WebFetch Go services
  plus a small shared Runtime module.
- **WebSearch:** capability-aware provider planning, capacity/profile routing,
  fresh/stale cache, canonical URL filtering, and encrypted opaque cursors.
- **WebFetch:** HTTP-path URL policy that validates DNS answers and pins approved
  targets, HTTP-first reads, a bounded Chromium fallback that rechecks only the
  final URL (no DNS pinning), extraction quality gates, and Markdown/text conversion.
- **Editorial boundary:** do not describe SearchX as parallel multi-engine
  aggregation, semantic reranking, LLM answer generation, or citation synthesis;
  those capabilities are not implemented in the public repository.

## Looper positioning contract

- **Product direction:** a complete, pluggable Agent Runtime that real business
  applications can extend without rewriting the execution loop.
- **Current evidence:** the first runnable Core slice with a Tokio Mailbox, pure
  decision and reducer, in-memory Event Store, Event Bus, simulated Model
  effect, CLI, and HTTP/SSE plus React inspection adapters.
- **Core ownership:** lifecycle, ordering, state transitions, effects, durable
  facts, event publication, and recovery semantics.
- **Extension seams:** Model, Tool, Memory or Storage, Event, Policy, and
  Transport interfaces.
- **Editorial rule:** always label current implementations separately from
  evolution targets; never present a planned interface as shipped capability.

## Token Atlas case-study contract

- **Public positioning:** a local-first, privacy-bounded observability dashboard
  for understanding AI tool activity across multiple coding clients.
- **Public scope:** architecture diagram and token definitions only. No real
  usage telemetry, prompts, responses, session labels, local paths, hosts,
  ports, databases, access tokens, environment variables, or credentials are
  published.
- **Token definitions:** `Fresh Tokens = non-cached input + output + reasoning`;
  `Processed Tokens = Fresh Tokens + cache reads`. Cache input, output, and
  reasoning are mutually exclusive after normalization, so tokens are never
  double counted.
- **Editorial boundary:** the running instance stays private. Any illustrated
  values on the site are synthetic or value-free; no private instance URL is
  provided.

## Local checks

```bash
node scripts/check-links.mjs
xmllint --noout sitemap.xml assets/searchx-architecture.svg assets/searchx-architecture-zh.svg assets/token-atlas-architecture.svg assets/token-atlas-architecture-zh.svg
```

The checker validates HTML5 document structure, balanced tags, page titles, one
`h1` per page, canonical URLs, `hreflang` en/zh-CN/x-default alternates and
mirror correspondence, local links/assets, and the absence of third-party
scripts. It also scans every published text file (HTML, CSS, JS, SVG, XML, MD,
TXT) for private-data patterns — phone numbers, email addresses, WeChat/wxid
IDs, local absolute paths, and bearer or environment-key names — without adding
a runtime dependency to the site. The checker itself is exempt from the scan so
its own patterns do not trigger false positives.

For a local HTTP preview on macOS:

```bash
ruby -run -e httpd . -p 8080
```

Then open `http://127.0.0.1:8080/`.

## GitHub Pages

The site contains only static HTML, CSS, SVG, XML, and text. It can be published from the `main` branch repository root. `.nojekyll` prevents Jekyll processing.

Planned repository: `ZoeImport/ZoeImport.github.io`  
Public URL: `https://zoeimport.github.io/`

## GitHub Profile backlink

Add this block to the existing `ZoeImport/ZoeImport` profile README so the profile and site link both ways:

```md
### Explore

- [Portfolio](https://zoeimport.github.io/)
- [Interests](https://zoeimport.github.io/interests/)
- [Skills](https://zoeimport.github.io/skills/)
- [Projects](https://zoeimport.github.io/projects/)
- [Looper case study](https://zoeimport.github.io/projects/looper/)
- [SearchX case study](https://zoeimport.github.io/projects/search-x/)
- [Token Atlas case study](https://zoeimport.github.io/projects/token-atlas/)
```

After the Looper repository exists, use the following reciprocal links:

- Repository About website: `https://zoeimport.github.io/projects/looper/`
- Portfolio source CTA: `https://github.com/ZoeImport/Looper`

SearchX already supports reciprocal links:

- Repository: `https://github.com/ZoeImport/search-x`
- Repository About website: `https://zoeimport.github.io/projects/search-x/`

## Public-data boundary

This repository must contain only deliberately public or synthetic material. Do not add Token Atlas usage snapshots, prompts, responses, local paths, project labels, session identifiers, host details, databases, environment files, access tokens, or credentials.
