/**
 * Firestore Security Rules tests for click-bateva.
 *
 * Requires the Firestore emulator running on port 8080:
 *   firebase emulators:start --only firestore
 *
 * Run with:
 *   cd firestore-tests && npm test
 */

import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

// ── Config ────────────────────────────────────────────────────────────────────

const PROJECT_ID = "click-bateva";

// Load rules from monorepo root (two levels up from firestore-tests/src/)
const rulesContent = readFileSync(
  resolve(__dirname, "../../firestore.rules"),
  "utf-8"
);

// ── Test environment ──────────────────────────────────────────────────────────

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: rulesContent,
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await env.cleanup();
});

afterEach(async () => {
  await env.clearFirestore();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns a businessRef string that matches the format set by the
 * createBusinessUser Cloud Function (and compared in the Firestore rules).
 * Format: /databases/(default)/documents/businesses/<businessId>
 */
function businessRefPath(businessId: string): string {
  return `/databases/(default)/documents/businesses/${businessId}`;
}

// ── clicks collection ─────────────────────────────────────────────────────────

describe("clicks collection", () => {
  const VALID_CLICK = {
    poiId: "p1",
    categoryId: "c1",
    timestamp: serverTimestamp(),
  };

  describe("CREATE", () => {
    it("allows unauthenticated user to create a valid click", async () => {
      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertSucceeds(addDoc(collection(db, "clicks"), VALID_CLICK));
    });

    it("allows authenticated user to create a valid click", async () => {
      const authed = env.authenticatedContext("user-123");
      const db = authed.firestore();
      await assertSucceeds(addDoc(collection(db, "clicks"), VALID_CLICK));
    });

    it("denies create when an extra field is present", async () => {
      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertFails(
        addDoc(collection(db, "clicks"), {
          ...VALID_CLICK,
          extraField: "not-allowed",
        })
      );
    });

    it("denies create when required field poiId is missing", async () => {
      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertFails(
        addDoc(collection(db, "clicks"), {
          categoryId: "c1",
          timestamp: serverTimestamp(),
        })
      );
    });

    it("denies create when required field categoryId is missing", async () => {
      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertFails(
        addDoc(collection(db, "clicks"), {
          poiId: "p1",
          timestamp: serverTimestamp(),
        })
      );
    });

    it("denies create when required field timestamp is missing", async () => {
      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertFails(
        addDoc(collection(db, "clicks"), {
          poiId: "p1",
          categoryId: "c1",
        })
      );
    });

    it("denies create when poiId is not a string", async () => {
      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertFails(
        addDoc(collection(db, "clicks"), {
          poiId: 123,
          categoryId: "c1",
          timestamp: serverTimestamp(),
        })
      );
    });

    it("denies create when categoryId is not a string", async () => {
      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertFails(
        addDoc(collection(db, "clicks"), {
          poiId: "p1",
          categoryId: 456,
          timestamp: serverTimestamp(),
        })
      );
    });

    it("denies create when poiId exceeds 100 characters", async () => {
      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertFails(
        addDoc(collection(db, "clicks"), {
          poiId: "a".repeat(100),
          categoryId: "c1",
          timestamp: serverTimestamp(),
        })
      );
    });

    it("denies create when categoryId exceeds 100 characters", async () => {
      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertFails(
        addDoc(collection(db, "clicks"), {
          poiId: "p1",
          categoryId: "b".repeat(100),
          timestamp: serverTimestamp(),
        })
      );
    });

    // ── Role-based click suppression ──

    it("denies admin from creating a click", async () => {
      const admin = env.authenticatedContext("admin-uid", { role: "admin" });
      const db = admin.firestore();
      await assertFails(addDoc(collection(db, "clicks"), VALID_CLICK));
    });

    it("denies content_manager from creating a click", async () => {
      const cm = env.authenticatedContext("cm-uid", { role: "content_manager" });
      const db = cm.firestore();
      await assertFails(addDoc(collection(db, "clicks"), VALID_CLICK));
    });

    it("denies business_user from creating a click on their own POI", async () => {
      // Seed a POI that belongs to the business user (businessId = user uid)
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "points_of_interest", "biz-poi"), {
          name: "Business POI",
          active: true,
          businessId: "biz-user-uid",
          description: "Owned by biz-user-uid",
          mapType: "default",
          maps: { agents: { price: null, active: true }, groups: { price: null, active: true } },
        });
      });

      const bizUser = env.authenticatedContext("biz-user-uid", {
        role: "business_user",
        businessRef: businessRefPath("biz-user-uid"),
      });
      const db = bizUser.firestore();
      await assertFails(
        addDoc(collection(db, "clicks"), {
          poiId: "biz-poi",
          categoryId: "c1",
          timestamp: serverTimestamp(),
        })
      );
    });

    it("allows business_user to create a click on a different POI", async () => {
      // Seed a POI that belongs to someone else
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "points_of_interest", "other-poi"), {
          name: "Other POI",
          active: true,
          businessId: "other-biz-uid",
          description: "Not owned by biz-user-uid",
          mapType: "default",
          maps: { agents: { price: null, active: true }, groups: { price: null, active: true } },
        });
      });

      const bizUser = env.authenticatedContext("biz-user-uid", {
        role: "business_user",
        businessRef: businessRefPath("biz-user-uid"),
      });
      const db = bizUser.firestore();
      await assertSucceeds(
        addDoc(collection(db, "clicks"), {
          poiId: "other-poi",
          categoryId: "c1",
          timestamp: serverTimestamp(),
        })
      );
    });

    it("allows travel_agent to create a click", async () => {
      const agent = env.authenticatedContext("agent-uid", { role: "travel_agent" });
      const db = agent.firestore();
      await assertSucceeds(addDoc(collection(db, "clicks"), VALID_CLICK));
    });

    it("allows standard_user to create a click", async () => {
      const user = env.authenticatedContext("user-uid", { role: "standard_user" });
      const db = user.firestore();
      await assertSucceeds(addDoc(collection(db, "clicks"), VALID_CLICK));
    });
  });

  describe("READ", () => {
    it("denies read for unauthenticated users", async () => {
      // Seed a click doc via admin context
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "clicks", "click-1"), VALID_CLICK);
      });

      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertFails(getDoc(doc(db, "clicks", "click-1")));
    });

    it("denies read for standard_user", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "clicks", "click-1"), VALID_CLICK);
      });

      const user = env.authenticatedContext("user-123", {
        role: "standard_user",
      });
      const db = user.firestore();
      await assertFails(getDoc(doc(db, "clicks", "click-1")));
    });

    it("allows admin to read a click", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "clicks", "click-1"), VALID_CLICK);
      });

      const admin = env.authenticatedContext("admin-uid", { role: "admin" });
      const db = admin.firestore();
      await assertSucceeds(getDoc(doc(db, "clicks", "click-1")));
    });
  });

  describe("DELETE", () => {
    it("denies delete for unauthenticated users", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "clicks", "click-1"), VALID_CLICK);
      });

      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertFails(deleteDoc(doc(db, "clicks", "click-1")));
    });

    it("denies delete for standard_user", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "clicks", "click-1"), VALID_CLICK);
      });

      const user = env.authenticatedContext("user-123", {
        role: "standard_user",
      });
      const db = user.firestore();
      await assertFails(deleteDoc(doc(db, "clicks", "click-1")));
    });

    it("allows admin to delete a click", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "clicks", "click-1"), VALID_CLICK);
      });

      const admin = env.authenticatedContext("admin-uid", { role: "admin" });
      const db = admin.firestore();
      await assertSucceeds(deleteDoc(doc(db, "clicks", "click-1")));
    });
  });
});

