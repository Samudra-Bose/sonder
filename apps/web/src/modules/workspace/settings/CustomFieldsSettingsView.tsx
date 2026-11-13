import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useWorkspace } from "@/modules/workspace/index.js";
import {
  useCustomFields,
  useCreateCustomField,
  useUpdateCustomField,
  useArchiveCustomField,
} from "./useCustomFields.js";
import { useWorkspaceSettings } from "./useWorkspaceSettings.js";
import type {
  CustomFieldDefinitionDto,
  CustomFieldType,
} from "./types.js";

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  TEXT: "Text",
  NUMBER: "Number",
  DATE: "Date",
  BOOLEAN: "Boolean (Yes/No)",
  SINGLE_SELECT: "Single Select",
};

const FIELD_TYPE_BADGES: Record<CustomFieldType, string> = {
  TEXT: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  NUMBER: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  DATE: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  BOOLEAN: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  SINGLE_SELECT: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
};

export const CustomFieldsSettingsView: React.FC = () => {
  const params = useParams<{ communityId?: string; workspaceId?: string }>();
  const { currentCommunityId, activeWorkspace } = useWorkspace();
  const communityId = params.communityId ?? currentCommunityId;
  const workspaceId = params.workspaceId ?? activeWorkspace?.id;

  const { data: workspaceData } = useWorkspaceSettings(communityId, workspaceId);
  const { data: customFieldsData, isLoading, isError, error } = useCustomFields(communityId, workspaceId);

  const createMutation = useCreateCustomField(communityId, workspaceId);
  const updateMutation = useUpdateCustomField(communityId, workspaceId);
  const archiveMutation = useArchiveCustomField(communityId, workspaceId);

  const isOwner = Boolean(
    activeWorkspace?.myRole === "OWNER" ||
    workspaceData?.myRole === "OWNER"
  );

  // Modal dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinitionDto | null>(null);
  const [archivingField, setArchivingField] = useState<CustomFieldDefinitionDto | null>(null);

  // Create form state
  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState<CustomFieldType>("TEXT");
  const [createRequired, setCreateRequired] = useState(false);
  const [createDescription, setCreateDescription] = useState("");
  const [createOptions, setCreateOptions] = useState<string[]>([]);
  const [newOptionInput, setNewOptionInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editRequired, setEditRequired] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  const openCreateDialog = () => {
    setCreateName("");
    setCreateType("TEXT");
    setCreateRequired(false);
    setCreateDescription("");
    setCreateOptions([]);
    setNewOptionInput("");
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleAddOption = () => {
    const trimmed = newOptionInput.trim();
    if (!trimmed) return;
    if (createOptions.includes(trimmed)) {
      setFormError("Option already exists.");
      return;
    }
    setCreateOptions([...createOptions, trimmed]);
    setNewOptionInput("");
    setFormError(null);
  };

  const handleRemoveOption = (indexToRemove: number) => {
    setCreateOptions(createOptions.filter((_, idx) => idx !== indexToRemove));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = createName.trim();
    if (!trimmedName) {
      setFormError("Field name is required.");
      return;
    }
    if (createType === "SINGLE_SELECT" && createOptions.length === 0) {
      setFormError("Single select fields must have at least one option.");
      return;
    }

    try {
      setFormError(null);
      await createMutation.mutateAsync({
        name: trimmedName,
        fieldType: createType,
        isRequired: createRequired,
        description: createDescription.trim() || undefined,
        displayOrder: (customFieldsData?.items?.length ?? 0) + 1,
        options: createType === "SINGLE_SELECT"
          ? createOptions.map((opt) => ({ label: opt }))
          : undefined,
      });
      setIsCreateOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Failed to create custom field.");
    }
  };

  const openEditDialog = (field: CustomFieldDefinitionDto) => {
    setEditingField(field);
    setEditName(field.name);
    setEditDescription(field.description || "");
    setEditRequired(field.isRequired);
    setEditFormError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingField) return;
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditFormError("Field name is required.");
      return;
    }

    try {
      setEditFormError(null);
      await updateMutation.mutateAsync({
        fieldId: editingField.id,
        data: {
          baseVersion: editingField.version,
          name: trimmedName,
          description: editDescription.trim() || null,
          isRequired: editRequired,
        },
      });
      setEditingField(null);
    } catch (err: any) {
      setEditFormError(err.message || "Failed to update custom field.");
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archivingField) return;
    try {
      await archiveMutation.mutateAsync({
        fieldId: archivingField.id,
        baseVersion: archivingField.version,
      });
      setArchivingField(null);
    } catch (err: any) {
      alert(err.message || "Failed to archive custom field.");
    }
  };

  const items = customFieldsData?.items?.filter((f) => !f.isArchived) ?? [];

  return (
    <div className="space-y-6" data-testid="custom-fields-settings">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Custom Fields
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Define structured metadata (FEAT-D04a) for tasks in this workspace. Custom fields are scoped to this workspace.
          </p>
        </div>
        <div>
          <button
            type="button"
            data-testid="create-custom-field-btn"
            onClick={openCreateDialog}
            disabled={!isOwner || createMutation.isPending}
            title={!isOwner ? "Only workspace owners can configure custom fields." : undefined}
            aria-disabled={!isOwner}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-primary text-primary-foreground font-medium text-sm shadow-xs hover:bg-primary/90 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create Custom Field
          </button>
        </div>
      </div>

      {/* Non-owner Read-only Notice */}
      {!isOwner && (
        <div
          data-testid="read-only-notice"
          className="rounded-lg border border-amber-300 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/30 p-4 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3"
        >
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <span className="font-semibold">Read-only view:</span> Only workspace owners can create, modify, or archive custom field definitions.
          </div>
        </div>
      )}

      {/* Loading & Error States */}
      {isLoading && (
        <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
          Loading custom fields...
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-xs text-destructive">
          Failed to load custom fields: {error?.message}
        </div>
      )}

      {/* Custom Fields List */}
      {!isLoading && !isError && items.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-12 text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-foreground">No custom fields yet</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Add custom fields like Story Points, Component, Release Track, or Target Deployment to track workspace-specific task metadata.
          </p>
          {isOwner && (
            <button
              type="button"
              onClick={openCreateDialog}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              Add First Custom Field
            </button>
          )}
        </div>
      )}

      {!isLoading && !isError && items.length > 0 && (
        <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="bg-muted/50 border-b border-border font-medium text-muted-foreground uppercase tracking-wider text-[11px]">
                <tr>
                  <th scope="col" className="px-4 py-3">Field Name</th>
                  <th scope="col" className="px-4 py-3">Type</th>
                  <th scope="col" className="px-4 py-3">Field Key</th>
                  <th scope="col" className="px-4 py-3">Constraint</th>
                  <th scope="col" className="px-4 py-3">Options</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((field) => (
                  <tr
                    key={field.id}
                    data-testid={`custom-field-row-${field.id}`}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3.5 font-medium">
                      <div data-testid={`custom-field-name-${field.id}`} className="text-foreground text-sm">
                        {field.name}
                      </div>
                      {field.description && (
                        <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {field.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        data-testid={`custom-field-type-${field.id}`}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${FIELD_TYPE_BADGES[field.fieldType]}`}
                      >
                        {FIELD_TYPE_LABELS[field.fieldType]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-muted-foreground">
                      <span data-testid={`custom-field-key-${field.id}`}>
                        cf.{field.fieldKey}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        data-testid={`custom-field-required-${field.id}`}
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                          field.isRequired
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {field.isRequired ? "Required" : "Optional"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {field.fieldType === "SINGLE_SELECT" ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {field.options && field.options.length > 0 ? (
                            field.options.map((opt) => (
                              <span
                                key={opt.id}
                                className="px-1.5 py-0.5 rounded bg-muted/80 text-[11px] text-foreground"
                              >
                                {opt.label}
                              </span>
                            ))
                          ) : (
                            <span className="italic text-[11px]">No options</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      {isOwner && (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            data-testid={`edit-custom-field-btn-${field.id}`}
                            onClick={() => openEditDialog(field)}
                            className="px-2.5 py-1 rounded bg-secondary text-secondary-foreground text-xs hover:bg-secondary/80 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            data-testid={`archive-custom-field-btn-${field.id}`}
                            onClick={() => setArchivingField(field)}
                            className="px-2.5 py-1 rounded bg-destructive/10 text-destructive text-xs hover:bg-destructive/20 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            Archive
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl space-y-5">
            <div>
              <h3 id="create-dialog-title" className="text-lg font-semibold text-foreground">
                Create Custom Field
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add a new structured metadata field for this workspace. Field type cannot be changed after creation.
              </p>
            </div>

            {formError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label htmlFor="field-name-input" className="block text-xs font-medium text-foreground mb-1">
                  Field Name <span className="text-destructive">*</span>
                </label>
                <input
                  id="field-name-input"
                  data-testid="field-name-input"
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Story Points, Component"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label htmlFor="field-type-select" className="block text-xs font-medium text-foreground mb-1">
                  Field Type <span className="text-destructive">*</span>
                </label>
                <select
                  id="field-type-select"
                  data-testid="field-type-select"
                  value={createType}
                  onChange={(e) => setCreateType(e.target.value as CustomFieldType)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="TEXT">Text</option>
                  <option value="NUMBER">Number</option>
                  <option value="DATE">Date</option>
                  <option value="BOOLEAN">Boolean (Yes/No)</option>
                  <option value="SINGLE_SELECT">Single Select</option>
                </select>
              </div>

              {/* SINGLE_SELECT Options Builder */}
              {createType === "SINGLE_SELECT" && (
                <div className="space-y-2 pt-1 border-t border-border">
                  <label className="block text-xs font-medium text-foreground">
                    Options <span className="text-destructive">* (min 1 option required)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      data-testid="add-option-input"
                      value={newOptionInput}
                      onChange={(e) => setNewOptionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddOption();
                        }
                      }}
                      placeholder="Add an option label"
                      className="flex-1 px-3 py-1.5 rounded-md border border-input bg-background text-xs text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <button
                      type="button"
                      data-testid="add-option-btn"
                      onClick={handleAddOption}
                      className="px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Add
                    </button>
                  </div>
                  {createOptions.length > 0 && (
                    <div className="space-y-1.5 pt-2 max-h-36 overflow-y-auto">
                      {createOptions.map((opt, idx) => (
                        <div
                          key={idx}
                          data-testid={`option-item-${idx}`}
                          className="flex items-center justify-between px-2.5 py-1 rounded bg-muted/60 text-xs text-foreground"
                        >
                          <span>{opt}</span>
                          <button
                            type="button"
                            data-testid={`remove-option-btn-${idx}`}
                            onClick={() => handleRemoveOption(idx)}
                            aria-label={`Remove option ${opt}`}
                            className="text-destructive hover:text-destructive/80 font-bold ml-2 text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="field-description-input" className="block text-xs font-medium text-foreground mb-1">
                  Description <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  id="field-description-input"
                  data-testid="field-description-input"
                  rows={2}
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="Explain when and how this field should be used"
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-xs text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="field-required-checkbox"
                  data-testid="field-required-checkbox"
                  type="checkbox"
                  checked={createRequired}
                  onChange={(e) => setCreateRequired(e.target.checked)}
                  className="rounded border-input text-primary focus-visible:ring-ring h-4 w-4"
                />
                <label htmlFor="field-required-checkbox" className="text-xs text-foreground font-medium cursor-pointer">
                  Require this field on all tasks
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  data-testid="cancel-custom-field-btn"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3.5 py-2 rounded-md border border-border bg-background text-foreground text-xs font-medium hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="submit-custom-field-btn"
                  disabled={createMutation.isPending}
                  className="px-3.5 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  {createMutation.isPending ? "Creating..." : "Create Field"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingField && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl space-y-5">
            <div>
              <h3 id="edit-dialog-title" className="text-lg font-semibold text-foreground">
                Edit Custom Field: {editingField.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Update metadata and constraints. Type ({editingField.fieldType}) and key (cf.{editingField.fieldKey}) are immutable.
              </p>
            </div>

            {editFormError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
                {editFormError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label htmlFor="edit-name-input" className="block text-xs font-medium text-foreground mb-1">
                  Field Name <span className="text-destructive">*</span>
                </label>
                <input
                  id="edit-name-input"
                  data-testid="edit-field-name-input"
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label htmlFor="edit-description-input" className="block text-xs font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  id="edit-description-input"
                  data-testid="edit-field-description-input"
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-xs text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="edit-required-checkbox"
                  data-testid="edit-field-required-checkbox"
                  type="checkbox"
                  checked={editRequired}
                  onChange={(e) => setEditRequired(e.target.checked)}
                  className="rounded border-input text-primary focus-visible:ring-ring h-4 w-4"
                />
                <label htmlFor="edit-required-checkbox" className="text-xs text-foreground font-medium cursor-pointer">
                  Require this field on all tasks
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  data-testid="cancel-edit-custom-field-btn"
                  onClick={() => setEditingField(null)}
                  className="px-3.5 py-2 rounded-md border border-border bg-background text-foreground text-xs font-medium hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="submit-edit-custom-field-btn"
                  disabled={updateMutation.isPending}
                  className="px-3.5 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ARCHIVE CONFIRMATION MODAL */}
      {archivingField && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-xl border border-destructive/30 bg-card p-6 shadow-xl space-y-4">
            <div>
              <h3 id="archive-dialog-title" className="text-lg font-semibold text-destructive">
                Archive Custom Field: {archivingField.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Archiving removes this custom field from new task creation and active filtering. Existing task values will be safely retained in historical records and audit logs.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                data-testid="cancel-archive-custom-field-btn"
                onClick={() => setArchivingField(null)}
                className="px-3.5 py-2 rounded-md border border-border bg-background text-foreground text-xs font-medium hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-archive-custom-field-btn"
                onClick={handleArchiveConfirm}
                disabled={archiveMutation.isPending}
                className="px-3.5 py-2 rounded-md bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/90 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {archiveMutation.isPending ? "Archiving..." : "Archive Field"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
