import { sendDebug, startDebugTab, stopDebugTab } from '@/src/background/debugger-work';
import { readLivePage } from '@/src/background/page-store';

const readPage = (pageId: string) => {
    const page = readLivePage(pageId);
    if (!page) throw new Error(`No active page matches ${pageId}`);
    return page;
};
const readValue = (value: any = {}) => value.value || value.value === '' || value.value === 0 || value.value === false ? value.value : value.description || null;

export const runPageDebugger = async (payload: any = {}) => {
    const page = readPage(`${payload.pageId || ''}`);
    if (payload.action === 'stop') {
        const leases = await stopDebugTab(page.tabId || 0);
        return { leases, pageId: page.pageId, started: false, tabId: page.tabId || 0 };
    }
    if (payload.action === 'evaluate') {
        const data = await sendDebug(page.tabId || 0, 'Runtime.evaluate', { awaitPromise: true, expression: `${payload.script || ''}`, returnByValue: true, userGesture: true });
        if (data.exceptionDetails) throw new Error(`${data.exceptionDetails.text || data.result && data.result.description || 'Debugger evaluate failed.'}`);
        return { pageId: page.pageId, tabId: page.tabId || 0, type: data.result && data.result.type || '', value: readValue(data.result || {}) };
    }
    const leases = await startDebugTab(page.tabId || 0);
    return { leases, pageId: page.pageId, started: true, tabId: page.tabId || 0 };
};
