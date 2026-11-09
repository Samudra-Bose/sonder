import type { MilestoneDto } from "@/modules/milestones/types.js";
import { WS_SHARED_ENG_ID, WS_SHARED_GALA_ID } from "./my-work.js";

export const MILESTONE_ENG_FREEZE_ID = "018f98a2-3f12-7890-m001-456789abcdef";
export const MILESTONE_ENG_BETA_ID = "018f98a2-3f12-7890-m002-456789abcdef";
export const MILESTONE_ENG_GA_ID = "018f98a2-3f12-7890-m003-456789abcdef";

export const MILESTONE_GALA_SIGNOFF_ID = "018f98a2-3f12-7890-m004-456789abcdef";
export const MILESTONE_GALA_TICKETS_ID = "018f98a2-3f12-7890-m005-456789abcdef";
export const MILESTONE_GALA_NIGHT_ID = "018f98a2-3f12-7890-m006-456789abcdef";

export const INITIAL_MOCK_MILESTONES: MilestoneDto[] = [
  {
    id: MILESTONE_ENG_FREEZE_ID,
    workspaceId: WS_SHARED_ENG_ID,
    name: "Beta Architecture Freeze",
    description: "All core API and data pipeline designs frozen for beta candidate.",
    targetDate: "2026-11-05",
    createdAt: "2026-10-15T10:00:00.000Z",
    updatedAt: "2026-10-15T10:00:00.000Z",
  },
  {
    id: MILESTONE_ENG_BETA_ID,
    workspaceId: WS_SHARED_ENG_ID,
    name: "Public Beta Release",
    description: "Deployment of initial public release candidate across staging environments.",
    targetDate: "2026-11-15",
    createdAt: "2026-10-15T10:30:00.000Z",
    updatedAt: "2026-10-15T10:30:00.000Z",
  },
  {
    id: MILESTONE_ENG_GA_ID,
    workspaceId: WS_SHARED_ENG_ID,
    name: "GA Stability Hardening",
    description: "End-to-end stability, performance benchmarks, and zero-defect signoff.",
    targetDate: "2026-11-30",
    createdAt: "2026-10-15T11:00:00.000Z",
    updatedAt: "2026-10-15T11:00:00.000Z",
  },
  {
    id: MILESTONE_GALA_SIGNOFF_ID,
    workspaceId: WS_SHARED_GALA_ID,
    name: "Venue & Vendor Sign-off",
    description: "Final contracts and deposits executed for venue, audio/video, and catering.",
    targetDate: "2026-11-08",
    createdAt: "2026-10-20T09:00:00.000Z",
    updatedAt: "2026-10-20T09:00:00.000Z",
  },
  {
    id: MILESTONE_GALA_TICKETS_ID,
    workspaceId: WS_SHARED_GALA_ID,
    name: "Ticket Sales Launch",
    description: "Early-bird ticketing portal opened for community attendees.",
    targetDate: "2026-11-14",
    createdAt: "2026-10-20T09:30:00.000Z",
    updatedAt: "2026-10-20T09:30:00.000Z",
  },
  {
    id: MILESTONE_GALA_NIGHT_ID,
    workspaceId: WS_SHARED_GALA_ID,
    name: "Gala Night 2026",
    description: "Annual community gala event and fundraising celebration.",
    targetDate: "2026-11-28",
    createdAt: "2026-10-20T10:00:00.000Z",
    updatedAt: "2026-10-20T10:00:00.000Z",
  },
];

let mockMilestones: MilestoneDto[] = INITIAL_MOCK_MILESTONES.map((m) => ({ ...m }));

export function getMockMilestones(): MilestoneDto[] {
  return mockMilestones;
}

export function setMockMilestones(newMilestones: MilestoneDto[]): void {
  mockMilestones = newMilestones;
}

export function resetMockMilestones(): void {
  mockMilestones = INITIAL_MOCK_MILESTONES.map((m) => ({ ...m }));
}
