import dotenv from "dotenv";
import { getErrorMessage, getLlmErrorMessage, logError } from "@/lib/logger.js";
import { getEnvConfig } from "@/lib/env.server.js";

dotenv.config();
const { LLM_API_KEY, LLM_MODEL, LLM_FALLBACK_MODEL, LLM_API_URL } = getEnvConfig();

interface LlmChoice {
  message: {
    content: string;
  };
}

interface LlmResponse {
  choices?: LlmChoice[];
}

async function makeLlmRequest(
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<LlmResponse> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(LLM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal as any,
    });
    clearTimeout(id);
    const text = await res.text();
    if (!res.ok) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
      const message = getLlmErrorMessage(parsed);
      throw new Error(message);
    }
    return JSON.parse(text) as LlmResponse;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function requestLlm(
  messages: Array<{
    role: string;
    content: string;
  }>,
  timeoutMs: number,
) {
  const requestBody = {
    model: LLM_MODEL,
    messages,
    max_tokens: 800,
    temperature: 0.2,
  };
  try {
    return await makeLlmRequest(requestBody, timeoutMs);
  } catch (err) {
    const errorMessage = getErrorMessage(err);
    if (LLM_MODEL !== LLM_FALLBACK_MODEL && /model_not_found|does not exist/i.test(errorMessage)) {
      logError(
        "llm",
        `Model ${LLM_MODEL} unavailable, retrying with fallback ${LLM_FALLBACK_MODEL}`,
      );
      return await makeLlmRequest({ ...requestBody, model: LLM_FALLBACK_MODEL }, timeoutMs);
    }
    throw new Error(`LLM request failed: ${errorMessage}`);
  }
}

async function requestLlmChat(
  messages: Array<{
    role: string;
    content: string;
  }>,
  timeoutMs: number,
) {
  const requestBody = {
    model: LLM_MODEL,
    messages,
    max_tokens: 300,
    temperature: 0.3,
  };
  try {
    return await makeLlmRequest(requestBody, timeoutMs);
  } catch (err) {
    const errorMessage = getErrorMessage(err);
    if (LLM_MODEL !== LLM_FALLBACK_MODEL && /model_not_found|does not exist/i.test(errorMessage)) {
      logError(
        "llm",
        `Model ${LLM_MODEL} unavailable, retrying with fallback ${LLM_FALLBACK_MODEL}`,
      );
      return await makeLlmRequest({ ...requestBody, model: LLM_FALLBACK_MODEL }, timeoutMs);
    }
    throw new Error(`LLM request failed: ${errorMessage}`);
  }
}

export async function generatePlanFromInput(userInput: string, timeoutMs = 30000): Promise<string> {
  const prompt = `Convert this unstructured text into a JSON array of action steps.
Input: ${userInput}

Requirements:
- Generate 5-10 steps
- Each step needs: step (number), action (specific task), why (reason), priority (1-5)
- Return ONLY valid JSON array wrapped in a markdown code block with json tag

CRITICAL FORMATTING INSTRUCTIONS:
1. Start with: \`\`\`json
2. Then put your JSON array on a new line
3. End with: \`\`\`
4. Do NOT add any text before or after the code block
5. Do NOT include explanatory text, comments, or natural language outside the code block

Example of CORRECT format:
\`\`\`json
[{"step":1,"action":"Research topic","why":"Understand requirements","priority":1}]
\`\`\`

Example of INCORRECT format (DO NOT DO THIS):
Here is your JSON: \`\`\`json[...]\`\`\` Thanks!

Generate ONLY the code block, nothing else.`;

  const response = await requestLlm([{ role: "user", content: prompt }], timeoutMs);
  if (isLlmResponse(response) && response.choices?.[0]?.message?.content) {
    return response.choices[0].message.content;
  }
  throw new Error("Invalid response structure from LLM");
}

export async function chatForStep(
  stepAction: string,
  stepWhy: string,
  userQuestion: string,
  timeoutMs = 30000,
): Promise<string> {
  const prompt = `Context: User is working on step: ${stepAction}\nReason: ${stepWhy}\nQuestion: ${userQuestion}\n\nProvide helpful, practical advice about this specific task. Keep response under 150 words.`;
  const response = await requestLlmChat([{ role: "user", content: prompt }], timeoutMs);
  if (isLlmResponse(response) && response.choices?.[0]?.message?.content) {
    return response.choices[0].message.content;
  }
  throw new Error("Invalid response structure from LLM");
}

function isLlmResponse(data: unknown): data is LlmResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "choices" in data &&
    Array.isArray((data as LlmResponse).choices) &&
    (data as LlmResponse).choices!.length > 0 &&
    "message" in (data as LlmResponse).choices![0] &&
    "content" in (data as LlmResponse).choices![0].message
  );
}