// ── points_of_interest collection ─────────────────────────────────────────────

describe("points_of_interest collection", () => {
  const ACTIVE_POI = {
    name: "Test POI",
    active: true,
    businessId: "biz-1",
    description: "A test point of interest",
    mapType: "default",
    maps: { agents: { price: null, active: true }, groups: { price: null, active: true } },
  };

  const INACTIVE_POI = {
    name: "Inactive POI",
    active: false,
    businessId: "biz-1",
    description: "An inactive POI",
    mapType: "default",
    maps: { agents: { price: null, active: true }, groups: { price: null, active: true } },
  };

  const AGENTS_ONLY_POI = {
    name: "Agents Only POI",
    active: true,
    businessId: null,
    description: "Only visible on agents map",
    mapType: "default",
    maps: { agents: { price: "100", active: true }, groups: { price: null, active: false } },
  };

  const GROUPS_ONLY_POI = {
    name: "Groups Only POI",
    active: true,
    businessId: null,
    description: "Only visible on groups map",
    mapType: "default",
    maps: { agents: { price: null, active: false }, groups: { price: "200", active: true } },
  };

  const FAMILIES_POI = {
    name: "Families POI",
    active: true,
    businessId: null,
    description: "A families map POI",
    mapType: "families",
    price: "50",
  };

  const INACTIVE_FAMILIES_POI = {
    name: "Inactive Families POI",
    active: false,
    businessId: null,
    description: "An inactive families POI",
    mapType: "families",
    price: null,
  };

  describe("READ", () => {
    it("denies unauthenticated user from reading an active POI", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "points_of_interest", "poi-1"), ACTIVE_POI);
      });

      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertFails(getDoc(doc(db, "points_of_interest", "poi-1")));
    });

    it("allows anonymous (signed-in) user to read an active POI", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "points_of_interest", "poi-1"), ACTIVE_POI);
      });

      const anon = env.authenticatedContext("anon-uid");
      const db = anon.firestore();
      await assertSucceeds(getDoc(doc(db, "points_of_interest", "poi-1")));
    });

    it("denies unauthenticated user from reading an inactive POI", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), "points_of_interest", "poi-inactive"),
          INACTIVE_POI
        );
      });

      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertFails(
        getDoc(doc(db, "points_of_interest", "poi-inactive"))
      );
    });

    it("allows admin to read an inactive POI", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), "points_of_interest", "poi-inactive"),
          INACTIVE_POI
        );
      });

      const admin = env.authenticatedContext("admin-uid", { role: "admin" });
      const db = admin.firestore();
      await assertSucceeds(
        getDoc(doc(db, "points_of_interest", "poi-inactive"))
      );
    });

    it("allows content_manager to read an inactive POI", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), "points_of_interest", "poi-inactive"),
          INACTIVE_POI
        );
      });

      const cm = env.authenticatedContext("cm-uid", {
        role: "content_manager",
      });
      const db = cm.firestore();
      await assertSucceeds(
        getDoc(doc(db, "points_of_interest", "poi-inactive"))
      );
    });

    // ── Map-based read access ──

    it("denies unauthenticated user from reading an agents-only POI", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), "points_of_interest", "poi-agents"),
          AGENTS_ONLY_POI
        );
      });

      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertFails(
        getDoc(doc(db, "points_of_interest", "poi-agents"))
      );
    });

    it("denies unauthenticated user from reading a groups-only POI", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), "points_of_interest", "poi-groups"),
          GROUPS_ONLY_POI
        );
      });

      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertFails(
        getDoc(doc(db, "points_of_interest", "poi-groups"))
      );
    });

    it("allows anonymous (signed-in) user to read a groups-only POI", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), "points_of_interest", "poi-groups"),
          GROUPS_ONLY_POI
        );
      });

      const anon = env.authenticatedContext("anon-uid");
      const db = anon.firestore();
      await assertSucceeds(
        getDoc(doc(db, "points_of_interest", "poi-groups"))
      );
    });

    it("allows travel_agent to read an agents-only POI", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), "points_of_interest", "poi-agents"),
          AGENTS_ONLY_POI
        );
      });

      const agent = env.authenticatedContext("agent-uid", {
        role: "travel_agent",
      });
      const db = agent.firestore();
      await assertSucceeds(
        getDoc(doc(db, "points_of_interest", "poi-agents"))
      );
    });

    it("allows travel_agent to read a groups-only POI (groups POIs are public)", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), "points_of_interest", "poi-groups"),
          GROUPS_ONLY_POI
        );
      });

      const agent = env.authenticatedContext("agent-uid", {
        role: "travel_agent",
      });
      const db = agent.firestore();
      await assertSucceeds(
        getDoc(doc(db, "points_of_interest", "poi-groups"))
      );
    });

    it("denies travel_agent from reading a globally inactive agents POI", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), "points_of_interest", "poi-global-off"),
          { ...AGENTS_ONLY_POI, active: false }
        );
      });

      const agent = env.authenticatedContext("agent-uid", {
        role: "travel_agent",
      });
      const db = agent.firestore();
      await assertFails(
        getDoc(doc(db, "points_of_interest", "poi-global-off"))
      );
    });

    it("allows admin to read agents-only POI", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), "points_of_interest", "poi-agents"),
          AGENTS_ONLY_POI
        );
      });

      const admin = env.authenticatedContext("admin-uid", { role: "admin" });
      const db = admin.firestore();
      await assertSucceeds(
        getDoc(doc(db, "points_of_interest", "poi-agents"))
      );
    });

    it("allows admin to read groups-only POI", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), "points_of_interest", "poi-groups"),
          GROUPS_ONLY_POI
        );
      });

      const admin = env.authenticatedContext("admin-uid", { role: "admin" });
      const db = admin.firestore();
      await assertSucceeds(
        getDoc(doc(db, "points_of_interest", "poi-groups"))
      );
    });

    // ── Families map read access ──

    it("denies unauthenticated user from reading an active families POI", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), "points_of_interest", "poi-fam"),
          FAMILIES_POI
        );
      });

      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertFails(
        getDoc(doc(db, "points_of_interest", "poi-fam"))
      );
    });

    it("allows anonymous (signed-in) user to read an active families POI", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), "points_of_interest", "poi-fam"),
          FAMILIES_POI
        );
      });

      const anon = env.authenticatedContext("anon-uid");
      const db = anon.firestore();
      await assertSucceeds(
        getDoc(doc(db, "points_of_interest", "poi-fam"))
      );
    });

    it("denies unauthenticated user from reading an inactive families POI", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), "points_of_interest", "poi-fam-off"),
          INACTIVE_FAMILIES_POI
        );
      });

      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertFails(
        getDoc(doc(db, "points_of_interest", "poi-fam-off"))
      );
    });

    it("allows travel_agent to read an active families POI", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), "points_of_interest", "poi-fam"),
          FAMILIES_POI
        );
      });

      const agent = env.authenticatedContext("agent-uid", {
        role: "travel_agent",
      });
      const db = agent.firestore();
      await assertSucceeds(
        getDoc(doc(db, "points_of_interest", "poi-fam"))
      );
    });

    it("allows admin to read an inactive families POI", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), "points_of_interest", "poi-fam-off"),
          INACTIVE_FAMILIES_POI
        );
      });

      const admin = env.authenticatedContext("admin-uid", { role: "admin" });
      const db = admin.firestore();
      await assertSucceeds(
        getDoc(doc(db, "points_of_interest", "poi-fam-off"))
      );
    });
  });

  describe("CREATE", () => {
    it("allows admin to create a POI", async () => {
      const admin = env.authenticatedContext("admin-uid", { role: "admin" });
      const db = admin.firestore();
      await assertSucceeds(
        setDoc(doc(db, "points_of_interest", "new-poi"), ACTIVE_POI)
      );
    });

    it("allows content_manager to create a POI", async () => {
      const cm = env.authenticatedContext("cm-uid", {
        role: "content_manager",
      });
      const db = cm.firestore();
      await assertSucceeds(
        setDoc(doc(db, "points_of_interest", "new-poi"), ACTIVE_POI)
      );
    });

    it("denies unauthenticated user from creating a POI", async () => {
      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertFails(
        setDoc(doc(db, "points_of_interest", "new-poi"), ACTIVE_POI)
      );
    });

    it("denies business_user from creating a POI", async () => {
      const bizUser = env.authenticatedContext("biz-uid", {
        role: "business_user",
        businessRef: businessRefPath("biz-1"),
      });
      const db = bizUser.firestore();
      await assertFails(
        setDoc(doc(db, "points_of_interest", "new-poi"), ACTIVE_POI)
      );
    });

    it("allows admin to create a families POI", async () => {
      const admin = env.authenticatedContext("admin-uid", { role: "admin" });
      const db = admin.firestore();
      await assertSucceeds(
        setDoc(doc(db, "points_of_interest", "new-fam"), FAMILIES_POI)
      );
    });

    it("denies admin from creating a POI with invalid mapType", async () => {
      const admin = env.authenticatedContext("admin-uid", { role: "admin" });
      const db = admin.firestore();
      await assertFails(
        setDoc(doc(db, "points_of_interest", "bad-type"), {
          ...ACTIVE_POI,
          mapType: "invalid",
        })
      );
    });
  });

  describe("UPDATE", () => {
    it("allows business_user to update editable fields on their own POI", async () => {
      // Seed the business with associatedUserIds
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "businesses", "biz-1"), {
          name: "Test Business",
          associatedUserIds: ["biz-user-uid"],
        });
        await setDoc(
          doc(ctx.firestore(), "points_of_interest", "poi-biz"),
          ACTIVE_POI
        );
      });

      const bizUser = env.authenticatedContext("biz-user-uid", {
        role: "business_user",
        businessRef: businessRefPath("biz-1"),
      });
      const db = bizUser.firestore();
      await assertSucceeds(
        updateDoc(doc(db, "points_of_interest", "poi-biz"), {
          description: "Updated description",
          phone: "050-1234567",
          email: "biz@example.com",
          website: "https://example.com",
          updatedAt: serverTimestamp(),
        })
      );
    });

    it("allows business_user to update whatsapp field on their own POI", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "businesses", "biz-1"), {
          name: "Test Business",
          associatedUserIds: ["biz-user-uid"],
        });
        await setDoc(
          doc(ctx.firestore(), "points_of_interest", "poi-biz"),
          ACTIVE_POI
        );
      });

      const bizUser = env.authenticatedContext("biz-user-uid", {
        role: "business_user",
        businessRef: businessRefPath("biz-1"),
      });
      const db = bizUser.firestore();
      await assertSucceeds(
        updateDoc(doc(db, "points_of_interest", "poi-biz"), {
          whatsapp: "972-50-1234567",
          updatedAt: serverTimestamp(),
        })
      );
    });

    it("denies business_user from updating iconId/iconUrl (admin-only fields)", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "businesses", "biz-1"), {
          name: "Test Business",
          associatedUserIds: ["biz-user-uid"],
        });
        await setDoc(
          doc(ctx.firestore(), "points_of_interest", "poi-biz"),
          ACTIVE_POI
        );
      });

      const bizUser = env.authenticatedContext("biz-user-uid", {
        role: "business_user",
        businessRef: businessRefPath("biz-1"),
      });
      const db = bizUser.firestore();
      await assertFails(
        updateDoc(doc(db, "points_of_interest", "poi-biz"), {
          iconId: "icon-123",
          iconUrl: "https://example.com/icon.png",
          updatedAt: serverTimestamp(),
        })
      );
    });

    it("denies business_user from updating non-editable fields on their own POI", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "businesses", "biz-1"), {
          name: "Test Business",
          associatedUserIds: ["biz-user-uid"],
        });
        await setDoc(
          doc(ctx.firestore(), "points_of_interest", "poi-biz"),
          ACTIVE_POI
        );
      });

      const bizUser = env.authenticatedContext("biz-user-uid", {
        role: "business_user",
        businessRef: businessRefPath("biz-1"),
      });
      const db = bizUser.firestore();
      // Attempting to update 'active' which is not in the allowed fields list
      await assertFails(
        updateDoc(doc(db, "points_of_interest", "poi-biz"), {
          active: false,
        })
      );
    });

    it("denies business_user from updating a POI they are not associated with", async () => {
      // Seed two businesses: biz-1 (user belongs to) and biz-2 (user does NOT belong to)
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "businesses", "biz-1"), {
          name: "Their Business",
          associatedUserIds: ["biz-user-uid"],
        });
        await setDoc(doc(ctx.firestore(), "businesses", "biz-2"), {
          name: "Other Business",
          associatedUserIds: ["other-user-uid"],
        });
        // POI belongs to biz-2, not biz-1
        await setDoc(
          doc(ctx.firestore(), "points_of_interest", "poi-other-biz"),
          {
            name: "Other Biz POI",
            active: true,
            businessId: "biz-2",
            description: "Belongs to another business",
          }
        );
      });

      const bizUser = env.authenticatedContext("biz-user-uid", {
        role: "business_user",
        businessRef: businessRefPath("biz-1"),
      });
      const db = bizUser.firestore();
      await assertFails(
        updateDoc(doc(db, "points_of_interest", "poi-other-biz"), {
          description: "Trying to update another business POI",
        })
      );
    });

    it("allows admin to update any field on a POI", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), "points_of_interest", "poi-1"),
          ACTIVE_POI
        );
      });

      const admin = env.authenticatedContext("admin-uid", { role: "admin" });
      const db = admin.firestore();
      await assertSucceeds(
        updateDoc(doc(db, "points_of_interest", "poi-1"), {
          active: false,
          name: "Renamed POI",
        })
      );
    });
  });

  describe("DELETE", () => {
    it("allows admin to delete a POI", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "points_of_interest", "poi-del"), ACTIVE_POI);
      });

      const admin = env.authenticatedContext("admin-uid", { role: "admin" });
      const db = admin.firestore();
      await assertSucceeds(deleteDoc(doc(db, "points_of_interest", "poi-del")));
    });

    it("denies content_manager from deleting a POI", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "points_of_interest", "poi-del"), ACTIVE_POI);
      });

      const cm = env.authenticatedContext("cm-uid", { role: "content_manager" });
      const db = cm.firestore();
      await assertFails(deleteDoc(doc(db, "points_of_interest", "poi-del")));
    });

    it("denies business_user from deleting a POI", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "points_of_interest", "poi-del"), ACTIVE_POI);
      });

      const bizUser = env.authenticatedContext("biz-uid", {
        role: "business_user",
        businessRef: "/databases/(default)/documents/businesses/biz-1",
      });
      const db = bizUser.firestore();
      await assertFails(deleteDoc(doc(db, "points_of_interest", "poi-del")));
    });

    it("denies unauthenticated user from deleting a POI", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "points_of_interest", "poi-del"), ACTIVE_POI);
      });

      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertFails(deleteDoc(doc(db, "points_of_interest", "poi-del")));
    });
  });
});

