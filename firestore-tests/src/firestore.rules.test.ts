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
  };

  const INACTIVE_POI = {
    name: "Inactive POI",
    active: false,
    businessId: "biz-1",
    description: "An inactive POI",
  };

  describe("READ", () => {
    it("allows unauthenticated user to read an active POI", async () => {
      await env.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "points_of_interest", "poi-1"), ACTIVE_POI);
      });

      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
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
      const bizUser = env.authenticatedContext("biz-user-uid", {
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
    it("allows unauthenticated user to read an icon", async () => {
      const unauthed = env.unauthenticatedContext();
      const db = unauthed.firestore();
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
