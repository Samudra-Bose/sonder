/**
 * Development Mock Handlers — Health & Operational Probes
 * 
 * Note: These handlers provide contract-shaped scaffolding for local dev and testing.
 * They do not implement backend business logic or health checking.
 */
import { http, HttpResponse } from "msw";
import type { ApiSchema } from "@sonder/contracts";

export const healthHandlers = [
  http.get("/api/v1/health/live", () => {
    const liveResponse: ApiSchema<"HealthLiveResponse"> = {
      status: "UP",
    };
    return HttpResponse.json(liveResponse, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }),

  http.get("/api/v1/health/ready", () => {
    const readyResponse: ApiSchema<"HealthReadyResponse"> = {
      status: "UP",
    };
    return HttpResponse.json(readyResponse, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }),
];
