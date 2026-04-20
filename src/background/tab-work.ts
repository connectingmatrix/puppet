import { closeDebugTab, ensureDebugTab } from '@/src/background/debugger-work';
import { runPageEval } from '@/src/background/page-eval-work';
import { uploadFiles } from '@/src/background/file-upload-work';
import { watchGraphql } from '@/src/background/graphql-wait';
import { dropInterceptRules } from '@/src/background/intercept-work';
import { readPageHtmlTarget } from '@/src/background/page-html-read';
import { waitForLoadState } from '@/src/background/page-load-work';
import { runPageDomAction } from '@/src/background/page-dom-work';
import { readPageScriptResult, runPageScript } from '@/src/background/page-script-read';
import { runFrameScript } from '@/src/background/page-script-work';
import { runUserAction } from '@/src/background/page-user-run';
import { waitForTab } from '@/src/background/tab-wait-work';
import { waitForPageTarget } from '@/src/background/page-wait-read';
import { waitForPageRoot } from '@/src/background/page-wait';
import { readNodeDetail, readDomSnapshot } from '@/src/sidepanel/lib/page-readers';

const rootWaitMs = 30000;
const rootSettleMs = 700;
const rootPollMs = 250;
const readOpenWindow = async () => chrome.windows.getLastFocused({ windowTypes: ['normal'] });
const readWaitError = (selector: string, state: { loading: boolean; title: string; url: string }) => state.loading
    ? `The page is still showing a loading shell while waiting for ${selector}. Final URL: ${state.url}. Final title: ${state.title}.`
    : `No visible element matches ${selector} after waiting for GraphQL and page render. Final URL: ${state.url}. Final title: ${state.title}.`;

export const openPageTab = async (url: string, active: boolean, waitUntil = 'load') => {
    const win = await readOpenWindow();
    const tab = await chrome.tabs.create({ active, url, windowId: win.id });
    const tabId = tab.id || 0;
    await waitForTab(tabId);
    await ensureDebugTab(tabId);
    await waitForLoadState(tabId, waitUntil as any);
    return tabId;
};

export const updatePageTab = async (tabId: number, url: string, waitUntil = 'load') => {
    await chrome.tabs.update(tabId, { url });
    await waitForTab(tabId);
    await waitForLoadState(tabId, waitUntil as any);
};

export const reloadPageTab = async (tabId: number, waitUntil = 'load') => {
    await chrome.tabs.reload(tabId);
    await waitForTab(tabId);
    await waitForLoadState(tabId, waitUntil as any);
};

export const capturePageTab = async (tabId: number, selector: string, path: string, size = null) => {
    const graphql = watchGraphql(tabId);
    try {
        await graphql.wait();
        const state = await runFrameScript(tabId, 0, waitForPageRoot, [selector, rootWaitMs, rootSettleMs, rootPollMs]);
        if (!state.found) throw new Error(readWaitError(selector, state));
        const snapshot = await runFrameScript(tabId, 0, readDomSnapshot, [selector]);
        const detail = await runFrameScript(tabId, 0, readNodeDetail, [selector, path]);
        return { detail, size, snapshot, tabId };
    } finally {
        graphql.close();
    }
};

export const captureLiveTab = async (tabId: number, selector: string, path: string, size = null) => {
    const snapshot = await runFrameScript(tabId, 0, readDomSnapshot, [selector]);
    if (snapshot.error) throw new Error(snapshot.error);
    const detail = await runFrameScript(tabId, 0, readNodeDetail, [selector, path]);
    if (detail.error) throw new Error(detail.error);
    return { detail, size, snapshot, tabId };
};

export const runPageAction = async (tabId: number, action) => {
    if (action.type === 'upload_files') return uploadFiles(tabId, action.selector || '', action.index || 0, action.files || []);
    if (action.type === 'wait_for_selector') return runFrameScript(tabId, action.frameId || 0, waitForPageTarget, [action.selector || '', action.index || 0, Boolean(action.visible), action.timeoutMs || 30000, 200], (action.timeoutMs || 30000) + 2000);
    if (action.type === 'get_page_html') return runFrameScript(tabId, action.frameId || 0, readPageHtmlTarget, [action.selector || 'html', action.index || 0]);
    if (action.type === 'execute_script' && !(action.frameId || 0)) return runPageEval(tabId, action.script || '', action.args || []);
    if (action.type === 'execute_script') return readPageScriptResult(await runFrameScript(tabId, action.frameId || 0, runPageScript, [action.script || '', action.args || []], action.timeoutMs || 60000));
    if (action.type === 'submit') return runFrameScript(tabId, action.frameId || 0, runPageDomAction, [action]);
    const data = await runUserAction(tabId, action);
    if (action.waitUntil) await waitForLoadState(tabId, action.waitUntil, action.frameId || 0);
    return data;
};

export const readPageHtml = async (tabId: number, selector = '', frameId = 0, index = 0) => runFrameScript(tabId, frameId, readPageHtmlTarget, [selector || 'html', index || 0]);

export const readPageBox = async (tabId: number, selector: string) => (await runFrameScript(tabId, 0, readNodeDetail, [selector, 'root'])).box;

export const readTabMeta = async (tabId: number) => {
    const tab = await chrome.tabs.get(tabId);
    return { height: tab.height || 0, title: tab.title || '', url: tab.url || '', width: tab.width || 0 };
};

export const closePageTab = async (tabId: number) => {
    dropInterceptRules(tabId);
    await closeDebugTab(tabId);
    await chrome.tabs.remove(tabId);
};
