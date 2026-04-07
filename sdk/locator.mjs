import { runAction } from './action.mjs';
import { ElementHandle } from './handle.mjs';
import { readNodePath, readNodeValue } from './query.mjs';

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
    async find(selector) { const path = await readNodePath(this.page, 'find', selector, '', 0, this.selector, this.index || 0); if (!path) throw new Error(`No element matches ${selector}.`); return new ElementHandle({ index: 0, page: this.page, selector: path }); }
    async closest(selector) { const path = await readNodePath(this.page, 'closest', selector, '', 0, this.selector, this.index || 0); if (!path) throw new Error(`No ancestor matches ${selector}.`); return new ElementHandle({ index: 0, page: this.page, selector: path }); }
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
