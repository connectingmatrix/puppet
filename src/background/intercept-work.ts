import { sendDebug } from '@/src/background/debugger-work';
import { readGraphqlName } from '@/src/background/graphql-name';
import { emitLive } from '@/src/background/live-event-work';
import { PageAction } from '@/src/shared/page-action';

const rules = new Map<number, PageAction[]>();
const active = new Map<number, { pageId: string; sessionId: string }>();
const pending = new Map<string, { pageId: string; tabId: number }>();
let ready = false;

const readParts = (value = '') => value.split('*').filter(Boolean);
const matchUrl = (pattern = '', url = '') => {
    if (!pattern || pattern === '*') return true;
    let offset = 0;
    for (const part of readParts(pattern)) {
        const index = url.indexOf(part, offset);
        if (index < 0) return false;
        offset = index + part.length;
    }
    return true;
};
const matchRule = (action: PageAction, params: chrome.debugger.DebuggeeEvent['params']) => {
    const match = action.match || {};
    const body = `${params.request.postData || ''}`;
    if (match.method && match.method !== params.request.method) return false;
    if (match.operationName && match.operationName !== readGraphqlName(body)) return false;
    if (match.resourceTypes && match.resourceTypes.length && !match.resourceTypes.includes((params.resourceType || '').toLowerCase())) return false;
    return matchUrl(match.urlPattern || '*', params.request.url || '');
};
const readHeaders = (items: Record<string, string>) => {
    const headers = [];
    for (const name of Object.keys(items || {})) headers.push({ name, value: `${items[name]}` });
    return headers;
};
const syncRules = async (tabId: number) => {
    const items = rules.get(tabId) || [];
    if (!items.length && !active.get(tabId)) return sendDebug(tabId, 'Fetch.disable');
    const patterns = [{ requestStage: 'Request', urlPattern: '*' }];
    for (const item of items) patterns.push({ requestStage: 'Request', urlPattern: item.match && item.match.urlPattern || '*' });
    await sendDebug(tabId, 'Fetch.enable', { patterns });
};
const finish = (tabId: number, action: PageAction) => action.mode === 'abort'
    ? sendDebug(tabId, 'Fetch.failRequest', { errorReason: 'Failed', requestId: action.requestId || '' })
    : action.mode === 'fulfill'
        ? sendDebug(tabId, 'Fetch.fulfillRequest', { body: action.bodyBase64 || action.fulfill && action.fulfill.bodyBase64 || '', requestId: action.requestId || '', responseCode: action.status || action.fulfill && action.fulfill.status || 200, responseHeaders: readHeaders(action.headers || action.fulfill && action.fulfill.headers || {}) })
        : sendDebug(tabId, 'Fetch.continueRequest', { requestId: action.requestId || '' });

export const saveInterceptRule = async (tabId: number, action: PageAction, sessionId: string) => {
    rules.set(tabId, [...(rules.get(tabId) || []), { ...action, pageId: action.pageId || '', type: action.type }]);
    await syncRules(tabId);
    emitLive('intercept.ready', { pageId: action.pageId || '', ruleId: action.ruleId || '' }, sessionId);
};

export const setRequestInterception = async (tabId: number, pageId: string, sessionId: string, enabled: boolean) => {
    if (!enabled) active.delete(tabId);
    if (enabled) active.set(tabId, { pageId, sessionId });
    await syncRules(tabId);
    return { enabled, pageId };
};

export const resolveInterceptRequest = async (pageId: string, action: PageAction) => {
    const item = pending.get(action.requestId || '');
    if (!item || item.pageId !== pageId) throw new Error(`No paused request matches ${action.requestId || ''}`);
    await finish(item.tabId, action);
    pending.delete(action.requestId || '');
    return { pageId, requestId: action.requestId || '' };
};

export const dropInterceptRules = (tabId: number) => {
    rules.delete(tabId);
    active.delete(tabId);
    for (const [requestId, item] of pending.entries()) if (item.tabId === tabId) pending.delete(requestId);
};

export const ensureInterceptWork = () => {
    if (ready) return;
    ready = true;
    chrome.debugger.onEvent.addListener(async (source, method, params) => {
        if (method !== 'Fetch.requestPaused' || !source.tabId) return;
        const tabId = source.tabId;
        const page = active.get(tabId);
        if (page) {
            pending.set(params.requestId, { pageId: page.pageId, tabId });
            emitLive('request', {
                body: `${params.request.postData || ''}`,
                headers: params.request.headers || {},
                method: params.request.method || '',
                operationName: readGraphqlName(`${params.request.postData || ''}`),
                pageId: page.pageId,
                requestId: params.requestId,
                resourceType: params.resourceType || '',
                url: params.request.url || ''
            }, page.sessionId);
            return;
        }
        const rule = (rules.get(tabId) || []).find((item) => matchRule(item, params));
        if (!rule) return sendDebug(tabId, 'Fetch.continueRequest', { requestId: params.requestId });
        emitLive('intercept.hit', { pageId: rule.pageId || '', requestId: params.requestId, ruleId: rule.ruleId || '', url: params.request.url || '' }, rule.pageId || '');
        await finish(tabId, { ...rule, requestId: params.requestId });
    });
};
