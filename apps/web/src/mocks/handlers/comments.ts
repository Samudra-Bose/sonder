import { http, HttpResponse } from "msw";
import type { ApiSchema } from "@sonder/contracts";
import { generateUuidV7 } from "../../lib/uuid.js";
import {
  getMockComments,
  getMockActivity,
  initialMockMentionCandidates,
  setMockTaskWatching,
  type CommentDto,
} from "../data/comments.js";
import { getMockTasks } from "./tasks.js";
import { MOCK_USER_ID } from "../data/my-work.js";
import { parseMarkdownToAst } from "../../modules/tasks/comments/markdown-ast.js";

export interface MockCommentsErrorOverride {
  status: number;
  problem: ApiSchema<"Problem">;
  endpoint?: "comments" | "watch" | "mentions" | "ALL";
}

let commentsErrorOverride: MockCommentsErrorOverride | null = null;

export function setMockCommentsError(error: MockCommentsErrorOverride | null): void {
  commentsErrorOverride = error;
}

function calculateCommentDepth(commentId: string | null | undefined, comments: CommentDto[]): number {
  let depth = 0;
  let currentId = commentId;
  while (currentId) {
    depth++;
    const parent = comments.find((c) => c.id === currentId);
    if (!parent) break;
    currentId = parent.parentCommentId;
    if (depth > 10) break; // cycle protection
  }
  return depth;
}

