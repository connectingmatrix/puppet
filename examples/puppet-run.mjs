const state = await server.start({ port: 4017 });
if (!state.browser) throw new Error('Puppet not ready: ' + state.status);
const page = await state.browser.newPage('http://127.0.0.1:4017/examples/search.html', { waitUntil: 'load' });
await page.locator('::-p-aria(Search)').fill('gamma');
await page.waitForSelector("[role='listbox']");
await page.click("[role='option']", { index: 1 });
await page.waitForSelector('#search');
return await page.evaluate(() => ({
    options: document.querySelectorAll('[role="option"]').length,
    title: (document.querySelector('#results-title') || {}).textContent || '',
    value: (document.querySelector('#search') || {}).value || ''
}));
