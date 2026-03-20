/**
 * Web scraping layer using Firecrawl API with plain fetch fallback.
 *
 * Scrapes up to 3 pages per POI: homepage + contact/gallery sub-pages.
 */

import fetch from "node-fetch";

const FIRECRAWL_API = "https://api.firecrawl.dev/v1";
const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY;

// Hebrew link text patterns for discovering sub-pages
const SUBPAGE_PATTERNS = [
  { pattern: /צור\s*קשר|יצירת\s*קשר|contact/i, type: "contact" },
  { pattern: /גלרי[יה]|gallery|תמונות|photos/i, type: "gallery" },
  { pattern: /אודות|about|מי\s*אנחנו/i, type: "about" },
];

/**
 * Scrape a POI website. Returns up to 3 pages of content.
 *
 * @param {string} website - domain only, e.g. "www.example.co.il"
 * @returns {{ success: boolean, pages: Array<{url, markdown, html, metadata}>, error?: string }}
 */
export async function scrapeWebsite(website) {
  const baseUrl = `https://${website}`;
  const pages = [];

  // Stage 1: Scrape homepage
  const homepage = await scrapePage(baseUrl);
  if (!homepage.success) {
    // Try http fallback
    const httpHomepage = await scrapePage(`http://${website}`);
    if (!httpHomepage.success) {
      return { success: false, pages: [], error: homepage.error };
    }
    pages.push(httpHomepage.data);
  } else {
    pages.push(homepage.data);
  }

  // Stage 2: Discover and scrape sub-pages (max 2 more)
  const subpageUrls = discoverSubpages(pages[0], baseUrl);
  for (const sub of subpageUrls.slice(0, 2)) {
    console.log(`    Sub-page: ${sub.type} → ${sub.url}`);
    const result = await scrapePage(sub.url);
    if (result.success) {
      pages.push({ ...result.data, subpageType: sub.type });
    }
    // Small delay between requests
    await new Promise(r => setTimeout(r, 1000));
  }

  return { success: true, pages };
}

/**
 * Scrape a single page using Firecrawl API.
 */
async function scrapePage(url) {
  try {
    const res = await fetch(`${FIRECRAWL_API}/scrape`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_KEY}`,
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
      return { success: false, error: `Firecrawl ${res.status}: ${body.slice(0, 200)}` };
    }

    const json = await res.json();
    if (!json.success) {
      return { success: false, error: json.error || "Firecrawl returned unsuccessful" };
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
  } catch (err) {
    return { success: false, error: `Fetch error: ${err.message}` };
  }
}

/**
 * Discover sub-page URLs from a scraped homepage.
 * Looks for Hebrew/English link text matching known patterns.
 */
function discoverSubpages(homepageData, baseUrl) {
  const html = homepageData.html || "";
  const found = [];

  // Extract all <a> tags with href
  const linkRegex = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    const linkText = match[2].replace(/<[^>]+>/g, "").trim();

    for (const { pattern, type } of SUBPAGE_PATTERNS) {
      if (pattern.test(linkText) || pattern.test(href)) {
        const resolvedUrl = resolveUrl(href, baseUrl);
        if (resolvedUrl && !found.some(f => f.type === type)) {
          found.push({ url: resolvedUrl, type });
        }
        break;
      }
    }
  }

  return found;
}

/**
 * Resolve a potentially relative URL against a base.
 */
function resolveUrl(href, baseUrl) {
  if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return null;
  }
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}
