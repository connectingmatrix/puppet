import server from '../sdk/index.mjs';

const { browser, status } = await server.start({ port: 4017 });
if (!browser) throw new Error(`CTM Puppet not ready: ${status}. Please open the CTM Puppet Extension in new tab.`);
const page = await browser.newPage('https://www.google.com/', { waitUntil: 'load' });
await page.waitForSelector("textarea[name='q']", { timeoutMs: 30000 });
await page.locator("textarea[name='q']").fill('ctm puppet chrome extension');
await page.waitForSelector("[role='listbox']", { timeoutMs: 30000 });
const count = await page.locator("[role='option']").count();
await page.click("[role='option']", { index: Math.max(0, Math.min((count || 1) - 1, Math.floor(Math.random() * Math.max(count || 1, 1)))), waitUntil: 'networkidle2' });
await page.waitForSelector('#search, #center_col, a h3', { timeoutMs: 30000 });
const state = { href: await page.url(), title: await page.evaluate(() => document.title) };
await page.scroll({ deltaY: 900 });
const shot = await page.screenshot({ path: '/Users/abeer/dev/chrome_extension_utils/artifacts/google-suite.png' });
console.log(JSON.stringify({ ok: true, pageId: page.pageId, screenshotBytes: (shot.dataBase64 || '').length, state }, null, 2));
await browser.close();
server.stop();
