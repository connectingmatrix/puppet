import { requestJson, readBaseUrl } from './http.mjs';
import { LiveSocket } from './live.mjs';
import { NetworkStore } from './network.mjs';
import { Page } from './page.mjs';

export class Browser {
    constructor(baseUrl = '') {
        this.baseUrl = readBaseUrl(baseUrl);
        this.live = new LiveSocket(this.baseUrl);
        this.listeners = [];
        this.network = new NetworkStore(this);
        this.sessionId = '';
        this.live.listen('', (event) => {
            for (const item of this.listeners) if ((!item.name || item.name === event.type || item.name === event.name) && (!item.pageId || item.pageId === event.pageId)) item.handler(event);
        });
    }
    setBaseUrl(baseUrl = '') {
        const next = readBaseUrl(baseUrl);
        if (this.baseUrl !== next) {
            this.live.close();
            this.sessionId = '';
        }
        this.baseUrl = next;
        this.live.baseUrl = this.baseUrl;
    }
    openLive() {
        this.live.open('');
    }
    listen(name, pageId, handler, open = true) {
        if (open) this.openLive();
        this.listeners.push({ handler, name, pageId });
        return () => { this.listeners = this.listeners.filter((item) => item.handler !== handler || item.name !== name || item.pageId !== pageId); };
    }
    async newPage(url = 'about:blank', options = {}) {
        if (!(options.newTab || options.reuse === false)) {
            const pages = await this.sessionPages();
            const page = pages[0] || null;
            if (page) {
                this.sessionId = page.sessionId || this.sessionId;
                let next = page;
                if (url && url !== 'about:blank') next = new Page(this, await page.goto(url, options));
                if (options.width && options.height) await next.setViewport({ height: options.height, width: options.width });
                return next;
            }
        }
        const data = await requestJson(this.baseUrl, '/api/pages/open', 'POST', {
            pages: [{ height: options.height, role: options.role || `page-${Date.now()}`, url, waitUntil: options.waitUntil || 'load', width: options.width }],
            sessionId: this.sessionId || '',
            snapshot: false
        });
        this.sessionId = data.sessionId || this.sessionId;
        this.openLive();
        return new Page(this, data.pages[0]);
    }
    async pages() {
        this.openLive();
        const data = await requestJson(this.baseUrl, '/api/pages/browser');
        const items = [];
        for (const item of data.items || []) items.push(new Page(this, item));
        return items;
    }
    async sessionPages() {
        this.openLive();
        const data = await requestJson(this.baseUrl, `/api/pages/active?sessionId=${encodeURIComponent(this.sessionId || '')}`);
        const items = [];
        for (const item of data.items || []) items.push(new Page(this, item));
        return items;
    }
    async close() {
        const pages = await this.sessionPages();
        for (const page of pages) await page.close();
        this.live.close();
        this.sessionId = '';
    }
}

export const browser = new Browser();
