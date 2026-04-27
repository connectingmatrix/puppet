import assert from 'node:assert/strict';
import server from '../sdk/index.mjs';

const queries = ['puppet parallel alpha', 'puppet parallel beta', 'puppet parallel gamma', 'puppet parallel delta', 'puppet parallel epsilon', 'puppet parallel zeta', 'puppet parallel eta', 'puppet parallel theta', 'puppet parallel iota', 'puppet parallel kappa'];
const targets = ['https://example.com/', 'https://www.iana.org/domains/reserved', 'https://www.wikipedia.org/', 'https://developer.mozilla.org/en-US/', 'https://www.python.org/', 'https://nodejs.org/en', 'https://www.gnu.org/', 'https://www.w3.org/', 'https://www.rfc-editor.org/', 'https://www.ecma-international.org/'];
const readTarget = (index) => targets[(index * 3 + 2) % targets.length];
const readHost = (value) => new URL(value).host.replace(/^www\./, '');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitForSearch = async (page, query) => {
    const target = encodeURIComponent(query).replace(/%20/g, '+');
    const endsAt = Date.now() + 45000;
    while (Date.now() < endsAt) {
        const url = await page.url();
        const title = await page.evaluate(() => document.title);
        if (url.includes('/search?') && url.includes(target) || title.toLowerCase().includes(query.split(' ')[2] || '')) return { title, url };
        await sleep(500);
    }
    throw new Error(`Search did not complete for "${query}".`);
};

const state = await server.start({ port: 4017 });
if (!state.browser) throw new Error(`Puppet not ready: ${state.status}. Reload the installed extension or bind the custom-port extension page.`);

try {
    const opening = [];
    for (let index = 0; index < queries.length; index += 1) opening.push(state.browser.newPage('https://www.google.com/', { height: 900, newTab: true, waitUntil: 'load', width: 1440 + index }));
    const pages = await Promise.all(opening);
    const pageIds = new Set();
    const tabIds = new Set();
    for (const page of pages) {
        pageIds.add(page.pageId);
        tabIds.add(page.tabId);
    }
    assert.equal(pageIds.size, pages.length);
    assert.equal(tabIds.size, pages.length);

    const searchWork = [];
    for (let index = 0; index < pages.length; index += 1) {
        const page = pages[index];
        searchWork.push((async () => {
            await page.waitForSelector("textarea[name='q']", { timeoutMs: 30000, visible: true });
            await page.goto(`https://www.google.com/search?q=${encodeURIComponent(queries[index])}`, { waitUntil: 'load' });
            const state = await waitForSearch(page, queries[index]);
            return { pageId: page.pageId, query: queries[index], tabId: page.tabId, title: state.title, url: state.url };
        })());
    }
    const searched = await Promise.all(searchWork);

    const navigationWork = [];
    for (let index = 0; index < pages.length; index += 1) {
        const page = pages[index];
        navigationWork.push((async () => {
            const expected = readTarget(index);
            await page.goto(expected, { waitUntil: 'load' });
            const finalUrl = await page.url();
            assert.equal(readHost(finalUrl), readHost(expected));
            return { expected, finalUrl, pageId: page.pageId, query: queries[index], tabId: page.tabId, title: await page.evaluate(() => document.title) };
        })());
    }
    const results = await Promise.all(navigationWork);

    console.log(JSON.stringify({ ok: true, results, searched }, null, 2));
} finally {
    await state.browser.close();
    server.stop();
}
