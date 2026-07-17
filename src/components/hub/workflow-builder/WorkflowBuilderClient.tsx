"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type {
  WorkflowData,
  WorkflowStep,
} from "@/lib/documents/workflow-prompts";
import { EMPTY_RULE } from "@/lib/documents/workflow-prompts";
import { Card, Button, Badge } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { validateWorkflowData } from "@/lib/documents/workflow-validation";
import type { ValidationError } from "@/lib/documents/workflow-validation";
import StepEditor from "./StepEditor";
import FileUploader from "@/components/hub/FileUploader";

interface WorkflowBuilderClientProps {
  projectId: string;
  initialData: WorkflowData;
  hubspotGlSystem?: string | null;
}

export default function WorkflowBuilderClient({
  projectId,
  initialData,
  hubspotGlSystem,
}: WorkflowBuilderClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<WorkflowData>(initialData);
  const [activeStepKey, setActiveStepKey] = useState<string | null>(() => {
    const keys = getSortedStepKeys(initialData);
    return keys[0] ?? null;
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const dragItem = useRef<string | null>(null);
  const dragOver = useRef<string | null>(null);

  const stepKeys = getSortedStepKeys(data);

  // Auto-save debounce
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!dirty) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveData(data);
    }, 3000);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, dirty]);

  const saveData = useCallback(
    async (toSave: WorkflowData) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/workflow-data`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toSave),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || "Save failed");
        }
        setDirty(false);
      } catch (err) {
        toast(
          err instanceof Error ? err.message : "Failed to save workflow data",
          "error",
        );
      } finally {
        setSaving(false);
      }
    },
    [projectId, toast],
  );

  const updateData = useCallback((next: WorkflowData) => {
    setData(next);
    setDirty(true);
  }, []);

  const updateStep = useCallback(
    (stepKey: string, step: WorkflowStep) => {
      updateData({
        ...data,
        workflow_steps: { ...data.workflow_steps, [stepKey]: step },
      });
    },
    [data, updateData],
  );

  const addStep = useCallback(() => {
    const existingNums = Object.keys(data.workflow_steps)
      .map((k) => {
        const m = k.match(/^step(\d+)$/);
        return m ? Number(m[1]) : 0;
      })
      .filter(Boolean);
    const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
    const newKey = `step${nextNum}`;
    const maxPriority = Object.values(data.workflow_steps).reduce(
      (max, s) => Math.max(max, s.priority),
      0,
    );
    const newStep: WorkflowStep = {
      active: true,
      label: `New Step ${nextNum}`,
      priority: maxPriority + 100,
      has_threshold: false,
      rules: [{ ...EMPTY_RULE }],
    };
    updateData({
      ...data,
      workflow_steps: { ...data.workflow_steps, [newKey]: newStep },
    });
    setActiveStepKey(newKey);
  }, [data, updateData]);

  const removeStep = useCallback(
    (stepKey: string) => {
      const next = { ...data.workflow_steps };
      delete next[stepKey];
      updateData({ ...data, workflow_steps: next });
      if (activeStepKey === stepKey) {
        const remaining = getSortedStepKeys({ ...data, workflow_steps: next });
        setActiveStepKey(remaining[0] ?? null);
      }
    },
    [data, activeStepKey, updateData],
  );

  // Drag-to-reorder
  const handleDragStart = useCallback((stepKey: string) => {
    dragItem.current = stepKey;
  }, []);

  const handleDragEnter = useCallback((stepKey: string) => {
    dragOver.current = stepKey;
  }, []);

  const handleDragEnd = useCallback(() => {
    if (
      !dragItem.current ||
      !dragOver.current ||
      dragItem.current === dragOver.current
    ) {
      dragItem.current = null;
      dragOver.current = null;
      return;
    }
    const fromKey = dragItem.current;
    const toKey = dragOver.current;
    dragItem.current = null;
    dragOver.current = null;

    const sorted = getSortedStepKeys(data);
    const fromIdx = sorted.indexOf(fromKey);
    const toIdx = sorted.indexOf(toKey);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...sorted];
    reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, fromKey);

    const updatedSteps = { ...data.workflow_steps };
    reordered.forEach((key, i) => {
      updatedSteps[key] = { ...updatedSteps[key], priority: (i + 1) * 100 };
    });
    updateData({ ...data, workflow_steps: updatedSteps });
  }, [data, updateData]);

  const handleManualSave = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await saveData(data);
    toast("Workflow data saved", "success");
  }, [data, saveData, toast]);

  const handleExtractionComplete = useCallback(() => {
    router.refresh();
    setShowUpload(false);
    toast("Workflow data extracted and saved", "success");
  }, [router, toast]);

  const handleSubmitForReview = useCallback(async () => {
    const result = validateWorkflowData(data);
    if (!result.valid) {
      setValidationErrors(result.errors);
      toast("Please fix validation errors before submitting", "error");
      return;
    }
    setValidationErrors([]);
    setSubmitting(true);
    try {
      if (dirty) {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        await saveData(data);
      }
      const updated = { ...data, review_status: "submitted" as const };
      const res = await fetch(`/api/projects/${projectId}/workflow-data`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setData(updated);
      setDirty(false);
      toast("Workflow submitted for review", "success");
    } catch {
      toast("Failed to submit for review", "error");
    } finally {
      setSubmitting(false);
    }
  }, [data, dirty, projectId, saveData, toast]);

  const handleGenerate = useCallback(async () => {
    const result = validateWorkflowData(data);
    if (!result.valid) {
      setValidationErrors(result.errors);
      toast("Please fix validation errors before generating", "error");
      return;
    }
    setValidationErrors([]);
    setGenerating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/workflow-generate`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) {
        if (body.validationErrors) {
          setValidationErrors(body.validationErrors);
        }
        throw new Error(body.error || "Generation failed");
      }
      const docs = [];
      if (body.documents?.xlsx) docs.push(body.documents.xlsx.name);
      if (body.documents?.docx) docs.push(body.documents.docx.name);
      toast(`Documents generated: ${docs.join(", ")}`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to generate documents", "error");
    } finally {
      setGenerating(false);
    }
  }, [data, projectId, toast]);

  const reviewStatus = data.review_status ?? "draft";
  const isLocked = reviewStatus === "submitted";
  const canGenerate = reviewStatus === "approved";

  const activeStep = activeStepKey
    ? data.workflow_steps[activeStepKey]
    : null;

  const totalRules = Object.values(data.workflow_steps).reduce(
    (sum, s) => sum + s.rules.length,
    0,
  );

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-esm-black">
              Workflow Builder
            </h1>
            <Badge
              variant={
                reviewStatus === "approved" ? "success" :
                reviewStatus === "submitted" ? "info" :
                reviewStatus === "changes_requested" ? "warning" :
                "neutral"
              }
              pill
            >
              {reviewStatus === "approved" ? "Approved" :
               reviewStatus === "submitted" ? "Submitted for Review" :
               reviewStatus === "changes_requested" ? "Changes Requested" :
               "Draft"}
            </Badge>
          </div>
          <p className="text-sm text-esm-muted mt-0.5">
            {stepKeys.length} step{stepKeys.length !== 1 ? "s" : ""},{" "}
            {totalRules} rule{totalRules !== 1 ? "s" : ""}
            {dirty && !saving && (
              <span className="ml-2 text-amber-600">Unsaved changes</span>
            )}
            {saving && (
              <span className="ml-2 text-esm-muted">Saving…</span>
            )}
            {isLocked && (
              <span className="ml-2 text-blue-600">Editing disabled while under review</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {!isLocked && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowUpload(!showUpload)}
            >
              {showUpload ? "Hide Upload" : "Upload Documents"}
            </Button>
          )}
          {!isLocked && (
            <Button
              variant="accent"
              size="sm"
              onClick={handleManualSave}
              disabled={saving || !dirty}
            >
              Save
            </Button>
          )}
          {reviewStatus === "draft" || reviewStatus === "changes_requested" ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmitForReview}
              disabled={submitting || saving}
            >
              {submitting ? "Submitting…" : "Submit for Review"}
            </Button>
          ) : null}
          {canGenerate && (
            <Button
              variant="accent"
              size="sm"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? "Generating…" : "Generate Documents"}
            </Button>
          )}
        </div>
      </div>

      {/* Review notes */}
      {reviewStatus === "changes_requested" && data.review_notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-card p-4">
          <p className="text-sm font-medium text-amber-800 mb-1">Changes Requested</p>
          <p className="text-sm text-amber-700">{data.review_notes}</p>
        </div>
      )}

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-card p-4">
          <p className="text-sm font-medium text-red-800 mb-2">Validation Errors</p>
          <ul className="space-y-1">
            {validationErrors.map((err, i) => (
              <li key={i} className="text-sm text-red-700">
                {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Document upload panel */}
      {showUpload && (
        <Card padding="md">
          <p className="text-sm text-esm-muted mb-3">
            Upload procurement policy documents to extract workflow data
            automatically. Existing data will be merged with new findings.
          </p>
          <FileUploader
            projectId={projectId}
            mode="extract"
            onUploadComplete={handleExtractionComplete}
          />
        </Card>
      )}

      {/* Global metadata */}
      <Card padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-esm-black mb-1">
              GL System
              {hubspotGlSystem && (
                <span className="ml-1.5 font-normal text-esm-muted">
                  (from HubSpot)
                </span>
              )}
            </label>
            {hubspotGlSystem ? (
              <div className="w-full text-sm border border-esm-border rounded-card px-3 py-2 text-esm-black bg-slate-50">
                {data.gl_system}
              </div>
            ) : (
              <input
                type="text"
                className="w-full text-sm border border-esm-border rounded-card px-3 py-2 text-esm-black focus:outline-none focus:ring-2 focus:ring-[var(--hub-accent)]/30"
                value={data.gl_system}
                onChange={(e) =>
                  updateData({ ...data, gl_system: e.target.value })
                }
                placeholder="e.g. Banner, PeopleSoft"
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-esm-black mb-1">
              Fund Codes
            </label>
            <input
              type="text"
              className="w-full text-sm border border-esm-border rounded-card px-3 py-2 text-esm-black focus:outline-none focus:ring-2 focus:ring-[var(--hub-accent)]/30"
              value={data.fund_codes}
              onChange={(e) =>
                updateData({ ...data, fund_codes: e.target.value })
              }
              placeholder="Fund code structure"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-esm-black mb-1">
              Org Codes
            </label>
            <input
              type="text"
              className="w-full text-sm border border-esm-border rounded-card px-3 py-2 text-esm-black focus:outline-none focus:ring-2 focus:ring-[var(--hub-accent)]/30"
              value={data.org_codes}
              onChange={(e) =>
                updateData({ ...data, org_codes: e.target.value })
              }
              placeholder="Org code structure"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-esm-black mb-1">
              Additional Notes
            </label>
            <input
              type="text"
              className="w-full text-sm border border-esm-border rounded-card px-3 py-2 text-esm-black focus:outline-none focus:ring-2 focus:ring-[var(--hub-accent)]/30"
              value={data.additional_notes}
              onChange={(e) =>
                updateData({ ...data, additional_notes: e.target.value })
              }
              placeholder="General notes"
            />
          </div>
        </div>
      </Card>

      {/* Main content: step nav + editor */}
      <div className="flex gap-4 items-start">
        {/* Step navigator sidebar */}
        <Card padding="sm" className="w-56 shrink-0">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-extrabold tracking-[0.09em] uppercase text-esm-muted">
              Steps
            </span>
            <button
              type="button"
              onClick={addStep}
              disabled={stepKeys.length >= 15}
              className="text-xs hover:opacity-80 disabled:opacity-40 transition-opacity"
              style={{ color: "var(--hub-accent, #F4333F)" }}
              title="Add step"
            >
              + Add
            </button>
          </div>
          <ul className="space-y-0.5">
            {stepKeys.map((key, idx) => {
              const step = data.workflow_steps[key];
              const isActive = key === activeStepKey;
              return (
                <li
                  key={key}
                  draggable
                  onDragStart={() => handleDragStart(key)}
                  onDragEnter={() => handleDragEnter(key)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <button
                    type="button"
                    onClick={() => setActiveStepKey(key)}
                    className={`w-full text-left px-3 py-2 rounded-card text-sm transition-colors flex items-center gap-2 ${
                      isActive
                        ? "bg-[var(--hub-accent-light)] font-medium"
                        : "hover:bg-slate-50"
                    }`}
                    style={
                      isActive
                        ? { color: "var(--hub-accent, #F4333F)" }
                        : undefined
                    }
                  >
                    <span className="text-esm-muted cursor-grab text-xs shrink-0" title="Drag to reorder">
                      &#x2630;
                    </span>
                    <span className="truncate">
                      <span className="text-esm-muted font-normal">
                        {idx + 1}.{" "}
                      </span>
                      {step.label || key}
                    </span>
                    <span className="ml-auto text-xs text-esm-muted shrink-0">
                      {step.rules.length}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {stepKeys.length === 0 && (
            <p className="text-xs text-esm-muted px-3 py-4 text-center">
              No steps yet. Upload documents or add a step manually.
            </p>
          )}
        </Card>

        {/* Step editor */}
        <div className="flex-1 min-w-0">
          {activeStep && activeStepKey ? (
            <Card padding="md">
              <StepEditor
                step={activeStep}
                onChange={(s) => updateStep(activeStepKey, s)}
                onRemove={() => removeStep(activeStepKey)}
                canRemove={stepKeys.length > 1}
                readOnly={isLocked}
              />
            </Card>
          ) : (
            <Card padding="lg">
              <div className="text-center py-8">
                <svg
                  className="w-10 h-10 mx-auto text-slate-300 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
                <p className="text-sm font-medium text-esm-black mb-1">
                  No workflow steps defined
                </p>
                <p className="text-sm text-esm-muted mb-4">
                  Upload procurement documents to auto-extract steps, or add
                  them manually.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => setShowUpload(true)}
                  >
                    Upload Documents
                  </Button>
                  <Button variant="secondary" size="sm" onClick={addStep}>
                    Add Step Manually
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function getSortedStepKeys(data: WorkflowData): string[] {
  return Object.entries(data.workflow_steps)
    .filter(([, s]) => s.active)
    .sort(([, a], [, b]) => a.priority - b.priority)
    .map(([key]) => key);
}
