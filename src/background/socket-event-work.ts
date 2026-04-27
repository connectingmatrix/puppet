import { emitLive } from '@/src/background/live-event-work';
import { readTabPage } from '@/src/background/page-store';
import { readPreviewText } from '@/src/background/text-preview';

const items = new Map<string, Record<string, unknown>>();
let ready = false;
const readId = (tabId: number, requestId = '') => `${tabId}:${requestId}`;
const emitSocket = (item = {}, value = {}) => emitLive('socket', { at: Date.now(), ...item, ...value }, `${item.sessionId || ''}`);

export const dropSocketEvents = (tabId: number) => {
    for (const name of items.keys()) if (name.startsWith(`${tabId}:`)) items.delete(name);
};

export const ensureSocketEvents = () => {
    if (ready) return;
    ready = true;
    chrome.debugger.onEvent.addListener((source, method, params) => {
        const tabId = source.tabId || 0;
        const page = readTabPage(tabId);
        if (!(tabId && page)) return;
        const requestId = `${params.requestId || ''}`;
        const id = readId(tabId, requestId);
        if (method === 'Network.webSocketCreated') {
            const item = { pageId: page.pageId, requestId, sessionId: page.sessionId, url: `${params.url || ''}` };
            items.set(id, item);
            return emitSocket(item, { kind: 'connect', stage: 'created' });
        }
        const item = items.get(id) || { pageId: page.pageId, requestId, sessionId: page.sessionId, url: '' };
        if (!items.get(id)) items.set(id, item);
        if (method === 'Network.webSocketWillSendHandshakeRequest') return emitSocket(item, { headers: params.request && params.request.headers || {}, kind: 'connect', stage: 'handshake' });
        if (method === 'Network.webSocketHandshakeResponseReceived') return emitSocket(item, { headers: params.response && params.response.headers || {}, kind: 'connect', stage: 'ready', status: Number(params.response && params.response.status || 0) });
        if (method === 'Network.webSocketFrameSent' || method === 'Network.webSocketFrameReceived') {
            const text = `${params.response && params.response.payloadData || ''}`;
            return emitSocket(item, { direction: method === 'Network.webSocketFrameSent' ? 'send' : 'receive', kind: 'message', opcode: Number(params.response && params.response.opcode || 1), preview: readPreviewText(text), text });
        }
        if (method === 'Network.webSocketFrameError') return emitSocket(item, { errorText: `${params.errorMessage || ''}`, kind: 'error' });
        if (method !== 'Network.webSocketClosed') return;
        emitSocket(item, { kind: 'disconnect' });
        items.delete(id);
    });
};
