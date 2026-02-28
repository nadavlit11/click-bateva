import {getAuth} from "firebase-admin/auth";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as Sentry from "@sentry/node";

const adminAuth = getAuth();
const db = getFirestore();

/**
 * Callable function: admin-only — deletes a content manager account.
 * Deletes the Firebase Auth user and removes the user document from Firestore.
 */
export const deleteContentManager = onCall({cors: true}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated.");
  }
  if (request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can delete content managers.");
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
      Sentry.captureException(err, {tags: {source: "deleteContentManager"}});
      logger.error("Unexpected error deleting Firebase Auth user", err);
      throw new HttpsError("internal", "Failed to delete user.");
    }
  }

  await db.collection("users").doc(uid).delete();

  logger.info("Content manager deleted", {uid, by: request.auth.uid});

  return {uid};
});

/**
 * Callable function: admin-only — blocks a content manager account.
 * Disables the Firebase Auth user and marks the Firestore user doc as blocked.
 */
export const blockContentManager = onCall({cors: true}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated.");
  }
  if (request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can block content managers.");
  }

  const {uid} = request.data as { uid: unknown };
  if (typeof uid !== "string" || !uid.trim()) {
    throw new HttpsError("invalid-argument", "uid must be a non-empty string.");
  }

  try {
    await adminAuth.updateUser(uid, {disabled: true});
  } catch (err: unknown) {
    Sentry.captureException(err, {tags: {source: "blockContentManager"}});
    logger.error("Unexpected error blocking Firebase Auth user", err);
    throw new HttpsError("internal", "Failed to block user.");
  }

  await db.collection("users").doc(uid).update({
    blocked: true,
    updatedAt: FieldValue.serverTimestamp(),
  });

  logger.info("Content manager blocked", {uid, by: request.auth.uid});

  return {uid};
});

/**
 * Callable function: admin-only — creates a new content manager account.
 * Creates a Firebase Auth user, sets the content_manager custom claim,
 * and writes the user document to Firestore.
 */
export const createContentManager = onCall({cors: true}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated.");
  }
  if (request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  const {email, password} = request.data as { email: string; password: string };
  if (typeof email !== "string" || !email.trim()) {
    throw new HttpsError("invalid-argument", "Email is required");
  }
  if (typeof password !== "string" || !password.trim()) {
    throw new HttpsError("invalid-argument", "Password is required");
  }

  let uid: string;
  try {
    const userRecord = await adminAuth.createUser({email: email.trim(), password});
    uid = userRecord.uid;
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "auth/email-already-in-use");
    }
    Sentry.captureException(err);
    throw new HttpsError("internal", "Failed to create user");
  }

  await adminAuth.setCustomUserClaims(uid, {role: "content_manager"});

  await db.collection("users").doc(uid).set({
    email: email.trim(),
    role: "content_manager",
    blocked: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  logger.info("Content manager created", {uid, by: request.auth.uid});

  return {uid};
});
