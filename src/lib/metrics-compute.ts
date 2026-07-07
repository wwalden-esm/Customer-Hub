import type { SmartsheetConfig } from "@/types/models";
import {
  getSheet,
  columnIdMap,
  cellValue,
  addRows,
  updateRows,
  ssFetch,
} from "./smartsheet";

interface ComputedMetric {
  metricType: string;
  current: number;
  total: number;
  label: string;
}

/**
 * Reads source sheets and computes metric values server-side.
 * Returns an array of metric rows ready to write to the Metrics sheet.
 */
export async function computeMetrics(config: SmartsheetConfig): Promise<ComputedMetric[]> {
  const metrics: ComputedMetric[] = [];

  // --- Milestone completion from Project Plan ---
  if (config.projectPlanSheetId) {
    try {
      const sheet = await getSheet(config.projectPlanSheetId);
      const cols = columnIdMap(sheet);
      const pctCol = cols.get("% Complete");

      // Need parentId info from the detailed API
      type DetailedRow = {
        id: number;
        parentId?: number;
        cells: Array<{ columnId: number; value?: string | number | boolean | null; displayValue?: string }>;
      };
      const detailed = await ssFetch<{ rows: DetailedRow[] }>(
        `/sheets/${config.projectPlanSheetId}?include=objectValue`,
      );
      const rows = detailed.rows;

      // Build set of parent row IDs
      const parentIds = new Set<number>();
      for (const row of rows) {
        if (row.parentId) parentIds.add(row.parentId);
      }

      const rootRowId = rows[0]?.id;
      if (rootRowId) {
        // Level-1 milestone rows: direct children of root that are themselves parents
        const level1Rows = rows.filter(
          (r) => r.parentId === rootRowId && parentIds.has(r.id),
        );

        if (level1Rows.length > 0 && pctCol) {
          let completedCount = 0;
          for (const row of level1Rows) {
            const pctCell = row.cells.find((c) => c.columnId === pctCol);
            const pct = Number(pctCell?.value ?? 0);
            if (pct >= 1) completedCount++;
          }

          metrics.push({
            metricType: "milestone",
            current: completedCount,
            total: level1Rows.length,
            label: `${completedCount} of ${level1Rows.length} milestones complete`,
          });
        }
      }
    } catch (e) {
      console.error("Metrics: failed to read project plan:", e);
    }
  }

  // --- Integration completion from Integration Tracker ---
  if (config.integrationTrackerSheetId) {
    try {
      const sheet = await getSheet(config.integrationTrackerSheetId);
      const cols = columnIdMap(sheet);
      const statusCol = cols.get("Status") ?? cols.get("Integration Status");
      const nameCol = cols.get("Integration") ?? cols.get("Integration Name") ?? cols.get("Name");

      if (nameCol) {
        const rows = sheet.rows.filter((r) => {
          const name = cellValue(r, nameCol);
          return name && String(name).trim().length > 0;
        });

        const total = rows.length;
        let completed = 0;

        if (statusCol) {
          completed = rows.filter((r) => {
            const status = String(cellValue(r, statusCol) ?? "").toLowerCase();
            return status === "complete" || status === "done" || status === "live";
          }).length;
        }

        metrics.push({
          metricType: "integration",
          current: completed,
          total,
          label: `${completed} of ${total} integrations complete`,
        });
      }
    } catch (e) {
      console.error("Metrics: failed to read integration tracker:", e);
    }
  }

  // --- RAID log open items ---
  if (config.raidLogSheetId) {
    try {
      const sheet = await getSheet(config.raidLogSheetId);
      const cols = columnIdMap(sheet);
      const statusCol = cols.get("Status");

      if (statusCol) {
        const allItems = sheet.rows.filter((r) => {
          const status = cellValue(r, statusCol);
          return status && String(status).trim().length > 0;
        });

        const openItems = allItems.filter((r) => {
          const status = String(cellValue(r, statusCol) ?? "").toLowerCase();
          return status !== "complete" && status !== "done" && status !== "closed";
        });

        const resolvedItems = allItems.length - openItems.length;

        metrics.push({
          metricType: "raid",
          current: resolvedItems,
          total: allItems.length,
          label: `${openItems.length} open RAID items`,
        });
      }
    } catch (e) {
      console.error("Metrics: failed to read RAID log:", e);
    }
  }

  // --- Meeting count from Meeting Tracker ---
  if (config.meetingTrackerSheetId) {
    try {
      const sheet = await getSheet(config.meetingTrackerSheetId);
      const cols = columnIdMap(sheet);
      const dateCol = cols.get("Date") ?? cols.get("Meeting Date");

      if (dateCol) {
        const now = new Date();
        const pastMeetings = sheet.rows.filter((r) => {
          const d = cellValue(r, dateCol);
          return d && new Date(String(d)) <= now;
        });

        metrics.push({
          metricType: "meetings",
          current: pastMeetings.length,
          total: sheet.rows.length,
          label: `${pastMeetings.length} meetings held`,
        });
      }
    } catch (e) {
      console.error("Metrics: failed to read meeting tracker:", e);
    }
  }

  // --- Document count ---
  if (config.documentSheetId) {
    try {
      const { listSheetAttachments } = await import("./smartsheet");
      const attachments = await listSheetAttachments(config.documentSheetId);
      metrics.push({
        metricType: "documents",
        current: attachments.length,
        total: attachments.length,
        label: `${attachments.length} documents uploaded`,
      });
    } catch (e) {
      console.error("Metrics: failed to read documents:", e);
    }
  }

  return metrics;
}

