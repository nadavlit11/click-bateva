/**
 * Seeds the Firebase emulator with CRM test data + admin/crm users.
 * Requires emulators running: firestore (8080) + auth (9099).
 *
 * Usage:
 *   node scripts/seed-crm-emulator.mjs
 */

import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
initializeApp({ projectId: "click-bateva" });

const db = getFirestore();
const auth = getAuth();

const ADMIN_UID = "admin-uid-001";
const CRM_UID = "crm-uid-001";
const CRM_UID_2 = "crm-uid-002";

async function createUser(uid, email, password, displayName, role, extra) {
  let actualUid = uid;
  try {
    const user = await auth.createUser({ uid, email, password, displayName });
    actualUid = user.uid;
  } catch (e) {
    if (e.code === "auth/uid-already-exists" || e.code === "auth/email-already-exists") {
      console.log(`  User ${email} already exists, updating claims`);
      try {
        const existing = await auth.getUserByEmail(email);
        actualUid = existing.uid;
      } catch { /* use original uid */ }
    } else {
      throw e;
    }
  }
  await auth.setCustomUserClaims(actualUid, { role, ...extra });
  await db.collection("users").doc(actualUid).set({
    email,
    role,
    name: displayName || null,
    blocked: false,
  });
}

const now = FieldValue.serverTimestamp();

const CONTACTS = [
  {
    id: "contact-1",
    name: "דוד כהן",
    businessName: "מסעדת דוד",
    phone: "054-1234567",
    email: "david@example.com",
    createdBy: ADMIN_UID,
    createdByEmail: "admin@test.com",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "contact-2",
    name: "שרה לוי",
    businessName: "צימר הגולן",
    phone: "050-2345678",
    email: "sarah@example.com",
    createdBy: CRM_UID,
    createdByEmail: "crm1@test.com",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "contact-3",
    name: "משה ישראלי",
    businessName: "ספא הצפון",
    phone: "052-3456789",
    email: "moshe@example.com",
    createdBy: CRM_UID,
    createdByEmail: "crm1@test.com",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "contact-4",
    name: "רחל אברהם",
    businessName: "",
    phone: "053-4567890",
    email: "rachel@example.com",
    createdBy: ADMIN_UID,
    createdByEmail: "admin@test.com",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "contact-5",
    name: "יוסי גולן",
    businessName: "אטרקציות הגולן",
    phone: "054-5678901",
    email: "yossi@example.com",
    createdBy: CRM_UID_2,
    createdByEmail: "crm2@test.com",
    createdAt: now,
    updatedAt: now,
  },
];

// Due dates: some today, some overdue, some future
const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const twoDaysAgo = new Date(today);
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const nextWeek = new Date(today);
nextWeek.setDate(nextWeek.getDate() + 7);

const TASKS = [
  {
    id: "task-1",
    contactId: "contact-1",
    contactName: "דוד כהן",
    title: "שיחת היכרות ראשונית",
    description: "להתקשר לדוד ולהציע חבילת פרסום",
    date: today,
    color: "#4CAF50",
    priority: "high",
    assigneeUid: CRM_UID,
    assigneeEmail: "crm1@test.com",
    followers: [ADMIN_UID],
    createdBy: ADMIN_UID,
    createdByEmail: "admin@test.com",
    completed: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "task-2",
    contactId: "contact-2",
    contactName: "שרה לוי",
    title: "שליחת הצעת מחיר",
    description: "להכין ולשלוח הצעת מחיר לחבילה שנתית",
    date: yesterday,
    color: "#FF9800",
    priority: "high",
    assigneeUid: CRM_UID,
    assigneeEmail: "crm1@test.com",
    followers: [],
    createdBy: CRM_UID,
    createdByEmail: "crm1@test.com",
    completed: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "task-3",
    contactId: "contact-3",
    contactName: "משה ישראלי",
    title: "פגישה במקום",
    description: "לתאם פגישה פיזית בספא לצילומים",
    date: tomorrow,
    color: "#2196F3",
    priority: "medium",
    assigneeUid: CRM_UID_2,
    assigneeEmail: "crm2@test.com",
    followers: [CRM_UID],
    createdBy: CRM_UID,
    createdByEmail: "crm1@test.com",
    completed: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "task-4",
    contactId: "contact-1",
    contactName: "דוד כהן",
    title: "מעקב אחרי הצעה",
    description: "לבדוק אם דוד קיבל את ההצעה",
    date: twoDaysAgo,
    color: "#F44336",
    priority: "medium",
    assigneeUid: ADMIN_UID,
    assigneeEmail: "admin@test.com",
    followers: [CRM_UID],
    createdBy: ADMIN_UID,
    createdByEmail: "admin@test.com",
    completed: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "task-5",
    contactId: "contact-5",
    contactName: "יוסי גולן",
    title: "עדכון פרטי עסק",
    description: "לבקש מיוסי תמונות ופרטים עדכניים",
    date: nextWeek,
    color: "#9C27B0",
    priority: "low",
    assigneeUid: CRM_UID_2,
    assigneeEmail: "crm2@test.com",
    followers: [],
    createdBy: CRM_UID_2,
    createdByEmail: "crm2@test.com",
    completed: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "task-6",
    contactId: "contact-4",
    contactName: "רחל אברהם",
    title: "שיחת סגירה",
    description: "סגירת עסקה עם רחל — הכל מוסכם",
    date: twoDaysAgo,
    color: "#4CAF50",
    priority: "low",
    assigneeUid: CRM_UID,
    assigneeEmail: "crm1@test.com",
    followers: [],
    createdBy: CRM_UID,
    createdByEmail: "crm1@test.com",
    completed: true,
    createdAt: now,
    updatedAt: now,
  },
];

