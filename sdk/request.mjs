export const runPageRequest = (page, options = {}) => page.evaluate(async (payload) => {
    const headers = { ...(payload.headers || {}) };
    const auth = payload.auth || 'auto-from-current-session';
    const accessToken = auth === 'auto-from-current-session' ? `${localStorage.getItem('giga_access_token') || ''}`.trim() : `${auth && auth.accessToken || ''}`.trim();
    const refreshToken = auth === 'auto-from-current-session' ? `${localStorage.getItem('giga_refresh_token') || ''}`.trim() : `${auth && auth.refreshToken || ''}`.trim();
    const value = `${auth || ''}`.trim();
    if (!(headers.Authorization || headers.authorization) && auth !== 'none') headers.Authorization = accessToken ? refreshToken ? `Bearer access_token=${accessToken};refresh_token=${refreshToken}` : `Bearer ${accessToken}` : value && value !== 'auto-from-current-session' ? value : '';
    if (!(headers['Content-Type'] || headers['content-type']) && payload.body && !(payload.body && payload.body.trim)) headers['Content-Type'] = 'application/json';
    const body = !payload.body && payload.body !== '' ? undefined : payload.body && payload.body.trim ? `${payload.body}` : JSON.stringify(payload.body);
    const response = await fetch(new URL(payload.url || location.href, location.href).toString(), { body, headers, method: payload.method || (body ? 'POST' : 'GET') });
    const text = await response.text();
    const data = { headers: {}, json: null, status: response.status, url: response.url };
    response.headers.forEach((next, key) => { data.headers[key] = next; });
    try { data.json = text ? JSON.parse(text) : null; } catch {}
    return { ...data, body: data.json || text };
}, options);

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
