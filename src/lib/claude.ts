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
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{ role: "user", content: `${userPrompt}\n\n---\n\nDOCUMENT TEXT:\n${text}` }],
  });

  const content = response.content.find((b) => b.type === "text");
  if (!content || content.type !== "text") {
    throw new Error("Claude returned no text content");
  }

  const jsonMatch = content.text.match(/```json\s*([\s\S]*?)```/);
  const raw = jsonMatch ? jsonMatch[1].trim() : content.text.trim();
  return JSON.parse(raw) as T;
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

  const jsonMatch = content.text.match(/```json\s*([\s\S]*?)```/);
  const raw = jsonMatch ? jsonMatch[1].trim() : content.text.trim();
  return JSON.parse(raw) as T;
}
