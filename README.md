# South Africa Law MCP

[![CI](https://github.com/Ansvar-Systems/southafrica-law-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Ansvar-Systems/southafrica-law-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@ansvar/southafrica-law-mcp)](https://www.npmjs.com/package/@ansvar/southafrica-law-mcp)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![OpenSSF Scorecard](https://img.shields.io/ossf-scorecard/github.com/Ansvar-Systems/southafrica-law-mcp)](https://securityscorecards.dev/viewer/?uri=github.com/Ansvar-Systems/southafrica-law-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-eu.ansvar%2Fsouthafrica--law--mcp-green)](https://registry.modelcontextprotocol.io/)

A Model Context Protocol (MCP) server providing full-text search and structured access to South African legislation and case law, including POPIA, the Cybercrimes Act, ECTA, Companies Act, Consumer Protection Act, and more.

> **Note:** South Africa has one of Africa's most mature legal frameworks for data protection and cybersecurity. The Protection of Personal Information Act (POPIA) is considered one of the continent's most comprehensive data protection laws, closely modeled on the EU GDPR. The Information Regulator is the independent data protection authority responsible for enforcement. The Cybercrimes Act (2020) provides a modern, comprehensive framework for addressing cybercrime, aligned with the Budapest Convention.

## Deployment Tier

**MEDIUM** -- dual tier (free + professional), bundled free database.

South Africa has an extensive legal corpus including significant case law from the Constitutional Court, Supreme Court of Appeal, and High Courts. The free tier covers core national legislation, while the professional tier adds full case law coverage.

| Tier | DB Size | Includes | Transport |
|------|---------|----------|-----------|
| **Free (bundled)** | ~100-200 MB | All national Acts, regulations, key Constitutional Court decisions | stdio (npm) |
| **Professional (full)** | ~500 MB - 1 GB | All legislation + full case law from all courts | stdio (npm) |

## Data Sources

| Source | Authority | Method | Update Frequency | License | Coverage |
|--------|-----------|--------|-----------------|---------|----------|
| [SAFLII](https://www.saflii.org) | SAFLII / UCT / Wits | HTML Scrape | Weekly | Free Access | National Acts, regulations, case law from all courts |
| [South African Government](https://www.gov.za/documents) | Government of South Africa | HTML Scrape | On change | Government Open Data | Government Gazette, Acts, regulations, policy documents |
| [Dept. of Justice](https://www.justice.gov.za) | Dept. of Justice and Constitutional Development | HTML Scrape | Monthly | Government Public Domain | Constitution, justice-related legislation, POPIA/PAIA regulations |

> Full provenance metadata: [`sources.yml`](./sources.yml)

## Key Legislation Covered

| Act | Identifier | Domain |
|-----|-----------|--------|
| **Protection of Personal Information Act (POPIA)** | Act 4 of 2013 | Data protection, privacy, Information Regulator |
| **Cybercrimes Act** | Act 19 of 2020 | Cybercrime offences, cyber response, mutual assistance |
| **Electronic Communications and Transactions Act (ECTA)** | Act 25 of 2002 | E-commerce, electronic signatures, cyber inspectors |
| **Companies Act** | Act 71 of 2008 | Corporate governance, company formation |
| **Consumer Protection Act** | Act 68 of 2008 | Consumer rights, product liability, data in marketing |
| **Promotion of Access to Information Act (PAIA)** | Act 2 of 2000 | Right of access to information, public and private bodies |
| **Regulation of Interception of Communications Act (RICA)** | Act 70 of 2002 | Lawful interception, SIM registration, communications surveillance |

## Quick Start

### Install from npm

```bash
npm install -g @ansvar/southafrica-law-mcp
```

### Run via npx (no install)

```bash
npx @ansvar/southafrica-law-mcp
```

### Configure in Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "southafrica-law": {
      "command": "npx",
      "args": ["-y", "@ansvar/southafrica-law-mcp"]
    }
  }
}
```

### Build from Source

```bash
git clone https://github.com/Ansvar-Systems/southafrica-law-mcp.git
cd southafrica-law-mcp
npm install
npm run build
npm run build:db      # Build the full database
npm run build:db:free # Build the free-tier database
npm start             # Start the server
```

## Tools

| Tool | Description |
|------|-------------|
| `get_provision` | Retrieve a specific section/article from a South African Act by law identifier and article number |
| `search_legislation` | Full-text search across all South African legislation |
| `search_case_law` | Full-text search across Constitutional Court, Supreme Court of Appeal, and High Court decisions |
| `list_acts` | List all available Acts in the database |
| `get_act_structure` | Get the table of contents / structure of a specific Act |
| `get_provision_eu_basis` | Cross-reference a South African provision with related EU/international instruments (GDPR, Budapest Convention, NIS2) |

## Contract Tests

This MCP includes 12 golden contract tests covering:

- **Article retrieval** (3 tests): POPIA Section 2, Cybercrimes Act Section 2, Companies Act Section 1
- **Search** (3 tests): personal information, cybercrime, electronic communication
- **Citation roundtrip** (2 tests): POPIA citation URL, Cybercrimes Act citation
- **Cross-reference** (2 tests): GDPR relationship, Budapest Convention relationship
- **Negative cases** (2 tests): non-existent Act, malformed section number

Run contract tests:

```bash
npm run test:contract
```

## Drift Detection

Golden hashes track 7 stable upstream provisions to detect silent content changes:

- Constitution of South Africa (1996), Section 1 (Republic)
- Constitution Section 14 (Right to privacy)
- POPIA Section 1 (definitions)
- POPIA Section 2 (purpose)
- Cybercrimes Act Section 1 (definitions)
- ECTA Section 1 (definitions)
- Companies Act Section 1 (interpretation)

Run drift detection:

```bash
npm run drift:detect
```

## Development

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm test             # Run all tests
npm run test:contract  # Run contract tests only
npm run lint         # Lint source code
npm run drift:detect # Check for upstream changes
```

## Security

See [SECURITY.md](.github/SECURITY.md) for vulnerability disclosure policy.

Report data errors: [Open an issue](https://github.com/Ansvar-Systems/southafrica-law-mcp/issues/new?template=data-error.md)

## License

Apache-2.0 -- see [LICENSE](LICENSE).

---

Built by [Ansvar Systems](https://ansvar.eu) -- Cybersecurity compliance through AI-powered legal intelligence.
