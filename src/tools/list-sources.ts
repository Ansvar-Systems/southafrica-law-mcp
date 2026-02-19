/**
 * list_sources — Returns metadata about data sources, coverage, and freshness.
 */

import type { Database } from '@ansvar/mcp-sqlite';
import { generateResponseMetadata, type ToolResponse } from '../utils/metadata.js';

export interface ListSourcesResult {
  jurisdiction: string;
  sources: Array<{
    name: string;
    authority: string;
    url: string;
    license: string;
    coverage: string;
    languages: string[];
  }>;
  database: {
    tier: string;
    schema_version: string;
    built_at: string;
    document_count: number;
    provision_count: number;
    eu_document_count: number;
  };
  limitations: string[];
}

function safeCount(db: Database, sql: string): number {
  try {
    const row = db.prepare(sql).get() as { count: number } | undefined;
    return row ? Number(row.count) : 0;
  } catch {
    return 0;
  }
}

function safeMetaValue(db: Database, key: string): string {
  try {
    const row = db.prepare('SELECT value FROM db_metadata WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function listSources(db: Database): Promise<ToolResponse<ListSourcesResult>> {
  const documentCount = safeCount(db, 'SELECT COUNT(*) as count FROM legal_documents');
  const provisionCount = safeCount(db, 'SELECT COUNT(*) as count FROM legal_provisions');
  const euDocumentCount = safeCount(db, 'SELECT COUNT(*) as count FROM eu_documents');

  return {
    results: {
      jurisdiction: 'South Africa (ZA)',
      sources: [
        {
          name: 'SAFLII (Southern African Legal Information Institute)',
          authority: 'University of Cape Town / Wits University',
          url: 'https://www.saflii.org',
          license: 'Free Access — South African legislation is public domain',
          coverage: 'All national Acts of Parliament including POPIA, Cybercrimes Act, ECTA, Companies Act, Consumer Protection Act, PAIA, RICA, and the Constitution.',
          languages: ['en', 'af', 'zu'],
        },
        {
          name: 'South African Government (gov.za)',
          authority: 'Government of South Africa',
          url: 'https://www.gov.za/documents',
          license: 'Government Open Data — Acts published in the Government Gazette are public domain',
          coverage: 'Government Gazette (Acts, regulations, proclamations, government notices).',
          languages: ['en', 'af'],
        },
      ],
      database: {
        tier: safeMetaValue(db, 'tier'),
        schema_version: safeMetaValue(db, 'schema_version'),
        built_at: safeMetaValue(db, 'built_at'),
        document_count: documentCount,
        provision_count: provisionCount,
        eu_document_count: euDocumentCount,
      },
      limitations: [
        `Covers ${documentCount.toLocaleString()} South African Acts of Parliament. Provincial legislation is not yet included.`,
        'Multi-language content (Afrikaans, Zulu) may be incomplete for some Acts.',
        'EU/international cross-references track influence relationships (GDPR -> POPIA, Budapest Convention -> Cybercrimes Act) rather than direct implementation.',
        'Historical legislation before 1994 may be incomplete.',
        'Always verify against official Government Gazette publications when legal certainty is required.',
      ],
    },
    _metadata: generateResponseMetadata(db),
  };
}