// ── businesses collection ─────────────────────────────────────────────────────

describe("businesses collection", () => {
  const BUSINESS_DOC = {
    name: "Test Business",
    associatedUserIds: ["biz-user-uid"],
  };

  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "businesses", "biz-1"), BUSINESS_DOC);
      await setDoc(doc(ctx.firestore(), "businesses", "biz-2"), {
        name: "Another Business",
        associatedUserIds: ["other-user-uid"],
      });
    });
  });

  describe("READ", () => {
    it("allows admin to read any business document", async () => {
      const admin = env.authenticatedContext("admin-uid", { role: "admin" });
      const db = admin.firestore();
      await assertSucceeds(getDoc(doc(db, "businesses", "biz-1")));
      await assertSucceeds(getDoc(doc(db, "businesses", "biz-2")));
    });

    it("allows business_user to read their own business document", async () => {
      // Rule: request.auth.uid == businessId — so uid must equal the doc ID
      const bizUser = env.authenticatedContext("biz-1", {
        role: "business_user",
        businessRef: businessRefPath("biz-1"),
      });
      const db = bizUser.firestore();
      await assertSucceeds(getDoc(doc(db, "businesses", "biz-1")));
    });

    it("denies business_user from reading a different business document", async () => {
      const bizUser = env.authenticatedContext("biz-user-uid", {
        role: "business_user",
        businessRef: businessRefPath("biz-1"),
      });
      const db = bizUser.firestore();
      // biz-2 does not match their businessRef claim
      await assertFails(getDoc(doc(db, "businesses", "biz-2")));
    });

    it("denies unauthenticated user from reading a business document", async () => {
      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertFails(getDoc(doc(db, "businesses", "biz-1")));
    });

    it("denies standard_user from reading any business document", async () => {
      const user = env.authenticatedContext("user-uid", {
        role: "standard_user",
      });
      const db = user.firestore();
      await assertFails(getDoc(doc(db, "businesses", "biz-1")));
    });
  });

  describe("WRITE", () => {
    it("allows admin to create a business document", async () => {
      const admin = env.authenticatedContext("admin-uid", { role: "admin" });
      const db = admin.firestore();
      await assertSucceeds(
        setDoc(doc(db, "businesses", "new-biz"), { name: "New Business" })
      );
    });

    it("denies business_user from creating a business document", async () => {
      const bizUser = env.authenticatedContext("biz-user-uid", {
        role: "business_user",
        businessRef: businessRefPath("biz-1"),
      });
      const db = bizUser.firestore();
      await assertFails(
        setDoc(doc(db, "businesses", "new-biz"), { name: "Rogue Business" })
      );
    });

    it("denies unauthenticated user from writing a business document", async () => {
      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertFails(
        setDoc(doc(db, "businesses", "biz-1"), BUSINESS_DOC)
      );
    });
  });
});

