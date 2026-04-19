const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const trim = (value = '', length = 180) => `${value || ''}`.replace(/\s+/g, ' ').trim().slice(0, length);

const pageProbe = (selectors, keys) => {
    const readStyles = (element) => {
        const styles = window.getComputedStyle(element);
        const out = {};
        for (const key of keys) out[key] = styles[key] || '';
        return out;
    };
    const sample = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return {
            className: (element.getAttribute('class') || '').slice(0, 160),
            rect: { height: Math.round(rect.height), width: Math.round(rect.width), x: Math.round(rect.x), y: Math.round(rect.y) },
            styles: readStyles(element),
            tag: element.tagName.toLowerCase(),
            text: (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90)
        };
    };
    const samples = {};
    for (const name of Object.keys(selectors)) samples[name] = sample(selectors[name]);
    const headings = [];
    for (const item of document.querySelectorAll('h1,h2,h3')) if (headings.length < 10) headings.push((item.textContent || '').replace(/\s+/g, ' ').trim());
    const buttons = [];
    for (const item of document.querySelectorAll('button')) if (buttons.length < 12) buttons.push((item.textContent || item.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim());
    return {
        bodyLength: document.body.innerText.length,
        bodyStart: document.body.innerText.slice(0, 600),
        buttonLabels: buttons,
        counts: {
            buttons: document.querySelectorAll('button').length,
            cards: document.querySelectorAll('[class*="card" i]').length,
            inputs: document.querySelectorAll('input,textarea,select,[role="combobox"]').length,
            panels: document.querySelectorAll('[class*="panel" i]').length,
            rows: document.querySelectorAll('tr').length,
            svgs: document.querySelectorAll('svg').length,
            tables: document.querySelectorAll('table').length
        },
        finalUrl: location.href,
        headings,
        samples,
        title: document.title
    };
};

export const compactText = trim;

export const inspectRoute = async (page, base, route, options) => {
    const failures = [];
    const off = page.on('network.response', (event) => {
        if (Number(event.status || 0) >= 400 && failures.length < 8) failures.push(`${event.method || ''} ${event.url || ''} ${event.status}`);
    });
    const started = Date.now();
    let error = null;
    try {
        await page.goto(`${base}${route}`, { waitUntil: options.waitUntil });
        await page.waitForSelector('body', { timeoutMs: 7000 });
        await wait(options.settleMs);
    } catch (err) {
        error = err && err.message ? err.message : `${err}`;
    }
    const data = await page.evaluate(pageProbe, options.selectors, options.styleKeys).catch((err) => ({ bodyLength: 0, bodyStart: '', buttonLabels: [], counts: {}, error: err && err.message ? err.message : `${err}`, finalUrl: '', headings: [], samples: {}, title: '' }));
    off();
    return { ...data, error: error || data.error || null, failures, ms: Date.now() - started, route, url: `${base}${route}` };
};
