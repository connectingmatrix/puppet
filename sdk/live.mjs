import { WebSocket } from 'ws';
import { readBaseUrl } from './http.mjs';

const readSocketUrl = (baseUrl) => {
    const url = new URL('/api/live', readBaseUrl(baseUrl));
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${url}`;
};

export class LiveSocket {
    constructor(baseUrl = '') {
        this.baseUrl = readBaseUrl(baseUrl);
        this.listeners = [];
        this.pending = new Map();
        this.socket = null;
        this.sessionId = '';
    }
    listen(type, handler) {
        this.listeners.push({ handler, type });
        return () => { this.listeners = this.listeners.filter((item) => item.handler !== handler || item.type !== type); };
    }
    emit(type, data) {
        for (const item of this.listeners) if (!item.type || item.type === type) item.handler(data);
    }
    finish(id, result = {}, error = '') {
        const item = this.pending.get(id);
        if (!item) return;
        clearTimeout(item.timer);
        this.pending.delete(id);
        if (error) return item.reject(new Error(error));
        item.resolve(result);
    }
    clear(error = 'Live socket closed.') {
        for (const [id, item] of this.pending.entries()) {
            clearTimeout(item.timer);
            this.pending.delete(id);
            item.reject(new Error(error));
        }
    }
    open(sessionId = '') {
        const next = sessionId || '';
        if (this.socket && this.sessionId === next && this.socket.readyState !== WebSocket.CLOSED && this.socket.readyState !== WebSocket.CLOSING) return;
        if (this.socket) this.socket.close();
        this.sessionId = next;
        this.socket = new WebSocket(readSocketUrl(this.baseUrl));
        this.socket.onmessage = (event) => {
            const message = JSON.parse(`${event.data}`);
            if (message.id && this.pending.has(message.id)) return this.finish(message.id, message.result || {}, message.error || '');
            if (message.type === 'event') this.emit(message.name || 'event', { ...(message.data || {}), name: message.name || 'event' });
            if (message.type === 'pages.active') this.emit('pages.active', message.items || []);
        };
        this.socket.onopen = () => {
            this.socket.send(JSON.stringify({ sessionId: this.sessionId, type: 'subscribe' }));
            this.emit('open', { sessionId: this.sessionId });
        };
        this.socket.onclose = () => {
            this.clear();
            this.emit('close', {});
        };
    }
    command(type, payload = {}, timeoutMs = 45000) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return Promise.reject(new Error('Live socket is not connected.'));
        const id = crypto.randomUUID();
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`Timed out waiting for ${type}.`));
            }, timeoutMs);
            this.pending.set(id, { reject, resolve, timer });
            this.socket.send(JSON.stringify({ id, payload, type }));
        });
    }
    close() {
        if (this.socket) this.socket.close();
        this.socket = null;
        this.clear();
    }
}
