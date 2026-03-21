/**
 * Unit tests for enrichment/index.ts
 */

// ── Mocks (must be declared before imports) ──────

jest.mock("firebase-admin/app", () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => [{name: "mock-app"}]),
}));

const mockDocGet = jest.fn();
const mockDocSet = jest.fn();
const mockCollAdd = jest.fn(() => ({id: "run123"}));
const mockCollGet = jest.fn();
const mockDoc = jest.fn(() => ({
  get: mockDocGet,
  set: mockDocSet,
}));
const mockCollection = jest.fn(() => ({
  add: mockCollAdd,
  orderBy: jest.fn(() => ({
    limit: jest.fn(() => ({get: mockCollGet})),
  })),
}));

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({
    doc: mockDoc,
    collection: mockCollection,
  })),
}));

const mockBucket = jest.fn(() => ({
  file: jest.fn(() => ({save: jest.fn()})),
  name: "test-bucket",
}));
jest.mock("firebase-admin/storage", () => ({
  getStorage: jest.fn(() => ({bucket: mockBucket})),
}));

jest.mock("firebase-functions/params", () => ({
  defineSecret: jest.fn(() => ({
    value: jest.fn(() => "mock-secret"),
  })),
}));

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};
jest.mock("firebase-functions/logger", () => mockLogger);

const mockSentry = {
  init: jest.fn(),
  captureException: jest.fn(),
};
jest.mock("@sentry/node", () => mockSentry);

// Mock sub-modules
const mockScrape = jest.fn();
jest.mock("../enrichment/scraper", () => ({
  scrapeWebsite: mockScrape,
}));

const mockExtractProg = jest.fn();
jest.mock("../enrichment/extractor", () => ({
  extractProgrammatic: mockExtractProg,
}));

const mockCallClaude = jest.fn();
const mockExtractLLM = jest.fn();
const mockVerifyLLM = jest.fn();
const mockFixNight = jest.fn();
const mockRankImages = jest.fn();
const mockExtractFromDescLLM = jest.fn();
jest.mock("../enrichment/llm-extractor", () => ({
  callClaude: mockCallClaude,
  extractWithLLM: mockExtractLLM,
  verifyWithLLM: mockVerifyLLM,
  fixNightTimeErrors: mockFixNight,
  rankImagesWithVision: mockRankImages,
  extractFromDescriptionWithLLM: mockExtractFromDescLLM,
}));

const mockExtractFromDesc = jest.fn();
jest.mock("../enrichment/description-extractor", () => ({
  extractFromDescription: mockExtractFromDesc,
}));

const mockProcessImages = jest.fn();
jest.mock("../enrichment/image-processor", () => ({
  processImages: mockProcessImages,
}));

import {
  formatInstructions,
  mergeResults,
  enrichPoiFromWebsite,
  updateEnrichmentInstructions,
  enrichPoiFromDescription,
} from "../enrichment/index";
import {ProgrammaticResult} from "../enrichment/types";

// ── Helpers ──────────────────────────────────────

