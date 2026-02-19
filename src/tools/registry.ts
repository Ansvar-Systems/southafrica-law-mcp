/**
 * Tool registry for South Africa Law MCP Server.
 * Shared between stdio (index.ts) and HTTP (api/mcp.ts) entry points.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import Database from '@ansvar/mcp-sqlite';

import { searchLegislation, SearchLegislationInput } from './search-legislation.js';
import { getProvision, GetProvisionInput } from './get-provision.js';
import { listSources } from './list-sources.js';
import { validateCitationTool, ValidateCitationInput } from './validate-citation.js';
import { buildLegalStance, BuildLegalStanceInput } from './build-legal-stance.js';
import { formatCitationTool, FormatCitationInput } from './format-citation.js';
import { checkCurrency, CheckCurrencyInput } from './check-currency.js';
import { getEUBasis, GetEUBasisInput } from './get-eu-basis.js';
import { getSouthAfricanImplementations, GetSouthAfricanImplementationsInput } from './get-southafrican-implementations.js';
import { searchEUImplementations, SearchEUImplementationsInput } from './search-eu-implementations.js';
import { getProvisionEUBasis, GetProvisionEUBasisInput } from './get-provision-eu-basis.js';
import { validateEUCompliance, ValidateEUComplianceInput } from './validate-eu-compliance.js';
import { getAbout, type AboutContext } from './about.js';
export type { AboutContext } from './about.js';

const ABOUT_TOOL: Tool = {
  name: 'about',
  description:
    'Server metadata, dataset statistics, freshness, and provenance. ' +
    'Call this to verify data coverage, currency, and content basis before relying on results.',
  inputSchema: { type: 'object', properties: {} },
};

export const TOOLS: Tool[] = [
  {
    name: 'search_legislation',
    description:
      'Search South African statutes and regulations by keyword. Returns provision-level results with BM25 relevance ranking. ' +
      'Supports natural language queries (e.g., "personal information protection") and FTS5 syntax (AND, OR, NOT, "phrase", prefix*). ' +
      'Results include: document ID, title, provision reference, snippet with >>>highlight<<< markers, and relevance score. ' +
      'Use document_id to filter within a single statute. Use status to filter by in_force/amended/repealed. ' +
      'Default limit is 10 (max 50). For broad legal research, prefer build_legal_stance instead.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query in English. Supports natural language or FTS5 syntax (AND, OR, NOT, "phrase", prefix*). Example: "personal information" OR "data protection"',
        },
        document_id: {
          type: 'string',
          description: 'Filter to a specific statute by ID (e.g., "act-4-2013") or title (e.g., "Protection of Personal Information Act 4 of 2013")',
        },
        status: {
          type: 'string',
          enum: ['in_force', 'amended', 'repealed'],
          description: 'Filter by legislative status. Omit to search all statuses.',
        },
        limit: {
          type: 'number',
          description: 'Maximum results to return (default: 10, max: 50). Lower values save tokens.',
          default: 10,
          minimum: 1,
          maximum: 50,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_provision',
    description:
      'Retrieve the full text of a specific provision (section) from a South African statute, or all provisions for a statute if no section is specified. ' +
      'SA provisions use section notation: s2, s2(1), s2(1)(a). Pass document_id as either the internal ID (e.g., "act-4-2013") ' +
      'or the human-readable title (e.g., "Protection of Personal Information Act 4 of 2013"). ' +
      'Returns: document ID, title, status, provision reference, chapter, section, title, and full content text. ' +
      'WARNING: Omitting section/provision_ref returns ALL provisions (capped at 200) for the statute.',
    inputSchema: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: 'Statute identifier (e.g., "act-4-2013") or title (e.g., "Protection of Personal Information Act 4 of 2013"). Fuzzy title matching is supported.',
        },
        section: {
          type: 'string',
          description: 'Section number (e.g., "2", "2(1)"). Matched against provision_ref and section columns.',
        },
        provision_ref: {
          type: 'string',
          description: 'Direct provision reference (e.g., "s2", "s2(1)"). Takes precedence over section if both provided.',
        },
      },
      required: ['document_id'],
    },
  },
  {
    name: 'list_sources',
    description:
      'Returns metadata about all data sources backing this server, including jurisdiction, authoritative source details, ' +
      'database tier, schema version, build date, record counts, and known limitations. ' +
      'Call this first to understand data coverage and freshness before relying on other tools.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'validate_citation',
    description:
      'Validate a South African legal citation against the database. Returns whether the cited statute and provision exist. ' +
      'Use this as a zero-hallucination check before presenting legal references to users. ' +
      'Supported formats: "Section 2, Protection of Personal Information Act 4 of 2013", "s. 2, POPIA", "POPIA 4 of 2013, s. 2". ' +
      'Returns: valid (boolean), parsed components, warnings about repealed/amended status.',
    inputSchema: {
      type: 'object',
      properties: {
        citation: {
          type: 'string',
          description: 'South African legal citation to validate. Examples: "Section 2, Protection of Personal Information Act 4 of 2013", "s. 2 POPIA", "Cybercrimes Act 19 of 2020, s. 2"',
        },
      },
      required: ['citation'],
    },
  },
  {
    name: 'build_legal_stance',
    description:
      'Build a comprehensive set of citations for a legal question by searching across all South African statutes simultaneously. ' +
      'Returns aggregated results from legislation search, cross-referenced with international law where applicable. ' +
      'Best for broad legal research questions like "What SA laws govern personal data processing?" ' +
      'For targeted lookups of a known provision, use get_provision instead.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Legal question or topic to research (e.g., "personal data processing obligations under POPIA")',
        },
        document_id: {
          type: 'string',
          description: 'Optionally limit search to one statute by ID or title',
        },
        limit: {
          type: 'number',
          description: 'Max results per category (default: 5, max: 20)',
          default: 5,
          minimum: 1,
          maximum: 20,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'format_citation',
    description:
      'Format a South African legal citation per standard legal conventions. ' +
      'Formats: "full" -> "Section 2, Protection of Personal Information Act 4 of 2013", ' +
      '"short" -> "s. 2 POPIA", "pinpoint" -> "s. 2". ' +
      'Does NOT validate existence -- use validate_citation for that.',
    inputSchema: {
      type: 'object',
      properties: {
        citation: {
          type: 'string',
          description: 'Citation string to format (e.g., "Section 2, Protection of Personal Information Act 4 of 2013")',
        },
        format: {
          type: 'string',
          enum: ['full', 'short', 'pinpoint'],
          description: 'Output format. "full" (default): formal citation. "short": abbreviated. "pinpoint": section reference only.',
          default: 'full',
        },
      },
      required: ['citation'],
    },
  },
  {
    name: 'check_currency',
    description:
      'Check whether a South African statute or provision is currently in force, amended, or repealed. ' +
      'Returns: is_current (boolean), status, dates (issued, in-force), and warnings. ' +
      'Essential before citing legislation -- repealed acts should not be cited as current law.',
    inputSchema: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: 'Statute identifier (e.g., "act-4-2013") or title (e.g., "Protection of Personal Information Act 4 of 2013")',
        },
        provision_ref: {
          type: 'string',
          description: 'Optional provision reference to check a specific section (e.g., "s2")',
        },
      },
      required: ['document_id'],
    },
  },
  {
    name: 'get_eu_basis',
    description:
      'Get EU/international legal basis (directives, regulations, conventions) that influenced a South African statute. ' +
      'Returns all international instruments that the SA statute was modeled on or aligned with. ' +
      'Example: POPIA -> influenced by GDPR (Regulation 2016/679). ' +
      'Example: Cybercrimes Act -> aligned with Budapest Convention on Cybercrime.',
    inputSchema: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: 'SA statute identifier (e.g., "act-4-2013") or title (e.g., "Protection of Personal Information Act 4 of 2013")',
        },
        include_articles: {
          type: 'boolean',
          description: 'Include specific article references in the response (default: false)',
          default: false,
        },
        reference_types: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['implements', 'supplements', 'applies', 'references', 'influenced_by', 'aligned_with', 'cites_article'],
          },
          description: 'Filter by reference type. Omit to return all types.',
        },
      },
      required: ['document_id'],
    },
  },
  {
    name: 'get_southafrican_implementations',
    description:
      'Find South African statutes that implement or were influenced by a specific EU directive/regulation or international convention. ' +
      'Input the document ID (e.g., "regulation:2016/679" for GDPR, "convention:budapest-cybercrime" for Budapest Convention). ' +
      'Returns matching SA statutes with alignment status.',
    inputSchema: {
      type: 'object',
      properties: {
        eu_document_id: {
          type: 'string',
          description: 'EU/international document ID (e.g., "regulation:2016/679" for GDPR)',
        },
        primary_only: {
          type: 'boolean',
          description: 'Return only primary implementing/aligned statutes (default: false)',
          default: false,
        },
        in_force_only: {
          type: 'boolean',
          description: 'Return only statutes currently in force (default: false)',
          default: false,
        },
      },
      required: ['eu_document_id'],
    },
  },
  {
    name: 'search_eu_implementations',
    description:
      'Search for EU/international instruments that have been implemented or referenced by South African statutes. ' +
      'Search by keyword (e.g., "data protection", "cybercrime"), filter by type (directive/regulation/convention), ' +
      'or year range. Returns international documents with counts of SA statutes referencing them.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Keyword search across international document titles and short names (e.g., "data protection")',
        },
        type: {
          type: 'string',
          enum: ['directive', 'regulation', 'convention'],
          description: 'Filter by document type',
        },
        year_from: { type: 'number', description: 'Filter: documents from this year onwards' },
        year_to: { type: 'number', description: 'Filter: documents up to this year' },
        has_sa_implementation: {
          type: 'boolean',
          description: 'If true, only return documents that have at least one SA implementing statute',
        },
        limit: {
          type: 'number',
          description: 'Max results (default: 20, max: 100)',
          default: 20,
          minimum: 1,
          maximum: 100,
        },
      },
    },
  },
  {
    name: 'get_provision_eu_basis',
    description:
      'Get EU/international legal basis for a specific provision or document within a South African statute. ' +
      'If provision_ref is provided, returns article-level references. ' +
      'If omitted, returns all international references for the entire document. ' +
      'Example: POPIA -> references GDPR. Cybercrimes Act -> references Budapest Convention.',
    inputSchema: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: 'SA statute identifier (e.g., "act-4-2013") or title',
        },
        provision_ref: {
          type: 'string',
          description: 'Optional provision reference (e.g., "s2", "s2(1)"). If omitted, returns document-level references.',
        },
      },
      required: ['document_id'],
    },
  },
  {
    name: 'validate_eu_compliance',
    description:
      'Check EU/international alignment status for a South African statute or provision. ' +
      'Detects references to international instruments and reports alignment status: aligned, partial, unclear, or not_applicable. ' +
      'Note: South Africa is not an EU member — this tracks influence and voluntary alignment, not legal obligation.',
    inputSchema: {
      type: 'object',
      properties: {
        document_id: {
          type: 'string',
          description: 'SA statute identifier (e.g., "act-4-2013") or title',
        },
        provision_ref: {
          type: 'string',
          description: 'Optional: check a specific provision (e.g., "s2")',
        },
        eu_document_id: {
          type: 'string',
          description: 'Optional: check alignment with a specific international document (e.g., "regulation:2016/679")',
        },
      },
      required: ['document_id'],
    },
  },
];

export function buildTools(context?: AboutContext): Tool[] {
  return context ? [...TOOLS, ABOUT_TOOL] : TOOLS;
}

export function registerTools(
  server: Server,
  db: InstanceType<typeof Database>,
  context?: AboutContext,
): void {
  const allTools = buildTools(context);

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: allTools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: unknown;

      switch (name) {
        case 'search_legislation':
          result = await searchLegislation(db, args as unknown as SearchLegislationInput);
          break;
        case 'get_provision':
          result = await getProvision(db, args as unknown as GetProvisionInput);
          break;
        case 'list_sources':
          result = await listSources(db);
          break;
        case 'validate_citation':
          result = await validateCitationTool(db, args as unknown as ValidateCitationInput);
          break;
        case 'build_legal_stance':
          result = await buildLegalStance(db, args as unknown as BuildLegalStanceInput);
          break;
        case 'format_citation':
          result = await formatCitationTool(args as unknown as FormatCitationInput);
          break;
        case 'check_currency':
          result = await checkCurrency(db, args as unknown as CheckCurrencyInput);
          break;
        case 'get_eu_basis':
          result = await getEUBasis(db, args as unknown as GetEUBasisInput);
          break;
        case 'get_southafrican_implementations':
          result = await getSouthAfricanImplementations(db, args as unknown as GetSouthAfricanImplementationsInput);
          break;
        case 'search_eu_implementations':
          result = await searchEUImplementations(db, args as unknown as SearchEUImplementationsInput);
          break;
        case 'get_provision_eu_basis':
          result = await getProvisionEUBasis(db, args as unknown as GetProvisionEUBasisInput);
          break;
        case 'validate_eu_compliance':
          result = await validateEUCompliance(db, args as unknown as ValidateEUComplianceInput);
          break;
        case 'about':
          if (context) {
            result = getAbout(db, context);
          } else {
            return {
              content: [{ type: 'text', text: 'About tool not configured.' }],
              isError: true,
            };
          }
          break;
        default:
          return {
            content: [{ type: 'text', text: `Error: Unknown tool "${name}".` }],
            isError: true,
          };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `Error: ${message}` }],
        isError: true,
      };
    }
  });
}
