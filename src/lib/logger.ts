export function serializeError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error, Object.getOwnPropertyNames(error));
  } catch {
    return String(error);
  }
}
export function getErrorMessage(error: unknown, fallback = "Internal server error"): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message || fallback;
  const anyError = error as any;
  if (typeof anyError.message === "string" && anyError.message.trim()) {
    return anyError.message;
  }
  if (typeof anyError.error === "string" && anyError.error.trim()) {
    return anyError.error;
  }
  if (typeof anyError.error?.message === "string" && anyError.error?.message.trim()) {
    return anyError.error.message;
  }
  try {
    return JSON.stringify(anyError);
  } catch {
    return fallback;
  }
}
export function logError(scope: string, error: unknown): void {
  console.error(`[${scope}]`, serializeError(error));
}
export function getLlmErrorMessage(body: unknown): string {
  if (!body || typeof body !== "object") return "LLM request failed";
  const anyBody = body as any;
  const llmError = anyBody.error ?? anyBody;
  if (llmError && typeof llmError === "object") {
    const message = typeof llmError.message === "string" ? llmError.message : undefined;
    const code = typeof llmError.code === "string" ? llmError.code : undefined;
    if (message && code) return `${message} (${code})`;
    if (message) return message;
    if (code) return `LLM error: ${code}`;
  }
  return "LLM request failed";
}
