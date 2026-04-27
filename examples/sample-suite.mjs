import assert from 'node:assert/strict';
import server from '../sdk/index.mjs';

const port = process.env.PUPPET_TEST_PORT || '4017';
const local = (path) => `http://127.0.0.1:${port}/examples/${path}`;
const text = async (page, selector) => await page.locator(selector).text();

const state = await server.start({ port });
const { browser, status } = state;
if (!browser) throw new Error(`Puppet not ready: ${status}. Reload the installed extension or bind the custom-port extension page.`);
if (process.env.PUPPET_TEST_INSTANCE_ID) browser.setInstanceId(process.env.PUPPET_TEST_INSTANCE_ID);

try {
  const click = await browser.newPage(local('click.html'), { waitUntil: 'load' });
  const seen = [];
  click.on('console', (event) => seen.push(event.text()));
  assert.equal(await text(click, '#out'), 'idle');
  await click.evaluate(() => console.log('sample-console'));
  assert.equal((await click.waitForConsole('sample-console')).text(), 'sample-console');
  assert.ok((await click.consoleMessages()).find((item) => item.text() === 'sample-console'));
  assert.ok(seen.includes('sample-console'));
  await click.click('#page-click');
  assert.equal(await text(click, '#out'), 'page-clicked');
  await click.locator('#locator-click').click();
  assert.equal(await text(click, '#out'), 'locator-clicked');
  assert.equal(await click.locator('button').count(), 3);
  assert.equal(await click.locator('#page-click').attribute('id'), 'page-click');
  assert.ok((await click.locator('#page-click').box()).width > 0);
  assert.ok(await click.locator('#page-click').inViewport());
  await click.scroll({ deltaY: 1200 });
  await click.click('#scroll-target');
  assert.equal(await text(click, '#out'), 'scroll-clicked');
  assert.ok((await click.html('#out')).html.includes('scroll-clicked'));
  assert.ok((await click.data('#out')).html.includes('scroll-clicked'));

  const search = await browser.newPage(local('search.html'), { waitUntil: 'load' });
  await search.locator("::-p-aria(Search)").fill('beta');
  await search.click("[role='option']", { index: 1 });
  await search.waitForSelector('#search');
  assert.equal(await text(search, '#results-title'), 'Results for beta');

  const form = await browser.newPage(local('form.html'), { waitUntil: 'load' });
  await form.type("input[name='name']", 'Abeer', { clearFirst: true });
  await form.select("select[name='country']", 'jp');
  await form.submit('#demo-form');
  assert.equal(await text(form, '#submitted'), 'Abeer - jp');

  const left = await browser.newPage(local('compare-left.html'), { waitUntil: 'load' });
  const right = await browser.newPage(local('compare-right.html'), { newTab: true, waitUntil: 'load' });
  const diff = await left.compare(right, { selector: '.card' });
  assert.ok(Object.keys(diff.left.diff.styles_diff || {}).length);

  console.log(JSON.stringify({ ok: true, tests: ['console', 'click', 'locator', 'scroll', 'html', 'data', 'search', 'form', 'compare'] }, null, 2));
} finally {
  await browser.close();
  server.stop();
}