function mkProg(
  overrides: Partial<ProgrammaticResult> = {},
): ProgrammaticResult {
  return {
    phone: null,
    whatsapp: null,
    email: null,
    videos: [],
    images: [],
    facebook: null,
    openingHours: null,
    location: null,
    ...overrides,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeReq(overrides: object = {}): any {
  return {
    auth: {uid: "admin1", token: {role: "admin"}},
    data: {
      website: "example.com",
      poiName: "Test POI",
      poiId: "poi123",
    },
    rawRequest: {},
    ...overrides,
  };
}

// ── formatInstructions ───────────────────────────

describe("formatInstructions", () => {
  it("returns undefined for undefined data", () => {
    expect(formatInstructions(undefined)).toBeUndefined();
  });

  it("returns undefined for empty object", () => {
    expect(formatInstructions({})).toBeUndefined();
  });

  it("formats general rule", () => {
    const r = formatInstructions({
      general: "Check contact page carefully",
    });
    expect(r).toBe(
      "General: Check contact page carefully",
    );
  });

  it("formats per-field rules", () => {
    const r = formatInstructions({
      opening_hours: "Check for בלילה",
      price: "Include context",
    });
    expect(r).toContain(
      "opening_hours: Check for בלילה",
    );
    expect(r).toContain("price: Include context");
  });

  it("puts general first, then per-field", () => {
    const r = formatInstructions({
      general: "General rule",
      images: "Skip logos",
    });
    expect(r).toBe(
      "General: General rule\nimages: Skip logos",
    );
  });

  it("skips non-string values", () => {
    const r = formatInstructions({
      general: "A rule",
      count: 42,
      nested: {foo: "bar"},
    });
    expect(r).toBe("General: A rule");
  });
});

// ── mergeResults ─────────────────────────────────

describe("mergeResults", () => {
  const llmEmpty = {
    openingHours: null,
    price: null,
    whatsapp: null,
    description: null,
    address: null,
  };

  it("uses programmatic openingHours", () => {
    const progH = {
      sunday: {open: "09:00", close: "17:00"},
      monday: null, tuesday: null, wednesday: null,
      thursday: null, friday: null, saturday: null,
    };
    const llmH = {
      sunday: {open: "10:00", close: "18:00"},
      monday: null, tuesday: null, wednesday: null,
      thursday: null, friday: null, saturday: null,
    };
    const prog = mkProg({openingHours: progH});
    const r = mergeResults(
      prog, {...llmEmpty, openingHours: llmH},
    );
    expect(r.openingHours).toBe(progH);
  });

  it("falls back to LLM openingHours", () => {
    const llmH = {
      sunday: {open: "10:00", close: "18:00"},
      monday: null, tuesday: null, wednesday: null,
      thursday: null, friday: null, saturday: null,
    };
    const prog = mkProg({openingHours: null});
    const r = mergeResults(
      prog, {...llmEmpty, openingHours: llmH},
    );
    expect(r.openingHours).toBe(llmH);
  });

  it("uses programmatic whatsapp", () => {
    const prog = mkProg({whatsapp: "0521234567"});
    const r = mergeResults(
      prog, {...llmEmpty, whatsapp: "0529876543"},
    );
    expect(r.whatsapp).toBe("0521234567");
  });

  it("falls back to LLM whatsapp", () => {
    const prog = mkProg({whatsapp: null});
    const r = mergeResults(
      prog, {...llmEmpty, whatsapp: "0529876543"},
    );
    expect(r.whatsapp).toBe("0529876543");
  });

  it("price always comes from LLM", () => {
    const prog = mkProg();
    const r = mergeResults(
      prog, {...llmEmpty, price: "כניסה: 80₪"},
    );
    expect(r.price).toBe("כניסה: 80₪");
  });

  it("preserves phone and email", () => {
    const prog = mkProg({
      phone: "046816000",
      email: "info@example.co.il",
    });
    const r = mergeResults(prog, llmEmpty);
    expect(r.phone).toBe("046816000");
    expect(r.email).toBe("info@example.co.il");
  });

  it("preserves images and videos", () => {
    const prog = mkProg({
      images: ["https://example.com/a.jpg"],
      videos: ["https://youtube.com/watch?v=abc"],
    });
    const r = mergeResults(prog, llmEmpty);
    expect(r.images).toEqual(
      ["https://example.com/a.jpg"],
    );
    expect(r.videos).toEqual(
      ["https://youtube.com/watch?v=abc"],
    );
  });

  it("description always comes from LLM", () => {
    const prog = mkProg();
    const llm = {
      ...llmEmpty,
      description: "מסעדה איטלקית",
    };
    const r = mergeResults(prog, llm);
    expect(r.description).toBe("מסעדה איטלקית");
  });

  it("address always comes from LLM", () => {
    const prog = mkProg();
    const llm = {
      ...llmEmpty,
      address: "רח' הרצל 42",
    };
    const r = mergeResults(prog, llm);
    expect(r.address).toBe("רח' הרצל 42");
  });

  it("preserves location", () => {
    const loc = {lat: 32.08, lng: 34.78};
    const prog = mkProg({location: loc});
    const r = mergeResults(prog, llmEmpty);
    expect(r.location).toBe(loc);
  });
});

// ── enrichPoiFromWebsite ─────────────────────────

describe("enrichPoiFromWebsite", () => {
  const defaultProg = mkProg({
    phone: "054-1234567",
    images: ["https://cdn.com/1.jpg"],
  });
  const defaultLlm = {
    openingHours: null,
    price: "50₪",
    whatsapp: null,
    description: "Desc",
    address: "Addr",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const page = {
      url: "https://example.com",
      markdown: "content",
      html: "",
      metadata: {},
    };
    mockScrape.mockResolvedValue({
      success: true,
      pages: [page],
    });
    mockExtractProg.mockReturnValue(defaultProg);
    mockDocGet.mockResolvedValue({
      exists: false,
      data: () => undefined,
    });
    mockExtractLLM.mockResolvedValue(defaultLlm);
    mockVerifyLLM.mockResolvedValue({
      ...defaultProg,
      price: "50₪",
      description: "Desc",
      address: "Addr",
    });
    mockRankImages.mockResolvedValue(
      ["https://cdn.com/1.jpg"],
    );
    mockProcessImages.mockResolvedValue(
      ["https://storage.com/1.jpg"],
    );
    mockCollAdd.mockReturnValue({id: "run123"});
  });

  it("throws unauthenticated when no auth", async () => {
    await expect(
      enrichPoiFromWebsite.run(
        makeReq({auth: null}),
      ),
    ).rejects.toMatchObject({
      code: "unauthenticated",
      message: "Must be authenticated.",
    });
  });

  it("throws permission-denied for non-admin", async () => {
    const auth = {uid: "u1", token: {role: "viewer"}};
    await expect(
      enrichPoiFromWebsite.run(makeReq({auth})),
    ).rejects.toMatchObject({
      code: "permission-denied",
      message: "Only admins can enrich POIs.",
    });
  });

  it("rejects empty website", async () => {
    const data = {
      website: "",
      poiName: "N",
      poiId: "P",
    };
    await expect(
      enrichPoiFromWebsite.run(makeReq({data})),
    ).rejects.toMatchObject({
      code: "invalid-argument",
      message: "website is required.",
    });
  });

  it("rejects non-string website", async () => {
    const data = {
      website: 123,
      poiName: "N",
      poiId: "P",
    };
    await expect(
      enrichPoiFromWebsite.run(makeReq({data})),
    ).rejects.toMatchObject({
      code: "invalid-argument",
      message: "website is required.",
    });
  });

  it("rejects empty poiName", async () => {
    const data = {
      website: "x.com",
      poiName: "",
      poiId: "P",
    };
    await expect(
      enrichPoiFromWebsite.run(makeReq({data})),
    ).rejects.toMatchObject({
      code: "invalid-argument",
      message: "poiName is required.",
    });
  });

  it("rejects empty poiId", async () => {
    const data = {
      website: "x.com",
      poiName: "N",
      poiId: "  ",
    };
    await expect(
      enrichPoiFromWebsite.run(makeReq({data})),
    ).rejects.toMatchObject({
      code: "invalid-argument",
      message: "poiId is required.",
    });
  });

  it("throws when scraping fails", async () => {
    mockScrape.mockResolvedValue({
      success: false,
      pages: [],
      error: "Connection refused",
    });
    await expect(
      enrichPoiFromWebsite.run(makeReq()),
    ).rejects.toMatchObject({
      code: "internal",
      message: "Scraping failed: Connection refused",
    });
  });

  it("throws when scraping returns empty", async () => {
    mockScrape.mockResolvedValue({
      success: true,
      pages: [],
    });
    await expect(
      enrichPoiFromWebsite.run(makeReq()),
    ).rejects.toMatchObject({
      code: "internal",
      message: expect.stringContaining("no pages"),
    });
  });

  it("runs full pipeline and returns result", async () => {
    const r = await enrichPoiFromWebsite.run(makeReq());
    expect(r.phone).toBe("054-1234567");
    expect(r.price).toBe("50₪");
    expect(r.description).toBe("Desc");
    expect(r.address).toBe("Addr");
    expect(r.images).toEqual(
      ["https://storage.com/1.jpg"],
    );
    expect(r.enrichmentRunId).toBe("run123");
    expect(r.provenance).toBeDefined();
  });

  it("logs enrichment progress", async () => {
    await enrichPoiFromWebsite.run(makeReq());
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining(
        "Enriching POI \"Test POI\"",
      ),
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining("Scraped"),
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining("Enrichment complete"),
    );
  });

  it("calls fixNight when LLM returns hours", async () => {
    const llmWithHours = {
      ...defaultLlm,
      openingHours: {
        sunday: {open: "12:00", close: "23:00"},
      },
    };
    mockExtractLLM.mockResolvedValue(llmWithHours);
    await enrichPoiFromWebsite.run(makeReq());
    expect(mockFixNight).toHaveBeenCalledWith(
      llmWithHours.openingHours,
      expect.any(String),
    );
  });

  it("skips fixNight when no LLM hours", async () => {
    await enrichPoiFromWebsite.run(makeReq());
    expect(mockFixNight).not.toHaveBeenCalled();
  });

  it("skips Vision when <= 2 images", async () => {
    const verified = {
      ...defaultProg,
      images: ["img1.jpg"],
    };
    mockVerifyLLM.mockResolvedValue(verified);
    await enrichPoiFromWebsite.run(makeReq());
    expect(mockRankImages).not.toHaveBeenCalled();
  });

  it("uses Vision when > 2 images", async () => {
    const verified = {
      ...defaultProg,
      images: ["a.jpg", "b.jpg", "c.jpg"],
    };
    mockVerifyLLM.mockResolvedValue(verified);
    mockRankImages.mockResolvedValue(
      ["c.jpg", "a.jpg"],
    );
    await enrichPoiFromWebsite.run(makeReq());
    expect(mockRankImages).toHaveBeenCalled();
  });

  it("captures Sentry on unexpected error", async () => {
    const err = new Error("unexpected");
    mockScrape.mockRejectedValue(err);
    await expect(
      enrichPoiFromWebsite.run(makeReq()),
    ).rejects.toMatchObject({code: "internal"});
    expect(
      mockSentry.captureException,
    ).toHaveBeenCalledWith(err);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining("Enrichment failed"),
    );
  });

  it("stores enrichment run in Firestore", async () => {
    await enrichPoiFromWebsite.run(makeReq());
    expect(mockCollection).toHaveBeenCalledWith(
      "enrichment_runs",
    );
    expect(mockCollAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        poiId: "poi123",
        website: "example.com",
      }),
    );
  });

  it("loads enrichment instructions", async () => {
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({general: "Be careful"}),
    });
    await enrichPoiFromWebsite.run(makeReq());
    expect(mockDoc).toHaveBeenCalledWith(
      "settings/enrichment_instructions",
    );
  });

  it("trims input fields", async () => {
    const data = {
      website: " example.com ",
      poiName: " Test ",
      poiId: " poi1 ",
    };
    await enrichPoiFromWebsite.run(makeReq({data}));
    expect(mockScrape).toHaveBeenCalledWith(
      "example.com",
      expect.any(String),
    );
  });
});

