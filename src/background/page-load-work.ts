import { readPendingRequests, waitForNetworkIdle } from '@/src/background/debug-live-work';
import { WaitUntilType } from '@/src/shared/page-action';

const readyOrder = (value: string) => value === 'complete' ? 2 : value === 'interactive' ? 1 : 0;
const readGoal = (value: WaitUntilType) => value === 'domcontentloaded' ? 1 : 2;
const readState = async (tabId: number, frameId = 0) => {
    const items = await chrome.scripting.executeScript({
        func: () => ({ body: Boolean(document.body), href: location.href, readyState: document.readyState, title: document.title }),
        target: frameId ? { frameIds: [frameId], tabId } : { tabId }
    });
    return items[0].result || { body: false, href: '', readyState: '', title: '' };
};
const readError = (tabId: number, waitUntil: WaitUntilType, state) => {
    const pending = readPendingRequests(tabId).map((item) => `${item.method || ''} ${item.url || ''}`.trim());
    return `Timed out waiting for ${waitUntil}. Current state: ${state.readyState || 'unknown'} ${state.href || ''}. Pending requests: ${pending.join(' | ') || 'none'}.`;
};

export const waitForLoadState = async (tabId: number, waitUntil: WaitUntilType, frameId = 0) => {
    if (waitUntil === 'networkidle0') return waitForNetworkIdle(tabId, 0, 800, 30000);
    if (waitUntil === 'networkidle2') return waitForNetworkIdle(tabId, 2, 800, 30000);
    const endsAt = Date.now() + 30000;
    let state = { body: false, href: '', readyState: '', title: '' };
    while (Date.now() < endsAt) {
        state = await readState(tabId, frameId);
        if (waitUntil === 'document' && state.body && state.href !== 'about:blank') return;
        if (readyOrder(state.readyState || '') >= readGoal(waitUntil)) return;
        await new Promise((resolve) => setTimeout(resolve, 150));
    }
    throw new Error(readError(tabId, waitUntil, state));
};
