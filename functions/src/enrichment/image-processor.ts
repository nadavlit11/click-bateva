/**
 * Image processing: download, validate, and upload to
 * Firebase Storage.
 *
 * Downloads external images, validates them, and uploads
 * to the poi-media/ path in Firebase Storage.
 */

import * as logger from "firebase-functions/logger";
import {randomBytes, randomUUID} from "crypto";
import {Bucket} from "@google-cloud/storage";

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
]);

const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Download and upload a single image to Firebase Storage.
 * @param {string} poiId Firestore document ID.
 * @param {string} url External image URL.
 * @param {number} index Image index for naming.
 * @param {Bucket} bucket Firebase Storage bucket.
 * @return {Promise<string>} Firebase Storage download URL.
 */
async function downloadAndUpload(
  poiId: string,
  url: string,
  index: number,
  bucket: Bucket,
): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const contentType =
    res.headers.get("content-type")?.split(";")[0]?.trim();
  if (!contentType || !ALLOWED_TYPES.has(contentType)) {
    throw new Error(`Unsupported type: ${contentType}`);
  }

  const arrayBuf = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  if (buffer.length > MAX_FILE_SIZE) {
    const mb = (buffer.length / 1024 / 1024).toFixed(1);
    throw new Error(`Too large: ${mb}MB`);
  }
  if (buffer.length < 1024) {
    throw new Error("Too small (likely tracking pixel)");
  }

  // Upload to Storage
  const ext = EXT_MAP[contentType] || "jpg";
  const rand = randomBytes(4).toString("hex");
  const storagePath =
    `poi-media/${poiId}-enriched-${index}-${rand}.${ext}`;

  const downloadToken = randomUUID();
  const file = bucket.file(storagePath);
  await file.save(buffer, {
    metadata: {
      contentType,
      metadata: {firebaseStorageDownloadTokens: downloadToken},
    },
  });

  // Build download URL matching Firebase client SDK format
  const bucketName = bucket.name;
  const encodedPath = encodeURIComponent(storagePath);
  return "https://firebasestorage.googleapis.com/v0/b/" +
    `${bucketName}/o/${encodedPath}?alt=media&token=` +
    downloadToken;
}

/**
 * Download, validate, and upload images to Firebase Storage.
 * @param {string} poiId Firestore document ID.
 * @param {string[]} imageUrls External image URLs.
 * @param {Bucket} bucket Firebase Storage bucket.
 * @return {Promise<string[]>} Firebase Storage download URLs.
 */
export async function processImages(
  poiId: string,
  imageUrls: string[],
  bucket: Bucket,
): Promise<string[]> {
  const storageUrls: string[] = [];

  for (const url of imageUrls.slice(0, MAX_IMAGES)) {
    try {
      const result = await downloadAndUpload(
        poiId, url, storageUrls.length, bucket,
      );
      storageUrls.push(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(
        `Image failed (${url.slice(0, 60)}): ${msg}`,
      );
    }
  }

  return storageUrls;
}