// ── icons collection ──────────────────────────────────────────────────────────

describe("icons collection", () => {
  const ICON_DOC = { name: "restaurant", url: "https://example.com/icon.png" };

  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "icons", "icon-1"), ICON_DOC);
    });
  });

  describe("READ", () => {
    it("denies unauthenticated user from reading an icon", async () => {
      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertFails(getDoc(doc(db, "icons", "icon-1")));
    });

    it("allows anonymous (signed-in) user to read an icon", async () => {
      const anon = env.authenticatedContext("anon-uid");
      const db = anon.firestore();
      await assertSucceeds(getDoc(doc(db, "icons", "icon-1")));
    });

    it("allows authenticated user to read an icon", async () => {
      const user = env.authenticatedContext("user-uid");
      const db = user.firestore();
      await assertSucceeds(getDoc(doc(db, "icons", "icon-1")));
    });
  });

  describe("WRITE", () => {
    it("denies unauthenticated user from creating an icon", async () => {
      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertFails(
        setDoc(doc(db, "icons", "new-icon"), ICON_DOC)
      );
    });

    it("denies unauthenticated user from updating an icon", async () => {
      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertFails(
        updateDoc(doc(db, "icons", "icon-1"), { name: "modified" })
      );
    });

    it("denies unauthenticated user from deleting an icon", async () => {
      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertFails(deleteDoc(doc(db, "icons", "icon-1")));
    });

    it("denies standard_user from writing an icon", async () => {
      const user = env.authenticatedContext("user-uid", {
        role: "standard_user",
      });
      const db = user.firestore();
      await assertFails(
        setDoc(doc(db, "icons", "new-icon"), ICON_DOC)
      );
    });

    it("allows admin to write an icon", async () => {
      const admin = env.authenticatedContext("admin-uid", { role: "admin" });
      const db = admin.firestore();
      await assertSucceeds(
        setDoc(doc(db, "icons", "new-icon"), ICON_DOC)
      );
    });

    it("allows content_manager to write an icon", async () => {
      const cm = env.authenticatedContext("cm-uid", {
        role: "content_manager",
      });
      const db = cm.firestore();
      await assertSucceeds(
        setDoc(doc(db, "icons", "new-icon"), ICON_DOC)
      );
    });
  });
});

