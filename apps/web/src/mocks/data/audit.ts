import type {
  AuditEventDto,
  AuditIntegrityStatusDto,
} from "@/modules/workspace/settings/types.js";
import { WS_SHARED_ENG_ID, WS_SHARED_GALA_ID } from "./my-work.js";

export const MOCK_COMMUNITY_ID = "018f98a2-3f12-7890-b123-456789abcdef";
export const MOCK_ACTOR_ALEX = "018f98a2-3f12-7890-a123-456789abcdef";
export const MOCK_ACTOR_JORDAN = "018f98a2-3f12-7890-a123-456789bbcdef";
export const MOCK_ACTOR_TAYLOR = "018f98a2-3f12-7890-a123-456789cccdef";

export const initialMockAuditEvents: AuditEventDto[] = [
  // 1. Genesis Event: Workspace Created
  {
    id: "018f98a2-3f12-7890-ae01-456789abcdef",
    communityId: MOCK_COMMUNITY_ID,
    communitySequence: 1,
    workspaceId: WS_SHARED_ENG_ID,
    eventType: "WORKSPACE_CREATED",
    category: "WORKSPACE_GOVERNANCE",
    occurredAt: "2026-02-01T08:00:00Z",
    severity: "INFO",
    actorId: MOCK_ACTOR_ALEX,
    targetType: "WORKSPACE",
    targetId: WS_SHARED_ENG_ID,
    metadata: {
      reasonCode: "ACCOUNT_RECOVERY",
      changedFields: ["workspacePolicy"],
    },
    previousEntryHash: null,
    entryHash: "b8b98031ed2f1ed3c1d5e5578b86e95cbf0ec752c1744ce994ce7a406769c7ca",
    hashAlgorithm: "SHA-256",
  },
  // 2. Settings Changed: Key Prefix reserved
  {
    id: "018f98a2-3f12-7890-ae02-456789abcdef",
    communityId: MOCK_COMMUNITY_ID,
    communitySequence: 2,
    workspaceId: WS_SHARED_ENG_ID,
    eventType: "WORKSPACE_SETTINGS_CHANGED",
    category: "WORKSPACE_GOVERNANCE",
    occurredAt: "2026-02-01T08:30:00Z",
    severity: "INFO",
    actorId: MOCK_ACTOR_ALEX,
    targetType: "WORKSPACE",
    targetId: WS_SHARED_ENG_ID,
    metadata: {
      changedFields: ["workspacePolicy", "taskEditPolicy"],
    },
    previousEntryHash: "b8b98031ed2f1ed3c1d5e5578b86e95cbf0ec752c1744ce994ce7a406769c7ca",
    entryHash: "fc483a32609937d14c6aea3433e14eb40bce190b10e728e29b108970958b0242",
    hashAlgorithm: "SHA-256",
  },
  // 3. Member Added: Jordan Lee as Coordinator
  {
    id: "018f98a2-3f12-7890-ae03-456789abcdef",
    communityId: MOCK_COMMUNITY_ID,
    communitySequence: 3,
    workspaceId: WS_SHARED_ENG_ID,
    eventType: "WORKSPACE_MEMBER_ADDED",
    category: "WORKSPACE_MEMBERSHIP",
    occurredAt: "2026-02-02T10:00:00Z",
    severity: "INFO",
    actorId: MOCK_ACTOR_ALEX,
    targetType: "MEMBERSHIP",
    targetId: "018f98a2-3f12-7890-mem01-456789abcdef",
    metadata: {
      membershipId: "018f98a2-3f12-7890-mem01-456789abcdef",
      roleId: "018f98a2-3f12-7890-role-coord-002",
      changedFields: ["membershipRole"],
    },
    previousEntryHash: "fc483a32609937d14c6aea3433e14eb40bce190b10e728e29b108970958b0242",
    entryHash: "b456184539d903b3a67aa00ff1068f050ff8f8038e41431623887cf39c174d58",
    hashAlgorithm: "SHA-256",
  },
  // 4. Role Changed: Taylor Swift promoted to Member
  {
    id: "018f98a2-3f12-7890-ae04-456789abcdef",
    communityId: MOCK_COMMUNITY_ID,
    communitySequence: 4,
    workspaceId: WS_SHARED_ENG_ID,
    eventType: "WORKSPACE_MEMBER_ROLE_CHANGED",
    category: "ROLE_AND_PERMISSION",
    occurredAt: "2026-02-03T11:15:00Z",
    severity: "WARNING",
    actorId: MOCK_ACTOR_JORDAN,
    targetType: "ROLE",
    targetId: "018f98a2-3f12-7890-role-member-003",
    metadata: {
      previousRoleId: "018f98a2-3f12-7890-role-viewer-004",
      newRoleId: "018f98a2-3f12-7890-role-member-003",
      changedFields: ["membershipRole"],
    },
    previousEntryHash: "b456184539d903b3a67aa00ff1068f050ff8f8038e41431623887cf39c174d58",
    entryHash: "2b45797e9e7af4216228ad273f24552bbb25aad86d87d988fa1e0bea21f0e365",
    hashAlgorithm: "SHA-256",
  },
  // 5. Custom Role Created: Triage Specialist
  {
    id: "018f98a2-3f12-7890-ae05-456789abcdef",
    communityId: MOCK_COMMUNITY_ID,
    communitySequence: 5,
    workspaceId: WS_SHARED_ENG_ID,
    eventType: "CUSTOM_ROLE_CREATED",
    category: "ROLE_AND_PERMISSION",
    occurredAt: "2026-02-04T14:20:00Z",
    severity: "INFO",
    actorId: MOCK_ACTOR_ALEX,
    targetType: "ROLE",
    targetId: "018f98a2-3f12-7890-role-custom-005",
    metadata: {
      roleId: "018f98a2-3f12-7890-role-custom-005",
      changedFields: ["customRoleCapabilities"],
    },
    previousEntryHash: "2b45797e9e7af4216228ad273f24552bbb25aad86d87d988fa1e0bea21f0e365",
    entryHash: "533c7ada981b6f0b698965b86af9556b538858cba9beab27975ad73e4d77022e",
    hashAlgorithm: "SHA-256",
  },
  // 6. Assignee Field Grants Changed
  {
    id: "018f98a2-3f12-7890-ae06-456789abcdef",
    communityId: MOCK_COMMUNITY_ID,
    communitySequence: 6,
    workspaceId: WS_SHARED_ENG_ID,
    eventType: "TASK_ASSIGNEE_FIELD_GRANTS_CHANGED",
    category: "ROLE_AND_PERMISSION",
    occurredAt: "2026-02-05T09:45:00Z",
    severity: "INFO",
    actorId: MOCK_ACTOR_ALEX,
    targetType: "TASK",
    targetId: "018f98a2-3f12-7890-t001-456789abcdef",
    metadata: {
      changedFields: ["assigneeFieldGrantCeiling", "assigneeEditableFieldGroups"],
    },
    previousEntryHash: "533c7ada981b6f0b698965b86af9556b538858cba9beab27975ad73e4d77022e",
    entryHash: "b80f044522157897668240083934371715b96d5199cb0750b0fbadceae042cff",
    hashAlgorithm: "SHA-256",
  },
  // 7. Task Transferred (Names Only)
  {
    id: "018f98a2-3f12-7890-ae07-456789abcdef",
    communityId: MOCK_COMMUNITY_ID,
    communitySequence: 7,
    workspaceId: WS_SHARED_ENG_ID,
    eventType: "TASK_TRANSFERRED",
    category: "DATA_LIFECYCLE",
    occurredAt: "2026-02-06T16:00:00Z",
    severity: "WARNING",
    actorId: MOCK_ACTOR_ALEX,
    targetType: "TASK",
    targetId: "018f98a2-3f12-7890-t002-456789abcdef",
    metadata: {
      sourceWorkspaceId: WS_SHARED_ENG_ID,
      targetWorkspaceId: WS_SHARED_GALA_ID,
      affectedCount: 1,
      changedFields: ["taskTransfer"],
    },
    previousEntryHash: "b80f044522157897668240083934371715b96d5199cb0750b0fbadceae042cff",
    entryHash: "3c3a11824e62c3878dfbd47adc1c03522f48ee976af4fc3d2c1f942351d7281d",
    hashAlgorithm: "SHA-256",
  },
  // 8. Audited Break-Glass Granted (Personal Workspace)
  {
    id: "018f98a2-3f12-7890-ae08-456789abcdef",
    communityId: MOCK_COMMUNITY_ID,
    communitySequence: 8,
    workspaceId: WS_SHARED_ENG_ID,
    eventType: "BREAK_GLASS_GRANTED",
    category: "ACCESS_EXCEPTION",
    occurredAt: "2026-02-07T12:00:00Z",
    severity: "CRITICAL",
    actorId: MOCK_ACTOR_ALEX,
    targetType: "BREAK_GLASS_GRANT",
    targetId: "018f98a2-3f12-7890-bg01-456789abcdef",
    metadata: {
      grantId: "018f98a2-3f12-7890-bg01-456789abcdef",
      breakGlassAccessMode: "READ_ONLY",
      reasonCode: "INCIDENT_RESPONSE",
      approverUserId: MOCK_ACTOR_ALEX,
    },
    previousEntryHash: "3c3a11824e62c3878dfbd47adc1c03522f48ee976af4fc3d2c1f942351d7281d",
    entryHash: "c12bea37c8b1c13763d928dcd052cc4bc6b93b97670abb57317efec4c8d91b14",
    hashAlgorithm: "SHA-256",
  },
  // 9. Audit Log Searched
  {
    id: "018f98a2-3f12-7890-ae09-456789abcdef",
    communityId: MOCK_COMMUNITY_ID,
    communitySequence: 9,
    workspaceId: WS_SHARED_ENG_ID,
    eventType: "AUDIT_LOG_SEARCHED",
    category: "AUDIT_ACCESS",
    occurredAt: "2026-02-08T15:30:00Z",
    severity: "INFO",
    actorId: MOCK_ACTOR_JORDAN,
    targetType: "WORKSPACE",
    targetId: WS_SHARED_ENG_ID,
    metadata: {
      changedFields: ["retentionPolicy"],
    },
    previousEntryHash: "c12bea37c8b1c13763d928dcd052cc4bc6b93b97670abb57317efec4c8d91b14",
    entryHash: "1cf2594864a298e5347ac9cf2dd230393826542249ceac6d1a5557ebed6fa76d",
    hashAlgorithm: "SHA-256",
  },
  // 10. Audit Log Exported to CSV
  {
    id: "018f98a2-3f12-7890-ae10-456789abcdef",
    communityId: MOCK_COMMUNITY_ID,
    communitySequence: 10,
    workspaceId: WS_SHARED_ENG_ID,
    eventType: "AUDIT_LOG_EXPORTED",
    category: "AUDIT_ACCESS",
    occurredAt: "2026-02-09T17:00:00Z",
    severity: "INFO",
    actorId: MOCK_ACTOR_ALEX,
    targetType: "AUDIT_EXPORT",
    targetId: "018f98a2-3f12-7890-exp1-456789abcdef",
    metadata: {
      exportId: "018f98a2-3f12-7890-exp1-456789abcdef",
      exportedRowCount: 9,
      exportFilterFingerprint: "e27c95fe8cf455885f1aed8a9171bbbf99832af4681ff5fa64ebf583b0c12171",
    },
    previousEntryHash: "1cf2594864a298e5347ac9cf2dd230393826542249ceac6d1a5557ebed6fa76d",
    entryHash: "e27c95fe8cf455885f1aed8a9171bbbf99832af4681ff5fa64ebf583b0c12171",
    hashAlgorithm: "SHA-256",
  },
  // 11. Additional event for pagination testing in WS_SHARED_ENG_ID
  {
    id: "018f98a2-3f12-7890-ae11-456789abcdef",
    communityId: MOCK_COMMUNITY_ID,
    communitySequence: 11,
    workspaceId: WS_SHARED_ENG_ID,
    eventType: "WORKSPACE_MEMBER_ADDED",
    category: "WORKSPACE_MEMBERSHIP",
    occurredAt: "2026-02-10T10:00:00Z",
    severity: "INFO",
    actorId: MOCK_ACTOR_ALEX,
    targetType: "MEMBERSHIP",
    targetId: "018f98a2-3f12-7890-mem02-456789abcdef",
    metadata: {
      membershipId: "018f98a2-3f12-7890-mem02-456789abcdef",
      roleId: "018f98a2-3f12-7890-role-viewer-004",
      changedFields: ["membershipRole"],
    },
    previousEntryHash: "e27c95fe8cf455885f1aed8a9171bbbf99832af4681ff5fa64ebf583b0c12171",
    entryHash: "86efb9d919aae90df6d9453ea25d6e5f068425753ef4c8a5d8737df4be40c37e",
    hashAlgorithm: "SHA-256",
  },
  // 12. Workspace Isolation Test Event: In Gala Planning (WS_SHARED_GALA_ID), NOT WS_SHARED_ENG_ID
  {
    id: "018f98a2-3f12-7890-ae12-456789abcdef",
    communityId: MOCK_COMMUNITY_ID,
    communitySequence: 12,
    workspaceId: WS_SHARED_GALA_ID,
    eventType: "WORKSPACE_SETTINGS_CHANGED",
    category: "WORKSPACE_GOVERNANCE",
    occurredAt: "2026-02-11T12:00:00Z",
    severity: "INFO",
    actorId: MOCK_ACTOR_ALEX,
    targetType: "WORKSPACE",
    targetId: WS_SHARED_GALA_ID,
    metadata: {
      changedFields: ["workspacePolicy"],
    },
    previousEntryHash: "86efb9d919aae90df6d9453ea25d6e5f068425753ef4c8a5d8737df4be40c37e",
    entryHash: "83c12fac268be30087c80bf0b2ff981f3d6cac854554c49a633bc287795040f5",
    hashAlgorithm: "SHA-256",
  },
];

export const initialMockAuditIntegrity: AuditIntegrityStatusDto = {
  status: "HEALTHY",
  currentHeadSequence: 12,
  verifiedThroughSequence: 12,
  lastVerifiedAt: "2026-02-11T12:00:05Z",
  externalCheckpointSequence: 12,
};

let currentAuditEvents: AuditEventDto[] = JSON.parse(JSON.stringify(initialMockAuditEvents));
let currentAuditIntegrity: AuditIntegrityStatusDto = { ...initialMockAuditIntegrity };

export function getMockAuditEvents(): AuditEventDto[] {
  return currentAuditEvents;
}

export function getMockAuditIntegrity(): AuditIntegrityStatusDto {
  return currentAuditIntegrity;
}

export function setMockAuditIntegrityStatus(status: AuditIntegrityStatusDto["status"]): void {
  currentAuditIntegrity = { ...currentAuditIntegrity, status };
}

export function resetMockAuditState(): void {
  currentAuditEvents = JSON.parse(JSON.stringify(initialMockAuditEvents));
  currentAuditIntegrity = { ...initialMockAuditIntegrity };
}
