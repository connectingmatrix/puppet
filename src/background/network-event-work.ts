import { sendDebug } from '@/src/background/debugger-work';
import { readGraphqlName } from '@/src/background/graphql-name';
import { emitLive } from '@/src/background/live-event-work';
import { readTabPage } from '@/src/background/page-store';

const items = new Map<string, Record<string, unknown>>();
let ready = false;
const previewLimit = 1200;

const readId = (tabId: number, requestId = '') => `${tabId}:${requestId}`;
const readPreview = (value = '') => {
    const text = `${value || ''}`;
    return text.length > previewLimit ? `${text.slice(0, previewLimit)}...[truncated ${text.length - previewLimit} chars]` : text;
};
const readTextBody = async (tabId: number, requestId = '', type = '') => {
    const resource = `${type || ''}`.toLowerCase();
    if (resource && resource !== 'fetch' && resource !== 'xhr' && resource !== 'document') return '';
    try {
        const result = await sendDebug(tabId, 'Network.getResponseBody', { requestId });
        if (!(result && result.base64Encoded && result.body)) return `${result && result.body || ''}`;
        return atob(result.body);
    } catch {
        return '';
    }
};
const readHeaders = (value = {}) => {
    const headers = {};
    for (const name of Object.keys(value || {})) headers[name] = `${value[name] || ''}`;
    return headers;
};
const readPayload = (params: Record<string, unknown>, pageId: string) => {
    const request = params.request || {};
    const body = `${request.postData || ''}`;
    return {
        body: readPreview(body),
        bodyBytes: body.length,
        headers: readHeaders(request.headers || {}),
        method: `${request.method || ''}`,
        operationName: readGraphqlName(body),
        pageId,
        requestId: `${params.requestId || ''}`,
        resourceType: `${params.type || ''}`.toLowerCase(),
        url: `${request.url || ''}`
    };
};

export const ensureNetworkEvents = () => {
    if (ready) return;
    ready = true;
    chrome.debugger.onEvent.addListener(async (source, method, params) => {
        const tabId = source.tabId || 0;
        const page = readTabPage(tabId);
        if (!(tabId && page)) return;
        const key = readId(tabId, `${params.requestId || ''}`);
        if (method === 'Network.requestWillBeSent') {
            const payload = readPayload(params, page.pageId);
            items.set(key, { ...payload, sessionId: page.sessionId });
            emitLive('network.request', payload, page.sessionId);
            return;
        }
        if (method === 'Network.responseReceived') {
            const item = items.get(key);
            if (!item) return;
            item.status = Number(params.response && params.response.status || 0);
            item.responseHeaders = readHeaders(params.response && params.response.headers || {});
            return;
        }
        if (method !== 'Network.loadingFinished' && method !== 'Network.loadingFailed') return;
        const item = items.get(key);
        items.delete(key);
        if (!item) return;
        const body = method === 'Network.loadingFinished' ? await readTextBody(tabId, `${params.requestId || ''}`, `${item.resourceType || ''}`) : '';
        const requestBody = `${item.body || ''}`;
        emitLive('network.response', {
            body: readPreview(body),
            bodyBytes: body.length,
            errorText: `${params.errorText || ''}`,
            headers: item.responseHeaders || {},
            method: `${item.method || ''}`,
            operationName: `${item.operationName || ''}`,
            pageId: `${item.pageId || ''}`,
            requestBody: readPreview(requestBody),
            requestBodyBytes: Number(item.bodyBytes || requestBody.length),
            requestHeaders: item.headers || {},
            requestId: `${item.requestId || ''}`,
            resourceType: `${item.resourceType || ''}`,
            status: Number(item.status || 0),
            url: `${item.url || ''}`
        }, `${item.sessionId || ''}`);
    });
};
