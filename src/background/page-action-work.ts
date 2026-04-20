import { readCompareResult, readInspectResult } from '@/src/background/result-shape';
import { captureLiveTab, reloadPageTab, runPageAction, updatePageTab } from '@/src/background/tab-work';
import { saveRecord, readRecord, patchLivePage } from '@/src/background/page-store';
import { closeLiveSessionPage, LiveEmit, readLiveHtml, readLiveShot, readPageState, readPublicPage, refreshPageMeta, updatePageStatus } from '@/src/background/page-session-work';
import { clearViewport, resizeViewport } from '@/src/background/debugger-work';
import { resolveInterceptRequest, saveInterceptRule, setRequestInterception } from '@/src/background/intercept-work';
import { PageAction } from '@/src/shared/page-action';
import { LivePage } from '@/src/shared/page-session';

const readPage = (pageId: string) => {
    const page = readPageState(pageId);
    if (!page) throw new Error(`No active page matches ${pageId}`);
    return page;
};
const readCapture = async (pageId: string, selector: string, path: string) => {
    const page = readPage(pageId);
    return captureLiveTab(page.tabId || 0, selector, path);
};
const readBound = (action: PageAction, pages: Record<string, string>) => {
    if (action.pageId || !action.role) return action;
    return { ...action, pageId: pages[action.role] || '' };
};
const readResult = (action: PageAction, data = null, error = '') => ({ actionId: action.actionId || crypto.randomUUID(), data: data === null ? undefined : data, error: error || undefined, ok: !error, pageId: action.pageId || '', type: action.type });

export const bindPageActions = (actions: PageAction[], pages: LivePage[]) => {
    const ids = {};
    for (const page of pages) ids[page.role] = page.pageId;
    const items: PageAction[] = [];
    for (const action of actions) items.push(readBound(action, ids));
    return items;
};

export const runLiveAction = async (action: PageAction, emit: LiveEmit) => {
    const startedPageId = action.pageId || action.leftPageId || action.rightPageId || '';
    const startedPage = startedPageId ? readPage(startedPageId) : null;
    const sessionId = startedPage ? startedPage.sessionId : '';
    emit('action.started', { actionId: action.actionId || '', pageId: startedPageId, type: action.type }, sessionId);
    if (action.type === 'get_page_data') {
        const data = readInspectResult(await readCapture(action.pageId || '', action.selector || 'body', action.path || 'root'), Boolean(action.snapshot));
        emit('data.ready', { actionId: action.actionId || '', pageId: action.pageId || '' }, sessionId);
        return readResult(action, data);
    }
    if (action.type === 'get_page_diff') {
        const left = await readCapture(action.leftPageId || '', action.selector || 'body', action.path || 'root');
        const right = await readCapture(action.rightPageId || '', action.selector || 'body', action.path || 'root');
        const data = readCompareResult(left, right, Boolean(action.snapshot));
        emit('diff.ready', { actionId: action.actionId || '', leftPageId: action.leftPageId || '', rightPageId: action.rightPageId || '' }, sessionId || readPage(action.leftPageId || '').sessionId);
        return readResult(action, data);
    }
    if (action.type === 'get_page_html') return readResult(action, await readLiveHtml(action.pageId || '', action.selector || ''));
    if (action.type === 'screenshot_page') return readResult(action, await readLiveShot(action.pageId || '', action.selector || '', Boolean(action.current) || action.fullPage === false));
    if (action.type === 'close_page') return readResult(action, await closeLiveSessionPage(action.pageId || '', emit));
    if (action.type === 'record_start') {
        const baseline = await readCapture(action.pageId || '', action.selector || 'body', 'root');
        const recordId = action.recordId || crypto.randomUUID();
        const page = readPage(action.pageId || '');
        saveRecord(page.pageId, recordId, { baseline, include: action.include || [], selector: action.selector || 'body' });
        const next = patchLivePage(page.pageId, { recordingIds: [...page.recordingIds, recordId] });
        emit('record.started', { pageId: page.pageId, recordId, recordingIds: next && next.recordingIds || [recordId] }, page.sessionId);
        return readResult(action, { pageId: page.pageId, recordId });
    }
    if (action.type === 'record_stop') {
        const record = readRecord(action.pageId || '', action.recordId || '');
        if (!record) throw new Error(`No recording matches ${action.recordId || ''}`);
        const after = await readCapture(action.pageId || '', record.selector, 'root');
        const data = { after: readInspectResult(after, true), before: readInspectResult(record.baseline, true), diff: readCompareResult(record.baseline, after, true) };
        emit('record.stopped', { pageId: action.pageId || '', recordId: action.recordId || '' }, sessionId);
        return readResult(action, data);
    }
    if (action.type === 'change_screen_size') {
        const page = readPage(action.pageId || '');
        await resizeViewport(page.tabId || 0, { height: action.height || page.height, name: page.role, width: action.width || page.width });
        const next = await refreshPageMeta(page.pageId);
        emit('page.resized', readPublicPage(next), page.sessionId);
        return readResult(action, readPublicPage(next));
    }
    if (action.type === 'navigate_to_url') {
        const page = updatePageStatus(action.pageId || '', 'navigating');
        const tabId = page.pageId ? page.tabId || 0 : 0;
        if (action.resetViewport) await clearViewport(tabId);
        await updatePageTab(tabId, action.url || '', action.waitUntil || 'load');
        const next = await refreshPageMeta(action.pageId || '');
        emit('page.navigated', readPublicPage(next), next.sessionId);
        return readResult(action, readPublicPage(next));
    }
    if (action.type === 'reload_page') {
        const page = updatePageStatus(action.pageId || '', 'reloading');
        await reloadPageTab(page.pageId ? page.tabId || 0 : 0, action.waitUntil || 'load');
        const next = await refreshPageMeta(action.pageId || '');
        emit('page.reloaded', readPublicPage(next), next.sessionId);
        return readResult(action, readPublicPage(next));
    }
    if (action.type === 'intercept_request') {
        const page = readPage(action.pageId || '');
        await saveInterceptRule(page.tabId || 0, action, page.sessionId);
        return readResult(action, { pageId: page.pageId, ruleId: action.ruleId || '' });
    }
    if (action.type === 'set_request_interception') {
        const page = readPage(action.pageId || '');
        return readResult(action, await setRequestInterception(page.tabId || 0, page.pageId, page.sessionId, Boolean(action.enabled)));
    }
    if (action.type === 'resolve_request') return readResult(action, await resolveInterceptRequest(action.pageId || '', action));
    const page = readPage(action.pageId || '');
    const data = await runPageAction(page.tabId || 0, action);
    return readResult(action, data);
};

export const runLiveActions = async (actions: PageAction[], emit: LiveEmit) => {
    const results = [];
    for (const action of actions) {
        try {
            const result = await runLiveAction(action, emit);
            const page = result.pageId && action.type !== 'close_page' ? readPage(result.pageId) : null;
            emit('action.completed', { actionId: result.actionId, pageId: result.pageId, type: action.type }, page ? page.sessionId : '');
            results.push(result);
        } catch (error) {
            const page = action.pageId ? readPage(action.pageId) : null;
            const result = readResult(action, null, error instanceof Error ? error.message : 'Action failed.');
            emit('action.failed', { actionId: result.actionId, error: result.error || '', pageId: result.pageId, type: action.type }, page ? page.sessionId : '');
            results.push(result);
        }
    }
    return results;
};
