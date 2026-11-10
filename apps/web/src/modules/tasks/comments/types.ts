import type { ApiSchema } from "@sonder/contracts";

export type CommentDto = ApiSchema<"CommentDto">;
export type TaskActivityDto = ApiSchema<"TaskActivityDto">;
export type ActivityEntryDto = ApiSchema<"ActivityEntryDto">;
export type CommentActorDto = ApiSchema<"CommentActorDto">;
export type CommentMentionDto = ApiSchema<"CommentMentionDto">;
export type CommentMarkdownAst = ApiSchema<"CommentMarkdownAst">;
export type CommentMarkdownNode = ApiSchema<"CommentMarkdownNode">;
export type CreateCommentRequest = ApiSchema<"CreateCommentRequest">;
export type UpdateCommentRequest = ApiSchema<"UpdateCommentRequest">;
export type SetWatchStatusRequest = ApiSchema<"SetWatchStatusRequest">;
export type MentionCandidateDto = ApiSchema<"MentionCandidateDto">;
export type MentionCandidateListDto = ApiSchema<"MentionCandidateListDto">;

export interface ListTaskActivityParams {
  communityId: string;
  workspaceId: string;
  taskId: string;
}

export interface CreateCommentParams {
  communityId: string;
  workspaceId: string;
  taskId: string;
  data: CreateCommentRequest;
  csrfToken: string;
  mutationId?: string;
}

export interface UpdateCommentParams {
  communityId: string;
  workspaceId: string;
  commentId: string;
  data: UpdateCommentRequest;
  csrfToken: string;
  mutationId?: string;
}

export interface DeleteCommentParams {
  communityId: string;
  workspaceId: string;
  commentId: string;
  csrfToken: string;
  mutationId?: string;
}

export interface SetTaskWatchStatusParams {
  communityId: string;
  workspaceId: string;
  taskId: string;
  data: SetWatchStatusRequest;
  csrfToken: string;
  mutationId?: string;
}

export interface ListMentionCandidatesParams {
  communityId: string;
  workspaceId: string;
  taskId: string;
  q: string;
  limit?: number;
}
