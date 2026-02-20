import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

const adminAuth = getAuth();
const db = getFirestore();

/**
 * Callable function: admin-only — creates a new business user account.
 * Creates a Firebase Auth user, sets the business_user custom claim, and
 * atomically writes user and business documents to Firestore.
 */
export const createBusinessUser = onCall({ cors: true }, async (request) => {
  // Verify caller is authenticated
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated.");
  }

  // Verify caller is an admin
  if (request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can create business users.");
  }

  const { name, email, password } = request.data as {
    name: unknown;
    email: unknown;
    password: unknown;
  };

  // Validate inputs
  if (typeof name !== "string" || !name.trim()) {
    throw new HttpsError("invalid-argument", "name must be a non-empty string.");
  }
  if (typeof email !== "string" || !email.trim()) {
    throw new HttpsError("invalid-argument", "email must be a non-empty string.");
  }
  if (typeof password !== "string" || password.length < 6) {
    throw new HttpsError("invalid-argument", "password must be at least 6 characters.");
  }

  // Create Firebase Auth user — catch known errors and convert to HttpsError
  let userRecord;
  try {
    userRecord = await adminAuth.createUser({ email: email.trim(), password });
  } catch (err: unknown) {
    const code = (err as { code?: string }).code ?? "";
    if (code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "(auth/email-already-in-use)");
    }
    logger.error("Unexpected error creating Firebase Auth user", err);
    throw new HttpsError("internal", "Failed to create user.");
  }
  const uid = userRecord.uid;

  // Set custom claims: role + businessRef (Firestore path used by security rules)
  const businessRef = `/databases/(default)/documents/businesses/${uid}`;
  await adminAuth.setCustomUserClaims(uid, { role: "business_user", businessRef });

  // Atomically write user and business documents
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();

  batch.set(db.collection("users").doc(uid), {
    uid,
    email: email.trim(),
    role: "business_user",
    businessRef,
    createdAt: now,
    updatedAt: now,
  });

  batch.set(db.collection("businesses").doc(uid), {
    id: uid,
    name: name.trim(),
    email: email.trim(),
    ownerUid: uid,
    associatedUserIds: [uid],   // required by POI update security rule
    createdAt: now,
    updatedAt: now,
  });

  await batch.commit();

  logger.info("Business user created", { uid, email, name, by: request.auth.uid });

  return { uid };
});
