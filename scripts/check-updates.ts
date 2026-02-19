#!/usr/bin/env tsx
/**
 * Check SAFLII for newly published or updated South African Acts.
 *
 * Exits:
 *   0 = no updates
 *   1 = updates found
 *   2 = check failed (network/parse/database error)
 */

import Database from 'better-sqlite3';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchSafliiIndex } from './lib/fetcher.js';
import { parseSafliiIndex, type ActIndexEntry } from './lib/parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '../data/database.db');
const INDEX_PATH = resolve(__dirname, '../data/source/act-index.json');

interface LocalIndexEntry {
  title: string;
  slug: string;
  url: string;
  updated: string;
}

interface UpdateHit {
  document_slug: string;
  title: string;
  remote_updated: string;
  local_updated?: string;
}

function parseJsonFile<T>(filePath: string): T | null {
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
}

async function main(): Promise<void> {
  console.log('South Africa Law MCP - Update checker');
  console.log('');

  if (!existsSync(DB_PATH)) {
    console.error(`Database not found: ${DB_PATH}`);
    process.exit(2);
  }

  const db = new Database(DB_PATH, { readonly: true });
  const localDocs = new Set<string>(
    (db.prepare("SELECT id FROM legal_documents").all() as { id: string }[])
      .map((row) => row.id),
  );
  db.close();

  const localIndex = parseJsonFile<LocalIndexEntry[]>(INDEX_PATH) ?? [];
  const localIndexBySlug = new Map<string, LocalIndexEntry>();
  for (const entry of localIndex) {
    localIndexBySlug.set(entry.slug, entry);
  }

  console.log('Fetching current SAFLII index...');
  const result = await fetchSafliiIndex();
  if (result.status !== 200) {
    console.error(`Failed to fetch SAFLII index: HTTP ${result.status}`);
    process.exit(2);
  }

  const recentEntries = parseSafliiIndex(result.body);
  console.log(`Checked ${recentEntries.length} upstream entries.`);

  const newActs: UpdateHit[] = [];

  for (const entry of recentEntries) {
    if (!localIndexBySlug.has(entry.slug)) {
      newActs.push({
        document_slug: entry.slug,
        title: entry.title,
        remote_updated: entry.updated,
      });
    }
  }

  console.log('');
  console.log(`New acts: ${newActs.length}`);

  if (newActs.length > 0) {
    console.log('');
    console.log('New upstream acts missing locally:');
    for (const hit of newActs.slice(0, 20)) {
      console.log(`  - ${hit.document_slug} (${hit.title})`);
    }
    process.exit(1);
  }

  console.log('');
  console.log('No new upstream acts detected.');
}

main().catch((error) => {
  console.error(`Update check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(2);
});
