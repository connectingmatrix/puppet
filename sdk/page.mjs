import { requestJson } from './http.mjs';
import { Locator } from './locator.mjs';
import { ElementHandle } from './handle.mjs';
import { runAction, runActions } from './action.mjs';
import { ConsoleMessage, RequestHandle } from './event.mjs';
import { saveBase64 } from './file.mjs';
import { readNodeItems, readNodeMatch, readNodePath, readNodeValue } from './query.mjs';
import { runPageGraphql, readPageRequestClient, LocalStorageStore } from './request.mjs';

class Keyboard { constructor(page) { this.page = page; } press(key, options = {}) { return runAction(this.page, { ...options, key, type: 'send_key' }); } }
const readEvent = (page, name, event) => name === 'console' ? new ConsoleMessage(event) : name === 'request' ? new RequestHandle(page, event) : event;
const functionPrelude = 'const __name=(fn)=>fn;';
const readScript = (script) => script && script.call && script.apply ? `${functionPrelude}return (${script.toString()})(...(args||[]));` : `${script || ''}`;

export class Page {
    constructor(browser, item, frameId = 0) {
        this.baseUrl = browser.baseUrl; this.browser = browser; this.frameId = frameId; this.iframe = new Proxy((value) => this.frame(value), { get: (_target, key) => this.frame(Number(key) || 0) }); this.keyboard = new Keyboard(this); this.localStorage = new LocalStorageStore(this); this.request = readPageRequestClient(this);
        this.active = Boolean(item.active); this.pageId = item.pageId; this.pageName = item.pageName || item.title || ''; this.pageStats = item.pageStats || { cpu: 0, heapUsage: 0, ram: 0 }; this.pageUrl = item.pageUrl || item.url || ''; this.role = item.role || ''; this.sessionId = item.sessionId || browser.sessionId; this.tabId = item.tabId || 0;
    }
    run(actions) { return runActions(this, actions); }
    on(name, handler) { return this.browser.listen(name, this.pageId, (event) => handler(readEvent(this, name, event))); }
    locator(selector, index = 0) { return new Locator(this, selector, index); }
    async querySelector(selector, options = {}) { const index = options.index || 0; return await readNodeValue(this, 'exists', selector, '', index) ? new ElementHandle(this.locator(selector, index)) : null; }
    async querySelectorAll(selector, options = {}) { const count = await readNodeValue(this, 'count', selector, '', 0); const items = []; for (let index = options.start || 0; index < count; index += 1) { const path = await readNodePath(this, 'path', selector, '', index); if (path) items.push(new ElementHandle(this.locator(path))); } return items; }
    $$eval(selector, script, ...args) { return readNodeItems(this, selector, script, args, '', 0, true); }
    async find(selector, script, ...args) { const path = await readNodeMatch(this, selector, script, args); return path ? new ElementHandle(this.locator(path)) : null; }
    async contains(selector, text, options = {}) {
        const value = arguments.length < 2 ? selector : text;
        const query = arguments.length < 2 ? '' : selector;
        const path = await readNodePath(this, 'contains', query || '*', value || '', options.index || 0);
        if (!path) throw new Error(`No element contains ${value || ''}.`);
        return this.locator(path).waitHandle({ visible: false });
    }
    waitForSelector(selector, options = {}) { return this.locator(selector, options.index || 0).waitHandle(options); }
    waitForRequest(match, options = {}) { return this.browser.network.wait('request', this.pageId, match, options); }
    waitForResponse(match, options = {}) { return this.browser.network.wait('response', this.pageId, match, options); }
    waitForGraphql(match, options = {}) { return this.waitForResponse(match, options); }
    intercept(match = {}, options = {}) { return this.browser.network.intercept(this, match, options); }
    goto(url, options = {}) { return runAction(this, { ...options, type: 'navigate_to_url', url }); }
    async back(options = {}) { const state = await this.evaluate(() => { history.back(); return { href: location.href }; }); if (options.waitForSelector) await this.waitForSelector(options.waitForSelector, options); return state; }
    reload(options = {}) { return runAction(this, { ...options, type: 'reload_page' }); }
    setViewport(size) { return runAction(this, { height: size.height, type: 'change_screen_size', width: size.width }); }
    setRequestInterception(enabled) { return runAction(this, { enabled, type: 'set_request_interception' }); }
    click(selector, options = {}) { return this.locator(selector, options.index || 0).click(options); }
    dblclick(selector, options = {}) { return this.locator(selector, options.index || 0).dblclick(options); }
    hover(selector, options = {}) { return this.locator(selector, options.index || 0).hover(options); }
    type(selector, value, options = {}) { return runAction(this, { ...options, clearFirst: options.clearFirst || false, selector, type: 'type_text', value }); }
    select(selector, value, options = {}) { return runAction(this, { ...options, selector, type: 'select_option', value }); }
    dragAndDrop(sourceSelector, targetSelector, options = {}) { return runAction(this, { ...options, sourceSelector, targetSelector, type: 'drag_drop' }); }
    scroll(options = {}) { return runAction(this, { ...options, type: 'scroll' }); }
    MouseScroll(x = 0, y = 0, options = {}) { return runAction(this, { ...options, deltaX: options.deltaX || 0, deltaY: options.deltaY || options.deltaY === 0 ? options.deltaY : 900, type: 'scroll', x, y }); }
    submit(selector, options = {}) { return runAction(this, { ...options, selector, type: 'submit' }); }
    evaluate(script, ...args) { return runAction(this, { args, script: readScript(script), type: 'execute_script' }); }
    graphql(query, options = {}) { return runPageGraphql(this, query, options); }
    url() { return this.evaluate(() => location.href); }
    location(part = '') { return part ? this.evaluate((name) => location[name] || '', part) : this.evaluate(() => ({ hash: location.hash, host: location.host, hostname: location.hostname, href: location.href, origin: location.origin, pathname: location.pathname, port: location.port, protocol: location.protocol, search: location.search })); }
    html(selector = '', options = {}) { return requestJson(this.baseUrl, '/api/pages/html', 'POST', { frameId: this.frameId, index: options.index || 0, pageId: this.pageId, raw: options.compact ? false : true, selector }); }
    data(selector, options = {}) { return requestJson(this.baseUrl, '/api/pages/data', 'POST', { pageId: this.pageId, path: options.path || 'root', raw: options.compact ? false : true, selector, snapshot: false }); }
    async screenshot(options = {}) { const data = await requestJson(this.baseUrl, '/api/pages/screenshot', 'POST', { ...options, current: Boolean(options.current) || options.fullPage === false, pageId: this.pageId, raw: true, selector: options.selector || '' }); await saveBase64(options.path || '', data.dataBase64 || ''); if (options.path && !options.raw) delete data.dataBase64; return data; }
    compare(page, options = {}) { return requestJson(this.baseUrl, '/api/pages/diff', 'POST', { leftPageId: this.pageId, path: options.path || 'root', raw: options.compact ? false : true, rightPageId: page.pageId, selector: options.selector || 'body', snapshot: false }); }
    compareSelector(selector, page, options = {}) { return requestJson(this.baseUrl, '/api/pages/diff', 'POST', { leftPageId: this.pageId, leftSelector: selector, path: options.path || 'root', raw: options.compact ? false : true, rightPageId: page.pageId, rightSelector: page.selector || selector, selector, snapshot: false }); }
    selectorTree(selector) { return { pageId: this.pageId, selector }; }
    async frames() { const data = await requestJson(this.baseUrl, '/api/pages/frames', 'POST', { pageId: this.pageId, raw: true }); return data.items || []; }
    frame(frameId) { return new Page(this.browser, this, Number(frameId) || 0); }
    iframes() { return this.frames(); }
    release() { return requestJson(this.baseUrl, '/api/pages/release', 'POST', { pageId: this.pageId }); }
    close() { return requestJson(this.baseUrl, '/api/pages/close', 'POST', { pageId: this.pageId }); }
}
