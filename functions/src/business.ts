import {getAuth} from "firebase-admin/auth";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as Sentry from "@sentry/node";

const adminAuth = getAuth();
const db = getFirestore();

/**
 * Callable function: admin-only — creates a new business user account.
 * Creates a Firebase Auth user, sets the business_user custom claim, and
 * atomically writes user and business documents to Firestore.
 */
export const createBusinessUser = onCall({cors: true}, async (request) => {
  // Verify caller is authenticated
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated.");
  }

  // Verify caller is an admin
  if (request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can create business users.");
  }

  const {name, username, password} = request.data as {
    name: unknown;
    username: unknown;
    password: unknown;
  };

  // Validate inputs
  if (typeof name !== "string" || !name.trim()) {
    throw new HttpsError("invalid-argument", "name must be a non-empty string.");
  }
  if (typeof username !== "string" || !username.trim()) {
    throw new HttpsError("invalid-argument", "username must be a non-empty string.");
  }
  if (username.trim().length < 3) {
    throw new HttpsError("invalid-argument", "username must be at least 3 characters.");
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(username.trim())) {
    throw new HttpsError("invalid-argument", "username may only contain letters, numbers, dot, hyphen, underscore.");
  }
  if (typeof password !== "string" || password.length < 6) {
    throw new HttpsError("invalid-argument", "password must be at least 6 characters.");
  }

  // Generate internal email from username (Firebase Auth requires an email)
  const email = `${username.trim().toLowerCase()}@click-bateva.app`;

  // Create Firebase Auth user — catch known errors and convert to HttpsError
  let userRecord;
  try {
    userRecord = await adminAuth.createUser({email, password});
  } catch (err: unknown) {
    const code = (err as { code?: string }).code ?? "";
    if (code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "(auth/email-already-in-use)");
    }
    Sentry.captureException(err, {tags: {source: "createBusinessUser"}});
    logger.error("Unexpected error creating Firebase Auth user", err);
    throw new HttpsError("internal", "Failed to create user.");
  }
  const uid = userRecord.uid;

  // Set custom claims: role + businessRef (Firestore path used by security rules)
  const businessRef = `/databases/(default)/documents/businesses/${uid}`;
  await adminAuth.setCustomUserClaims(uid, {role: "business_user", businessRef});

  // Atomically write user and business documents
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();

  batch.set(db.collection("users").doc(uid), {
    uid,
    email,
    username: username.trim(),
    role: "business_user",
    businessRef,
    createdAt: now,
    updatedAt: now,
  });

  batch.set(db.collection("businesses").doc(uid), {
    id: uid,
    name: name.trim(),
    email,
    username: username.trim(),
    ownerUid: uid,
    associatedUserIds: [uid], // required by POI update security rule
    createdAt: now,
    updatedAt: now,
  });

  await batch.commit();

  logger.info("Business user created", {uid, username: username, name, by: request.auth.uid});

  return {uid};
});

/**
 * Callable function: admin-only — deletes a business user account.
 * Deletes the Firebase Auth user and atomically removes the user + business documents.
 */
export const deleteBusinessUser = onCall({cors: true}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated.");
  }
  if (request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can delete business users.");
  }

  const {uid} = request.data as { uid: unknown };
  if (typeof uid !== "string" || !uid.trim()) {
    throw new HttpsError("invalid-argument", "uid must be a non-empty string.");
  }

  try {
    await adminAuth.deleteUser(uid);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code ?? "";
    if (code === "auth/user-not-found") {
      // Auth user already gone — still clean up Firestore
    } else {
      Sentry.captureException(err, {tags: {source: "deleteBusinessUser"}});
      logger.error("Unexpected error deleting Firebase Auth user", err);
      throw new HttpsError("internal", "Failed to delete user.");
    }
  }

  const batch = db.batch();
  batch.delete(db.collection("users").doc(uid));
  batch.delete(db.collection("businesses").doc(uid));
  await batch.commit();

  logger.info("Business user deleted", {uid, by: request.auth.uid});

  return {uid};
});
