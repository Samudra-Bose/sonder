import { healthHandlers } from "./health.js";
import { authHandlers } from "./auth.js";
import { workspaceHandlers } from "./workspaces.js";

export const handlers = [...healthHandlers, ...authHandlers, ...workspaceHandlers];
