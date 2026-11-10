import { healthHandlers } from "./health.js";
import { authHandlers } from "./auth.js";
import { workspaceHandlers } from "./workspaces.js";
import { myWorkHandlers } from "./my-work.js";
import { taskHandlers } from "./tasks.js";
import { milestoneHandlers } from "./milestones.js";
import { taskLinkHandlers } from "./task-links.js";
import { commentHandlers } from "./comments.js";
import { notificationHandlers } from "./notifications.js";

export const handlers = [
  ...healthHandlers,
  ...authHandlers,
  ...workspaceHandlers,
  ...myWorkHandlers,
  ...taskHandlers,
  ...milestoneHandlers,
  ...taskLinkHandlers,
  ...commentHandlers,
  ...notificationHandlers,
];
