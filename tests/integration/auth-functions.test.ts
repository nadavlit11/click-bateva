/**
 * Integration tests for Cloud Functions — onUserCreated and setUserRole.
 *
 * Requires emulators running:
 *   firebase emulators:start --only auth,functions,firestore
 */

import { initializeApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  Auth,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  getDoc,
  Firestore,
} from "firebase/firestore";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
  Functions,
} from "firebase/functions";

// ── Emulator config ───────────────────────────────────────────────────────────

const PROJECT_ID = "click-bateva";
const RUN = Date.now(); // unique suffix per test run to avoid email conflicts

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;

beforeAll(() => {
  app = initializeApp({ projectId: PROJECT_ID, apiKey: "test-key" }, `test-${RUN}`);
  auth = getAuth(app);
  db = getFirestore(app);
  functions = getFunctions(app);

  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
});

afterEach(async () => {
  await signOut(auth).catch(() => {});
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function setClaimViaEmulator(uid: string, claims: object): Promise<void> {
  const res = await fetch(
    `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer owner",
      },
      body: JSON.stringify({
        localId: uid,
        customAttributes: JSON.stringify(claims),
      }),
    }
  );
  if (!res.ok) throw new Error(`Emulator claim update failed: ${await res.text()}`);
}

function email(label: string): string {
  return `${label}-${RUN}@example.com`;
}

// ── onUserCreated ─────────────────────────────────────────────────────────────

describe("onUserCreated trigger", () => {
  it("creates a Firestore users/{uid} doc with role standard_user", async () => {
    const cred = await createUserWithEmailAndPassword(auth, email("trigger-1"), "password123");
    const uid = cred.user.uid;

    // Wait for the async trigger to fire (generous buffer for cold start)
    await new Promise((r) => setTimeout(r, 5000));

    const snap = await getDoc(doc(db, "users", uid));
    expect(snap.exists()).toBe(true);
    expect(snap.data()?.role).toBe("standard_user");
    expect(snap.data()?.uid).toBe(uid);
    expect(snap.data()?.email).toBe(email("trigger-1"));
  });

  it("sets custom claim role=standard_user on the new user", async () => {
    const cred = await createUserWithEmailAndPassword(auth, email("trigger-2"), "password123");

    await new Promise((r) => setTimeout(r, 5000));

    await cred.user.getIdToken(true);
    const tokenResult = await cred.user.getIdTokenResult(true);
    expect(tokenResult.claims["role"]).toBe("standard_user");
  });
});

// ── setUserRole ───────────────────────────────────────────────────────────────

describe("setUserRole callable", () => {
  it("rejects an unauthenticated caller", async () => {
    const setUserRole = httpsCallable(functions, "setUserRole");
    await expect(
      setUserRole({ uid: "any", role: "admin" })
    ).rejects.toMatchObject({ code: "functions/unauthenticated" });
  });

  it("rejects a non-admin caller (standard_user)", async () => {
    const setUserRole = httpsCallable(functions, "setUserRole");
    await createUserWithEmailAndPassword(auth, email("nonadmin"), "password123");
    await signInWithEmailAndPassword(auth, email("nonadmin"), "password123");

    await expect(
      setUserRole({ uid: "any", role: "admin" })
    ).rejects.toMatchObject({ code: "functions/permission-denied" });
  });

  it("allows an admin to update a user's role in Firestore and custom claim", async () => {
    const setUserRole = httpsCallable(functions, "setUserRole");

    // Create both users
    const [adminCred, targetCred] = await Promise.all([
      createUserWithEmailAndPassword(auth, email("admin"), "password123"),
      createUserWithEmailAndPassword(auth, email("target"), "password123"),
    ]);

    // Wait for onUserCreated to finish before overriding admin claim
    await new Promise((r) => setTimeout(r, 5000));
    await setClaimViaEmulator(adminCred.user.uid, { role: "admin" });

    // Sign in as admin with fresh token
    const freshAdmin = await signInWithEmailAndPassword(auth, email("admin"), "password123");
    await freshAdmin.user.getIdToken(true);

    // Promote target user
    const result = await setUserRole({ uid: targetCred.user.uid, role: "content_manager" });
    expect((result.data as { success: boolean }).success).toBe(true);

    // Verify Firestore (sign in as target — they can read their own doc)
    await signInWithEmailAndPassword(auth, email("target"), "password123");
    const snap = await getDoc(doc(db, "users", targetCred.user.uid));
    expect(snap.data()?.role).toBe("content_manager");

    // Verify custom claim
    await targetCred.user.getIdToken(true);
    const tokenResult = await targetCred.user.getIdTokenResult(true);
    expect(tokenResult.claims["role"]).toBe("content_manager");
  });
});
