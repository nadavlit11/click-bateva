/**
 * Shared types for the POI enrichment pipeline.
 */

export interface DayHours {
  open: string; // "09:00"
  close: string; // "17:00"
}

export type DayKey =
  | "sunday" | "monday" | "tuesday" | "wednesday"
  | "thursday" | "friday" | "saturday";

export const DAY_KEYS: DayKey[] = [
  "sunday", "monday", "tuesday", "wednesday",
  "thursday", "friday", "saturday",
];

export interface ScrapedPage {
  url: string;
  markdown: string;
  html: string;
  metadata: Record<string, unknown>;
  subpageType?: string;
}

export interface ScrapeResult {
  success: boolean;
  pages: ScrapedPage[];
  error?: string;
}

export interface ProgrammaticResult {
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  videos: string[];
  images: string[];
  facebook: string | null;
  openingHours: Record<DayKey, DayHours | null> | null;
  location: { lat: number; lng: number } | null;
}

export interface EnrichmentResult {
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  videos: string[];
  images: string[]; // Firebase Storage download URLs
  facebook: string | null;
  openingHours: Record<DayKey, DayHours | null> | null;
  price: string | null;
}