/**
 * Writes computed metrics to the Metrics sheet.
 * Upserts: updates existing rows by metric type, adds new ones.
 */
export async function writeMetricsToSheet(
  metricsSheetId: string,
  metrics: ComputedMetric[],
): Promise<{ updated: number; created: number }> {
  const sheet = await getSheet(metricsSheetId);
  const cols = columnIdMap(sheet);

  const typeCol = cols.get("Metric Type") ?? cols.get("Metric type") ?? cols.get("Type");
  const currentCol = cols.get("Current");
  const totalCol = cols.get("Total");
  const labelCol = cols.get("Label");

  if (!typeCol || !currentCol || !totalCol) {
    throw new Error("Metrics sheet missing required columns (Metric Type, Current, Total)");
  }

  // Build existing row lookup by metric type
  const existingRows = new Map<string, number>();
  for (const row of sheet.rows) {
    const type = cellValue(row, typeCol);
    if (type) existingRows.set(String(type), row.id);
  }

  const toUpdate: Array<{ id: number; cells: Array<{ columnId: number; value: string | number }> }> = [];
  const toAdd: Array<{ cells: Array<{ columnId: number; value: string | number }> }> = [];

  for (const m of metrics) {
    const cells: Array<{ columnId: number; value: string | number }> = [
      { columnId: typeCol, value: m.metricType },
      { columnId: currentCol, value: m.current },
      { columnId: totalCol, value: m.total },
    ];
    if (labelCol) {
      cells.push({ columnId: labelCol, value: m.label });
    }

    const existingRowId = existingRows.get(m.metricType);
    if (existingRowId) {
      toUpdate.push({ id: existingRowId, cells });
    } else {
      toAdd.push({ cells });
    }
  }

  if (toUpdate.length > 0) {
    await updateRows(metricsSheetId, toUpdate);
  }
  if (toAdd.length > 0) {
    await addRows(metricsSheetId, toAdd);
  }

  return { updated: toUpdate.length, created: toAdd.length };
}

/**
 * Full refresh: compute metrics from source sheets and write to the Metrics sheet.
 */
export async function refreshMetrics(
  config: SmartsheetConfig,
): Promise<{ metrics: ComputedMetric[]; updated: number; created: number }> {
  if (!config.metricsSheetId) {
    throw new Error("No metrics sheet configured for this project");
  }

  const metrics = await computeMetrics(config);
  const result = await writeMetricsToSheet(config.metricsSheetId, metrics);

  return { metrics, ...result };
}
