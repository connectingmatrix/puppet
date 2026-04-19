import { waitForNetworkIdle } from '@/src/background/debug-live-work';
import { WaitUntilType } from '@/src/shared/page-action';

const readyOrder = (value: string) => value === 'complete' ? 2 : value === 'interactive' ? 1 : 0;
const readGoal = (value: WaitUntilType) => value === 'domcontentloaded' ? 1 : 2;

export const waitForLoadState = async (tabId: number, waitUntil: WaitUntilType, frameId = 0) => {
    if (waitUntil === 'networkidle0') return waitForNetworkIdle(tabId, 0, 800, 30000);
    if (waitUntil === 'networkidle2') return waitForNetworkIdle(tabId, 2, 800, 30000);
    const endsAt = Date.now() + 30000;
    while (Date.now() < endsAt) {
        const items = await chrome.scripting.executeScript({
            func: () => document.readyState,
            target: frameId ? { frameIds: [frameId], tabId } : { tabId }
        });
        if (readyOrder(items[0].result || '') >= readGoal(waitUntil)) return;
        await new Promise((resolve) => setTimeout(resolve, 150));
    }
    throw new Error(`Timed out waiting for ${waitUntil}.`);
};
