import { runWithLimit } from '@/src/shared/time-limit';

const scriptMs = 60000;

export const runFrameScript = async <T,>(tabId: number, frameId: number, func: (...args: any[]) => T, args: any[] = [], timeoutMs = scriptMs) => {
    const target = frameId ? { frameIds: [frameId], tabId } : { tabId };
    const result = await runWithLimit(chrome.scripting.executeScript({ args, func, target }), timeoutMs, 'page script execution');
    return result[0].result as T;
};
