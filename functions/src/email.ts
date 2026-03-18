import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as Sentry from "@sentry/node";
import {getAuth} from "firebase-admin/auth";
import * as nodemailer from "nodemailer";

const adminAuth = getAuth();

/**
 * Callable: CRM-authorized — sends an email on behalf of a CRM user.
 * Requires SMTP_USER and SMTP_PASS environment variables.
 */
export const sendContactEmail = onCall(
  {cors: true, enforceAppCheck: true},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated", "Must be authenticated."
      );
    }

    const claims = request.auth.token;
    if (claims.role !== "admin" && claims.role !== "crm_user") {
      throw new HttpsError(
        "permission-denied", "Only CRM users can send emails."
      );
    }

    const {to, subject, body, attachments} = request.data as {
      to: unknown;
      subject: unknown;
      body: unknown;
      attachments: unknown;
    };

    if (typeof to !== "string" || !to.trim()) {
      throw new HttpsError(
        "invalid-argument", "Recipient email is required."
      );
    }
    if (typeof subject !== "string" || !subject.trim()) {
      throw new HttpsError(
        "invalid-argument", "Subject is required."
      );
    }
    if (typeof body !== "string") {
      throw new HttpsError(
        "invalid-argument", "Body is required."
      );
    }

    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    if (!smtpUser || !smtpPass) {
      logger.error("SMTP credentials not configured");
      throw new HttpsError(
        "failed-precondition",
        "Email service not configured."
      );
    }

    // Get sender display name
    let senderName = "קליק בטבע CRM";
    try {
      const user = await adminAuth.getUser(request.auth.uid);
      senderName = user.displayName || user.email || senderName;
    } catch {
      // use default
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {user: smtpUser, pass: smtpPass},
    });

    // Build attachment list from URLs
    const mailAttachments: nodemailer.SendMailOptions["attachments"] = [];
    if (Array.isArray(attachments)) {
      for (const att of attachments) {
        if (
          att &&
          typeof att === "object" &&
          typeof (att as Record<string, unknown>).url === "string" &&
          typeof (att as Record<string, unknown>).name === "string"
        ) {
          mailAttachments.push({
            filename: (att as Record<string, string>).name,
            path: (att as Record<string, string>).url,
          });
        }
      }
    }

    try {
      await transporter.sendMail({
        from: `"${senderName}" <${smtpUser}>`,
        to: to.trim(),
        subject: subject.trim(),
        html: body,
        attachments: mailAttachments,
      });

      logger.info("Email sent", {to, subject: subject.trim()});
      return {success: true};
    } catch (err: unknown) {
      logger.error("Email send failed", err);
      Sentry.captureException(err, {
        tags: {source: "sendContactEmail"},
      });
      throw new HttpsError(
        "internal", "Failed to send email."
      );
    }
  }
);
