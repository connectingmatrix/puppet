import { readNodePath } from './query.mjs';

const readScript = (script) => script && script.call && script.apply ? `const selector=args[0]||'';const index=args[1]||0;const extra=args.slice(2);const readText=node=>(node.textContent||'').replace(/\\s+/g,' ').trim();const readName=node=>((node.getAttribute('aria-label')||node.getAttribute('title')||node.getAttribute('placeholder')||node.value||'').trim())||readText(node);const readNodes=()=>{const items=[];const walker=document.createTreeWalker(document.body||document.documentElement,NodeFilter.SHOW_ELEMENT);for(let node=walker.currentNode;node;node=walker.nextNode())items.push(node);return items;};const readList=()=>!selector.startsWith('::-p-')||!selector.endsWith(')')?Array.from(document.querySelectorAll(selector||'body')):readNodes().filter(node=>selector.startsWith('::-p-text(')?readText(node).includes(selector.slice(selector.indexOf('(')+1,-1).trim()):readName(node).includes(selector.slice(selector.indexOf('(')+1,-1).trim()));const node=readList()[index||0];if(!node)throw new Error(\`No element matches \${selector}\`);return (${script.toString()})(node,...extra);` : `${script || ''}`;

export class ElementHandle {
    constructor(locator) {
        this.locator = locator;
        this.page = locator.page;
    }
    click(options = {}) { return this.locator.click(options); }
    dblclick(options = {}) { return this.locator.dblclick(options); }
    hover(options = {}) { return this.locator.hover(options); }
    fill(value, options = {}) { return this.locator.fill(value, options); }
    press(key, options = {}) { return this.locator.press(key, options); }
    evaluate(script, ...args) { return this.page.evaluate(readScript(script), this.locator.selector, this.locator.index || 0, ...args); }
    querySelector(selector, options = {}) { return this.locator.querySelector(selector, options); }
    querySelectorAll(selector, options = {}) { return this.locator.querySelectorAll(selector, options); }
    $$eval(selector, script, ...args) { return this.locator.$$eval(selector, script, ...args); }
    find(selector, script, ...args) { return this.locator.find(selector, script, ...args); }
    async closest(selector) { const path = await readNodePath(this.page, 'closest', selector, '', 0, this.locator.selector, this.locator.index || 0); if (!path) throw new Error(`No ancestor matches ${selector}.`); return this.page.locator(path).waitHandle({ visible: false }); }
    text() { return this.evaluate((node) => (node.textContent || '').replace(/\s+/g, ' ').trim()); }
    attribute(name) { return this.evaluate((node, value) => node.getAttribute(value) || '', name); }
    outerHeight() { return this.evaluate((node) => node.getBoundingClientRect().height || node.offsetHeight || 0); }
    checked() { return this.evaluate((node) => Boolean(node.checked)); }
    html(options = {}) { return this.locator.html(options); }
    data(options = {}) { return this.locator.data(options); }
    screenshot(options = {}) { return this.locator.screenshot(options); }
    uploadFile(files, options = {}) { return this.locator.uploadFile(files, options); }
}