// ── trips collection ──────────────────────────────────────────────────────────

describe("trips collection", () => {
  const USER_UID = "user-uid-1";
  const OTHER_USER_UID = "user-uid-2";

  const UNSHARED_TRIP = {
    ownerId: USER_UID,
    clientName: "משפחת כהן",
    pois: [],
    numDays: 2,
    isShared: false,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  const SHARED_TRIP = {
    ownerId: USER_UID,
    clientName: "משפחת לוי",
    pois: [],
    numDays: 3,
    isShared: true,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  function signedInUser(uid: string, role = "standard_user") {
    return env.authenticatedContext(uid, { role });
  }

  describe("CREATE", () => {
    it("allows any signed-in user to create a trip with their own ownerId", async () => {
      const ctx = signedInUser(USER_UID);
      const db = ctx.firestore();
      await assertSucceeds(
        addDoc(collection(db, "trips"), UNSHARED_TRIP)
      );
    });

    it("allows travel_agent to create a trip", async () => {
      const ctx = signedInUser(USER_UID, "travel_agent");
      const db = ctx.firestore();
      await assertSucceeds(
        addDoc(collection(db, "trips"), UNSHARED_TRIP)
      );
    });

    it("allows admin to create a trip with their own ownerId", async () => {
      const ctx = signedInUser("admin-uid", "admin");
      const db = ctx.firestore();
      await assertSucceeds(
        addDoc(collection(db, "trips"), {
          ...UNSHARED_TRIP,
          ownerId: "admin-uid",
        })
      );
    });

    it("denies creating a trip with someone else's ownerId", async () => {
      const ctx = signedInUser(USER_UID);
      const db = ctx.firestore();
      await assertFails(
        addDoc(collection(db, "trips"), {
          ...UNSHARED_TRIP,
          ownerId: OTHER_USER_UID,
        })
      );
    });

    it("denies unauthenticated user from creating a trip", async () => {
      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertFails(
        addDoc(collection(db, "trips"), UNSHARED_TRIP)
      );
    });
  });

  describe("READ", () => {
    beforeEach(async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), "trips", "trip-unshared"),
          UNSHARED_TRIP
        );
        await setDoc(
          doc(ctx.firestore(), "trips", "trip-shared"),
          SHARED_TRIP
        );
        await setDoc(
          doc(ctx.firestore(), "trips", "trip-other-user"),
          { ...UNSHARED_TRIP, ownerId: OTHER_USER_UID }
        );
      });
    });

    it("allows signed-in user to read their own unshared trip", async () => {
      const ctx = signedInUser(USER_UID);
      const db = ctx.firestore();
      await assertSucceeds(getDoc(doc(db, "trips", "trip-unshared")));
    });

    it("allows signed-in user to read their own shared trip", async () => {
      const ctx = signedInUser(USER_UID);
      const db = ctx.firestore();
      await assertSucceeds(getDoc(doc(db, "trips", "trip-shared")));
    });

    it("denies signed-in user from reading another user's unshared trip", async () => {
      const ctx = signedInUser(USER_UID);
      const db = ctx.firestore();
      await assertFails(getDoc(doc(db, "trips", "trip-other-user")));
    });

    it("allows unauthenticated user to read a shared trip", async () => {
      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertSucceeds(getDoc(doc(db, "trips", "trip-shared")));
    });

    it("denies unauthenticated user from reading an unshared trip", async () => {
      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertFails(getDoc(doc(db, "trips", "trip-unshared")));
    });
  });

  describe("UPDATE", () => {
    beforeEach(async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), "trips", "trip-1"),
          UNSHARED_TRIP
        );
        await setDoc(doc(ctx.firestore(), "trips", "trip-other"), {
          ...UNSHARED_TRIP,
          ownerId: OTHER_USER_UID,
        });
      });
    });

    it("allows signed-in user to update their own trip", async () => {
      const ctx = signedInUser(USER_UID);
      const db = ctx.firestore();
      await assertSucceeds(
        updateDoc(doc(db, "trips", "trip-1"), {
          clientName: "משפחת גולן",
          updatedAt: Date.now(),
        })
      );
    });

    it("denies signed-in user from updating another user's trip", async () => {
      const ctx = signedInUser(USER_UID);
      const db = ctx.firestore();
      await assertFails(
        updateDoc(doc(db, "trips", "trip-other"), {
          clientName: "Hacked",
        })
      );
    });

    it("denies unauthenticated user from updating a trip", async () => {
      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertFails(
        updateDoc(doc(db, "trips", "trip-1"), { clientName: "Hacked" })
      );
    });
  });

  describe("DELETE", () => {
    beforeEach(async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), "trips", "trip-del"),
          UNSHARED_TRIP
        );
        await setDoc(
          doc(ctx.firestore(), "trips", "trip-other-del"),
          { ...UNSHARED_TRIP, ownerId: OTHER_USER_UID }
        );
      });
    });

    it("allows signed-in user to delete their own trip", async () => {
      const ctx = signedInUser(USER_UID);
      const db = ctx.firestore();
      await assertSucceeds(deleteDoc(doc(db, "trips", "trip-del")));
    });

    it("denies signed-in user from deleting another user's trip", async () => {
      const ctx = signedInUser(USER_UID);
      const db = ctx.firestore();
      await assertFails(deleteDoc(doc(db, "trips", "trip-other-del")));
    });

    it("denies unauthenticated user from deleting a trip", async () => {
      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
      await assertFails(deleteDoc(doc(db, "trips", "trip-del")));
    });
  });
});

