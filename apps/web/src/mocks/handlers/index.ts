import { healthHandlers } from "./health.js";
import { authHandlers } from "./auth.js";
import { workspaceHandlers } from "./workspaces.js";
import { myWorkHandlers } from "./my-work.js";
import { taskHandlers } from "./tasks.js";

export const handlers = [
  ...healthHandlers,
  ...authHandlers,
  ...workspaceHandlers,
  ...myWorkHandlers,
  ...taskHandlers,
];