// ── updateEnrichmentInstructions ─────────────────

describe("updateEnrichmentInstructions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({general: "old rule"}),
    });
    mockCollGet.mockResolvedValue({
      empty: false,
      docs: [{
        data: () => ({
          appliedFields: ["phone"],
          skippedFields: [],
          fieldRatings: {phone: "good"},
          note: null,
        }),
      }],
    });
    mockCallClaude.mockResolvedValue(
      JSON.stringify({general: "updated rule"}),
    );
    mockDocSet.mockResolvedValue(undefined);
  });

  it("throws unauthenticated when no auth", async () => {
    await expect(
      updateEnrichmentInstructions.run(
        makeReq({auth: null, data: {}}),
      ),
    ).rejects.toMatchObject({
      code: "unauthenticated",
      message: "Must be authenticated.",
    });
  });

  it("throws permission-denied for non-admin", async () => {
    const auth = {
      uid: "u1",
      token: {role: "crm_user"},
    };
    await expect(
      updateEnrichmentInstructions.run(
        makeReq({auth, data: {}}),
      ),
    ).rejects.toMatchObject({
      code: "permission-denied",
      message: "Only admins can update instructions.",
    });
  });

  it("returns not updated when no feedback", async () => {
    mockCollGet.mockResolvedValue({
      empty: true,
      docs: [],
    });
    const r = await updateEnrichmentInstructions.run(
      makeReq({data: {}}),
    );
    expect(r).toMatchObject({
      updated: false,
      reason: "No feedback yet",
    });
  });

  it("updates instructions from feedback", async () => {
    const r = await updateEnrichmentInstructions.run(
      makeReq({data: {}}),
    );
    expect(r).toEqual({updated: true});
    expect(mockDocSet).toHaveBeenCalledWith(
      {general: "updated rule"},
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      "Enrichment instructions updated from feedback",
    );
  });

  it("handles JSON in code block", async () => {
    mockCallClaude.mockResolvedValue(
      "```json\n{\"general\": \"new\"}\n```",
    );
    const r = await updateEnrichmentInstructions.run(
      makeReq({data: {}}),
    );
    expect(r).toEqual({updated: true});
    expect(mockDocSet).toHaveBeenCalledWith(
      {general: "new"},
    );
  });

  it("uses empty object for missing rules", async () => {
    mockDocGet.mockResolvedValue({
      exists: false,
      data: () => undefined,
    });
    await updateEnrichmentInstructions.run(
      makeReq({data: {}}),
    );
    expect(mockCallClaude).toHaveBeenCalled();
  });

  it("captures Sentry on failure", async () => {
    const err = new Error("Claude error");
    mockCallClaude.mockRejectedValue(err);
    await expect(
      updateEnrichmentInstructions.run(
        makeReq({data: {}}),
      ),
    ).rejects.toMatchObject({
      code: "internal",
      message: expect.stringContaining(
        "Instruction update failed",
      ),
    });
    expect(
      mockSentry.captureException,
    ).toHaveBeenCalledWith(err);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining(
        "Instruction update failed",
      ),
    );
  });
});

