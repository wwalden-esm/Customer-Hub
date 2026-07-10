import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

const MODEL = "claude-sonnet-4-6";

export async function extractDataFromText<T>(
  text: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<T> {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: systemPrompt,
    messages: [{ role: "user", content: `${userPrompt}\n\n---\n\nDOCUMENT TEXT:\n${text}` }],
  });

  if (response.stop_reason === "max_tokens") {
    throw new Error("Response was truncated — transcript may be too long. Try a shorter excerpt.");
  }

  const content = response.content.find((b) => b.type === "text");
  if (!content || content.type !== "text") {
    throw new Error("Claude returned no text content");
  }

  const raw = extractJson(content.text);
  return JSON.parse(raw) as T;
}

function extractJson(text: string): string {
  // Try fenced JSON block first
  const fenced = text.match(/```json\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Try any fenced block
  const anyFence = text.match(/```\s*([\s\S]*?)```/);
  if (anyFence) return anyFence[1].trim();
  // Try to find a JSON object in the raw text
  const objStart = text.indexOf("{");
  const objEnd = text.lastIndexOf("}");
  if (objStart !== -1 && objEnd > objStart) return text.slice(objStart, objEnd + 1);
  return text.trim();
}

export async function generateDocument<T>(
  systemPrompt: string,
  userPrompt: string,
): Promise<T> {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content = response.content.find((b) => b.type === "text");
  if (!content || content.type !== "text") {
    throw new Error("Claude returned no text content");
  }

  const raw = extractJson(content.text);
  return JSON.parse(raw) as T;
}
