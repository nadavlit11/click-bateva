/**
 * Image processing: download, validate, and upload to Firebase Storage.
 *
 * Downloads external images, validates them, and uploads to the
 * poi-media/ path in Firebase Storage.
 */

import fetch from "node-fetch";
import { randomBytes, randomUUID } from "crypto";

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const EXT_MAP = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Download images from external URLs, validate, and upload to Firebase Storage.
 *
 * @param {string} poiId - Firestore document ID
 * @param {string[]} imageUrls - external image URLs to process
 * @param {import("@google-cloud/storage").Bucket} bucket - Firebase Storage bucket
 * @returns {string[]} array of Firebase Storage download URLs
 */
export async function processImages(poiId, imageUrls, bucket) {
  const storageUrls = [];

  for (const url of imageUrls.slice(0, MAX_IMAGES)) {
    try {
      const result = await downloadAndUpload(poiId, url, storageUrls.length, bucket);
      if (result) storageUrls.push(result);
    } catch (err) {
      console.warn(`      Image failed (${url.slice(0, 60)}): ${err.message}`);
    }
  }

  return storageUrls;
}

async function downloadAndUpload(poiId, url, index, bucket) {
  // Download
  const res = await fetch(url, { timeout: 15000 });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const contentType = res.headers.get("content-type")?.split(";")[0]?.trim();
  if (!ALLOWED_TYPES.has(contentType)) {
    throw new Error(`Unsupported type: ${contentType}`);
  }

  const buffer = await res.buffer();
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`Too large: ${(buffer.length / 1024 / 1024).toFixed(1)}MB`);
  }
  if (buffer.length < 1024) {
    throw new Error("Too small (likely tracking pixel)");
  }

  // Upload to Storage
  const ext = EXT_MAP[contentType] || "jpg";
  const rand = randomBytes(4).toString("hex");
  const storagePath = `poi-media/${poiId}-enriched-${index}-${rand}.${ext}`;

  // Upload with a download token (same pattern as Firebase client SDK getDownloadURL)
  const downloadToken = randomUUID();
  const file = bucket.file(storagePath);
  await file.save(buffer, {
    metadata: {
      contentType,
      metadata: { firebaseStorageDownloadTokens: downloadToken },
    },
  });

  // Build the download URL matching Firebase client SDK format
  const bucketName = bucket.name;
  const encodedPath = encodeURIComponent(storagePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;
}
