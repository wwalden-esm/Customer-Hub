"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { SectionKey, SectionStatus, DataSource } from "@/types/enums";
import { SECTION_LABELS, SECTION_ORDER, WORKSHOP_SECTIONS, DATA_SOURCE_FOR_SECTION } from "@/types";
import { parseLocalDate } from "@/lib/date-utils";
import { SectionNav } from "./SectionNav";
import { WorkshopSection } from "./sections/WorkshopSection";
import { CustomerProfileSection } from "./sections/CustomerProfileSection";
import { SuccessCriteriaSection } from "./sections/SuccessCriteriaSection";
import { ProjectTeamSection } from "./sections/ProjectTeamSection";
import { CommunicationSection } from "./sections/CommunicationSection";
import { ResponsibilitiesSection } from "./sections/ResponsibilitiesSection";
import { InstitutionalProfileSection } from "./sections/InstitutionalProfileSection";
import { ProcurementGuidelinesSection } from "./sections/ProcurementGuidelinesSection";
import { CatalogLandscapeSection } from "./sections/CatalogLandscapeSection";
import { PoProcessSection } from "./sections/PoProcessSection";
import { ReceivingProcessSection } from "./sections/ReceivingProcessSection";
import { PowerUsersSection } from "./sections/PowerUsersSection";
import { SsoInfoSection } from "./sections/SsoInfoSection";
import { EsmTestingAccessSection } from "./sections/EsmTestingAccessSection";
import { TransactionPreferencesSection } from "./sections/TransactionPreferencesSection";
import { SignoffSection } from "./sections/SignoffSection";

interface ProjectShape {
  id: string;
  customerName: string;
  projectName: string;
  goLiveDate: string | null;
  intakeCompletePercent: number;
}

interface SectionShape {
  sectionKey: SectionKey;
  status: SectionStatus;
  dataSource: DataSource;
  formData: Record<string, unknown>;
}

interface Props {
  initialProject: ProjectShape;
  initialSections: SectionShape[];
  visibleSections?: SectionKey[];
}

const SAVE_DEBOUNCE_MS = 1000;

