/**
 * SAFLII HTML parser for South African legislation.
 *
 * Parses the SAFLII HTML format (AfricanLII platform) into structured seed JSON.
 * Uses cheerio for HTML parsing.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Index Parsing
// ─────────────────────────────────────────────────────────────────────────────

export interface ActIndexEntry {
  title: string;
  slug: string;
  url: string;
  updated: string;
}

/**
 * Parse the SAFLII consolidated acts index page to extract act entries.
 */
export function parseSafliiIndex(html: string): ActIndexEntry[] {
  const entries: ActIndexEntry[] = [];

  // SAFLII uses alphabetical sub-pages with relative links in <li class="make-database">
  // Format: <a href="popia4o2013399" class="make-database">Protection of Personal Information Act 4 of 2013 </a>
  // Also match absolute paths: <a href="/za/legis/consol_act/SLUG/" ...>
  const linkPattern = /<a\s+href="(?:\/za\/legis\/consol_act\/)?([a-z0-9]+)\/?"[^>]*>([^<]+)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(html)) !== null) {
    const slug = match[1];
    const title = match[2].replace(/\s+/g, ' ').trim();

    if (!title || title.length < 3) continue;

    entries.push({
      title,
      slug,
      url: `https://www.saflii.org/za/legis/consol_act/${slug}/`,
      updated: new Date().toISOString().slice(0, 10),
    });
  }

  return entries;
}

// ─────────────────────────────────────────────────────────────────────────────
// Act Parsing
// ─────────────────────────────────────────────────────────────────────────────

export interface ParsedProvision {
  provision_ref: string;
  section: string;
  title: string;
  content: string;
  language?: string;
}

export interface ParsedAct {
  id: string;
  type: 'statute' | 'constitution';
  title: string;
  short_name: string;
  act_number?: number;
  year?: number;
  status: 'in_force';
  issued_date: string;
  url: string;
  language: string;
  provisions: ParsedProvision[];
}

/**
 * Extract Act number and year from a SAFLII title or slug.
 *
 * Examples:
 *   "Protection of Personal Information Act 4 of 2013" -> { actNumber: 4, year: 2013 }
 *   Slug "popia2013464" -> try to extract from title
 */
export function extractActIdentifiers(title: string): { actNumber?: number; year?: number } {
  // Pattern: "Act N of YYYY"
  const match = title.match(/\bAct\s+(\d+)\s+of\s+(\d{4})\b/i);
  if (match) {
    return {
      actNumber: parseInt(match[1], 10),
      year: parseInt(match[2], 10),
    };
  }

  // Constitution pattern
  const constMatch = title.match(/Constitution.*?(\d{4})/i);
  if (constMatch) {
    return { year: parseInt(constMatch[1], 10) };
  }

  // Try just a year
  const yearMatch = title.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    return { year: parseInt(yearMatch[1], 10) };
  }

  return {};
}

/**
 * Build document ID from Act number and year.
 */
