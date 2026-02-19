/**
 * Rate-limited HTTP client for SAFLII (saflii.org)
 *
 * - 500ms minimum delay between requests (polite scraping)
 * - User-Agent header identifying the MCP
 * - Handles HTML responses from SAFLII
 */

const USER_AGENT = 'SouthAfrica-Law-MCP/1.0 (https://github.com/Ansvar-Systems/southafrica-law-mcp; hello@ansvar.ai)';
const MIN_DELAY_MS = 500;

let lastRequestTime = 0;

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_DELAY_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

export interface FetchResult {
  status: number;
  body: string;
  contentType: string;
}

/**
 * Fetch a URL with rate limiting and proper headers.
 * Retries up to 3 times on 429/5xx errors with exponential backoff.
 */
export async function fetchWithRateLimit(url: string, maxRetries = 3): Promise<FetchResult> {
  await rateLimit();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html, application/xhtml+xml, */*',
      },
    });

    if (response.status === 429 || response.status >= 500) {
      if (attempt < maxRetries) {
        const backoff = Math.pow(2, attempt + 1) * 1000;
        console.log(`  HTTP ${response.status} for ${url}, retrying in ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
    }

    const body = await response.text();
    return {
      status: response.status,
      body,
      contentType: response.headers.get('content-type') ?? '',
    };
  }

  throw new Error(`Failed to fetch ${url} after ${maxRetries} retries`);
}

/**
 * Fetch the SAFLII index page listing consolidated South African Acts.
 */
export async function fetchSafliiIndex(): Promise<FetchResult> {
  const url = 'https://www.saflii.org/za/legis/consol_act/';
  return fetchWithRateLimit(url);
}

/**
 * Fetch a specific Act page from SAFLII.
 */
export async function fetchSafliiAct(actSlug: string): Promise<FetchResult> {
  const url = `https://www.saflii.org/za/legis/consol_act/${actSlug}/`;
  return fetchWithRateLimit(url);
}

/**
 * Fetch a specific section page from SAFLII.
 */
export async function fetchSafliiSection(actSlug: string, sectionPath: string): Promise<FetchResult> {
  const url = `https://www.saflii.org/za/legis/consol_act/${actSlug}/${sectionPath}`;
  return fetchWithRateLimit(url);
}
