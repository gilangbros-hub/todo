import OpenAI from 'openai';

export const ALLOWED_MODELS = [
  'deepseek-v4-pro',
  'deepseek-v4-flash',
  'deepseek-chat',
  'deepseek-reasoner',
] as const;

export const DEFAULT_MODEL = 'deepseek-v4-pro';

export const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

export const BA_SYSTEM_PROMPT =
  'You are an expert senior business analyst with 15+ years of experience in enterprise requirements analysis, process modeling, and system documentation. Respond only with valid JSON.';

/**
 * Resolve the model to use, falling back to the default if invalid.
 */
export function selectModel(model?: string): string {
  if (model && (ALLOWED_MODELS as readonly string[]).includes(model)) {
    return model;
  }
  return DEFAULT_MODEL;
}

/**
 * Read and validate the DeepSeek API key from the environment.
 * Returns the key or null if not configured.
 */
export function getDeepSeekApiKey(): string | null {
  return process.env.DEEPSEEK_API_KEY || null;
}

/**
 * Create an OpenAI-compatible client pointing at DeepSeek.
 */
export function createDeepSeekClient(apiKey: string): OpenAI {
  return new OpenAI({
    baseURL: DEEPSEEK_BASE_URL,
    apiKey,
  });
}
