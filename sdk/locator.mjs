import { runAction } from './action.mjs';
import { ElementHandle } from './handle.mjs';
import { readNodeItems, readNodeMatch, readNodePath, readNodeValue } from './query.mjs';

export class Locator {
    constructor(page, selector, index = 0) {
        this.index = index;
        this.page = page;
        this.selector = selector;
    }
    click(options = {}) { return runAction(this.page, { ...options, index: options.index || this.index || 0, selector: this.selector, type: 'click' }); }
    dblclick(options = {}) { return runAction(this.page, { ...options, clickCount: 2, index: options.index || this.index || 0, selector: this.selector, type: 'click' }); }
    hover(options = {}) { return runAction(this.page, { ...options, index: options.index || this.index || 0, selector: this.selector, type: 'hover' }); }
    fill(value, options = {}) { return runAction(this.page, { ...options, clearFirst: options.clearFirst || options.clearFirst === false ? options.clearFirst : true, index: options.index || this.index || 0, selector: this.selector, type: 'type_text', value }); }
    press(key, options = {}) { return runAction(this.page, { ...options, index: options.index || this.index || 0, key, selector: this.selector, type: 'send_key' }); }
    wait(options = {}) { return runAction(this.page, { ...options, index: options.index || this.index || 0, selector: this.selector, type: 'wait_for_selector', visible: options.visible || options.visible === false ? options.visible : true }); }
    async waitHandle(options = {}) { await this.wait(options); return new ElementHandle(this); }
    async all(options = {}) { const count = await this.count(); const items = []; for (let index = options.start || 0; index < count; index += 1) items.push(new ElementHandle({ index, page: this.page, selector: this.selector })); return items; }
    map(script, ...args) { return readNodeItems(this.page, this.selector, script, args); }
    async querySelector(selector, options = {}) { const path = await readNodePath(this.page, 'path', selector, '', options.index || 0, this.selector, this.index || 0); return path ? new ElementHandle({ index: 0, page: this.page, selector: path }) : null; }
    async querySelectorAll(selector, options = {}) { const count = await readNodeValue(this.page, 'count', selector, '', 0, this.selector, this.index || 0); const items = []; for (let index = options.start || 0; index < count; index += 1) { const path = await readNodePath(this.page, 'path', selector, '', index, this.selector, this.index || 0); if (path) items.push(new ElementHandle({ index: 0, page: this.page, selector: path })); } return items; }
    $$eval(selector, script, ...args) { return readNodeItems(this.page, selector, script, args, this.selector, this.index || 0, true); }
    async find(selector, script, ...args) {
        if (!script) { const path = await readNodePath(this.page, 'find', selector, '', 0, this.selector, this.index || 0); if (!path) throw new Error(`No element matches ${selector}.`); return new ElementHandle({ index: 0, page: this.page, selector: path }); }
        const path = await readNodeMatch(this.page, selector, script, args, this.selector, this.index || 0);
        return path ? new ElementHandle({ index: 0, page: this.page, selector: path }) : null;
    }
    async closest(selector) { const path = await readNodePath(this.page, 'closest', selector, '', 0, this.selector, this.index || 0); if (!path) throw new Error(`No ancestor matches ${selector}.`); return new ElementHandle({ index: 0, page: this.page, selector: path }); }
    scrollBy(move = {}) { return new ElementHandle(this).evaluate((node, value) => { node.scrollLeft += value.x || 0; node.scrollTop += value.y || 0; return { scrollHeight: node.scrollHeight, scrollLeft: node.scrollLeft, scrollTop: node.scrollTop, scrollWidth: node.scrollWidth }; }, move); }
    scrollToChild(selector, options = {}) {
        return new ElementHandle(this).evaluate((root, query, opts) => {
            const readText = (node) => (node.textContent || '').replace(/\s+/g, ' ').trim();
            const readName = (node) => (node.getAttribute('aria-label') || node.getAttribute('title') || node.getAttribute('placeholder') || node.value || '').trim() || readText(node);
            const readNodes = () => { const items = []; const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT); for (let node = walker.currentNode; node; node = walker.nextNode()) items.push(node); return items; };
            const readList = () => !query.startsWith('::-p-') || !query.endsWith(')') ? Array.from(root.querySelectorAll(query || 'body')) : readNodes().filter((node) => query.startsWith('::-p-text(') ? readText(node).includes(query.slice(query.indexOf('(') + 1, -1).trim()) : readName(node).includes(query.slice(query.indexOf('(') + 1, -1).trim()));
            const visible = (node) => { const rect = node.getBoundingClientRect(); const box = root.getBoundingClientRect(); const style = getComputedStyle(node); return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && rect.top >= box.top && rect.bottom <= box.bottom; };
            for (let attempt = 0; attempt < (opts.maxScrolls || 25); attempt += 1) {
                const child = readList()[opts.index || 0] || null;
                if (child && visible(child)) return { found: true, scrollTop: root.scrollTop, visible: true };
                if (child) { const rect = child.getBoundingClientRect(); const box = root.getBoundingClientRect(); root.scrollTop += rect.top - box.top - Math.floor(box.height / 2); }
                else root.scrollTop += Math.floor(root.clientHeight * (opts.stepRatio || 0.85));
                if (!child && root.scrollTop + root.clientHeight >= root.scrollHeight) return { found: false, scrollTop: root.scrollTop, visible: false };
            }
            return { found: Boolean(readList()[opts.index || 0]), scrollTop: root.scrollTop, visible: false };
        }, selector, options);
    }
    async clickChild(selector, options = {}) { const state = await this.scrollToChild(selector, options); if (state.visible) { const child = await this.querySelector(selector, options); await child.click({ ...options, index: 0 }); return { ...state, clicked: true }; } return { ...state, clicked: false }; }
    count() { return readNodeValue(this.page, 'count', this.selector, '', this.index || 0); }
    async exists() { return Boolean(await readNodeValue(this.page, 'exists', this.selector, '', this.index || 0)); }
    text() { return readNodeValue(this.page, 'text', this.selector, '', this.index || 0); }
    attribute(name) { return readNodeValue(this.page, 'attribute', this.selector, name || '', this.index || 0); }
    outerHeight() { return readNodeValue(this.page, 'outerHeight', this.selector, '', this.index || 0); }
    async checked() { return Boolean(await readNodeValue(this.page, 'checked', this.selector, '', this.index || 0)); }
    html(options = {}) { return this.page.html(this.selector, { ...options, index: options.index || this.index || 0 }); }
    data(options = {}) { return this.page.data(this.selector, options); }
    screenshot(options = {}) { return this.page.screenshot({ ...options, index: options.index || this.index || 0, selector: this.selector }); }
    uploadFile(files, options = {}) { return runAction(this.page, { ...options, files, index: options.index || this.index || 0, selector: this.selector, type: 'upload_files' }); }
}
