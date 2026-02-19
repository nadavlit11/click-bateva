/**
 * Manual test script for Phase 1.4 — Firebase Auth + Custom Claims
 *
 * Run with: node test-auth.mjs
 * Requires emulators running: firebase emulators:start --only auth,functions,firestore
 */

import { initializeApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, doc, getDoc } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from "firebase/functions";

const app = initializeApp({ projectId: "click-bateva", apiKey: "test" });
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
connectFirestoreEmulator(db, "127.0.0.1", 8081);
connectFunctionsEmulator(functions, "127.0.0.1", 5001);

const setUserRole = httpsCallable(functions, "setUserRole");

// Unique emails per run to avoid conflicts
const RUN = Date.now();
const TEST_EMAIL = `test-${RUN}@example.com`;
const ADMIN_EMAIL = `admin-${RUN}@example.com`;
const PASSWORD = "password123";
const PROJECT_ID = "click-bateva";

function pass(msg) { console.log("  ✅", msg); }
function fail(msg) { console.error("  ❌", msg); }

// Sets a custom claim directly via the Auth emulator REST API (admin bypass)
async function setClaimViaEmulator(uid, claims) {
  const res = await fetch(
    `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer owner",
      },
      body: JSON.stringify({
        localId: uid,
        customAttributes: JSON.stringify(claims),
      }),
    }
  );
  if (!res.ok) throw new Error(`Emulator claim update failed: ${await res.text()}`);
}

// ── Test 1: onUserCreated trigger ────────────────────────────────────────────
console.log("\n── Test 1: onUserCreated creates Firestore user doc ──");
let testUid;
try {
  const cred = await createUserWithEmailAndPassword(auth, TEST_EMAIL, PASSWORD);
  testUid = cred.user.uid;
  pass(`User created in Auth: ${testUid}`);

  // Give the function a moment to run
  await new Promise((r) => setTimeout(r, 3000));

  const snap = await getDoc(doc(db, "users", testUid));
  if (!snap.exists()) {
    fail("Firestore user doc was NOT created");
  } else {
    const data = snap.data();
    if (data.role === "standard_user") {
      pass(`Firestore doc created with role: ${data.role}`);
    } else {
      fail(`Unexpected role: ${data.role}`);
    }

    // Force token refresh to pick up custom claim set by the function
    await cred.user.getIdToken(true);
    const token = await cred.user.getIdTokenResult(true);
    if (token.claims.role === "standard_user") {
      pass(`Custom claim set: role = ${token.claims.role}`);
    } else {
      fail(`Custom claim missing or wrong: ${JSON.stringify(token.claims)}`);
    }
  }
} catch (e) {
  fail(`Test 1 error: ${e.message}`);
}

// ── Test 2: setUserRole — rejected for unauthenticated caller ────────────────
console.log("\n── Test 2: setUserRole rejected for unauthenticated caller ──");
try {
  await auth.signOut();
  await setUserRole({ uid: "any-uid", role: "admin" });
  fail("Should have been rejected but wasn't");
} catch (e) {
  if (e.code === "functions/unauthenticated") {
    pass(`Correctly rejected with: ${e.code}`);
  } else {
    fail(`Unexpected error: ${e.code} — ${e.message}`);
  }
}

// ── Test 3: setUserRole — rejected for non-admin ─────────────────────────────
console.log("\n── Test 3: setUserRole rejected for non-admin (standard_user) ──");
try {
  await signInWithEmailAndPassword(auth, TEST_EMAIL, PASSWORD);
  await setUserRole({ uid: "any-uid", role: "admin" });
  fail("Should have been rejected but wasn't");
} catch (e) {
  if (e.code === "functions/permission-denied") {
    pass(`Correctly rejected with: ${e.code}`);
  } else {
    fail(`Unexpected error: ${e.code} — ${e.message}`);
  }
}

// ── Test 4: setUserRole — succeeds for admin ─────────────────────────────────
console.log("\n── Test 4: setUserRole succeeds for admin ──");
try {
  // Create admin user
  const adminCred = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, PASSWORD);
  const adminUid = adminCred.user.uid;
  pass(`Admin user created: ${adminUid}`);

  // Wait for onUserCreated to finish (sets standard_user claim), then override to admin
  await new Promise((r) => setTimeout(r, 3000));
  await setClaimViaEmulator(adminUid, { role: "admin" });
  pass("Admin custom claim set via emulator REST API");

  // Sign in as admin and force token refresh to pick up the new claim
  const freshAdmin = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, PASSWORD);
  await freshAdmin.user.getIdToken(true);
  const adminToken = await freshAdmin.user.getIdTokenResult(true);
  if (adminToken.claims.role !== "admin") {
    fail(`Admin token still has role: ${adminToken.claims.role}`);
    process.exit(1);
  }

  // Call setUserRole to promote test user to content_manager
  const result = await setUserRole({ uid: testUid, role: "content_manager" });
  if (result.data.success) {
    pass("setUserRole returned { success: true }");
  } else {
    fail("setUserRole did not return success");
  }

  // Sign in as test user to verify their own Firestore doc was updated
  const testUserCred = await signInWithEmailAndPassword(auth, TEST_EMAIL, PASSWORD);
  const snap = await getDoc(doc(db, "users", testUid));
  if (snap.data()?.role === "content_manager") {
    pass("Firestore role updated to content_manager");
  } else {
    fail(`Firestore role is: ${snap.data()?.role}`);
  }

  // Verify custom claim was also updated
  await testUserCred.user.getIdToken(true);
  const testToken = await testUserCred.user.getIdTokenResult(true);
  if (testToken.claims.role === "content_manager") {
    pass(`Custom claim updated to: ${testToken.claims.role}`);
  } else {
    fail(`Custom claim not updated: ${testToken.claims.role}`);
  }
} catch (e) {
  fail(`Test 4 error: ${e.code} — ${e.message}`);
}

console.log("\nDone.\n");
process.exit(0);
