/**
 * South African legal citation formatter.
 *
 * Formats:
 *   full:     "Section 2, Protection of Personal Information Act 4 of 2013"
 *   short:    "s. 2 POPIA"
 *   pinpoint: "s. 2(1)(a)"
 */

import type { ParsedCitation, CitationFormat } from '../types/index.js';

const SHORT_NAMES: Record<string, string> = {
  'protection of personal information act': 'POPIA',
  'electronic communications and transactions act': 'ECTA',
  'regulation of interception of communications and related information act': 'RICA',
  'promotion of access to information act': 'PAIA',
  'consumer protection act': 'CPA',
  'cybercrimes act': 'Cybercrimes Act',
  'companies act': 'Companies Act',
  'constitution of the republic of south africa': 'Constitution',
};

export function formatCitation(
  parsed: ParsedCitation,
  format: CitationFormat = 'full'
): string {
  if (!parsed.valid || !parsed.section) {
    return '';
  }

  const pinpoint = buildPinpoint(parsed);

  switch (format) {
    case 'full': {
      const actRef = parsed.act_number && parsed.year
        ? ` ${parsed.act_number} of ${parsed.year}`
        : parsed.year ? ` (${parsed.year})` : '';
      return `Section ${pinpoint}, ${parsed.title ?? ''}${actRef}`.trim();
    }

    case 'short': {
      const shortName = getShortName(parsed.title ?? '');
      return `s. ${pinpoint} ${shortName}`.trim();
    }

    case 'pinpoint':
      return `s. ${pinpoint}`;

    default:
      return `Section ${pinpoint}, ${parsed.title ?? ''}`.trim();
  }
}

function buildPinpoint(parsed: ParsedCitation): string {
  let ref = parsed.section ?? '';
  if (parsed.subsection) {
    ref += `(${parsed.subsection})`;
  }
  if (parsed.paragraph) {
    ref += `(${parsed.paragraph})`;
  }
  return ref;
}

function getShortName(title: string): string {
  const lower = title.toLowerCase().trim();
  return SHORT_NAMES[lower] ?? title;
}
