const readData = async (page, kind, selector = '', value = '', index = 0, baseSelector = '', baseIndex = 0) => page.evaluate((mode, query, extra, offset, baseQuery, baseOffset) => {
    const readText = (node) => (node.textContent || '').replace(/\s+/g, ' ').trim();
    const readName = (node) => (node.getAttribute('aria-label') || node.getAttribute('title') || node.getAttribute('placeholder') || node.value || '').trim() || readText(node);
    const readNodes = (root) => { const items = []; const walker = document.createTreeWalker(root || document.body || document.documentElement, NodeFilter.SHOW_ELEMENT); for (let node = walker.currentNode; node; node = walker.nextNode()) items.push(node); return items; };
    const readList = (target, root = document) => !target.startsWith('::-p-') || !target.endsWith(')') ? Array.from((root || document).querySelectorAll(target || 'body')) : readNodes(root || document.body || document.documentElement).filter((node) => target.startsWith('::-p-text(') ? readText(node).includes(target.slice(target.indexOf('(') + 1, -1).trim()) : readName(node).includes(target.slice(target.indexOf('(') + 1, -1).trim()));
    const readPath = (node) => {
        const items = [];
        for (let current = node; current && current.nodeType === 1; current = current.parentElement) {
            if (current.id) return `#${CSS.escape(current.id)}${items.length ? ` > ${items.join(' > ')}` : ''}`;
            let part = current.tagName.toLowerCase();
            let count = 1;
            for (let prev = current.previousElementSibling; prev; prev = prev.previousElementSibling) if (prev.tagName === current.tagName) count += 1;
            items.unshift(`${part}:nth-of-type(${count})`);
        }
        return items.join(' > ');
    };
    const base = baseQuery ? readList(baseQuery)[baseOffset || 0] || null : null;
    const items = readList(query, base || document);
    const readContains = () => items.find((item) => readText(item).includes(extra) && !Array.from(item.children || []).find((child) => readText(child).includes(extra))) || items.find((item) => readText(item).includes(extra)) || null;
    const node = mode === 'contains' ? readContains()
        : mode === 'find' ? items[0] || null
            : mode === 'closest' ? ((base || items[offset || 0] || null) && (base || items[offset || 0]).closest(query)) || null
                : items[offset || 0] || null;
    if (mode === 'count') return items.length;
    if (mode === 'exists') return Boolean(node);
    if (!node) return mode.includes('path') || mode === 'contains' || mode === 'find' || mode === 'closest' ? '' : mode === 'checked' ? false : 0;
    if (mode === 'attribute') return node.getAttribute(extra) || '';
    if (mode === 'checked') return Boolean(node.checked);
    if (mode === 'outerHeight') return node.getBoundingClientRect().height || node.offsetHeight || 0;
    if (mode === 'text') return readText(node);
    return readPath(node);
}, kind, selector, value, index, baseSelector, baseIndex);

const readBulkScript = (script, listMode) => `
const selector=args[0]||'';
const baseSelector=args[1]||'';
const baseIndex=args[2]||0;
const extra=args[3]||[];
const mapper=(${script && script.call && script.apply ? script.toString() : script || '() => null'});
const readText=(node)=>(node.textContent||'').replace(/\\s+/g,' ').trim();
const readName=(node)=>(node.getAttribute('aria-label')||node.getAttribute('title')||node.getAttribute('placeholder')||node.value||'').trim()||readText(node);
const readNodes=(root)=>{const items=[];const seed=(root&&root.body)||root||document.body||document.documentElement;const walker=document.createTreeWalker(seed,NodeFilter.SHOW_ELEMENT);for(let node=walker.currentNode;node;node=walker.nextNode())items.push(node);return items;};
const readList=(target,root=document)=>!target.startsWith('::-p-')||!target.endsWith(')')?Array.from((root||document).querySelectorAll(target||'body')):readNodes(root).filter((node)=>target.startsWith('::-p-text(')?readText(node).includes(target.slice(target.indexOf('(')+1,-1).trim()):readName(node).includes(target.slice(target.indexOf('(')+1,-1).trim()));
const root=baseSelector?readList(baseSelector,document)[baseIndex||0]:document;
const nodes=readList(selector,root||document);
if(${listMode ? 'true' : 'false'}) return await mapper(nodes,...extra);
const out=[];
for(let index=0;index<nodes.length;index+=1) out.push(await mapper(nodes[index],index,nodes,...extra));
return out;
`;

const readMatchScript = (script) => `
const selector=args[0]||'';
const baseSelector=args[1]||'';
const baseIndex=args[2]||0;
const extra=args[3]||[];
const predicate=(${script && script.call && script.apply ? script.toString() : script || '() => false'});
const readText=(node)=>(node.textContent||'').replace(/\\s+/g,' ').trim();
const readName=(node)=>(node.getAttribute('aria-label')||node.getAttribute('title')||node.getAttribute('placeholder')||node.value||'').trim()||readText(node);
const readNodes=(root)=>{const items=[];const seed=(root&&root.body)||root||document.body||document.documentElement;const walker=document.createTreeWalker(seed,NodeFilter.SHOW_ELEMENT);for(let node=walker.currentNode;node;node=walker.nextNode())items.push(node);return items;};
const readList=(target,root=document)=>!target.startsWith('::-p-')||!target.endsWith(')')?Array.from((root||document).querySelectorAll(target||'body')):readNodes(root).filter((node)=>target.startsWith('::-p-text(')?readText(node).includes(target.slice(target.indexOf('(')+1,-1).trim()):readName(node).includes(target.slice(target.indexOf('(')+1,-1).trim()));
const readPath=(node)=>{const items=[];for(let current=node;current&&current.nodeType===1;current=current.parentElement){if(current.id)return '#'+CSS.escape(current.id)+(items.length?' > '+items.join(' > '):'');let part=current.tagName.toLowerCase();let count=1;for(let prev=current.previousElementSibling;prev;prev=prev.previousElementSibling)if(prev.tagName===current.tagName)count+=1;items.unshift(part+':nth-of-type('+count+')');}return items.join(' > ');};
const root=baseSelector?readList(baseSelector,document)[baseIndex||0]:document;
const nodes=readList(selector,root||document);
for(let index=0;index<nodes.length;index+=1) if(await predicate(nodes[index],index,nodes,...extra)) return readPath(nodes[index]);
return '';
`;

export const readNodePath = (page, kind, selector = '', value = '', index = 0, baseSelector = '', baseIndex = 0) => readData(page, kind, selector, value, index, baseSelector, baseIndex);

export const readNodeValue = (page, kind, selector = '', value = '', index = 0, baseSelector = '', baseIndex = 0) => readData(page, kind, selector, value, index, baseSelector, baseIndex);

export const readNodeItems = (page, selector = '', script = '', args = [], baseSelector = '', baseIndex = 0, listMode = false) => page.evaluate(readBulkScript(script, listMode), selector, baseSelector, baseIndex, args);

export const readNodeMatch = (page, selector = '', script = '', args = [], baseSelector = '', baseIndex = 0) => page.evaluate(readMatchScript(script), selector, baseSelector, baseIndex, args);
