import {
  validateUploadFile,
  extractTextFromBuffers,
} from "@/lib/file-extraction";
import { extractDataFromText } from "@/lib/claude";
import {
  WORKFLOW_EXTRACTION_SYSTEM,
  WORKFLOW_EXTRACTION_USER,
  type WorkflowData,
} from "@/lib/documents/workflow-prompts";

export interface UploadedFile {
  name: string;
  size: number;
  buffer: Buffer;
}

export interface ExtractionResult {
  data: WorkflowData;
  fileNames: string[];
  stepCount: number;
  ruleCount: number;
}

export async function extractWorkflowFromFiles(
  files: UploadedFile[],
  existingData?: WorkflowData | null,
): Promise<ExtractionResult> {
  if (files.length === 0) {
    throw new Error("No files provided");
  }

  for (const file of files) {
    const error = validateUploadFile(file.name, file.size);
    if (error) throw new Error(`${file.name}: ${error}`);
  }

  const combinedText = await extractTextFromBuffers(files);
  if (!combinedText.trim()) {
    throw new Error("Could not extract text from the uploaded files");
  }

  let userPrompt = WORKFLOW_EXTRACTION_USER;
  if (existingData && Object.keys(existingData.workflow_steps).length > 0) {
    userPrompt += `\n\n---\n\nEXISTING WORKFLOW DATA (merge new findings into this structure, preserving any existing rules that are not contradicted by the new documents):\n${JSON.stringify(existingData, null, 2)}`;
  }

  const data = await extractDataFromText<WorkflowData>(
    combinedText,
    WORKFLOW_EXTRACTION_SYSTEM,
    userPrompt,
  );

  const activeSteps = Object.values(data.workflow_steps).filter(s => s.active);
  const ruleCount = activeSteps.reduce((sum, s) => sum + s.rules.length, 0);

  return {
    data,
    fileNames: files.map(f => f.name),
    stepCount: activeSteps.length,
    ruleCount,
  };
}
