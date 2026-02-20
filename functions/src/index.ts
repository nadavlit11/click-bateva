import { setGlobalOptions } from "firebase-functions";

setGlobalOptions({ maxInstances: 10 });

export { onUserCreated, setUserRole } from "./auth.js";
export { createBusinessUser } from "./business.js";
