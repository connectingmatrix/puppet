import { requestJson } from './http.mjs';

export const runPageRequest = (page, options = {}) => requestJson(page.baseUrl, '/api/pages/request', 'POST', { ...options, pageId: page.pageId, raw: true });

export const readPageRequestClient = (page) => {
    const request = (options = {}) => runPageRequest(page, options);
    request.fetch = (url, options = {}) => runPageRequest(page, { ...options, url: url || options.url || '' });
    request.on = (handler) => page.on('network.request', handler);
    return request;
};

export const runPageGraphql = async (page, query, options = {}) => {
    const data = await runPageRequest(page, { auth: options.auth || 'auto-from-current-session', body: { query, variables: options.variables || {} }, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, method: 'POST', url: options.url || '/api/v2/graphql' });
    const errors = data.json && data.json.errors || [];
    if (errors.length) throw new Error(errors.map((item) => item.message || `${item}`).join(' | ') || 'GraphQL request failed.');
    return data.json || {};
};

export class LocalStorageStore {
    constructor(page) {
        this.page = page;
    }
    get(key) {
        return this.page.evaluate((name) => localStorage.getItem(name) || '', key);
    }
    set(key, value) {
        return this.page.evaluate((name, next) => (localStorage.setItem(name, next), true), key, value);
    }
    remove(key) {
        return this.page.evaluate((name) => (localStorage.removeItem(name), true), key);
    }
    all() {
        return this.page.evaluate(() => {
            const items = {};
            for (let index = 0; index < localStorage.length; index += 1) items[localStorage.key(index) || ''] = localStorage.getItem(localStorage.key(index) || '') || '';
            return items;
        });
    }
}
