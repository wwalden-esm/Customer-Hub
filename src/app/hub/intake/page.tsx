import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/magic-link";
import { getProjectById } from "@/lib/smartsheet-data";
import { getIntakeRecord, normalizeIntakeData } from "@/lib/hubspot";
import type { IntakeField } from "@/lib/hubspot";
import { parseLocalDate } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Intake" };
}

function getHubspotIntakeId(projectId: string): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const projects = require("../../../../config/projects.json");
    return projects[projectId]?.hubspotIntakeId ?? null;
  } catch {
    return null;
  }
}

function formatDate(value: string): string {
  try {
    return parseLocalDate(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function formatMultiselect(value: string): string[] {
  return value.split(";").map((v) => v.trim()).filter(Boolean);
}

function FieldDisplay({ field }: { field: IntakeField }) {
  if (!field.value) {
    return <span className="text-esm-muted italic">Not provided</span>;
  }

  if (field.type === "date") {
    return <span className="text-esm-black">{formatDate(field.value)}</span>;
  }

  if (field.type === "multiselect") {
    const items = formatMultiselect(field.value);
    return (
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-800 text-xs font-medium rounded-full"
          >
            {item}
          </span>
        ))}
      </div>
    );
  }

  return <span className="text-esm-black">{field.value}</span>;
}

export default async function IntakePage() {
  const session = await getCustomerSession();
  if (!session) redirect("/hub/login");

  const project = getProjectById(session.projectId);
  if (!project) redirect("/hub/login");

  const hubspotIntakeId = getHubspotIntakeId(session.projectId);

  let intakeData = null;
  let error: string | null = null;

  if (hubspotIntakeId) {
    try {
      const record = await getIntakeRecord(hubspotIntakeId);
      intakeData = await normalizeIntakeData(record);
    } catch (e) {
      console.error("Failed to fetch HubSpot intake data:", e);
      error = "Unable to load intake data from HubSpot.";
    }
  } else {
    error = "No intake form has been linked to this project yet.";
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-esm-black">Customer Intake</h1>
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Sourced from HubSpot
          </span>
          {intakeData && (
            <span className="text-xs text-esm-muted">
              Last updated: {parseLocalDate(intakeData.updatedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="bg-amber-50 border border-amber-200 rounded-card p-4 text-sm text-amber-800">
          {error}
        </div>
      )}

      {intakeData && (
        <div className="bg-white rounded-card border border-esm-border divide-y divide-esm-border">
          {intakeData.fields.map((field) => (
            <div key={field.key} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
              <dt className="text-sm font-medium text-esm-grey sm:w-56 shrink-0">
                {field.label}
              </dt>
              <dd className="text-sm flex-1">
                <FieldDisplay field={field} />
              </dd>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
