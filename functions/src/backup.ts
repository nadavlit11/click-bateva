import {onSchedule} from "firebase-functions/v2/scheduler";
import {v1} from "@google-cloud/firestore";
import * as logger from "firebase-functions/logger";

/**
 * Scheduled function: exports entire Firestore database to a
 * Cloud Storage bucket daily at 2:00 AM Israel time.
 *
 * Prerequisites (one-time console setup):
 * 1. Create GCS bucket: gs://{projectId}-firestore-backups
 * 2. Grant "Cloud Datastore Import Export Admin" role to the
 *    default Cloud Functions service account.
 * 3. Grant "Storage Admin" on the bucket to the same account.
 */
export const dailyFirestoreExport = onSchedule(
  {
    schedule: "0 2 * * *",
    timeZone: "Asia/Jerusalem",
    retryCount: 3,
  },
  async () => {
    const projectId = process.env.GCLOUD_PROJECT ||
      process.env.GCP_PROJECT;
    const client = new v1.FirestoreAdminClient();
    const dbName = client.databasePath(projectId!, "(default)");
    const date = new Date().toISOString().split("T")[0];
    const bucket = `gs://${projectId}-firestore-backups`;

    const [response] = await client.exportDocuments({
      name: dbName,
      outputUriPrefix: `${bucket}/${date}`,
      collectionIds: [],
    });

    logger.info("Firestore export initiated", {
      operation: response.name,
      destination: `${bucket}/${date}`,
    });
  }
);
