import { requestJson, readBaseUrl } from './http.mjs';
import { LiveSocket } from './live.mjs';
import { NetworkStore } from './network.mjs';
import { Page } from './page.mjs';

const readSessionPages = (items = [], sessionId = '') => {
    const pages = [];
    for (const item of items) if (sessionId && item.sessionId === sessionId) pages.push(item);
    return pages;
};

export class Browser {
    constructor(baseUrl = '') {
        this.baseUrl = readBaseUrl(baseUrl);
        this.live = new LiveSocket(this.baseUrl);
        this.listeners = [];
        this.keepPagesOpen = false;
        this.network = new NetworkStore(this);
        this.instanceId = '';
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
    setInstanceId(instanceId = '') {
        this.instanceId = instanceId;
        return this;
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
        if (!(options.newTab || options.reuse === false) && this.sessionId) {
            const pages = readSessionPages(await this.pages(), this.sessionId);
            const page = pages.find((item) => item.pageUrl === url || item.pageUrl === url.replace(/#.*$/, '')) || pages[0] || null;
            if (page) {
                this.sessionId = page.sessionId || this.sessionId;
                let next = page;
                if (url && url !== 'about:blank') next = new Page(this, await page.goto(url, { ...options, resetViewport: !(options.width && options.height) }));
                if (options.width && options.height) await next.setViewport({ height: options.height, width: options.width });
                return next;
            }
        }
        const data = await requestJson(this.baseUrl, '/api/pages/open', 'POST', {
            pages: [{ height: options.height, role: options.role || `page-${Date.now()}`, url, waitUntil: options.waitUntil || 'load', width: options.width }],
            instanceId: options.instanceId || this.instanceId || '',
            raw: true,
            sessionId: this.sessionId || '',
            snapshot: false
        });
        this.sessionId = data.sessionId || this.sessionId;
        this.openLive();
        return new Page(this, data.pages[0]);
    }
    async pages() {
        this.openLive();
        const instance = this.instanceId ? `&instanceId=${encodeURIComponent(this.instanceId)}` : '';
        const data = await requestJson(this.baseUrl, `/api/pages/browser?raw=1${instance}`);
        const items = [];
        for (const item of data.items || []) items.push(new Page(this, item));
        return items;
    }
    async sessionPages() {
        return this.pages();
    }
    async close(options = {}) {
        if (options.keepPagesOpen || this.keepPagesOpen) {
            this.live.close();
            this.sessionId = '';
            return { keptPagesOpen: true };
        }
        const pages = readSessionPages(await this.pages(), this.sessionId);
        for (const page of pages) {
            try {
                if (page.role !== 'browser') await page.close();
            } catch (error) {
                if (!`${error.message || error}`.includes('No active page matches')) throw error;
            }
        }
        this.live.close();
        this.sessionId = '';
        return { keptPagesOpen: false };
    }
}

export const browser = new Browser();
