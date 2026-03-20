/**
 * Unit tests for enrichment analysis and provenance.
 */

// ── Mocks ────────────────────────────────────────────────

jest.mock("firebase-admin/app", () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => [{name: "mock-app"}]),
}));

const mockSet = jest.fn();
const mockGet = jest.fn();
const mockCollectionGet = jest.fn();
const mockCountGet = jest.fn();
const mockDoc = jest.fn(() => ({
  get: mockGet,
  set: mockSet,
}));
const mockCollection = jest.fn(() => ({
  orderBy: jest.fn(() => ({
    limit: jest.fn(() => ({get: mockCollectionGet})),
  })),
  count: jest.fn(() => ({get: mockCountGet})),
}));
jest.mock("firebase-admin/firestore", () => ({
  getFirestore: jest.fn(() => ({
    doc: mockDoc,
    collection: mockCollection,
  })),
  FieldValue: {serverTimestamp: jest.fn(() => "SERVER_TS")},
}));

jest.mock("firebase-admin/storage", () => ({
  getStorage: jest.fn(),
}));

jest.mock("firebase-functions/params", () => ({
  defineSecret: jest.fn(() => ({value: jest.fn()})),
}));

jest.mock("@sentry/node", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
}));

import {
  aggregateFeedback, analyzeEnrichmentFeedback,
} from "../enrichment/analysis";
import {buildProvenance} from "../enrichment/index";
import {
  ProgrammaticResult, ExtractionSource,
} from "../enrichment/types";

// ── aggregateFeedback tests ──────────────────────────────

function mkFeedback(
  ratings: Record<string, "good" | "bad">,
  provenance: Record<string, ExtractionSource> = {},
) {
  return {
    poiId: "poi1",
    website: "https://example.com",
    fieldRatings: ratings,
    fieldProvenance: provenance,
    appliedFields: Object.keys(ratings),
    skippedFields: [],
    note: null,
  };
}

