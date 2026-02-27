import {setGlobalOptions} from "firebase-functions";
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,
});

setGlobalOptions({maxInstances: 10});

export {onUserCreated, setUserRole} from "./auth.js";
export {createBusinessUser, deleteBusinessUser} from "./business.js";
export {deleteContentManager, blockContentManager} from "./users.js";
export {createTravelAgent, deleteTravelAgent} from "./travelAgent.js";
