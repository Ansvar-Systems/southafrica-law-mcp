/**
 * South African statute identifier handling.
 *
 * South African statutes are identified by Act number and year,
 * e.g., "act-4-2013" for POPIA (Act 4 of 2013).
 */

import type { Database } from '@ansvar/mcp-sqlite';

export function isValidStatuteId(id: string): boolean {
  return id.length > 0 && id.trim().length > 0;
}

export function statuteIdCandidates(id: string): string[] {
  const trimmed = id.trim().toLowerCase();
  const candidates = new Set<string>();
  candidates.add(trimmed);
  candidates.add(id.trim());

  if (trimmed.includes(' ')) {
    candidates.add(trimmed.replace(/\s+/g, '-'));
  }
  if (trimmed.includes('-')) {
    candidates.add(trimmed.replace(/-/g, ' '));
  }

  // Try extracting Act number and year from title format
  // "Protection of Personal Information Act 4 of 2013" -> "act-4-2013"
  const actMatch = trimmed.match(/act\s+(\d+)\s+of\s+(\d{4})/i);
  if (actMatch) {
    candidates.add(`act-${actMatch[1]}-${actMatch[2]}`);
  }

  return [...candidates];
}

export function resolveExistingStatuteId(
  db: Database,
  inputId: string,
): string | null {
  // Try exact match first
  const exact = db.prepare(
    "SELECT id FROM legal_documents WHERE id = ? LIMIT 1"
  ).get(inputId) as { id: string } | undefined;

  if (exact) return exact.id;

  // Try extracting Act number and year to build a canonical ID
  const actMatch = inputId.match(/act\s+(\d+)\s+of\s+(\d{4})/i);
  if (actMatch) {
    const canonicalId = `act-${actMatch[1]}-${actMatch[2]}`;
    const byCanonical = db.prepare(
      "SELECT id FROM legal_documents WHERE id = ? LIMIT 1"
    ).get(canonicalId) as { id: string } | undefined;
    if (byCanonical) return byCanonical.id;
  }

  // Try LIKE match on title
  const byTitle = db.prepare(
    "SELECT id FROM legal_documents WHERE title LIKE ? LIMIT 1"
  ).get(`%${inputId}%`) as { id: string } | undefined;

  return byTitle?.id ?? null;
}
