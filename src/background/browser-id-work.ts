import { readStorageLocal } from '@/src/shared/extension-api';

const key = 'browser-id';
const readLocal = () => new Promise<string>((resolve, reject) => {
    readStorageLocal().get(key, (items) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(`${items[key] || ''}`);
    });
});
const writeLocal = (value: string) => new Promise<string>((resolve, reject) => {
    readStorageLocal().set({ [key]: value }, () => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(value);
    });
});

export const readBrowserId = async () => {
    const saved = await readLocal();
    if (saved) return saved;
    return writeLocal(crypto.randomUUID());
};