describe("aggregateFeedback", () => {
  it("returns empty analysis for no docs", () => {
    const result = aggregateFeedback([]);
    expect(result.totalFeedbackCount).toBe(0);
    expect(result.byField).toEqual({});
    expect(result.topIssues).toEqual([]);
  });

  it("counts good and bad ratings per field", () => {
    const docs = [
      mkFeedback({phone: "good", email: "bad"}),
      mkFeedback({phone: "good", email: "good"}),
      mkFeedback({phone: "bad"}),
    ];
    const result = aggregateFeedback(docs);

    expect(result.byField.phone.total).toBe(3);
    expect(result.byField.phone.goodCount).toBe(2);
    expect(result.byField.phone.badCount).toBe(1);
    expect(result.byField.email.total).toBe(2);
    expect(result.byField.email.goodCount).toBe(1);
    expect(result.byField.email.badCount).toBe(1);
  });

  it("computes bad rate as fraction", () => {
    const docs = [
      mkFeedback({phone: "bad"}),
      mkFeedback({phone: "bad"}),
      mkFeedback({phone: "good"}),
      mkFeedback({phone: "good"}),
    ];
    const result = aggregateFeedback(docs);
    expect(result.byField.phone.badRate).toBe(0.5);
  });

  it("groups by provenance source", () => {
    const docs = [
      mkFeedback(
        {phone: "good"},
        {phone: "programmatic"},
      ),
      mkFeedback(
        {phone: "bad"},
        {phone: "programmatic"},
      ),
      mkFeedback(
        {phone: "good"},
        {phone: "llm"},
      ),
    ];
    const result = aggregateFeedback(docs);
    const bySource = result.byField.phone.bySource;

    expect(bySource.programmatic?.total).toBe(2);
    expect(bySource.programmatic?.bad).toBe(1);
    expect(bySource.llm?.total).toBe(1);
    expect(bySource.llm?.bad).toBe(0);
  });

  it("flags high severity when bad rate > 15%", () => {
    // 5 samples needed, 1 bad = 20% > 15%
    const docs = Array.from({length: 5}, (_, i) =>
      mkFeedback(
        {phone: i === 0 ? "bad" : "good"},
        {phone: "programmatic"},
      ),
    );
    const result = aggregateFeedback(docs);

    expect(result.topIssues.length).toBe(1);
    expect(result.topIssues[0].severity).toBe("high");
    expect(result.topIssues[0].field).toBe("phone");
    expect(result.topIssues[0].source).toBe("programmatic");
  });

  it("skips issues below min samples", () => {
    const docs = [
      mkFeedback(
        {phone: "bad"},
        {phone: "programmatic"},
      ),
      mkFeedback(
        {phone: "bad"},
        {phone: "programmatic"},
      ),
    ];
    const result = aggregateFeedback(docs);
    // Only 2 samples < 5 threshold
    expect(result.topIssues.length).toBe(0);
  });

  it("sorts issues: high first, then by bad rate", () => {
    // 6 docs: phone=3 bad/6 (50%), email=1 bad/6 (17%)
    const docs = Array.from({length: 6}, (_, i) =>
      mkFeedback(
        {
          phone: i < 3 ? "bad" : "good",
          email: i === 0 ? "bad" : "good",
        },
        {phone: "programmatic", email: "llm"},
      ),
    );
    const result = aggregateFeedback(docs);

    expect(result.topIssues.length).toBe(2);
    expect(result.topIssues[0].field).toBe("phone");
    expect(result.topIssues[1].field).toBe("email");
  });

  it("skips docs without fieldRatings", () => {
    const docs = [
      {
        poiId: "p1",
        website: "https://x.com",
        fieldRatings: null as unknown as Record<
          string, "good" | "bad"
        >,
        fieldProvenance: {},
        appliedFields: [],
        skippedFields: [],
        note: null,
      },
    ];
    const result = aggregateFeedback(docs);
    expect(result.totalFeedbackCount).toBe(1);
    expect(result.byField).toEqual({});
  });

  it("handles missing fieldProvenance gracefully", () => {
    const docs = [
      mkFeedback({phone: "good"}),
      mkFeedback({phone: "bad"}),
    ];
    // No provenance data — should still count
    const result = aggregateFeedback(docs);
    expect(result.byField.phone.total).toBe(2);
    expect(
      Object.keys(result.byField.phone.bySource).length,
    ).toBe(0);
  });
});

// ── buildProvenance tests ────────────────────────────────

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

const emptyLlm = {
  openingHours: null,
  price: null,
  whatsapp: null,
  description: null,
  address: null,
};

