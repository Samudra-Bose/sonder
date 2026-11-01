import { healthHandlers } from "./health.js";
import { authHandlers } from "./auth.js";

export const handlers = [...healthHandlers, ...authHandlers];
