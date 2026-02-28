import {initializeApp, getApps} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {auth} from "firebase-functions/v1";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const adminAuth = getAuth();

const VALID_ROLES = ["admin", "content_manager", "business_user", "standard_user"] as const;
type Role = (typeof VALID_ROLES)[number];

/**
 * Auth trigger (Gen1): fires when a new Firebase Auth user is created.
 * Creates a Firestore user document and sets the default custom claim.
 */
export const onUserCreated = auth.user().onCreate(async (user) => {
  // If another callable (e.g. createBusinessUser, createContentManager) already set
  // custom claims, skip — that function handles its own Firestore doc and claims.
  // We check twice with a short delay to handle the race where the callable creates
  // the Auth user first, then sets claims asynchronously.
  let userRecord = await adminAuth.getUser(user.uid);
  if (userRecord.customClaims?.role) {
    logger.info("User created with existing role, skipping standard_user setup", {
      uid: user.uid,
      role: userRecord.customClaims.role,
    });
    return;
  }

  // Wait briefly for any concurrent callable to finish setting claims
  await new Promise((resolve) => setTimeout(resolve, 1500));
  userRecord = await adminAuth.getUser(user.uid);
  if (userRecord.customClaims?.role) {
    logger.info("User created with existing role (after delay), skipping standard_user setup", {
      uid: user.uid,
      role: userRecord.customClaims.role,
    });
    return;
  }

  const now = FieldValue.serverTimestamp();
  const role: Role = "standard_user";

  await Promise.all([
    db.collection("users").doc(user.uid).set({
      uid: user.uid,
      email: user.email ?? null,
      role,
      createdAt: now,
      updatedAt: now,
    }),
    adminAuth.setCustomUserClaims(user.uid, {role}),
  ]);

  logger.info("User created", {uid: user.uid, email: user.email});
});

/**
 * Callable function: admin-only — assigns a role to a user.
 * Updates both the Firestore user document and the Auth custom claim.
 */
export const setUserRole = onCall({cors: true}, async (request) => {
  // Verify caller is authenticated
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated.");
  }

  // Verify caller is an admin
  if (request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can assign roles.");
  }

  const {uid, role} = request.data as { uid: unknown; role: unknown };

  // Validate inputs
  if (typeof uid !== "string" || !uid) {
    throw new HttpsError("invalid-argument", "uid must be a non-empty string.");
  }
  if (!VALID_ROLES.includes(role as Role)) {
    throw new HttpsError(
      "invalid-argument",
      `role must be one of: ${VALID_ROLES.join(", ")}.`
    );
  }

  const validRole = role as Role;

  await Promise.all([
    db.collection("users").doc(uid).update({
      role: validRole,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    adminAuth.setCustomUserClaims(uid, {role: validRole}),
  ]);

  logger.info("User role updated", {uid, role: validRole, by: request.auth.uid});

  return {success: true};
});
