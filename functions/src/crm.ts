import {getAuth} from "firebase-admin/auth";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as Sentry from "@sentry/node";

const adminAuth = getAuth();
const db = getFirestore();

/**
 * Callable: admin-only — creates a new CRM user account.
 */
export const createCrmUser = onCall(
  {cors: true, enforceAppCheck: true},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated", "Must be authenticated."
      );
    }
    if (request.auth.token.role !== "admin") {
      throw new HttpsError(
        "permission-denied", "Only admins can create CRM users."
      );
    }

    const {email, password, name} = request.data as {
      email: unknown; password: unknown; name: unknown;
    };
    if (typeof email !== "string" || !email.trim()) {
      throw new HttpsError(
        "invalid-argument", "Email is required"
      );
    }
    if (typeof password !== "string" || !password.trim()) {
      throw new HttpsError(
        "invalid-argument", "Password is required"
      );
    }
    if (typeof name !== "string" || !name.trim()) {
      throw new HttpsError(
        "invalid-argument", "Name is required"
      );
    }

    let uid: string;
    try {
      const userRecord = await adminAuth.createUser({
        email: email.trim(),
        password,
        displayName: name.trim(),
      });
      uid = userRecord.uid;
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/email-already-exists") {
        throw new HttpsError(
          "already-exists", "auth/email-already-in-use"
        );
      }
      Sentry.captureException(err, {
        tags: {source: "createCrmUser"},
      });
      throw new HttpsError("internal", "Failed to create user");
    }

    await adminAuth.setCustomUserClaims(uid, {role: "crm_user"});

    await db.collection("users").doc(uid).set({
      email: email.trim(),
      name: name.trim(),
      role: "crm_user",
      blocked: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    logger.info("CRM user created", {
      uid, by: request.auth.uid,
    });

    return {uid};
  }
);

/**
 * Callable: admin-only — deletes a CRM user account.
 */
export const deleteCrmUser = onCall(
  {cors: true, enforceAppCheck: true},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated", "Must be authenticated."
      );
    }
    if (request.auth.token.role !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "Only admins can delete CRM users."
      );
    }

    const {uid} = request.data as { uid: unknown };
    if (typeof uid !== "string" || !uid.trim()) {
      throw new HttpsError(
        "invalid-argument",
        "uid must be a non-empty string."
      );
    }

    try {
      await adminAuth.deleteUser(uid);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/user-not-found") {
        // Auth user already gone — still clean up Firestore
      } else {
        Sentry.captureException(err, {
          tags: {source: "deleteCrmUser"},
        });
        logger.error(
          "Unexpected error deleting Firebase Auth user", err
        );
        throw new HttpsError(
          "internal", "Failed to delete user."
        );
      }
    }

    await db.collection("users").doc(uid).delete();

    logger.info("CRM user deleted", {
      uid, by: request.auth.uid,
    });

    return {uid};
  }
);