export function IntakeShell({ initialProject, initialSections, visibleSections }: Props) {
  const [project, setProject] = useState(initialProject);
  const [sections, setSections] = useState<Record<SectionKey, SectionShape>>(() => {
    const map = {} as Record<SectionKey, SectionShape>;
    for (const key of SECTION_ORDER) {
      const existing = initialSections.find((s) => s.sectionKey === key);
      map[key] = existing ?? {
        sectionKey: key,
        status: WORKSHOP_SECTIONS.has(key) ? "IN_WORKSHOP" : "NOT_STARTED",
        dataSource: DATA_SOURCE_FOR_SECTION[key],
        formData: {},
      };
    }
    return map;
  });
  const [active, setActive] = useState<SectionKey>(
    visibleSections ? visibleSections[0] : SECTION_ORDER[0],
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimers = useRef<Record<SectionKey, ReturnType<typeof setTimeout> | null>>(
    {} as Record<SectionKey, ReturnType<typeof setTimeout> | null>,
  );

  const displayOrder = visibleSections ?? SECTION_ORDER;

  const completeCount = useMemo(
    () => displayOrder.filter((k) => sections[k]?.status === "COMPLETE").length,
    [sections, displayOrder],
  );

  const saveSection = useCallback(
    async (key: SectionKey, formData: Record<string, unknown>) => {
      setSaveState("saving");
      try {
        const res = await fetch(`/api/projects/${project.id}/sections/${key}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error(`Save failed: ${res.status}`);
        const json = (await res.json()) as { status: SectionStatus; intakeCompletePercent: number };
        setSections((prev) => ({
          ...prev,
          [key]: { ...prev[key], status: json.status, formData },
        }));
        setProject((p) => ({ ...p, intakeCompletePercent: json.intakeCompletePercent }));
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1500);
      } catch (e) {
        console.error(e);
        setSaveState("error");
      }
    },
    [project.id],
  );

  const handleChange = useCallback(
    (key: SectionKey, formData: Record<string, unknown>) => {
      setSections((prev) => ({ ...prev, [key]: { ...prev[key], formData } }));
      const existing = saveTimers.current[key];
      if (existing) clearTimeout(existing);
      saveTimers.current[key] = setTimeout(() => {
        void saveSection(key, formData);
      }, SAVE_DEBOUNCE_MS);
    },
    [saveSection],
  );

  const activeSection = sections[active];
  const isReadOnly =
    activeSection.dataSource === "SMARTSHEET" || activeSection.dataSource === "SC";

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500">Customer Intake</div>
          <h1 className="text-xl font-semibold text-esm-black">{project.customerName}</h1>
        </div>
        <div className="text-right text-sm text-slate-600">
          {project.goLiveDate && (
            <div>
              Go-Live:{" "}
              <span className="font-medium text-esm-black">
                {parseLocalDate(project.goLiveDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          )}
          <div className="mt-1 flex items-center gap-2 justify-end">
            <span>
              {completeCount} of {displayOrder.length} sections complete
            </span>
            <SaveIndicator state={saveState} />
          </div>
        </div>
      </header>

      <div className="px-6 py-3 bg-white border-b border-slate-200">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-esm-red transition-all duration-300"
            style={{ width: `${project.intakeCompletePercent}%` }}
          />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <SectionNav
          active={active}
          onSelect={setActive}
          statuses={
            Object.fromEntries(
              displayOrder.map((k) => [k, sections[k].status]),
            ) as Record<SectionKey, SectionStatus>
          }
        />
        <main className="flex-1 p-8 max-w-4xl overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-esm-black">{SECTION_LABELS[active]}</h2>
            {isReadOnly && (
              <p className="mt-1 text-sm text-slate-500">
                This section is managed by your ESM team and is read-only.
              </p>
            )}
          </div>
          {renderSection(active, activeSection, (data) => handleChange(active, data), project.id)}
        </main>
      </div>
    </div>
  );
}

function renderSection(
  key: SectionKey,
  section: { formData: Record<string, unknown>; dataSource: DataSource },
  onChange: (d: Record<string, unknown>) => void,
  projectId: string,
) {
  const isSmartsheet = section.dataSource === "SMARTSHEET";
  const isSc = section.dataSource === "SC";

  if (WORKSHOP_SECTIONS.has(key)) {
    return <WorkshopSection sectionKey={key} data={section.formData} onChange={onChange} />;
  }
  switch (key) {
    case "CUSTOMER_PROFILE":
      return <CustomerProfileSection data={section.formData} onChange={onChange} readOnly={isSmartsheet} />;
    case "SUCCESS_CRITERIA":
      return <SuccessCriteriaSection data={section.formData} onChange={onChange} />;
    case "PROJECT_TEAM":
      return <ProjectTeamSection data={section.formData} onChange={onChange} />;
    case "COMMUNICATION":
      return <CommunicationSection data={section.formData} onChange={onChange} readOnly={isSc} />;
    case "RESPONSIBILITIES":
      return <ResponsibilitiesSection data={section.formData} onChange={onChange} />;
    case "INSTITUTIONAL_PROFILE":
      return <InstitutionalProfileSection data={section.formData} onChange={onChange} />;
    case "PROCUREMENT_GUIDELINES":
      return <ProcurementGuidelinesSection data={section.formData} onChange={onChange} projectId={projectId} />;
    case "CATALOG_LANDSCAPE":
      return <CatalogLandscapeSection data={section.formData} onChange={onChange} projectId={projectId} />;
    case "PO_PROCESS":
      return <PoProcessSection data={section.formData} onChange={onChange} projectId={projectId} />;
    case "RECEIVING_PROCESS":
      return <ReceivingProcessSection data={section.formData} onChange={onChange} />;
    case "POWER_USERS":
      return <PowerUsersSection data={section.formData} onChange={onChange} />;
    case "SSO_INFO":
      return <SsoInfoSection data={section.formData} onChange={onChange} projectId={projectId} />;
    case "ESM_TESTING_ACCESS":
      return <EsmTestingAccessSection data={section.formData} onChange={onChange} />;
    case "TRANSACTION_PREFERENCES":
      return <TransactionPreferencesSection data={section.formData} onChange={onChange} />;
    case "SIGNOFF":
      return <SignoffSection data={section.formData} onChange={onChange} />;
    default:
      return <div className="text-slate-500">Unknown section.</div>;
  }
}

function SaveIndicator({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "idle") return null;
  const label = state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Save failed";
  const color = state === "error" ? "text-red-600" : state === "saved" ? "text-emerald-600" : "text-slate-500";
  return <span className={`text-xs ${color}`}>{label}</span>;
}
