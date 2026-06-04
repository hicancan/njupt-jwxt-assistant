import { EvalSettingsSchema, DEFAULT_EVAL_SETTINGS, type EvalSettings } from './types';

const STORAGE_KEY = 'njupt-eval:settings';

function storageGet<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(result[key] as T | undefined);
    });
  });
}

function storageSet(value: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(value, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

export async function loadSettings(): Promise<EvalSettings> {
  const raw = await storageGet<EvalSettings>(STORAGE_KEY);
  const parsed = EvalSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return DEFAULT_EVAL_SETTINGS;
  }
  return parsed.data;
}

export async function saveSettings(settings: EvalSettings): Promise<void> {
  await storageSet({ [STORAGE_KEY]: settings });
}