// ── enrichPoiFromDescription ──────────────────────

describe("enrichPoiFromDescription", () => {
  const poiDescription =
    "מסעדה ים תיכונית. טל: 054-1234567. כניסה 80₪.";

  const defaultDescProg = {
    phone: "0541234567", whatsapp: "0541234567", email: null,
  };
  const defaultDescLlm = {
    openingHours: null,
    price: "כניסה 80₪",
    whatsapp: null,
    phone: "0541234567",
    description: null,
    address: null,
    minPeople: null,
    maxPeople: null,
    cleanedDescription: "מסעדה ים תיכונית.",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function makeDescReq(overrides: object = {}): any {
    return {
      auth: {uid: "admin1", token: {role: "admin"}},
      data: {poiId: "poi123"},
      rawRequest: {},
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    // First call: POI doc; second call: instructions doc
    mockDocGet
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({description: poiDescription, name: "מסעדה"}),
      })
      .mockResolvedValueOnce({
        exists: false,
        data: () => undefined,
      });
    mockExtractFromDesc.mockReturnValue(defaultDescProg);
    mockExtractFromDescLLM.mockResolvedValue(defaultDescLlm);
    mockCollAdd.mockReturnValue({id: "run456"});
  });

  it("throws unauthenticated when no auth", async () => {
    await expect(
      enrichPoiFromDescription.run(makeDescReq({auth: null})),
    ).rejects.toMatchObject({
      code: "unauthenticated",
      message: "Must be authenticated.",
    });
  });

  it("throws permission-denied for non-admin", async () => {
    const auth = {uid: "u1", token: {role: "viewer"}};
    await expect(
      enrichPoiFromDescription.run(makeDescReq({auth})),
    ).rejects.toMatchObject({
      code: "permission-denied",
      message: "Only admins can enrich POIs.",
    });
  });

  it("rejects missing poiId", async () => {
    await expect(
      enrichPoiFromDescription.run(makeDescReq({data: {}})),
    ).rejects.toMatchObject({
      code: "invalid-argument",
      message: "poiId is required.",
    });
  });

  it("throws not-found when POI does not exist", async () => {
    mockDocGet.mockReset();
    mockDocGet.mockResolvedValue({
      exists: false, data: () => undefined,
    });
    await expect(
      enrichPoiFromDescription.run(makeDescReq()),
    ).rejects.toMatchObject({code: "not-found"});
  });

  it("throws failed-precondition when description is empty", async () => {
    mockDocGet.mockReset();
    mockDocGet.mockResolvedValue({
      exists: true, data: () => ({description: "", name: "X"}),
    });
    await expect(
      enrichPoiFromDescription.run(makeDescReq()),
    ).rejects.toMatchObject({code: "failed-precondition"});
  });

  it("runs programmatic extraction on description text", async () => {
    await enrichPoiFromDescription.run(makeDescReq());
    expect(mockExtractFromDesc).toHaveBeenCalledWith(
      poiDescription,
    );
  });

  it("runs LLM extraction on description text", async () => {
    await enrichPoiFromDescription.run(makeDescReq());
    expect(mockExtractFromDescLLM).toHaveBeenCalledWith(
      poiDescription,
      "mock-secret",
      undefined,
    );
  });

  it("stores enrichment_run with source: description", async () => {
    await enrichPoiFromDescription.run(makeDescReq());
    expect(mockCollAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        poiId: "poi123",
        source: "description",
        descriptionText: poiDescription,
      }),
    );
  });

  it("returns empty images, videos, and null location", async () => {
    const r = await enrichPoiFromDescription.run(makeDescReq());
    expect(r.images).toEqual([]);
    expect(r.videos).toEqual([]);
    expect(r.location).toBeNull();
    expect(r.facebook).toBeNull();
  });

  it("returns cleanedDescription in result", async () => {
    const r = await enrichPoiFromDescription.run(makeDescReq());
    expect(r.cleanedDescription).toBe("מסעדה ים תיכונית.");
  });

  it("returns enrichmentRunId", async () => {
    const r = await enrichPoiFromDescription.run(makeDescReq());
    expect(r.enrichmentRunId).toBe("run456");
  });

  it("calls fixNightTimeErrors when hours and בלילה present", async () => {
    const nightDesc = "פתוח ל1 בלילה";
    mockDocGet.mockReset();
    mockDocGet
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({description: nightDesc, name: "X"}),
      })
      .mockResolvedValueOnce({exists: false, data: () => undefined});
    mockExtractFromDescLLM.mockResolvedValue({
      ...defaultDescLlm,
      openingHours: {
        sunday: {open: "12:00", close: "23:00"},
        monday: null, tuesday: null, wednesday: null,
        thursday: null, friday: null, saturday: null,
      },
    });
    await enrichPoiFromDescription.run(makeDescReq());
    expect(mockFixNight).toHaveBeenCalled();
  });

  it("captures Sentry on unexpected error", async () => {
    const err = new Error("boom");
    mockExtractFromDesc.mockImplementation(() => {
      throw err;
    });
    await expect(
      enrichPoiFromDescription.run(makeDescReq()),
    ).rejects.toMatchObject({code: "internal"});
    expect(mockSentry.captureException).toHaveBeenCalledWith(err);
  });
});