// ── CRM contacts collection ──────────────────────────────────────────────────

describe("crm_contacts collection", () => {
  const mkContactData = (uid: string, email: string) => ({
    name: "Test Contact",
    businessName: "Test Biz",
    phone: "050-1234567",
    email: "test@example.com",
    createdBy: uid,
    createdByEmail: email,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  it("allows crm_user to create a contact", async () => {
    const crm = env.authenticatedContext("crm-uid", {
      role: "crm_user",
    });
    const db = crm.firestore();
    await assertSucceeds(
      addDoc(
        collection(db, "crm_contacts"),
        mkContactData("crm-uid", "crm@example.com")
      )
    );
  });

  it("allows admin to create a contact", async () => {
    const admin = env.authenticatedContext("admin-uid", {
      role: "admin",
    });
    const db = admin.firestore();
    await assertSucceeds(
      addDoc(
        collection(db, "crm_contacts"),
        mkContactData("admin-uid", "admin@example.com")
      )
    );
  });

  it("denies create with mismatched createdBy", async () => {
    const crm = env.authenticatedContext("crm-uid", {
      role: "crm_user",
    });
    const db = crm.firestore();
    await assertFails(
      addDoc(
        collection(db, "crm_contacts"),
        mkContactData("other-uid", "other@example.com")
      )
    );
  });

  it("denies create with extra fields", async () => {
    const crm = env.authenticatedContext("crm-uid", {
      role: "crm_user",
    });
    const db = crm.firestore();
    await assertFails(
      addDoc(collection(db, "crm_contacts"), {
        ...mkContactData("crm-uid", "crm@example.com"),
        extraField: "hack",
      })
    );
  });

  it("denies content_manager from creating a contact", async () => {
    const cm = env.authenticatedContext("cm-uid", {
      role: "content_manager",
    });
    const db = cm.firestore();
    await assertFails(
      addDoc(
        collection(db, "crm_contacts"),
        mkContactData("cm-uid", "cm@example.com")
      )
    );
  });

  it("denies unauthenticated from reading contacts", async () => {
    const unauthed = env.unauthenticatedContext();
    const db = unauthed.firestore();
    await assertFails(
      getDoc(doc(db, "crm_contacts", "c1"))
    );
  });

  it("allows crm_user to read a contact", async () => {
    const adminCtx = env.authenticatedContext("admin-uid", {
      role: "admin",
    });
    await setDoc(
      doc(adminCtx.firestore(), "crm_contacts", "c1"),
      mkContactData("admin-uid", "admin@example.com")
    );

    const crm = env.authenticatedContext("crm-uid", {
      role: "crm_user",
    });
    const db = crm.firestore();
    await assertSucceeds(getDoc(doc(db, "crm_contacts", "c1")));
  });

  it("allows crm_user to update allowed fields", async () => {
    const adminCtx = env.authenticatedContext("admin-uid", {
      role: "admin",
    });
    await setDoc(
      doc(adminCtx.firestore(), "crm_contacts", "c1"),
      mkContactData("admin-uid", "admin@example.com")
    );

    const crm = env.authenticatedContext("crm-uid", {
      role: "crm_user",
    });
    const db = crm.firestore();
    await assertSucceeds(
      updateDoc(doc(db, "crm_contacts", "c1"), {
        name: "Updated",
        updatedAt: serverTimestamp(),
      })
    );
  });

  it("denies crm_user from updating disallowed fields", async () => {
    const adminCtx = env.authenticatedContext("admin-uid", {
      role: "admin",
    });
    await setDoc(
      doc(adminCtx.firestore(), "crm_contacts", "c1"),
      mkContactData("admin-uid", "admin@example.com")
    );

    const crm = env.authenticatedContext("crm-uid", {
      role: "crm_user",
    });
    const db = crm.firestore();
    await assertFails(
      updateDoc(doc(db, "crm_contacts", "c1"), {
        createdBy: "crm-uid",
      })
    );
  });

  it("denies crm_user from deleting a contact", async () => {
    const adminCtx = env.authenticatedContext("admin-uid", {
      role: "admin",
    });
    await setDoc(
      doc(adminCtx.firestore(), "crm_contacts", "c1"),
      mkContactData("admin-uid", "admin@example.com")
    );

    const crm = env.authenticatedContext("crm-uid", {
      role: "crm_user",
    });
    const db = crm.firestore();
    await assertFails(deleteDoc(doc(db, "crm_contacts", "c1")));
  });

  it("allows admin to delete a contact", async () => {
    const admin = env.authenticatedContext("admin-uid", {
      role: "admin",
    });
    const db = admin.firestore();
    await setDoc(
      doc(db, "crm_contacts", "c1"),
      mkContactData("admin-uid", "admin@example.com")
    );
    await assertSucceeds(deleteDoc(doc(db, "crm_contacts", "c1")));
  });
});

// ── CRM contacts activity_log subcollection ──────────────────────────────────

describe("crm_contacts activity_log subcollection", () => {
  const mkLogEntry = (uid: string, email: string) => ({
    text: "Called, interested",
    createdBy: uid,
    createdByEmail: email,
    createdAt: serverTimestamp(),
  });

  it("allows crm_user to add an activity log entry", async () => {
    const adminCtx = env.authenticatedContext("admin-uid", {
      role: "admin",
    });
    await setDoc(
      doc(adminCtx.firestore(), "crm_contacts", "c1"),
      { name: "Test" }
    );

    const crm = env.authenticatedContext("crm-uid", {
      role: "crm_user",
    });
    const db = crm.firestore();
    await assertSucceeds(
      addDoc(
        collection(db, "crm_contacts", "c1", "activity_log"),
        mkLogEntry("crm-uid", "crm@example.com")
      )
    );
  });

  it("denies activity log create with mismatched createdBy", async () => {
    const adminCtx = env.authenticatedContext("admin-uid", {
      role: "admin",
    });
    await setDoc(
      doc(adminCtx.firestore(), "crm_contacts", "c1"),
      { name: "Test" }
    );

    const crm = env.authenticatedContext("crm-uid", {
      role: "crm_user",
    });
    const db = crm.firestore();
    await assertFails(
      addDoc(
        collection(db, "crm_contacts", "c1", "activity_log"),
        mkLogEntry("other-uid", "other@example.com")
      )
    );
  });

  it("allows crm_user to read activity log", async () => {
    const adminCtx = env.authenticatedContext("admin-uid", {
      role: "admin",
    });
    const adminDb = adminCtx.firestore();
    await setDoc(doc(adminDb, "crm_contacts", "c1"), { name: "T" });
    await setDoc(
      doc(adminDb, "crm_contacts", "c1", "activity_log", "l1"),
      mkLogEntry("admin-uid", "admin@example.com")
    );

    const crm = env.authenticatedContext("crm-uid", {
      role: "crm_user",
    });
    const db = crm.firestore();
    await assertSucceeds(
      getDoc(doc(db, "crm_contacts", "c1", "activity_log", "l1"))
    );
  });

  it("denies crm_user from deleting activity log", async () => {
    const adminCtx = env.authenticatedContext("admin-uid", {
      role: "admin",
    });
    const adminDb = adminCtx.firestore();
    await setDoc(doc(adminDb, "crm_contacts", "c1"), { name: "T" });
    await setDoc(
      doc(adminDb, "crm_contacts", "c1", "activity_log", "l1"),
      mkLogEntry("admin-uid", "admin@example.com")
    );

    const crm = env.authenticatedContext("crm-uid", {
      role: "crm_user",
    });
    const db = crm.firestore();
    await assertFails(
      deleteDoc(
        doc(db, "crm_contacts", "c1", "activity_log", "l1")
      )
    );
  });

  it("denies content_manager from adding activity log", async () => {
    const adminCtx = env.authenticatedContext("admin-uid", {
      role: "admin",
    });
    await setDoc(
      doc(adminCtx.firestore(), "crm_contacts", "c1"),
      { name: "T" }
    );

    const cm = env.authenticatedContext("cm-uid", {
      role: "content_manager",
    });
    const db = cm.firestore();
    await assertFails(
      addDoc(
        collection(db, "crm_contacts", "c1", "activity_log"),
        mkLogEntry("cm-uid", "cm@example.com")
      )
    );
  });
});

// ── CRM tasks collection ─────────────────────────────────────────────────────

describe("crm_tasks collection", () => {
  const mkTaskData = (uid: string, email: string) => ({
    contactId: "c1",
    contactName: "Test Contact",
    title: "Call back",
    description: "Follow up",
    date: new Date(),
    color: "#FF0000",
    priority: "high",
    assigneeUid: uid,
    assigneeEmail: email,
    followers: [],
    createdBy: uid,
    createdByEmail: email,
    completed: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  it("allows crm_user to create a task", async () => {
    const crm = env.authenticatedContext("crm-uid", {
      role: "crm_user",
    });
    const db = crm.firestore();
    await assertSucceeds(
      addDoc(
        collection(db, "crm_tasks"),
        mkTaskData("crm-uid", "crm@example.com")
      )
    );
  });

  it("allows admin to create a task", async () => {
    const admin = env.authenticatedContext("admin-uid", {
      role: "admin",
    });
    const db = admin.firestore();
    await assertSucceeds(
      addDoc(
        collection(db, "crm_tasks"),
        mkTaskData("admin-uid", "admin@example.com")
      )
    );
  });

  it("denies create with mismatched createdBy", async () => {
    const crm = env.authenticatedContext("crm-uid", {
      role: "crm_user",
    });
    const db = crm.firestore();
    await assertFails(
      addDoc(
        collection(db, "crm_tasks"),
        mkTaskData("other-uid", "other@example.com")
      )
    );
  });

  it("allows crm_user to update allowed fields", async () => {
    const adminCtx = env.authenticatedContext("admin-uid", {
      role: "admin",
    });
    await setDoc(
      doc(adminCtx.firestore(), "crm_tasks", "t1"),
      mkTaskData("admin-uid", "admin@example.com")
    );

    const crm = env.authenticatedContext("crm-uid", {
      role: "crm_user",
    });
    const db = crm.firestore();
    await assertSucceeds(
      updateDoc(doc(db, "crm_tasks", "t1"), {
        assigneeUid: "other-uid",
        assigneeEmail: "other@example.com",
      })
    );
  });

  it("denies crm_user from updating disallowed fields", async () => {
    const adminCtx = env.authenticatedContext("admin-uid", {
      role: "admin",
    });
    await setDoc(
      doc(adminCtx.firestore(), "crm_tasks", "t1"),
      mkTaskData("admin-uid", "admin@example.com")
    );

    const crm = env.authenticatedContext("crm-uid", {
      role: "crm_user",
    });
    const db = crm.firestore();
    await assertFails(
      updateDoc(doc(db, "crm_tasks", "t1"), {
        createdBy: "crm-uid",
      })
    );
  });

  it("denies crm_user from deleting a task", async () => {
    const adminCtx = env.authenticatedContext("admin-uid", {
      role: "admin",
    });
    await setDoc(
      doc(adminCtx.firestore(), "crm_tasks", "t1"),
      mkTaskData("admin-uid", "admin@example.com")
    );

    const crm = env.authenticatedContext("crm-uid", {
      role: "crm_user",
    });
    const db = crm.firestore();
    await assertFails(deleteDoc(doc(db, "crm_tasks", "t1")));
  });

  it("allows admin to delete a task", async () => {
    const admin = env.authenticatedContext("admin-uid", {
      role: "admin",
    });
    const db = admin.firestore();
    await setDoc(
      doc(db, "crm_tasks", "t1"),
      mkTaskData("admin-uid", "admin@example.com")
    );
    await assertSucceeds(deleteDoc(doc(db, "crm_tasks", "t1")));
  });

  it("denies content_manager from accessing tasks", async () => {
    const cm = env.authenticatedContext("cm-uid", {
      role: "content_manager",
    });
    const db = cm.firestore();
    await assertFails(
      addDoc(
        collection(db, "crm_tasks"),
        mkTaskData("cm-uid", "cm@example.com")
      )
    );
  });

  it("denies unauthenticated from reading tasks", async () => {
    const unauthed = env.unauthenticatedContext();
    const db = unauthed.firestore();
    await assertFails(getDoc(doc(db, "crm_tasks", "t1")));
  });
});

// ── CRM user can read users collection (for assignee picker) ────────────────

describe("crm_user reading users collection", () => {
  it("allows crm_user to read any user doc", async () => {
    const adminCtx = env.authenticatedContext("admin-uid", {
      role: "admin",
    });
    await setDoc(
      doc(adminCtx.firestore(), "users", "other-uid"),
      { email: "other@example.com", role: "crm_user" }
    );

    const crm = env.authenticatedContext("crm-uid", {
      role: "crm_user",
    });
    const db = crm.firestore();
    await assertSucceeds(
      getDoc(doc(db, "users", "other-uid"))
    );
  });
});
