import server from 'puppet';

const { browser, status } = await server.start({ port: 4017 });
if (!browser) throw new Error(`Puppet not ready: ${status}. Reload the installed extension or bind the custom-port extension page.`);
const page = await browser.newPage('http://127.0.0.1:4017/examples/search.html', { waitUntil: 'document' });
page.on('console', (event) => console.log('PAGE LOG:', event.text()));
await page.locator("::-p-aria(Search)").fill('gamma');
await page.waitForSelector("[role='listbox']");
await page.click("[role='option']", { index: 2 });
await page.waitForSelector('#search');
const handle = await page.waitForSelector('#results-title');
const title = await handle.evaluate((node) => node.textContent);
const value = await page.evaluate(() => (document.querySelector('#search') || {}).value || '');
console.log(JSON.stringify({ title, value }, null, 2));
await browser.close();
server.stop();
