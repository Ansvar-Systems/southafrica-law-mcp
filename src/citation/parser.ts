/**
 * South African legal citation parser.
 *
 * Parses citations like:
 *   "Section 2, Protection of Personal Information Act 4 of 2013"
 *   "s. 2, POPIA"
 *   "s. 2(1)(a) Cybercrimes Act 19 of 2020"
 *   "Protection of Personal Information Act 4 of 2013, s. 2"
 *   "Constitution of South Africa, Section 14"
 */

import type { ParsedCitation } from '../types/index.js';

// Known short name aliases for SA Acts
const ACT_ALIASES: Record<string, { title: string; act_number: number; year: number }> = {
  'popia': { title: 'Protection of Personal Information Act', act_number: 4, year: 2013 },
  'ecta': { title: 'Electronic Communications and Transactions Act', act_number: 25, year: 2002 },
  'rica': { title: 'Regulation of Interception of Communications and Related Information Act', act_number: 70, year: 2002 },
  'paia': { title: 'Promotion of Access to Information Act', act_number: 2, year: 2000 },
  'cpa': { title: 'Consumer Protection Act', act_number: 68, year: 2008 },
};

// Full citation: "Section 2, Protection of Personal Information Act 4 of 2013"
const FULL_CITATION = /^(?:Section|s\.?)\s+(\d+(?:\(\d+\))*(?:\([a-z]\))*)\s*,?\s+(.+?)\s+(\d+)\s+of\s+(\d{4})$/i;

// Short citation: "s. 2 POPIA"
const SHORT_CITATION = /^s\.?\s+(\d+(?:\(\d+\))*(?:\([a-z]\))*)\s+(\w+)$/i;

// Trailing section citation: "Protection of Personal Information Act 4 of 2013, s. 2"
const TRAILING_SECTION = /^(.+?)\s+(\d+)\s+of\s+(\d{4})\s*,?\s*(?:Section|s\.?)\s*(\d+(?:\(\d+\))*(?:\([a-z]\))*)$/i;

// Constitution citation: "Constitution of South Africa, Section 14"
const CONSTITUTION_CITATION = /^Constitution\s+(?:of\s+(?:the\s+Republic\s+of\s+)?South\s+Africa)?(?:\s*\(?\s*1996\s*\)?)?\s*,?\s*(?:Section|s\.?)\s*(\d+(?:\(\d+\))*(?:\([a-z]\))*)$/i;

// Section with subsection: "2(1)(a)"
const SECTION_REF = /^(\d+)(?:\((\d+)\))?(?:\(([a-z])\))?$/;

// Simple section + title + Act N of Y: "Section 2, POPIA 4 of 2013"
const SECTION_ALIAS_WITH_NUM = /^(?:Section|s\.?)\s+(\d+(?:\(\d+\))*(?:\([a-z]\))*)\s*,?\s+(.+?)\s+(\d+)\s+of\s+(\d{4})$/i;

export function parseCitation(citation: string): ParsedCitation {
  const trimmed = citation.trim();

  // Constitution
  let match = trimmed.match(CONSTITUTION_CITATION);
  if (match) {
    return parseSection(match[1], 'Constitution of the Republic of South Africa', undefined, 1996, 'constitution');
  }

  // Full citation with Act number
  match = trimmed.match(FULL_CITATION);
  if (match) {
    return parseSection(match[1], match[2], parseInt(match[3], 10), parseInt(match[4], 10), 'statute');
  }

  // Trailing section with Act number
  match = trimmed.match(TRAILING_SECTION);
  if (match) {
    return parseSection(match[4], match[1], parseInt(match[2], 10), parseInt(match[3], 10), 'statute');
  }

  // Short citation with alias
  match = trimmed.match(SHORT_CITATION);
  if (match) {
    const alias = ACT_ALIASES[match[2].toLowerCase()];
    if (alias) {
      return parseSection(match[1], alias.title, alias.act_number, alias.year, 'statute');
    }
    // Even without alias, try to use it as a title
    return parseSection(match[1], match[2], undefined, undefined, 'statute');
  }

  return {
    valid: false,
    type: 'unknown',
    error: `Could not parse South African citation: "${trimmed}"`,
  };
}

function parseSection(
  sectionStr: string,
  title: string,
  actNumber: number | undefined,
  year: number | undefined,
  type: 'statute' | 'regulation' | 'constitution'
): ParsedCitation {
  const sectionMatch = sectionStr.match(SECTION_REF);
  if (!sectionMatch) {
    return {
      valid: true,
      type,
      title: title.trim(),
      act_number: actNumber,
      year,
      section: sectionStr,
    };
  }

  return {
    valid: true,
    type,
    title: title.trim(),
    act_number: actNumber,
    year,
    section: sectionMatch[1],
    subsection: sectionMatch[2] || undefined,
    paragraph: sectionMatch[3] || undefined,
  };
}
