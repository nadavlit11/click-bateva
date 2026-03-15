import {getAuth} from "firebase-admin/auth";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as Sentry from "@sentry/node";

const adminAuth = getAuth();
const db = getFirestore();

/**
 * Callable function: admin-only — creates a new travel agent account.
 * Creates a Firebase Auth user, sets the travel_agent custom claim,
 * and writes the user document to Firestore.
 */
export const createTravelAgent = onCall({cors: true, enforceAppCheck: true}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated.");
  }
  if (request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  const {email, password, name} = request.data as {
    email: string; password: string; name?: string;
  };
  if (typeof email !== "string" || !email.trim()) {
    throw new HttpsError("invalid-argument", "Email is required");
  }
  if (typeof password !== "string" || !password.trim()) {
    throw new HttpsError("invalid-argument", "Password is required");
  }

  const trimmedName = typeof name === "string" ? name.trim() : "";

  let uid: string;
  try {
    const userRecord = await adminAuth.createUser({
      email: email.trim(),
      password,
      ...(trimmedName ? {displayName: trimmedName} : {}),
    });
    uid = userRecord.uid;
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "auth/email-already-in-use");
    }
    Sentry.captureException(err);
    throw new HttpsError("internal", "Failed to create user");
  }

  await adminAuth.setCustomUserClaims(uid, {role: "travel_agent"});

  await db.collection("users").doc(uid).set({
    email: email.trim(),
    name: trimmedName || null,
    role: "travel_agent",
    blocked: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  logger.info("Travel agent created", {uid, by: request.auth.uid});

  return {uid};
});

/**
 * Callable function: admin-only — deletes a travel agent account.
 * Deletes the Firebase Auth user and removes the user document from Firestore.
 */
export const deleteTravelAgent = onCall({cors: true, enforceAppCheck: true}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated.");
  }
  if (request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can delete travel agents.");
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
      Sentry.captureException(err, {tags: {source: "deleteTravelAgent"}});
      logger.error("Unexpected error deleting Firebase Auth user", err);
      throw new HttpsError("internal", "Failed to delete user.");
    }
  }

  await db.collection("users").doc(uid).delete();

  logger.info("Travel agent deleted", {uid, by: request.auth.uid});

  return {uid};
});