const ACTIVITY_LOGS = [
  {
    contactId: "contact-1",
    entries: [
      { text: "שיחה ראשונית — דוד מעוניין לשמוע על חבילות", createdBy: ADMIN_UID, createdByEmail: "admin@test.com" },
      { text: "נשלח מייל עם פרטי החבילות", createdBy: CRM_UID, createdByEmail: "crm1@test.com" },
      { text: "דוד ביקש הצעת מחיר מפורטת", createdBy: CRM_UID, createdByEmail: "crm1@test.com" },
    ],
  },
  {
    contactId: "contact-2",
    entries: [
      { text: "שרה פנתה דרך האתר", createdBy: CRM_UID, createdByEmail: "crm1@test.com" },
      { text: "שיחה טלפונית — מעוניינת בחבילה שנתית", createdBy: CRM_UID, createdByEmail: "crm1@test.com" },
    ],
  },
  {
    contactId: "contact-3",
    entries: [
      { text: "פגישה ראשונית — משה רוצה לקדם את הספא באתר", createdBy: CRM_UID_2, createdByEmail: "crm2@test.com" },
    ],
  },
];

async function seed() {
  // 1. Create users
  console.log("Creating users...");
  await createUser(ADMIN_UID, "admin@test.com", "Admin123", "מנהל ראשי", "admin", {});
  await createUser(CRM_UID, "crm1@test.com", "Crm12345", "נועה CRM", "crm_user", {});
  await createUser(CRM_UID_2, "crm2@test.com", "Crm12345", "אורי CRM", "crm_user", {});

  // 2. Seed contacts + tasks
  console.log("Seeding CRM contacts...");
  const batch = db.batch();

  for (const c of CONTACTS) {
    const { id, ...data } = c;
    batch.set(db.collection("crm_contacts").doc(id), data);
  }

  for (const t of TASKS) {
    const { id, ...data } = t;
    batch.set(db.collection("crm_tasks").doc(id), data);
  }

  await batch.commit();

  // 3. Seed activity logs (subcollection — separate writes)
  console.log("Seeding activity logs...");
  for (const log of ACTIVITY_LOGS) {
    const logBatch = db.batch();
    for (const entry of log.entries) {
      const ref = db
        .collection("crm_contacts")
        .doc(log.contactId)
        .collection("activity_log")
        .doc();
      logBatch.set(ref, {
        ...entry,
        createdAt: now,
      });
    }
    await logBatch.commit();
  }

  console.log(
    `Seeded: 3 users, ${CONTACTS.length} contacts, ${TASKS.length} tasks, ${ACTIVITY_LOGS.reduce((s, l) => s + l.entries.length, 0)} activity log entries`
  );
  console.log("");
  console.log("Login credentials:");
  console.log("  Admin:  admin@test.com / Admin123");
  console.log("  CRM 1:  crm1@test.com / Crm12345");
  console.log("  CRM 2:  crm2@test.com / Crm12345");
}

seed().catch(console.error);
