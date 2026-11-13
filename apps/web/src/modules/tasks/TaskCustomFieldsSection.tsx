import React, { useState, useEffect } from "react";
import { Database, AlertCircle } from "lucide-react";
import { useCustomFields } from "@/modules/workspace/settings/useCustomFields.js";
import { useUpdateTask } from "./useUpdateTask.js";
import type { TaskDto } from "./types.js";
import type { CustomFieldDefinitionDto } from "@/modules/workspace/settings/types.js";

export interface TaskCustomFieldsSectionProps {
  task: TaskDto;
  communityId: string | null;
  workspaceId: string;
  isArchived?: boolean;
}

export const TaskCustomFieldsSection: React.FC<TaskCustomFieldsSectionProps> = ({
  task,
  communityId,
  workspaceId,
  isArchived = false,
}) => {
  const { data: customFieldsData, isLoading } = useCustomFields(communityId, workspaceId);
  const updateTaskMutation = useUpdateTask();

  const [values, setValues] = useState<Record<string, string | number | boolean | null>>(() => ({
    ...(task.customFieldValues ?? {}),
  }));

  const [savingFieldId, setSavingFieldId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setValues({ ...(task.customFieldValues ?? {}) });
  }, [task.customFieldValues]);

  const canEdit = !isArchived && Boolean(task.effectivePermissions?.canEditCustomFieldsLinks);

  const activeDefinitions = (customFieldsData?.items ?? []).filter((def) => !def.isArchived);

  if (isLoading || activeDefinitions.length === 0) {
    return null;
  }

  const handleValueChange = async (
    def: CustomFieldDefinitionDto,
    newValue: string | number | boolean | null
  ) => {
    if (!canEdit) return;

    setValues((prev) => ({ ...prev, [def.id]: newValue }));
    setSavingFieldId(def.id);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[def.id];
      return next;
    });

    try {
      const revKey = `customFieldValues.${def.id}`;
      const currentRevision = (task.fieldRevisions as Record<string, number> | undefined)?.[revKey] ?? 1;

      await updateTaskMutation.mutateAsync({
        communityId: communityId ?? "",
        workspaceId,
        taskId: task.id,
        data: {
          customFieldValues: {
            [def.id]: newValue,
          },
          baseFieldRevisions: {
            [revKey]: currentRevision,
          },
        },
      });
    } catch (err: any) {
      setFieldErrors((prev) => ({
        ...prev,
        [def.id]: err.message || "Failed to update field value.",
      }));
    } finally {
      setSavingFieldId(null);
    }
  };

  return (
    <div className="space-y-3 pt-4 border-t border-[var(--border-subtle)]" data-testid="task-custom-fields-section">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Custom Fields
          </h3>
          <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
            {activeDefinitions.length}
          </span>
        </div>
        {!canEdit && (
          <span className="text-[11px] text-muted-foreground italic">
            Read-only
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {activeDefinitions.map((def) => {
          const rawValue = values[def.id];
          const isSaving = savingFieldId === def.id;
          const errorMsg = fieldErrors[def.id];

          return (
            <div key={def.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={`cf-input-${def.id}`}
                  data-testid={`custom-field-label-${def.id}`}
                  className="text-xs font-medium text-foreground flex items-center gap-1"
                >
                  <span>{def.name}</span>
                  {def.isRequired && <span className="text-destructive">*</span>}
                </label>
                {isSaving && (
                  <span className="text-[10px] text-muted-foreground animate-pulse">
                    Saving...
                  </span>
                )}
              </div>

              {/* Render by field type */}
              {def.fieldType === "TEXT" && (
                <input
                  id={`cf-input-${def.id}`}
                  data-testid={`custom-field-input-${def.id}`}
                  data-fieldkey={def.fieldKey}
                  type="text"
                  disabled={!canEdit || isSaving}
                  value={(rawValue as string) ?? ""}
                  placeholder={def.isRequired ? "Required text" : "Empty"}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleValueChange(def, val.trim() === "" ? null : val);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md border border-input bg-background text-xs text-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
                />
              )}

              {def.fieldType === "NUMBER" && (
                <input
                  id={`cf-input-${def.id}`}
                  data-testid={`custom-field-input-${def.id}`}
                  data-fieldkey={def.fieldKey}
                  type="number"
                  disabled={!canEdit || isSaving}
                  value={rawValue !== undefined && rawValue !== null ? String(rawValue) : ""}
                  placeholder={def.isRequired ? "Required number" : "Empty"}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleValueChange(def, val === "" ? null : Number(val));
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md border border-input bg-background text-xs text-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
                />
              )}

              {def.fieldType === "DATE" && (
                <input
                  id={`cf-input-${def.id}`}
                  data-testid={`custom-field-input-${def.id}`}
                  data-fieldkey={def.fieldKey}
                  type="date"
                  disabled={!canEdit || isSaving}
                  value={(rawValue as string) ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleValueChange(def, val === "" ? null : val);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md border border-input bg-background text-xs text-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
                />
              )}

              {def.fieldType === "BOOLEAN" && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    id={`cf-input-${def.id}`}
                    data-testid={`custom-field-input-${def.id}`}
                    data-fieldkey={def.fieldKey}
                    type="checkbox"
                    disabled={!canEdit || isSaving}
                    checked={Boolean(rawValue)}
                    onChange={(e) => {
                      handleValueChange(def, e.target.checked);
                    }}
                    className="h-4 w-4 rounded border-input text-primary focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <span className="text-xs text-muted-foreground">
                    {Boolean(rawValue) ? "Yes / Enabled" : "No / Disabled"}
                  </span>
                </div>
              )}

              {def.fieldType === "SINGLE_SELECT" && (
                <select
                  id={`cf-input-${def.id}`}
                  data-testid={`custom-field-input-${def.id}`}
                  data-fieldkey={def.fieldKey}
                  disabled={!canEdit || isSaving}
                  value={(rawValue as string) ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleValueChange(def, val === "" ? null : val);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md border border-input bg-background text-xs text-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">— None —</option>
                  {(def.options ?? []).map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}

              {errorMsg && (
                <div
                  data-testid={`custom-field-error-${def.id}`}
                  className="text-[11px] text-destructive flex items-center gap-1 pt-0.5"
                >
                  <AlertCircle className="w-3 h-3" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