describe("buildProvenance", () => {
  it("marks programmatic-only fields", () => {
    const prog = mkProg({phone: "054-1234567"});
    const verified = {phone: "054-1234567"};
    const prov = buildProvenance(prog, emptyLlm, verified);

    expect(prov.phone.source).toBe("programmatic");
    expect(prov.phone.programmaticValue).toBe("054-1234567");
    expect(prov.phone.llmValue).toBeNull();
  });

  it("marks llm-only fields (price)", () => {
    const prog = mkProg();
    const llm = {...emptyLlm, price: "כניסה: 80₪"};
    const verified = {price: "כניסה: 80₪"};
    const prov = buildProvenance(prog, llm, verified);

    expect(prov.price.source).toBe("llm");
    expect(prov.price.llmValue).toBe("כניסה: 80₪");
  });

  it("marks llm_rejected when LLM value nulled", () => {
    const prog = mkProg();
    const llm = {...emptyLlm, price: "50₪"};
    const verified = {price: null};
    const prov = buildProvenance(prog, llm, verified);

    expect(prov.price.source).toBe("llm_rejected");
  });

  it("marks programmatic_preferred for shared fields", () => {
    const hours = {
      sunday: {open: "09:00", close: "17:00"},
      monday: null, tuesday: null, wednesday: null,
      thursday: null, friday: null, saturday: null,
    };
    const llmHours = {
      sunday: {open: "10:00", close: "18:00"},
      monday: null, tuesday: null, wednesday: null,
      thursday: null, friday: null, saturday: null,
    };
    const prog = mkProg({openingHours: hours});
    const llm = {
      ...emptyLlm, openingHours: llmHours,
    };
    const verified = {openingHours: hours};
    const prov = buildProvenance(prog, llm, verified);

    expect(prov.openingHours.source).toBe(
      "programmatic_preferred",
    );
  });

  it("marks both_agree when values match", () => {
    const prog = mkProg({whatsapp: "0521234567"});
    const llm = {...emptyLlm, whatsapp: "0521234567"};
    const verified = {whatsapp: "0521234567"};
    const prov = buildProvenance(prog, llm, verified);

    expect(prov.whatsapp.source).toBe("both_agree");
  });

  it("marks llm for shared field when prog is null", () => {
    const prog = mkProg({whatsapp: null});
    const llm = {...emptyLlm, whatsapp: "0529876543"};
    const verified = {whatsapp: "0529876543"};
    const prov = buildProvenance(prog, llm, verified);

    expect(prov.whatsapp.source).toBe("llm");
    expect(prov.whatsapp.llmValue).toBe("0529876543");
  });

  it("marks llm_rejected for shared field", () => {
    const prog = mkProg({whatsapp: null});
    const llm = {...emptyLlm, whatsapp: "0529876543"};
    const verified = {whatsapp: null};
    const prov = buildProvenance(prog, llm, verified);

    expect(prov.whatsapp.source).toBe("llm_rejected");
  });

  it("omits fields where neither layer found a value", () => {
    const prog = mkProg();
    const prov = buildProvenance(
      prog, emptyLlm, {},
    );
    expect(Object.keys(prov).length).toBe(0);
  });

  it("handles programmatic arrays (images/videos)", () => {
    const prog = mkProg({
      images: ["https://example.com/a.jpg"],
    });
    const verified = {
      images: ["https://example.com/a.jpg"],
    };
    const prov = buildProvenance(prog, emptyLlm, verified);

    expect(prov.images.source).toBe("programmatic");
    expect(prov.images.programmaticValue).toEqual(
      ["https://example.com/a.jpg"],
    );
  });

  it("skips empty arrays for programmatic fields", () => {
    const prog = mkProg({images: [], videos: []});
    const prov = buildProvenance(
      prog, emptyLlm, {},
    );
    expect(prov.images).toBeUndefined();
    expect(prov.videos).toBeUndefined();
  });
});

// ── analyzeEnrichmentFeedback CF tests ───────────────────

function makeRequest(overrides: object) {
  return {
    auth: {uid: "admin-uid", token: {role: "admin"}},
    data: {force: true},
    rawRequest: {},
    ...overrides,
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

describe("analyzeEnrichmentFeedback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws unauthenticated when no auth", async () => {
    await expect(
      analyzeEnrichmentFeedback.run(
        makeRequest({auth: null}),
      ),
    ).rejects.toMatchObject({code: "unauthenticated"});
  });

  it("throws permission-denied for non-admin", async () => {
    await expect(
      analyzeEnrichmentFeedback.run(
        makeRequest({
          auth: {
            uid: "u1",
            token: {role: "content_manager"},
          },
        }),
      ),
    ).rejects.toMatchObject({code: "permission-denied"});
  });

  it("returns analyzed:true with force flag", async () => {
    mockCollectionGet.mockResolvedValue({
      docs: [
        {
          data: () => ({
            fieldRatings: {phone: "good"},
            fieldProvenance: {phone: "programmatic"},
          }),
        },
      ],
      size: 1,
    });
    mockSet.mockResolvedValue(undefined);

    const result = await analyzeEnrichmentFeedback.run(
      makeRequest({data: {force: true}}),
    );
    expect(result).toMatchObject({analyzed: true});
    expect(mockSet).toHaveBeenCalled();
  });

  it("skips analysis below threshold", async () => {
    mockGet.mockResolvedValue({
      data: () => ({feedbackCountAtAnalysis: 10}),
    });
    mockCountGet.mockResolvedValue({
      data: () => ({count: 15}),
    });

    const result = await analyzeEnrichmentFeedback.run(
      makeRequest({data: {}}),
    );
    expect(result).toMatchObject({analyzed: false});
    expect(mockSet).not.toHaveBeenCalled();
  });
});
