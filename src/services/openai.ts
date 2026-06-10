import dotenv from "dotenv";
import { getErrorMessage, getOpenAIErrorMessage, logError } from "@/lib/logger.js";
import { getEnvConfig } from "@/lib/env.server.js";
dotenv.config();
const { OPENAI_API_KEY, OPENAI_MODEL, OPENAI_FALLBACK_MODEL } = getEnvConfig();
const OPENAI_KEY = OPENAI_API_KEY;
interface OpenAIChoice {
  message: {
    content: string;
  };
}
interface OpenAIResponse {
  choices?: OpenAIChoice[];
}
async function makeOpenAIRequest(
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<OpenAIResponse> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
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
      const message = getOpenAIErrorMessage(parsed);
      throw new Error(message);
    }
    return JSON.parse(text) as OpenAIResponse;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}
async function requestOpenAI(
  messages: Array<{
    role: string;
    content: string;
  }>,
  timeoutMs: number,
) {
  const requestBody = {
    model: OPENAI_MODEL,
    messages,
    max_tokens: 800,
    temperature: 0.2,
  };
  try {
    return await makeOpenAIRequest(requestBody, timeoutMs);
  } catch (err) {
    const errorMessage = getErrorMessage(err);
    if (
      OPENAI_MODEL !== OPENAI_FALLBACK_MODEL &&
      /model_not_found|does not exist/i.test(errorMessage)
    ) {
      logError(
        "openai",
        `Model ${OPENAI_MODEL} unavailable, retrying with fallback ${OPENAI_FALLBACK_MODEL}`,
      );
      return await makeOpenAIRequest({ ...requestBody, model: OPENAI_FALLBACK_MODEL }, timeoutMs);
    }
    throw new Error(`OpenAI request failed: ${errorMessage}`);
  }
}
async function requestOpenAIChat(
  messages: Array<{
    role: string;
    content: string;
  }>,
  timeoutMs: number,
) {
  const requestBody = {
    model: OPENAI_MODEL,
    messages,
    max_tokens: 300,
    temperature: 0.3,
  };
  try {
    return await makeOpenAIRequest(requestBody, timeoutMs);
  } catch (err) {
    const errorMessage = getErrorMessage(err);
    if (
      OPENAI_MODEL !== OPENAI_FALLBACK_MODEL &&
      /model_not_found|does not exist/i.test(errorMessage)
    ) {
      logError(
        "openai",
        `Model ${OPENAI_MODEL} unavailable, retrying with fallback ${OPENAI_FALLBACK_MODEL}`,
      );
      return await makeOpenAIRequest({ ...requestBody, model: OPENAI_FALLBACK_MODEL }, timeoutMs);
    }
    throw new Error(`OpenAI request failed: ${errorMessage}`);
  }
}
export async function generatePlanFromInput(userInput: string, timeoutMs = 30000): Promise<string> {
  const prompt = `Convert this unstructured text into a JSON array of action steps.\nInput: ${userInput}\n\nRequirements:\n- Generate 5-10 steps\n- Each step needs: action (specific task), why (reason), priority (1-5)\n- Return ONLY valid JSON array\n\nFormat example:\n[{"step":1,"action":"Research topic","why":"Understand requirements","priority":1}]`;
  const response = await requestOpenAI([{ role: "user", content: prompt }], timeoutMs);
  if (isOpenAIResponse(response) && response.choices?.[0]?.message?.content) {
    return response.choices[0].message.content;
  }
  throw new Error("Invalid response structure from OpenAI");
}
export async function chatForStep(
  stepAction: string,
  stepWhy: string,
  userQuestion: string,
  timeoutMs = 30000,
): Promise<string> {
  const prompt = `Context: User is working on step: ${stepAction}\nReason: ${stepWhy}\nQuestion: ${userQuestion}\n\nProvide helpful, practical advice about this specific task. Keep response under 150 words.`;
  const response = await requestOpenAIChat([{ role: "user", content: prompt }], timeoutMs);
  if (isOpenAIResponse(response) && response.choices?.[0]?.message?.content) {
    return response.choices[0].message.content;
  }
  throw new Error("Invalid response structure from OpenAI");
}
function isOpenAIResponse(data: unknown): data is OpenAIResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "choices" in data &&
    Array.isArray((data as OpenAIResponse).choices) &&
    (data as OpenAIResponse).choices!.length > 0 &&
    "message" in (data as OpenAIResponse).choices![0] &&
    "content" in (data as OpenAIResponse).choices![0].message
  );
}
