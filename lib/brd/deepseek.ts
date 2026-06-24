import OpenAI from 'openai';

export type LLMProvider = 'deepseek' | 'ollama';

interface ModelConfig {
  provider: LLMProvider;
  model: string;
  baseURL: string;
  apiKeyEnv: string;
}

const MODEL_REGISTRY: Record<string, ModelConfig> = {
  'deepseek-v4-pro': { provider: 'deepseek', model: 'deepseek-v4-pro', baseURL: 'https://api.deepseek.com', apiKeyEnv: 'DEEPSEEK_API_KEY' },
  'deepseek-v4-flash': { provider: 'deepseek', model: 'deepseek-v4-flash', baseURL: 'https://api.deepseek.com', apiKeyEnv: 'DEEPSEEK_API_KEY' },
  'deepseek-chat': { provider: 'deepseek', model: 'deepseek-chat', baseURL: 'https://api.deepseek.com', apiKeyEnv: 'DEEPSEEK_API_KEY' },
  'deepseek-reasoner': { provider: 'deepseek', model: 'deepseek-reasoner', baseURL: 'https://api.deepseek.com', apiKeyEnv: 'DEEPSEEK_API_KEY' },
  'ollama/qwen3.5': { provider: 'ollama', model: 'qwen3.5', baseURL: 'https://api.ollama.com/v1', apiKeyEnv: 'OLLAMA_API_KEY' },
  'ollama/gemma4': { provider: 'ollama', model: 'gemma4', baseURL: 'https://api.ollama.com/v1', apiKeyEnv: 'OLLAMA_API_KEY' },
  'ollama/deepseek-v4-pro': { provider: 'ollama', model: 'deepseek-v4-pro', baseURL: 'https://api.ollama.com/v1', apiKeyEnv: 'OLLAMA_API_KEY' },
  'ollama/glm-5.2': { provider: 'ollama', model: 'glm-5.2', baseURL: 'https://api.ollama.com/v1', apiKeyEnv: 'OLLAMA_API_KEY' },
};

export const ALLOWED_MODELS = Object.keys(MODEL_REGISTRY);

export const DEFAULT_MODEL = 'deepseek-v4-pro';

export const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

export const BA_SYSTEM_PROMPT =
  'You are an expert senior business analyst with 15+ years of experience in enterprise requirements analysis, process modeling, and system documentation. Respond only with valid JSON.';

export function getModelConfig(modelId?: string): ModelConfig {
  if (modelId && MODEL_REGISTRY[modelId]) {
    return MODEL_REGISTRY[modelId];
  }
  return MODEL_REGISTRY[DEFAULT_MODEL];
}

export function selectModel(model?: string): string {
  const config = getModelConfig(model);
  return config.model;
}

export function getDeepSeekApiKey(): string | null {
  return process.env.DEEPSEEK_API_KEY || null;
}

export function getApiKeyForModel(modelId?: string): string | null {
  const config = getModelConfig(modelId);
  return process.env[config.apiKeyEnv] || null;
}

export function createDeepSeekClient(apiKey: string): OpenAI {
  return new OpenAI({
    baseURL: DEEPSEEK_BASE_URL,
    apiKey,
  });
}

export function createLLMClient(modelId?: string): OpenAI | null {
  const config = getModelConfig(modelId);
  const apiKey = process.env[config.apiKeyEnv];
  if (!apiKey) return null;
  return new OpenAI({ baseURL: config.baseURL, apiKey });
}
