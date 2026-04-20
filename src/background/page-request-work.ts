import { runFrameScript } from '@/src/background/page-script-work';
import { readPageState } from '@/src/background/page-session-work';

const readBody = (body: unknown) => !body && body !== '' ? undefined : body && (body as any).trim ? `${body}` : JSON.stringify(body);
const readAuth = (auth: any) => auth || 'auto-from-current-session';
const readStorageAuth = () => ({
    accessToken: `${localStorage.getItem('giga_access_token') || ''}`.trim(),
    refreshToken: `${localStorage.getItem('giga_refresh_token') || ''}`.trim()
});
const readHeaders = (headers: Headers) => {
    const out: Record<string, string> = {};
    headers.forEach((value, key) => { out[key] = value; });
    return out;
};
const readAuthHeader = async (tabId: number, auth: any) => {
    if (readAuth(auth) === 'none') return '';
    if (readAuth(auth) === 'auto-from-current-session') {
        const tokens = await runFrameScript(tabId, 0, readStorageAuth);
        if (tokens.accessToken && tokens.refreshToken) return `Bearer access_token=${tokens.accessToken};refresh_token=${tokens.refreshToken}`;
        return tokens.accessToken ? `Bearer ${tokens.accessToken}` : '';
    }
    if (auth && auth.accessToken) return auth.refreshToken ? `Bearer access_token=${auth.accessToken};refresh_token=${auth.refreshToken || ''}` : `Bearer ${auth.accessToken}`;
    return `${auth || ''}`.trim();
};

export const fetchPageRequest = async (payload: any) => {
    const page = readPageState(`${payload.pageId || ''}`);
    const headers = { ...(payload.headers || {}) };
    const body = readBody(payload.body);
    const auth = await readAuthHeader(page.tabId || 0, payload.auth);
    if (!(headers.Authorization || headers.authorization) && auth) headers.Authorization = auth;
    if (!(headers['Content-Type'] || headers['content-type']) && payload.body && !(payload.body as any).trim) headers['Content-Type'] = 'application/json';
    const response = await fetch(new URL(payload.url || page.url, page.url).toString(), {
        body,
        credentials: payload.credentials || 'include',
        headers,
        method: payload.method || (body ? 'POST' : 'GET')
    });
    const text = await response.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch {}
    return { body: json || text, headers: readHeaders(response.headers), json, status: response.status, url: response.url };
};
