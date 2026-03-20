/**
 * Web scraping layer using Firecrawl API.
 *
 * Scrapes up to 3 pages per POI: homepage + contact/gallery sub-pages.
 */

import * as logger from "firebase-functions/logger";
import {ScrapedPage, ScrapeResult} from "./types";

const FIRECRAWL_API = "https://api.firecrawl.dev/v1";

// Hebrew link text patterns for discovering sub-pages
const SUBPAGE_PATTERNS = [
  {pattern: /צור\s*קשר|יצירת\s*קשר|contact/i, type: "contact"},
  {pattern: /גלרי[יה]|gallery|תמונות|photos/i, type: "gallery"},
  {pattern: /אודות|about|מי\s*אנחנו/i, type: "about"},
];

interface PageResult {
  success: boolean;
  data?: ScrapedPage;
  error?: string;
}

/**
 * Scrape a single page using Firecrawl API.
 * @param {string} url Page URL to scrape.
 * @param {string} firecrawlKey Firecrawl API key.
 * @return {Promise<PageResult>} Scrape result.
 */
async function scrapePage(
  url: string, firecrawlKey: string,
): Promise<PageResult> {
  try {
    const res = await fetch(`${FIRECRAWL_API}/scrape`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "html"],
        onlyMainContent: false,
        timeout: 30000,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return {
        success: false,
        error: `Firecrawl ${res.status}: ${body.slice(0, 200)}`,
      };
    }

    const json = await res.json();
    if (!json.success) {
      return {
        success: false,
        error: json.error || "Firecrawl returned unsuccessful",
      };
    }

    return {
      success: true,
      data: {
        url,
        markdown: json.data?.markdown || "",
        html: json.data?.html || "",
        metadata: json.data?.metadata || {},
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {success: false, error: `Fetch error: ${msg}`};
  }
}

/**
 * Resolve a potentially relative URL against a base.
 * @param {string} href Link href to resolve.
 * @param {string} baseUrl Base URL for resolution.
 * @return {string|null} Resolved absolute URL or null.
 */
function resolveUrl(
  href: string, baseUrl: string,
): string | null {
  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("javascript:") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    return null;
  }
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}

/**
 * Discover sub-page URLs from a scraped homepage.
 * Looks for Hebrew/English link text matching known patterns.
 * @param {ScrapedPage} homepageData Scraped homepage data.
 * @param {string} baseUrl Base URL for resolving relative links.
 * @return {Array} Discovered sub-page URLs with types.
 */
export function discoverSubpages(
  homepageData: ScrapedPage, baseUrl: string,
): Array<{url: string; type: string}> {
  const html = homepageData.html || "";
  const found: Array<{url: string; type: string}> = [];

  const linkRegex =
    /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    const linkText = match[2].replace(/<[^>]+>/g, "").trim();

    for (const {pattern, type} of SUBPAGE_PATTERNS) {
      if (pattern.test(linkText) || pattern.test(href)) {
        const resolvedUrl = resolveUrl(href, baseUrl);
        if (resolvedUrl && !found.some((f) => f.type === type)) {
          found.push({url: resolvedUrl, type});
        }
        break;
      }
    }
  }

  return found;
}

/**
 * Scrape a POI website. Returns up to 3 pages of content.
 * @param {string} website Domain, e.g. "www.example.co.il".
 * @param {string} firecrawlKey Firecrawl API key.
 * @return {Promise<ScrapeResult>} Scrape result with pages.
 */
export async function scrapeWebsite(
  website: string, firecrawlKey: string,
): Promise<ScrapeResult> {
  const domain = website
    .replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const baseUrl = `https://${domain}`;
  const pages: ScrapedPage[] = [];

  // Stage 1: Scrape homepage
  const homepage = await scrapePage(baseUrl, firecrawlKey);
  if (!homepage.success || !homepage.data) {
    // Try http fallback
    const httpHomepage = await scrapePage(
      `http://${domain}`, firecrawlKey,
    );
    if (!httpHomepage.success || !httpHomepage.data) {
      return {
        success: false, pages: [], error: homepage.error,
      };
    }
    pages.push(httpHomepage.data);
  } else {
    pages.push(homepage.data);
  }

  // Stage 2: Discover and scrape sub-pages (max 2 more)
  const subpageUrls = discoverSubpages(pages[0], baseUrl);
  for (const sub of subpageUrls.slice(0, 2)) {
    logger.info(`Sub-page: ${sub.type} → ${sub.url}`);
    const result = await scrapePage(sub.url, firecrawlKey);
    if (result.success && result.data) {
      pages.push({...result.data, subpageType: sub.type});
    }
    // Small delay between requests
    await new Promise((r) => setTimeout(r, 1000));
  }

  return {success: true, pages};
}
