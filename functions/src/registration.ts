import {onCall, HttpsError} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as nodemailer from "nodemailer";
import * as logger from "firebase-functions/logger";
import * as Sentry from "@sentry/node";

const gmailUser = defineSecret("GMAIL_USER");
const gmailAppPassword = defineSecret("GMAIL_APP_PASSWORD");

const MAX_FIELD_LENGTH = 200;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function validateStringField(
  value: unknown, maxLen: number, errorMsg: string
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpsError("invalid-argument", errorMsg);
  }
  if (value.trim().length > maxLen) {
    throw new HttpsError("invalid-argument", `${errorMsg} (מקסימום ${maxLen} תווים)`);
  }
  return value.trim();
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser.value(),
        pass: gmailAppPassword.value(),
      },
    });
  }
  return transporter;
}

/**
 * Callable function: public (no auth required) — sends a registration request
 * email to the admin inbox with the prospective business/agent details.
 */
export const sendRegistrationRequest = onCall(
  {cors: true, secrets: [gmailUser, gmailAppPassword]},
  async (request) => {
    const {
      companyName: rawCompany, contactName: rawContact,
      phone: rawPhone, type, email: rawEmail,
    } = request.data as {
        companyName: unknown;
        contactName: unknown;
        phone: unknown;
        type: unknown;
        email?: unknown;
      };

    const companyName = validateStringField(
      rawCompany, MAX_FIELD_LENGTH, "שם חברה נדרש"
    );
    const contactName = validateStringField(
      rawContact, MAX_FIELD_LENGTH, "שם איש קשר נדרש"
    );
    const phone = validateStringField(
      rawPhone, MAX_FIELD_LENGTH, "מספר טלפון נדרש"
    );

    // Email is optional — validate format and length only if provided
    let emailValue: string | null = null;
    if (rawEmail && typeof rawEmail === "string" && rawEmail.trim()) {
      if (rawEmail.trim().length > MAX_FIELD_LENGTH) {
        throw new HttpsError(
          "invalid-argument",
          `אימייל (מקסימום ${MAX_FIELD_LENGTH} תווים)`
        );
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail.trim())) {
        throw new HttpsError("invalid-argument", "כתובת אימייל לא תקינה");
      }
      emailValue = rawEmail.trim();
    }

    if (type !== "business" && type !== "agent") {
      throw new HttpsError("invalid-argument", "סוג חייב להיות business או agent");
    }

    const typeLabel = type === "business" ? "בית עסק" : "סוכן נסיעות";

    const mailOptions = {
      from: `"קליק בטבע" <${gmailUser.value()}>`,
      to: "bateva365@gmail.com",
      subject: `בקשת הרשמה חדשה — ${typeLabel}`,
      html: `
        <div dir="rtl" style="font-family: sans-serif; line-height: 1.8;">
          <h2>בקשת הרשמה חדשה</h2>
          <p><strong>סוג:</strong> ${escapeHtml(typeLabel)}</p>
          <p><strong>שם חברה:</strong> ${escapeHtml(companyName)}</p>
          <p><strong>שם איש קשר:</strong> ${escapeHtml(contactName)}</p>
          <p><strong>טלפון:</strong> ${escapeHtml(phone)}</p>${emailValue ?
  `\n          <p><strong>אימייל:</strong> ${escapeHtml(emailValue)}</p>` :
  ""}
        </div>
      `,
    };

    try {
      await getTransporter().sendMail(mailOptions);
      logger.info("Registration request email sent", {type, companyName});
      return {success: true};
    } catch (err) {
      Sentry.captureException(err);
      logger.error("Failed to send registration email", err);
      throw new HttpsError("internal", "שליחת האימייל נכשלה");
    }
  }
);

// Exported for testing
export {escapeHtml, validateStringField};
