import { runAction } from './action.mjs';

const limit = 80;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const readAlias = (value = '') => `${value || ''}`.replace(/^@/, '').trim();
const readKey = (pageId = '', type = '') => `${pageId}:${type}`;
const readParts = (value = '') => `${value || ''}`.split('*').filter(Boolean);
const readRule = (value = '') => value && (value.method || value.urlPattern || value.operationName || value.status || value.resourceType) ? value : { operationName: readAlias(value) };
const matchUrl = (pattern = '', url = '') => {
    if (!pattern || pattern === '*') return true;
    let offset = 0;
    for (const part of readParts(pattern)) {
        const index = `${url || ''}`.indexOf(part, offset);
        if (index < 0) return false;
        offset = index + part.length;
    }
    return true;
};
const matchEvent = (match = '', event = {}) => {
    const rule = readRule(match);
    if (rule.method && rule.method !== event.method) return false;
    if (rule.operationName && rule.operationName !== event.operationName && !`${event.url || ''}`.includes(rule.operationName)) return false;
    if (rule.resourceType && rule.resourceType !== event.resourceType) return false;
    if (rule.status && Number(rule.status) !== Number(event.status || 0)) return false;
    return matchUrl(rule.urlPattern || '*', event.url || '');
};

export class NetworkStore {
    constructor(browser) {
        this.aliases = [];
        this.browser = browser;
        this.events = new Map();
        browser.listen('network.request', '', (event) => this.push('request', event), false);
        browser.listen('network.response', '', (event) => this.push('response', event), false);
    }
    push(type, event = {}) {
        const key = readKey(event.pageId || '', type);
        const items = this.events.get(key) || [];
        items.unshift(event);
        if (items.length > limit) items.length = limit;
        this.events.set(key, items);
    }
    addAlias(pageId, name, match) {
        const alias = readAlias(name);
        if (!alias) return '';
        this.aliases = this.aliases.filter((item) => item.pageId !== pageId || item.alias !== alias);
        this.aliases.push({ alias, match, pageId });
        return alias;
    }
    readMatch(pageId, match = '') {
        const alias = !(match && (match.method || match.urlPattern || match.operationName || match.status || match.resourceType)) && readAlias(match) || '';
        if (!alias) return match;
        for (const item of this.aliases) if (item.pageId === pageId && item.alias === alias) return item.match;
        return { operationName: alias };
    }
    async wait(type, pageId, match = '', options = {}) {
        this.browser.openLive();
        const rule = this.readMatch(pageId, match);
        const items = this.events.get(readKey(pageId, type)) || [];
        for (const item of items) if (matchEvent(rule, item)) return item;
        const endsAt = Date.now() + Number(options.timeoutMs || 45000);
        while (Date.now() < endsAt) {
            await wait(150);
            const next = this.events.get(readKey(pageId, type)) || [];
            for (const item of next) if (matchEvent(rule, item)) return item;
        }
        throw new Error(`Timed out waiting for ${type}.`);
    }
    intercept(page, match = {}, options = {}) {
        const rule = readRule(match);
        const alias = this.addAlias(page.pageId, options.alias || '', rule);
        if (!(options.mode || options.status || options.headers || options.body || options.bodyBase64)) return Promise.resolve({ alias, pageId: page.pageId });
        return runAction(page, {
            bodyBase64: options.bodyBase64 || options.body ? Buffer.from(options.body && options.body.trim ? `${options.body}` : JSON.stringify(options.body || '')).toString('base64') : '',
            headers: options.headers || {},
            match: rule,
            mode: options.mode || 'observe',
            ruleId: alias || options.ruleId || crypto.randomUUID(),
            status: options.status || 200,
            type: 'intercept_request'
        });
    }
}
