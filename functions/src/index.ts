// Cloud Functions entry point — v2 enrichment pipeline
import {setGlobalOptions} from "firebase-functions";
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,
});

setGlobalOptions({maxInstances: 10, region: "me-west1"});

export {onUserCreated, setUserRole} from "./auth.js";
export {createBusinessUser, deleteBusinessUser} from "./business.js";
export {deleteContentManager, blockContentManager, createContentManager} from "./users.js";
export {createTravelAgent, deleteTravelAgent} from "./agent.js";
export {sendRegistrationRequest} from "./registration.js";
export {createCrmUser, deleteCrmUser} from "./crm.js";
export {sendContactEmail} from "./email.js";
export {auditPoiChanges} from "./audit.js";
export {
  enrichPoiFromWebsite,
  updateEnrichmentInstructions,
  enrichPoiFromDescription,
} from "./enrichment/index.js";
export {
  analyzeEnrichmentFeedback,
} from "./enrichment/analysis.js";
