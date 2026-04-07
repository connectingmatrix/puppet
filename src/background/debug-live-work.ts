import { emitLive } from '@/src/background/live-event-work';
import { patchLivePage, readTabPage } from '@/src/background/page-store';

const pending = new Map<number, number>();
let ready = false;

const dropPending = (tabId: number) => pending.set(tabId, Math.max((pending.get(tabId) || 1) - 1, 0));
const readSession = (tabId: number) => {
    const page = readTabPage(tabId);
    return { page, sessionId: page ? page.sessionId : '' };
};

export const ensureDebugEvents = () => {
    if (ready) return;
    ready = true;
    chrome.debugger.onEvent.addListener((source, method, params) => {
        const tabId = source.tabId || 0;
        const state = readSession(tabId);
        if (method === 'Network.requestWillBeSent') pending.set(tabId, (pending.get(tabId) || 0) + 1);
        if (method === 'Network.loadingFinished' || method === 'Network.loadingFailed') dropPending(tabId);
        if (method === 'Runtime.consoleAPICalled' && state.page) {
            const parts = [];
            for (const item of params.args || []) parts.push(item.value || item.description || '');
            emitLive('console', { pageId: state.page.pageId, text: parts.join(' ').trim(), type: params.type || 'log' }, state.sessionId);
        }
        if (method === 'Page.frameNavigated' && state.page && params.frame && !params.frame.parentId) {
            patchLivePage(state.page.pageId, { title: params.frame.name || state.page.title, url: params.frame.url || state.page.url });
            emitLive('navigation', { pageId: state.page.pageId, url: params.frame.url || state.page.url }, state.sessionId);
        }
    });
};

export const waitForNetworkIdle = (tabId: number, limit: number, idleMs: number, timeoutMs: number) => new Promise<void>((resolve, reject) => {
    const endsAt = Date.now() + timeoutMs;
    let quietAt = 0;
    const tick = () => {
        if ((pending.get(tabId) || 0) <= limit) quietAt = quietAt || Date.now();
        if ((pending.get(tabId) || 0) > limit) quietAt = 0;
        if (quietAt && Date.now() - quietAt >= idleMs) return resolve();
        if (Date.now() >= endsAt) return reject(new Error('Timed out waiting for network idle.'));
        setTimeout(tick, 150);
    };
    tick();
});
