"use client";

import { useCallback } from "react";
import type { WorkflowStep, WorkflowRule } from "@/lib/documents/workflow-prompts";
import { EMPTY_RULE } from "@/lib/documents/workflow-prompts";

interface StepEditorProps {
  step: WorkflowStep;
  onChange: (step: WorkflowStep) => void;
  onRemove: () => void;
  canRemove: boolean;
  readOnly?: boolean;
}

const OPERATOR_OPTIONS = ["", "NEXT", "AND", "OR"] as const;

const inputClass =
  "w-full rounded border border-slate-200 px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--hub-accent)]/30 focus:border-[var(--hub-accent)]/50";

const selectClass =
  "w-full rounded border border-slate-200 px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--hub-accent)]/30";

export default function StepEditor({
  step,
  onChange,
  onRemove,
  canRemove,
  readOnly,
}: StepEditorProps) {
  const updateRule = useCallback(
    (ruleIdx: number, field: keyof WorkflowRule, value: string | number | null) => {
      const rules = step.rules.map((r, i) =>
        i === ruleIdx ? { ...r, [field]: value } : r,
      );
      onChange({ ...step, rules });
    },
    [step, onChange],
  );

  const addRule = useCallback(() => {
    onChange({ ...step, rules: [...step.rules, { ...EMPTY_RULE }] });
  }, [step, onChange]);

  const removeRule = useCallback(
    (ruleIdx: number) => {
      if (step.rules.length <= 1) return;
      onChange({ ...step, rules: step.rules.filter((_, i) => i !== ruleIdx) });
    },
    [step, onChange],
  );

  const rules = step.rules.length > 0 ? step.rules : [{ ...EMPTY_RULE }];

  return (
    <div className="space-y-4">
      {/* Step header */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-esm-black mb-1">
            Step Label
          </label>
          <input
            type="text"
            className={inputClass}
            value={step.label}
            onChange={(e) => onChange({ ...step, label: e.target.value })}
            placeholder="e.g. Department Approver"
            disabled={readOnly}
          />
        </div>
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-2 py-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={step.has_threshold}
              onChange={(e) =>
                onChange({ ...step, has_threshold: e.target.checked })
              }
              className="rounded border-esm-border"
              disabled={readOnly}
            />
            <span className="text-sm text-esm-grey">Dollar thresholds</span>
          </label>
          {canRemove && !readOnly && (
            <button
              type="button"
              onClick={onRemove}
              className="text-xs text-esm-muted hover:text-red-600 py-1.5 px-2 rounded transition-colors"
              title="Remove step"
            >
              Remove step
            </button>
          )}
        </div>
      </div>

      {/* Rules table */}
      <fieldset disabled={readOnly} className="contents">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-slate-200 rounded">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-2 py-2 text-left text-slate-600 font-medium border-b border-slate-200 w-8">
                #
              </th>
              <th className="px-2 py-2 text-left text-slate-600 font-medium border-b border-slate-200 min-w-[140px]">
                Workflow Name
              </th>
              <th className="px-2 py-2 text-left text-slate-600 font-medium border-b border-slate-200 min-w-[100px]">
                Fund Code
              </th>
              <th className="px-2 py-2 text-left text-slate-600 font-medium border-b border-slate-200 min-w-[100px]">
                Org Code
              </th>
              <th className="px-2 py-2 text-left text-slate-600 font-medium border-b border-slate-200 min-w-[100px]">
                Other Criteria
              </th>
              {step.has_threshold && (
                <th className="px-2 py-2 text-left text-slate-600 font-medium border-b border-slate-200 min-w-[90px]">
                  Threshold $
                </th>
              )}
              <th className="px-2 py-2 text-left text-slate-600 font-medium border-b border-slate-200 min-w-[140px]">
                Approver 1
              </th>
              <th className="px-2 py-2 text-left text-slate-600 font-medium border-b border-slate-200 w-[60px]">
                Op
              </th>
              <th className="px-2 py-2 text-left text-slate-600 font-medium border-b border-slate-200 min-w-[140px]">
                Approver 2
              </th>
              <th className="px-2 py-2 text-left text-slate-600 font-medium border-b border-slate-200 w-[60px]">
                Op
              </th>
              <th className="px-2 py-2 text-left text-slate-600 font-medium border-b border-slate-200 min-w-[140px]">
                Approver 3
              </th>
              <th className="px-2 py-2 text-left text-slate-600 font-medium border-b border-slate-200 min-w-[100px]">
                Notes
              </th>
              <th className="w-8 border-b border-slate-200" />
            </tr>
          </thead>
          <tbody>
            {rules.map((rule, rIdx) => (
              <tr
                key={rIdx}
                className="border-b border-slate-100 hover:bg-slate-50/50"
              >
                <td className="px-2 py-1 text-xs text-esm-muted">{rIdx + 1}</td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    className={inputClass}
                    value={rule.workflow_name}
                    onChange={(e) =>
                      updateRule(rIdx, "workflow_name", e.target.value)
                    }
                    placeholder="Rule name"
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    className={inputClass}
                    value={rule.fund_code}
                    onChange={(e) =>
                      updateRule(rIdx, "fund_code", e.target.value)
                    }
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    className={inputClass}
                    value={rule.org_code}
                    onChange={(e) =>
                      updateRule(rIdx, "org_code", e.target.value)
                    }
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    className={inputClass}
                    value={rule.other_criteria}
                    onChange={(e) =>
                      updateRule(rIdx, "other_criteria", e.target.value)
                    }
                  />
                </td>
                {step.has_threshold && (
                  <td className="px-1 py-1">
                    <input
                      type="number"
                      className={inputClass}
                      value={rule.transaction_total ?? ""}
                      onChange={(e) =>
                        updateRule(
                          rIdx,
                          "transaction_total",
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                      placeholder="0.00"
                      min={0}
                      step="0.01"
                    />
                  </td>
                )}
                <td className="px-1 py-1">
                  <div className="space-y-0.5">
                    <input
                      type="text"
                      className={inputClass}
                      value={rule.approver_1_name}
                      onChange={(e) =>
                        updateRule(rIdx, "approver_1_name", e.target.value)
                      }
                      placeholder="Name"
                    />
                    <input
                      type="email"
                      className={inputClass}
                      value={rule.approver_1_email}
                      onChange={(e) =>
                        updateRule(rIdx, "approver_1_email", e.target.value)
                      }
                      placeholder="Email"
                    />
                  </div>
                </td>
                <td className="px-1 py-1">
                  <select
                    className={selectClass}
                    value={rule.approver_1_2_operator}
                    onChange={(e) =>
                      updateRule(rIdx, "approver_1_2_operator", e.target.value)
                    }
                  >
                    {OPERATOR_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o || "—"}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <div className="space-y-0.5">
                    <input
                      type="text"
                      className={inputClass}
                      value={rule.approver_2_name}
                      onChange={(e) =>
                        updateRule(rIdx, "approver_2_name", e.target.value)
                      }
                      placeholder="Name"
                    />
                    <input
                      type="email"
                      className={inputClass}
                      value={rule.approver_2_email}
                      onChange={(e) =>
                        updateRule(rIdx, "approver_2_email", e.target.value)
                      }
                      placeholder="Email"
                    />
                  </div>
                </td>
                <td className="px-1 py-1">
                  <select
                    className={selectClass}
                    value={rule.approver_2_3_operator}
                    onChange={(e) =>
                      updateRule(rIdx, "approver_2_3_operator", e.target.value)
                    }
                  >
                    {OPERATOR_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o || "—"}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-1 py-1">
                  <div className="space-y-0.5">
                    <input
                      type="text"
                      className={inputClass}
                      value={rule.approver_3_name}
                      onChange={(e) =>
                        updateRule(rIdx, "approver_3_name", e.target.value)
                      }
                      placeholder="Name"
                    />
                    <input
                      type="email"
                      className={inputClass}
                      value={rule.approver_3_email}
                      onChange={(e) =>
                        updateRule(rIdx, "approver_3_email", e.target.value)
                      }
                      placeholder="Email"
                    />
                  </div>
                </td>
                <td className="px-1 py-1">
                  <input
                    type="text"
                    className={inputClass}
                    value={rule.notes}
                    onChange={(e) =>
                      updateRule(rIdx, "notes", e.target.value)
                    }
                    placeholder="Notes"
                  />
                </td>
                <td className="px-1 py-1 text-center">
                  <button
                    type="button"
                    onClick={() => removeRule(rIdx)}
                    disabled={rules.length <= 1}
                    className="text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Remove rule"
                    title="Remove rule"
                  >
                    &times;
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      </fieldset>

      {!readOnly && (
        <button
          type="button"
          onClick={addRule}
          className="text-sm hover:opacity-80 transition-opacity"
          style={{ color: "var(--hub-accent, #F4333F)" }}
        >
          + Add rule
        </button>
      )}
    </div>
  );
}
