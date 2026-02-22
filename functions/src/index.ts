import {setGlobalOptions} from "firebase-functions";

setGlobalOptions({maxInstances: 10});

export {onUserCreated, setUserRole} from "./auth.js";
export {createBusinessUser, deleteBusinessUser} from "./business.js";
