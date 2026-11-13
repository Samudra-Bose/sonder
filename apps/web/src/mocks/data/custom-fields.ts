import type { ApiSchema } from "@sonder/contracts";
import { WS_SHARED_ENG_ID } from "./my-work.js";

export type CustomFieldDefinitionDto = ApiSchema<"CustomFieldDefinitionDto">;
export type CustomFieldOptionDto = ApiSchema<"CustomFieldOptionDto">;

export const initialMockCustomFields: CustomFieldDefinitionDto[] = [
  {
    id: "018f98a2-3f12-7890-cf01-456789abcdef",
    name: "Component",
    fieldType: "TEXT",
    isRequired: false,
    isArchived: false,
    options: [],
    fieldKey: "cf_component",
    version: 1,
    displayOrder: 1,
    description: "Architectural component or subsystem",
  },
  {
    id: "018f98a2-3f12-7890-cf02-456789abcdef",
    name: "Story Points",
    fieldType: "NUMBER",
    isRequired: false,
    isArchived: false,
    options: [],
    fieldKey: "cf_story_points",
    version: 1,
    displayOrder: 2,
    description: "Complexity estimation in points",
  },
  {
    id: "018f98a2-3f12-7890-cf03-456789abcdef",
    name: "Release Track",
    fieldType: "SINGLE_SELECT",
    isRequired: false,
    isArchived: false,
    options: [
      {
        id: "018f98a2-3f12-7890-opt1-456789abcdef",
        label: "Alpha",
        sortOrder: 1,
        isArchived: false,
      },
      {
        id: "018f98a2-3f12-7890-opt2-456789abcdef",
        label: "Beta",
        sortOrder: 2,
        isArchived: false,
      },
      {
        id: "018f98a2-3f12-7890-opt3-456789abcdef",
        label: "Stable",
        sortOrder: 3,
        isArchived: false,
      },
    ],
    fieldKey: "cf_release_track",
    version: 1,
    displayOrder: 3,
    description: "Target deployment track",
  },
  {
    id: "018f98a2-3f12-7890-cf04-456789abcdef",
    name: "Target Deployment",
    fieldType: "DATE",
    isRequired: false,
    isArchived: false,
    options: [],
    fieldKey: "cf_target_deployment",
    version: 1,
    displayOrder: 4,
    description: "Target release or deployment date",
  },
  {
    id: "018f98a2-3f12-7890-cf05-456789abcdef",
    name: "Customer Impact",
    fieldType: "BOOLEAN",
    isRequired: false,
    isArchived: false,
    options: [],
    fieldKey: "cf_customer_impact",
    version: 1,
    displayOrder: 5,
    description: "Whether change directly affects end customers",
  },
];

export const mockCustomFieldsByWorkspaceId: Record<string, CustomFieldDefinitionDto[]> = {
  [WS_SHARED_ENG_ID]: JSON.parse(JSON.stringify(initialMockCustomFields)),
};

export function getMockCustomFields(workspaceId: string): CustomFieldDefinitionDto[] {
  if (!mockCustomFieldsByWorkspaceId[workspaceId]) {
    mockCustomFieldsByWorkspaceId[workspaceId] = [];
  }
  return mockCustomFieldsByWorkspaceId[workspaceId];
}

export function resetCustomFieldsMockState(): void {
  mockCustomFieldsByWorkspaceId[WS_SHARED_ENG_ID] = JSON.parse(
    JSON.stringify(initialMockCustomFields)
  );
  for (const wsId of Object.keys(mockCustomFieldsByWorkspaceId)) {
    if (wsId !== WS_SHARED_ENG_ID) {
      delete mockCustomFieldsByWorkspaceId[wsId];
    }
  }
}