export const commentHandlers = [
  // 1. List task activity & comments
  http.get(
    "/api/v1/communities/:communityId/workspaces/:workspaceId/tasks/:taskId/comments",
    async ({ params }) => {
      const { taskId } = params as { taskId: string };

      if (commentsErrorOverride && (!commentsErrorOverride.endpoint || commentsErrorOverride.endpoint === "comments" || commentsErrorOverride.endpoint === "ALL")) {
        return HttpResponse.json(commentsErrorOverride.problem, {
          status: commentsErrorOverride.status,
          headers: { "Content-Type": "application/problem+json" },
        });
      }

      const tasks = getMockTasks();
      const task = tasks.find((t) => t.id === taskId);
      if (!task) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/not-found",
            title: "Task Not Found",
            status: 404,
            detail: `Task ${taskId} was not found.`,
            code: "TASK_NOT_FOUND",
          },
          { status: 404, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      const allComments = getMockComments();
      const taskComments = allComments.filter((c) => c.taskId === taskId);
      const allActivity = getMockActivity();

      return HttpResponse.json(
        {
          comments: taskComments,
          activity: allActivity,
        },
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "private, no-store",
          },
        }
      );
    }
  ),

  // 2. Create comment
  http.post(
    "/api/v1/communities/:communityId/workspaces/:workspaceId/tasks/:taskId/comments",
    async ({ request, params }) => {
      const { taskId } = params as { taskId: string };
      const csrfToken = request.headers.get("x-csrf-token");

      if (!csrfToken || !csrfToken.trim()) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/csrf-error",
            title: "CSRF Token Required",
            status: 400,
            detail: "A valid CSRF synchronizer token is required.",
            code: "CSRF_TOKEN_REQUIRED",
          },
          { status: 400, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      if (commentsErrorOverride && (!commentsErrorOverride.endpoint || commentsErrorOverride.endpoint === "comments" || commentsErrorOverride.endpoint === "ALL")) {
        return HttpResponse.json(commentsErrorOverride.problem, {
          status: commentsErrorOverride.status,
          headers: { "Content-Type": "application/problem+json" },
        });
      }

      const tasks = getMockTasks();
      const task = tasks.find((t) => t.id === taskId);
      if (!task) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/not-found",
            title: "Task Not Found",
            status: 404,
            detail: `Task ${taskId} was not found.`,
            code: "TASK_NOT_FOUND",
          },
          { status: 404, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      let body: ApiSchema<"CreateCommentRequest">;
      try {
        body = (await request.json()) as ApiSchema<"CreateCommentRequest">;
      } catch {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/invalid-body",
            title: "Invalid Request Body",
            status: 400,
            detail: "Unable to parse request JSON.",
          },
          { status: 400, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      if (!body.body || !body.body.trim()) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/comment-body-invalid",
            title: "Comment Body Invalid",
            status: 422,
            detail: "Comment body cannot be empty.",
            code: "COMMENT_BODY_INVALID",
          },
          { status: 422, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      if (body.body.length > 20000) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/comment-body-invalid",
            title: "Comment Body Exceeds Maximum Length",
            status: 422,
            detail: "Comment body cannot exceed 20,000 characters.",
            code: "COMMENT_BODY_INVALID",
          },
          { status: 422, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      const allComments = getMockComments();

      // Check parent comment if threaded reply
      if (body.parentCommentId) {
        const parent = allComments.find(
          (c) => c.id === body.parentCommentId && c.taskId === taskId && !c.isDeleted
        );
        if (!parent) {
          return HttpResponse.json(
            {
              type: "https://errors.sonder.platform/comment-parent-invalid",
              title: "Invalid Parent Comment",
              status: 422,
              detail: "Parent comment does not exist or has been deleted.",
              code: "COMMENT_PARENT_INVALID",
            },
            { status: 422, headers: { "Content-Type": "application/problem+json" } }
          );
        }

        const depth = calculateCommentDepth(body.parentCommentId, allComments);
        if (depth >= 5) {
          return HttpResponse.json(
            {
              type: "https://errors.sonder.platform/comment-depth-exceeded",
              title: "Comment Nesting Depth Exceeded",
              status: 422,
              detail: "Maximum comment thread depth is 5.",
              code: "COMMENT_DEPTH_EXCEEDED",
            },
            { status: 422, headers: { "Content-Type": "application/problem+json" } }
          );
        }
      }

      // Parse AST and mentions
      const parsedAst = parseMarkdownToAst(body.body);
      const mentionTokens: ApiSchema<"CommentMentionDto">[] = [];
      const mentionRegex =
        /@\[([^\]]+)\]\(user:([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\)/g;
      let match: RegExpExecArray | null;
      while ((match = mentionRegex.exec(body.body)) !== null) {
        const displayName = match[1];
        const userId = match[2];
        if (displayName && userId && !mentionTokens.some((m) => m.userId === userId)) {
          mentionTokens.push({
            userId,
            displayName,
            isFormerMember: false,
          });
        }
      }

      const newComment: CommentDto = {
        id: generateUuidV7(),
        taskId,
        authorId: MOCK_USER_ID,
        author: {
          id: MOCK_USER_ID,
          displayName: "Alex Morgan",
          avatarUrl: null,
          isFormerMember: false,
        },
        parentCommentId: body.parentCommentId ?? null,
        body: body.body,
        bodyAst: parsedAst,
        mentions: mentionTokens,
        createdAt: new Date().toISOString(),
        editedAt: null,
        deletedAt: null,
        isDeleted: false,
        version: 1,
      };

      allComments.push(newComment);

      // Auto-watch creator of comment
      setMockTaskWatching(taskId, MOCK_USER_ID, true);

      return HttpResponse.json(newComment, {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-store",
          "X-Workspace-Seq": "101",
        },
      });
    }
  ),

  // 3. Edit comment
  http.patch(
    "/api/v1/communities/:communityId/workspaces/:workspaceId/comments/:commentId",
    async ({ request, params }) => {
      const { commentId } = params as { commentId: string };
      const csrfToken = request.headers.get("x-csrf-token");

      if (!csrfToken || !csrfToken.trim()) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/csrf-error",
            title: "CSRF Token Required",
            status: 400,
            detail: "A valid CSRF synchronizer token is required.",
            code: "CSRF_TOKEN_REQUIRED",
          },
          { status: 400, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      const allComments = getMockComments();
      const comment = allComments.find((c) => c.id === commentId);

      if (!comment || comment.isDeleted) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/not-found",
            title: "Comment Not Found",
            status: 404,
            detail: `Comment ${commentId} was not found.`,
            code: "COMMENT_NOT_FOUND",
          },
          { status: 404, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      // Check author capability
      if (comment.authorId !== MOCK_USER_ID) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/insufficient-capability",
            title: "Forbidden",
            status: 403,
            detail: "You can only edit your own comments.",
            code: "INSUFFICIENT_CAPABILITY",
          },
          { status: 403, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      const body = (await request.json()) as ApiSchema<"UpdateCommentRequest">;

      // Optimistic concurrency check
      if (body.version !== comment.version) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/comment-version-conflict",
            title: "Comment Version Conflict",
            status: 409,
            detail: "Comment was modified by another request. Please reload and try again.",
            code: "COMMENT_VERSION_CONFLICT",
          },
          { status: 409, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      comment.body = body.body;
      comment.bodyAst = parseMarkdownToAst(body.body);
      comment.editedAt = new Date().toISOString();
      comment.version += 1;

      return HttpResponse.json(comment, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-store",
          "X-Workspace-Seq": "102",
        },
      });
    }
  ),

  // 4. Soft-delete comment
  http.delete(
    "/api/v1/communities/:communityId/workspaces/:workspaceId/comments/:commentId",
    async ({ request, params }) => {
      const { commentId } = params as { commentId: string };
      const csrfToken = request.headers.get("x-csrf-token");

      if (!csrfToken || !csrfToken.trim()) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/csrf-error",
            title: "CSRF Token Required",
            status: 400,
            detail: "A valid CSRF synchronizer token is required.",
            code: "CSRF_TOKEN_REQUIRED",
          },
          { status: 400, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      const allComments = getMockComments();
      const comment = allComments.find((c) => c.id === commentId);

      if (!comment) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/not-found",
            title: "Comment Not Found",
            status: 404,
            detail: `Comment ${commentId} was not found.`,
            code: "COMMENT_NOT_FOUND",
          },
          { status: 404, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      // Soft delete
      comment.isDeleted = true;
      comment.body = null;
      comment.bodyAst = null;
      comment.mentions = [];
      comment.deletedAt = new Date().toISOString();
      comment.version += 1;

      return new HttpResponse(null, {
        status: 204,
        headers: {
          "Cache-Control": "private, no-store",
          "X-Workspace-Seq": "103",
        },
      });
    }
  ),

  // 5. Task watch status toggle
  http.put(
    "/api/v1/communities/:communityId/workspaces/:workspaceId/tasks/:taskId/watch",
    async ({ request, params }) => {
      const { taskId } = params as { taskId: string };
      const csrfToken = request.headers.get("x-csrf-token");

      if (!csrfToken || !csrfToken.trim()) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/csrf-error",
            title: "CSRF Token Required",
            status: 400,
            detail: "A valid CSRF synchronizer token is required.",
            code: "CSRF_TOKEN_REQUIRED",
          },
          { status: 400, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      if (commentsErrorOverride && (!commentsErrorOverride.endpoint || commentsErrorOverride.endpoint === "watch" || commentsErrorOverride.endpoint === "ALL")) {
        return HttpResponse.json(commentsErrorOverride.problem, {
          status: commentsErrorOverride.status,
          headers: { "Content-Type": "application/problem+json" },
        });
      }

      const body = (await request.json()) as ApiSchema<"SetWatchStatusRequest">;
      setMockTaskWatching(taskId, MOCK_USER_ID, body.watching);

      return new HttpResponse(null, {
        status: 204,
        headers: {
          "Cache-Control": "private, no-store",
          "X-Workspace-Seq": "104",
        },
      });
    }
  ),

  // 6. Mention candidates
  http.get(
    "/api/v1/communities/:communityId/workspaces/:workspaceId/tasks/:taskId/mention-candidates",
    async ({ request }) => {
      const url = new URL(request.url);
      const q = url.searchParams.get("q") ?? "";

      const filtered = initialMockMentionCandidates.filter(
        (c) =>
          c.userId !== MOCK_USER_ID && // Exclude actor
          c.displayName.toLowerCase().includes(q.toLowerCase())
      );

      return HttpResponse.json(
        { items: filtered },
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "private, no-store",
          },
        }
      );
    }
  ),
];
