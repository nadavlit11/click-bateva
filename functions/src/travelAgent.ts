import {getAuth} from "firebase-admin/auth";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as Sentry from "@sentry/node";

const adminAuth = getAuth();
const db = getFirestore();

/**
 * Callable function: admin-only — creates a new travel agent account.
 * Creates a Firebase Auth user with their real email, sets the travel_agent
 * custom claim, and creates a users document.
 */
export const createTravelAgent = onCall({cors: true}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated.");
  }
  if (request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can create travel agents.");
  }

  const {email, password, displayName} = request.data as {
    email: unknown;
    password: unknown;
    displayName: unknown;
  };

  if (typeof email !== "string" || !email.trim()) {
    throw new HttpsError("invalid-argument", "email must be a non-empty string.");
  }
  if (typeof password !== "string" || password.length < 6) {
    throw new HttpsError("invalid-argument", "password must be at least 6 characters.");
  }
  if (typeof displayName !== "string" || !displayName.trim()) {
    throw new HttpsError("invalid-argument", "displayName must be a non-empty string.");
  }

  let userRecord;
  try {
    userRecord = await adminAuth.createUser({
      email: email.trim().toLowerCase(),
      password,
      displayName: displayName.trim(),
    });
  } catch (err: unknown) {
    const code = (err as {code?: string}).code ?? "";
    if (code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "(auth/email-already-in-use)");
    }
    Sentry.captureException(err, {tags: {source: "createTravelAgent"}});
    logger.error("Unexpected error creating travel agent", err);
    throw new HttpsError("internal", "Failed to create user.");
  }

  const uid = userRecord.uid;
  await adminAuth.setCustomUserClaims(uid, {role: "travel_agent"});

  const now = FieldValue.serverTimestamp();
  await db.collection("users").doc(uid).set({
    uid,
    email: email.trim().toLowerCase(),
    displayName: displayName.trim(),
    role: "travel_agent",
    createdAt: now,
    updatedAt: now,
  });

  logger.info("Travel agent created", {uid, email, by: request.auth.uid});

  return {uid};
});

/**
 * Callable function: admin-only — deletes a travel agent account.
 * Deletes the Firebase Auth user and removes the users document.
 */
export const deleteTravelAgent = onCall({cors: true}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated.");
  }
  if (request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can delete travel agents.");
  }

  const {uid} = request.data as {uid: unknown};
  if (typeof uid !== "string" || !uid.trim()) {
    throw new HttpsError("invalid-argument", "uid must be a non-empty string.");
  }

  // Verify target user is actually a travel_agent before deleting
  try {
    const userRecord = await adminAuth.getUser(uid);
    if (userRecord.customClaims?.role !== "travel_agent") {
      throw new HttpsError("failed-precondition", "Target user is not a travel agent.");
    }
  } catch (err: unknown) {
    if ((err as {code?: string}).code === "auth/user-not-found") {
      // User already gone — clean up Firestore doc and return success
      await db.collection("users").doc(uid).delete();
      logger.info("Travel agent already deleted from Auth, cleaned up Firestore", {uid, by: request.auth.uid});
      return {uid};
    }
    // Re-throw HttpsErrors (e.g. failed-precondition from above) and unexpected errors
    if ((err as {httpErrorCode?: unknown}).httpErrorCode !== undefined) throw err;
    Sentry.captureException(err, {tags: {source: "deleteTravelAgent.getUser"}});
    logger.error("Error fetching user before delete", err);
    throw new HttpsError("internal", "Failed to verify user.");
  }

  try {
    await adminAuth.deleteUser(uid);
  } catch (err: unknown) {
    const code = (err as {code?: string}).code ?? "";
    if (code !== "auth/user-not-found") {
      Sentry.captureException(err, {tags: {source: "deleteTravelAgent"}});
      logger.error("Unexpected error deleting travel agent", err);
      throw new HttpsError("internal", "Failed to delete user.");
    }
  }

  await db.collection("users").doc(uid).delete();

  logger.info("Travel agent deleted", {uid, by: request.auth.uid});

  return {uid};
});