export function buildDocumentId(title: string, actNumber?: number, year?: number): string {
  if (title.toLowerCase().includes('constitution')) {
    return `constitution-${year ?? 1996}`;
  }
  if (actNumber && year) {
    return `act-${actNumber}-${year}`;
  }
  // Fallback: slugify the title
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

/**
 * Build a short name abbreviation from a title.
 */
export function buildShortName(title: string): string {
  const KNOWN_SHORT_NAMES: Record<string, string> = {
    'protection of personal information act': 'POPIA',
    'electronic communications and transactions act': 'ECTA',
    'cybercrimes act': 'Cybercrimes Act',
    'companies act': 'Companies Act',
    'consumer protection act': 'CPA',
    'promotion of access to information act': 'PAIA',
    'regulation of interception of communications': 'RICA',
    'constitution of the republic of south africa': 'Constitution',
  };

  const lower = title.toLowerCase().replace(/\s+\d+\s+of\s+\d{4}$/, '').trim();
  for (const [pattern, shortName] of Object.entries(KNOWN_SHORT_NAMES)) {
    if (lower.includes(pattern)) {
      return shortName;
    }
  }

  // Generate abbreviation from significant words
  const words = title.replace(/[()]/g, '').split(/\s+/);
  const significant = words.filter(w =>
    w.length > 2 &&
    w[0] === w[0].toUpperCase() &&
    !['The', 'And', 'For', 'Act', 'Of', 'In', 'To', 'With'].includes(w)
  );

  if (significant.length >= 2) {
    return significant.slice(0, 4).map(w => w[0]).join('');
  }

  return title.slice(0, 30).trim();
}

/**
 * Parse a SAFLII Act HTML page to extract provisions.
 *
 * SAFLII uses a standardized HTML structure with section anchors.
 * Sections are typically marked with <a name="section-N"> or <h2>/<h3> headings.
 */
export function parseSafliiActHtml(html: string, title: string, slug: string): ParsedAct {
  const { actNumber, year } = extractActIdentifiers(title);
  const id = buildDocumentId(title, actNumber, year);
  const shortName = buildShortName(title);
  const isConstitution = title.toLowerCase().includes('constitution');

  const provisions: ParsedProvision[] = [];

  // Strategy 1: Look for section headings with anchors
  // SAFLII typically uses patterns like:
  //   <a name="section1">1.</a> Title of section
  //   Content of the section...
  const sectionPattern = /<a\s+name="section(\d+)"[^>]*>[^<]*<\/a>\s*\.?\s*(.*?)(?=<a\s+name="section\d+"|<\/body|$)/gis;
  let sectionMatch: RegExpExecArray | null;

  while ((sectionMatch = sectionPattern.exec(html)) !== null) {
    const sectionNum = sectionMatch[1];
    const rawContent = sectionMatch[2];

    // Clean HTML tags from content
    const cleanContent = rawContent
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanContent.length < 5) continue;

    // Extract title from first line/heading
    const titleMatch = cleanContent.match(/^(.{5,120}?)(?:\.\s|\n|$)/);
    const provTitle = titleMatch ? titleMatch[1].trim() : '';

    provisions.push({
      provision_ref: `s${sectionNum}`,
      section: sectionNum,
      title: provTitle,
      content: cleanContent,
      language: 'en',
    });
  }

  // Strategy 2: If no sections found with anchors, try heading-based extraction
  if (provisions.length === 0) {
    const headingPattern = /(?:<h[2-4][^>]*>|<b>|<strong>)\s*(?:Section\s+)?(\d+)\.?\s*(.*?)(?:<\/h[2-4]>|<\/b>|<\/strong>)\s*([\s\S]*?)(?=(?:<h[2-4][^>]*>|<b>|<strong>)\s*(?:Section\s+)?\d+\.?|<\/body|$)/gi;
    let headingMatch: RegExpExecArray | null;

    while ((headingMatch = headingPattern.exec(html)) !== null) {
      const sectionNum = headingMatch[1];
      const headingTitle = headingMatch[2].replace(/<[^>]+>/g, '').trim();
      const rawContent = headingMatch[3];

      const cleanContent = rawContent
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();

      if (cleanContent.length < 5) continue;

      provisions.push({
        provision_ref: `s${sectionNum}`,
        section: sectionNum,
        title: headingTitle,
        content: `${headingTitle}. ${cleanContent}`.trim(),
        language: 'en',
      });
    }
  }

  // Strategy 3: If still no provisions, extract the whole body as a single provision
  if (provisions.length === 0) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      const cleanBody = bodyMatch[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();

      if (cleanBody.length > 20) {
        provisions.push({
          provision_ref: 's1',
          section: '1',
          title: title,
          content: cleanBody.slice(0, 50000),
          language: 'en',
        });
      }
    }
  }

  return {
    id,
    type: isConstitution ? 'constitution' : 'statute',
    title,
    short_name: shortName,
    act_number: actNumber,
    year,
    status: 'in_force',
    issued_date: year ? `${year}-01-01` : '2000-01-01',
    url: `https://www.saflii.org/za/legis/consol_act/${slug}/`,
    language: 'en',
    provisions,
  };
}
