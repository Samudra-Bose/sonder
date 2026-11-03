import { http, HttpResponse, delay } from "msw";
import type { ApiSchema } from "@sonder/contracts";
import { mockTasksCommunity1, MOCK_COMMUNITY_1_ID } from "../data/my-work";
import type { MyWorkQueryResult } from "@/modules/my-work/types";

let myWorkDelayMs = 0;
let myWorkError: { status: number; problem: ApiSchema<"Problem"> } | null = null;
let myWorkEmpty = false;

export function setMockMyWorkDelay(ms: number): void {
  myWorkDelayMs = ms;
}

export function setMockMyWorkError(
  error: { status: number; problem: ApiSchema<"Problem"> } | null
): void {
  myWorkError = error;
}

export function setMockMyWorkEmpty(empty: boolean): void {
  myWorkEmpty = empty;
}

export function resetMyWorkMockState(): void {
  myWorkDelayMs = 0;
  myWorkError = null;
  myWorkEmpty = false;
}

export const myWorkHandlers = [
  // POST /api/v1/communities/:communityId/my-work/query
  http.post("/api/v1/communities/:communityId/my-work/query", async ({ params }) => {
    if (myWorkDelayMs > 0) {
      await delay(myWorkDelayMs);
    }

    if (myWorkError) {
      return HttpResponse.json(myWorkError.problem, {
        status: myWorkError.status,
        headers: { "Content-Type": "application/problem+json" },
      });
    }

    const communityId = (params.communityId ?? "").toString();

    // Reject unknown community with 404 problem
    if (communityId !== MOCK_COMMUNITY_1_ID && !communityId.startsWith("comm-")) {
      const notFoundProblem: ApiSchema<"Problem"> = {
        type: "https://errors.sonder.platform/community-not-found",
        title: "Community Not Found",
        status: 404,
        detail: `Community with ID "${communityId}" was not found or is inaccessible.`,
        code: "COMMUNITY_NOT_FOUND",
      };
      return HttpResponse.json(notFoundProblem, {
        status: 404,
        headers: { "Content-Type": "application/problem+json" },
      });
    }

    if (myWorkEmpty) {
      const emptyResult: MyWorkQueryResult = {
        items: [],
        total: 0,
        nextCursor: null,
      };
      return HttpResponse.json(emptyResult, { status: 200 });
    }

    const result: MyWorkQueryResult = {
      items: mockTasksCommunity1,
      total: mockTasksCommunity1.length,
      nextCursor: null,
    };

    return HttpResponse.json(result, { status: 200 });
  }),
];
