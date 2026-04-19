# Puppet - Giving AI Eyes. Pair with Codex Pro & Claude Max

Puppet is a Chrome extension plus local server for trusted browser control, live page sessions, DOM/style diffs, screenshots, and scriptable inspection. Every non-`/api` route returns this file as `text/markdown`, so AI clients can discover the contract from `GET /`, `GET /docs`, or any other non-API path.

## Quick Start

1. Local install: `npm install -g /Users/abeer/dev/chrome_extension_utils`
2. GitHub install on another machine: `npm install -g git+ssh://git@github.com/connectingmatrix/puppet.git`
3. `puppet server start --port 4017`
4. Load `/Users/abeer/dev/chrome_extension_utils/dist` as an unpacked Chrome extension once
5. Keep Chrome running; the extension background worker connects to the default `4017` server without opening an extension tab
6. Check `puppet instances --port 4017` for a connected item
7. Configure the extension URL once with `puppet configure chrome-extension://YOUR_EXTENSION_ID/sidepanel.html`
8. For another Chrome instance, start a custom server with `puppet server start --port 4021`
9. Bind custom ports with `puppet extension open --port 4021`

The `puppet` binary is the preferred automation interface. It can start the server, call every REST endpoint, run server-side SDK scripts, and open custom-port extension pages.

## CLI First

```sh
puppet help
puppet help pages
puppet help detail
puppet help md
puppet configure chrome-extension://YOUR_EXTENSION_ID/sidepanel.html
puppet configure show
puppet extension open --port 4021
puppet server start --port 4017
puppet server status --port 4017
puppet pages open --json '{"pages":[{"url":"https://example.com","waitUntil":"load"}]}'
puppet pages actions --json '{"actions":[{"type":"scroll","pageId":"PAGE","deltaY":800}]}'
puppet pages data --json '{"pageId":"PAGE","selector":"body"}'
puppet compare routes --json '{"oldBase":"http://127.0.0.1:64925","currentBase":"http://127.0.0.1:5001","routes":["/dashboard","/settings"]}'
puppet compare selector --json '{"leftUrl":"https://a.test","rightUrl":"https://b.test","selector":"body"}'
puppet run ./inspect.mjs --timeout-ms 180000
puppet api GET /api/health
```

Request bodies can come from `--json`, `--file`, or `--stdin`. The raw API escape hatch is `puppet api METHOD /api/path`. Files passed to `puppet run` are server-side function bodies with `server`, `browser`, `args`, and `console` already in scope. Use `puppet help detail` for the API/helper return reference and `puppet help md` to print this README from the installed CLI.

## Token-Safe Defaults

Puppet is compact by default for REST and CLI responses. If a response is large, the server returns `{ "compact": true, "summary": ..., "artifact": { "path": "..." } }` and writes the full JSON under `~/.puppet/artifacts`.

Use this pattern for Codex work:

```js
const state = await server.start({ port: 4017 });
if (!state.browser) throw new Error(`Puppet not ready: ${state.status}`);
const page = await state.browser.newPage('http://localhost:5173/u');
return await page.evaluate(() => ({
  title: document.title,
  url: location.href,
  ready: Boolean(document.querySelector('#app')),
  text: document.body.innerText.slice(0, 500)
}));
```

Avoid returning `snapshot:true`, full `body` HTML, base64 screenshots, or all-size compare output directly into Codex. If you need the full payload for offline inspection, pass `"raw": true` or read `artifact.path` outside the chat context.

## Compact Route Compare

Use this when you need the same broad old-vs-current UI check that Codex often writes as a Playwright script. It visits each route on both bases in one reused Puppet tab, samples body text, headings, element counts, and selected computed styles, writes the full artifact to `.tmp`, and returns only route-level summary keys.

```sh
puppet compare routes --json '{
  "oldBase":"http://127.0.0.1:64925",
  "currentBase":"http://127.0.0.1:5001",
  "routes":["/dashboard","/bots","/settings"],
  "artifactPath":".tmp/ui-route-compare-64925-vs-5001.json",
  "waitUntil":"domcontentloaded",
  "settleMs":2200
}'
```

Response:

```json
{
  "ok": true,
  "artifactPath": "/absolute/path/.tmp/ui-route-compare-64925-vs-5001.json",
  "routesChecked": 3,
  "summary": [
    { "route": "/dashboard", "bodyDelta": 0, "countDiffKeys": [], "styleDiffKeys": ["card"], "errors": { "old": null, "current": null } }
  ]
}
```

Optional request keys:
- `selectors`: replace the sampled selector map, for example `{ "header":"header", "card":"[class*=\"card\" i]" }`
- `styleKeys`: replace sampled computed style properties
- `width` and `height`: viewport used for the reused tab
- `timeoutMs`: total compare timeout
- `raw`: still works, but prefer the artifact file for full details

## SDK First

```js
import server from 'puppet';

const { browser, status } = await server.start({ port: 4017 });
if (!browser) throw new Error(`Puppet not ready: ${status}. Reload the installed extension or bind the custom-port extension page.`);
const page = await browser.newPage();
await page.goto('https://developer.chrome.com/', { waitUntil: 'load' });
await page.setViewport({ width: 1080, height: 1024 });
await page.keyboard.press('/');
await page.locator('::-p-aria(Search)').fill('automate beyond recorder');
await page.locator('.devsite-result-item-link').click({ waitUntil: 'networkidle2' });
const titleHandle = await page.locator('::-p-text(Customize and automate)').waitHandle();
const title = await titleHandle.evaluate((node) => node.textContent);
page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
await page.evaluate(() => console.log(`url is ${location.href}`));
await browser.close();
```

### More SDK patterns

```js
await page.setRequestInterception(true);
page.on('request', async (request) => {
  if (request.isInterceptResolutionHandled()) return;
  if (request.url().endsWith('.png') || request.url().endsWith('.jpg')) await request.abort();
  else await request.continue();
});
await page.goto('https://example.com', { waitUntil: 'networkidle2' });
await page.screenshot({ path: '/tmp/example.png' });
const fileInput = await page.waitForSelector('input[type=file]');
await fileInput.uploadFile(['/absolute/path/file.txt']);
const frames = await page.iframes();
await page.iframe[frames[0].frameId].click('#frame-button');
```

Request callbacks stay live during `page.reload()` and `page.goto()` calls, so `await request.continue()` no longer deadlocks navigation.

## Main SDK Surface

- `const { browser, status, port, baseUrl, extensionUrl, instanceId } = await server.start()` starts or reuses the local listener
- `const { browser, status } = await server.start({ port: 4021 })` targets another Puppet server port
- `status` is `connected`, `server_ready_no_instance`, or `server_started_no_instance`
- if `browser` is `null`, the server is healthy but no extension instance has registered yet
- `server.stop()` only clears the local SDK browser binding; it does not stop the shared Puppet listener
- use `server.stop({ force: true })` only when you intentionally want to kill a listener started by this SDK process
- default-port automation does not require an extension page; the background worker registers itself with the server
- the sidepanel status lamp mirrors the singleton background worker; sidepanels do not register separate socket instances
- custom ports are handled by saving the server URL in extension settings, then the background worker reconnects as the same browser instance
- use the lamp popup's restart button if the background worker is connected to Chrome but stops responding
- extension pages opened through `puppet extension open` only save the custom server URL; after the background worker reconnects, the page is not a separate control instance
- the opener does not create a new extension tab when the target server already has a connected instance
- `await browser.newPage(url?, options?)` reuses the latest Puppet page by default; if a new script process has no session memory, it binds an existing browser tab first
- pass `{ newTab: true }` or `{ reuse: false }` to force a new tab
- `await browser.pages()` returns all open browser tabs bound as Puppet pages
- `await browser.sessionPages()` returns only pages opened in the current Puppet session
- `await browser.close()`
- `await page.goto(url, options?)`
- `await page.reload(options?)`
- `await page.setViewport({ width, height })`
- `await page.setRequestInterception(true | false)`
- `page.on('console' | 'request' | 'navigation' | 'network.request', handler)`
- `await page.intercept(match, { alias, mode, status, headers, body })`
- `await page.waitForRequest(match, options?)`
- `await page.waitForResponse(match, options?)`
- `await page.waitForGraphql(aliasOrOperationName, options?)`
- `page.locator(selector)`
- `await page.contains(text)` and `await page.contains(selector, text)`
- `await page.waitForSelector(selector, options?)`
- `await page.click(selector, options?)`
- `await page.dblclick(selector, options?)`
- `await page.hover(selector, options?)`
- `await page.type(selector, value, options?)`
- `await page.keyboard.press(key, options?)`
- `await page.select(selector, value, options?)`
- `await page.dragAndDrop(sourceSelector, targetSelector, options?)`
- `await page.scroll(options?)`
- `await page.submit(selector, options?)`
- `await page.evaluate(scriptOrFunction, ...args)`
- `await page.request({ method, url, headers, body, auth })`
- `await page.graphql(query, { variables, url, auth })`
- `await page.localStorage.get/set/remove/all()`
- `await page.html(selector?)`
- `await page.data(selector, { snapshot, compact })`
- `await page.screenshot({ selector, current, path })` captures the full page by default; pass `{ current: true }` for only the visible viewport
- `await page.compare(otherPage, options?)`
- `await page.compareSelector(selector, otherPage.selectorTree(selector), { compact: true })`
- `await page.frames()`
- `await page.iframes()`
- `page.frame(frameId)` and `page.iframe[frameId]`
- `await page.close()`

## REST Routes

Live routes:
- `POST /api/pages/open`
- `GET /api/pages/active`
- `GET /api/pages/browser`
- `POST /api/pages/actions`
- `POST /api/pages/diff`
- `POST /api/pages/data`
- `POST /api/pages/html`
- `POST /api/pages/frames`
- `POST /api/pages/screenshot`
- `POST /api/pages/run`
- `POST /api/pages/close`

Legacy routes:
- `POST /api/compare/routes`
- `POST /api/compare/pages`
- `POST /api/compare/selector`
- `POST /api/inspect/selector`

Utility routes:
- `GET /api/health`
- `GET /api/instances`

Live socket:
- `ws://127.0.0.1:4017/api/live`

## Status-First Startup

```js
const state = await server.start({ port: 4017 });
if (!state.browser) throw new Error(`Puppet not ready: ${state.status}`);
const { browser } = state;
```

Status meanings:
- `connected`: server is healthy and a Puppet extension instance is bound to that port
- `server_ready_no_instance`: server is already running but no extension instance has registered yet
- `server_started_no_instance`: this call started the server, but no extension instance has registered yet

## Open Pages

```json
{
  "pages": [
    { "role": "left", "url": "http://127.0.0.1:4017/examples/compare-left.html", "width": 1440, "height": 900, "waitUntil": "load" },
    { "role": "right", "url": "http://127.0.0.1:4017/examples/compare-right.html", "width": 1440, "height": 900, "waitUntil": "load" }
  ]
}
```

Actions passed to `POST /api/pages/open` may use `role` instead of `pageId`.

## Bind Existing Browser Tabs

`browser.pages()` returns all normal browser tabs that the connected extension can see, and each item is already bindable with a `pageId`.

```js
const { browser, status } = await server.start({ port: 4017 });
if (!browser) throw new Error(`Puppet not ready: ${status}`);
const pages = await browser.pages();
for (const page of pages) {
  console.log({
    pageId: page.pageId,
    tabId: page.tabId,
    pageName: page.pageName,
    pageUrl: page.pageUrl,
    pageStats: page.pageStats
  });
}
```

Returned page fields:
- `pageId`
- `tabId`
- `pageName`
- `pageUrl`
- `pageStats.ram`
- `pageStats.cpu`
- `pageStats.heapUsage`

`pageStats` comes from the best live debugger metrics exposed by Chrome for that tab. `cpu` is the current task-duration metric, `heapUsage` is used JS heap, and `ram` is the current heap allocation size reported for the page runtime.

## Action Arrays

```json
{
  "actions": [
    { "type": "wait_for_selector", "pageId": "PAGE_ID", "selector": "textarea[name='q']", "visible": true, "timeoutMs": 30000 },
    { "type": "type_text", "pageId": "PAGE_ID", "selector": "textarea[name='q']", "value": "puppet browser automation", "clearFirst": true },
    { "type": "click", "pageId": "PAGE_ID", "selector": "[role='option']", "index": 1, "waitUntil": "networkidle2" },
    { "type": "scroll", "pageId": "PAGE_ID", "deltaY": 900 }
  ]
}
```

## Network Waits And Static Mocks

```js
await page.intercept({ operationName: 'listWorkflowCatalog', urlPattern: '*graphql*' }, { alias: 'listWorkflowCatalog' });
await page.intercept({ operationName: 'workflowRunningStatuses', urlPattern: '*graphql*' }, {
  body: { data: { workflowRunningStatuses: [] } },
  mode: 'fulfill',
  status: 200
});
const request = await page.waitForRequest('@listWorkflowCatalog');
const response = await page.waitForGraphql('@listWorkflowCatalog');
console.log(request.method, request.url, response.status);
```

Matches can be:
- `@alias`
- `{ method, urlPattern, resourceType, operationName, status }`

`waitForGraphql()` waits on response events and works with either a saved alias or a raw GraphQL operation name.

## Query Helpers

```js
const row = await page.contains('[data-cy^="workflow-record-user-"]', 'My Workflow');
const button = await row.closest('[data-cy^="workflow-record-user-"]');
const menu = await button.find('.menu-trigger');
await menu.click();
const text = await page.locator('.title').text();
const count = await page.locator('[data-cy^="tree-row-"]').count();
const height = await page.locator('.canvas').outerHeight();
const checked = await page.locator("input[type='checkbox']").checked();
const href = await page.url();
const pathname = await page.location('pathname');
```

## Session Helpers

```js
const accessToken = await page.localStorage.get('giga_access_token');
await page.localStorage.set('workflow_catalog_selected_org_ids', JSON.stringify(['org-1']));
const payload = await page.graphql('query Me { gigaCurrentUser { id } }');
const response = await page.request({
  auth: 'auto-from-current-session',
  method: 'POST',
  url: '/api/v2/graphql',
  body: { query: 'query Ping { __typename }' }
});
console.log(accessToken, payload.data, response.status);
```

## Action Reference

- `click`: `await page.click('.button', { index: 0, waitUntil: 'load' })`
  raw: `{ "type": "click", "pageId": "PAGE_ID", "selector": ".button", "index": 0, "waitUntil": "load" }`
- `type_text`: `await page.type("input[name='q']", 'hello', { clearFirst: true })`
  raw: `{ "type": "type_text", "pageId": "PAGE_ID", "selector": "input[name='q']", "value": "hello", "clearFirst": true }`
- `send_key`: `await page.keyboard.press('Enter')`
  raw: `{ "type": "send_key", "pageId": "PAGE_ID", "key": "Enter" }`
- `select_option`: `await page.select("select[name='country']", 'jp')`
  raw: `{ "type": "select_option", "pageId": "PAGE_ID", "selector": "select[name='country']", "value": "jp" }`
- `drag_drop`: `await page.dragAndDrop('.card', '#target')`
  raw: `{ "type": "drag_drop", "pageId": "PAGE_ID", "sourceSelector": ".card", "targetSelector": "#target" }`
- `scroll`: `await page.scroll({ deltaY: 900 })`
  raw: `{ "type": "scroll", "pageId": "PAGE_ID", "deltaY": 900 }`
- `submit`: `await page.submit('#demo-form')`
  raw: `{ "type": "submit", "pageId": "PAGE_ID", "selector": "#demo-form" }`
- `wait_for_selector`: `await page.waitForSelector('#ready', { timeoutMs: 30000 })`
  raw: `{ "type": "wait_for_selector", "pageId": "PAGE_ID", "selector": "#ready", "visible": true, "timeoutMs": 30000 }`
- `reload_page`: `await page.reload({ waitUntil: 'networkidle2' })`
  raw: `{ "type": "reload_page", "pageId": "PAGE_ID", "waitUntil": "networkidle2" }`
- `change_screen_size`: `await page.setViewport({ width: 1024, height: 700 })`
  raw: `{ "type": "change_screen_size", "pageId": "PAGE_ID", "width": 1024, "height": 700 }`
- `navigate_to_url`: `await page.goto('https://example.com', { waitUntil: 'load' })`
  raw: `{ "type": "navigate_to_url", "pageId": "PAGE_ID", "url": "https://example.com", "waitUntil": "load" }`
- `get_page_diff`: `await left.compare(right, { selector: '.card', compact: true })`
  raw: `{ "type": "get_page_diff", "leftPageId": "LEFT_ID", "rightPageId": "RIGHT_ID", "selector": ".card" }`
- `get_page_data`: `await page.data('.card', { compact: true })`
  raw: `{ "type": "get_page_data", "pageId": "PAGE_ID", "selector": ".card" }`
- `get_page_html`: `await page.html('#main')`
  raw: `{ "type": "get_page_html", "pageId": "PAGE_ID", "selector": "#main" }`
- `screenshot_page`: `await page.screenshot({ path: '/tmp/full.png' })`
  raw: `{ "type": "screenshot_page", "pageId": "PAGE_ID" }`
- `screenshot_page` current viewport: `await page.screenshot({ current: true, path: '/tmp/current.png' })`
  raw: `{ "type": "screenshot_page", "pageId": "PAGE_ID", "current": true }`
- `close_page`: `await page.close()`
  raw: `{ "type": "close_page", "pageId": "PAGE_ID" }`
- `intercept_request`: `await page.run([{ type: 'intercept_request', pageId: page.pageId, ruleId: 'observe-all', mode: 'observe', match: { urlPattern: '*' } }])`
  raw: `{ "type": "intercept_request", "pageId": "PAGE_ID", "ruleId": "observe-all", "mode": "observe", "match": { "urlPattern": "*" } }`
- `record_start`: `await page.run([{ type: 'record_start', pageId: page.pageId, recordId: 'header', selector: '.header', include: ['classes', 'styles', 'tree'] }])`
  raw: `{ "type": "record_start", "pageId": "PAGE_ID", "recordId": "header", "selector": ".header", "include": ["classes", "styles", "tree"] }`
- `record_stop`: `await page.run([{ type: 'record_stop', pageId: page.pageId, recordId: 'header' }])`
  raw: `{ "type": "record_stop", "pageId": "PAGE_ID", "recordId": "header" }`
- `execute_script`: `await page.evaluate(() => ({ href: location.href, title: document.title }))`
  raw: `{ "type": "execute_script", "pageId": "PAGE_ID", "script": "return { href: location.href, title: document.title };" }`
- `upload_files`: `await page.waitForSelector('#file-input').then((handle) => handle.uploadFile(['/absolute/path/file.txt']))`
  raw: `{ "type": "upload_files", "pageId": "PAGE_ID", "selector": "#file-input", "files": ["/absolute/path/file.txt"] }`

Supported selector syntax:
- CSS selectors
- `::-p-text(...)`
- `::-p-aria(...)`

## `/api/pages/run`

```json
{
  "pages": [{ "url": "http://127.0.0.1:4017/examples/search.html", "waitUntil": "load" }],
  "script": "const { browser, status } = await server.start({ port: 4017 }); if (!browser) throw new Error(`Puppet not ready: ${status}`); const page = await browser.newPage('http://127.0.0.1:4017/examples/search.html'); await page.locator('::-p-aria(Search)').fill('gamma'); await page.click(\"[role='option']\", { index: 2 }); return await page.evaluate(() => ({ value: (document.querySelector('#search') || {}).value || '', options: [...document.querySelectorAll('[role=option]')].length }));",
  "closeOnExit": true
}
```

Response keys:
- `sessionId`
- `pageIds`
- `logs`
- `result`

## Output Shape

- `classes`, `snapshot.classes`, `snapshot.style`, `diff.classes_diff`, `diff.styles_diff`, tree `styles`, and tree diff `styles` are key-value objects
- `diff.classes_diff[className]` is `applied` or `missing class`
- `diff.styles_diff[propertyName]` is that side’s changed computed value
- `snapshot.tree` is keyed by labels like `< span >.title`
- `diff.tree_diff` contains only changed nodes and changed styles
- `runs` is keyed by viewport like `runs["1024x700"]`
- `snapshot` is omitted unless you request it
- large API responses are summarized and stored in `~/.puppet/artifacts` unless `raw:true` is passed

## Included Example Pages

- `/examples/search.html`
- `/examples/form.html`
- `/examples/drag.html`
- `/examples/iframe.html`
- `/examples/upload.html`
- `/examples/intercept.html`
- `/examples/compare-left.html`
- `/examples/compare-right.html`

Runnable examples:
- `puppet run /Users/abeer/dev/chrome_extension_utils/examples/puppet-run.mjs --timeout-ms 180000`
- `puppet compare routes --file /Users/abeer/dev/chrome_extension_utils/examples/route-compare.json`
- `node /Users/abeer/dev/chrome_extension_utils/examples/google-suite.mjs`
- `node /Users/abeer/dev/chrome_extension_utils/examples/sample-suite.mjs`
- `node /Users/abeer/dev/chrome_extension_utils/examples/giga-workflow-actions.mjs open-designer`
- `/Users/abeer/dev/chrome_extension_utils/examples/giga-workflow-actions.md`
- `/Users/abeer/dev/chrome_extension_utils/examples/puppet-run.mjs`
- `/Users/abeer/dev/chrome_extension_utils/examples/google-suite.mjs`
- `/Users/abeer/dev/chrome_extension_utils/examples/sample-suite.mjs`
- `/Users/abeer/dev/chrome_extension_utils/examples/boilerplate/run.mjs`
- `/Users/abeer/dev/chrome_extension_utils/examples/route-compare.json`

## Google Suite

The Google suite does this:
- opens `https://www.google.com/`
- waits for the search box
- types the query
- waits for the suggestion list
- clicks a random visible suggestion
- verifies a results selector exists
- scrolls the results page
- writes a screenshot to `/Users/abeer/dev/chrome_extension_utils/artifacts/google-suite.png`

## Notes

- Each Chrome profile broadcasts one stable `browserId`, and a server keeps one active instance per browser id
- The default `4017` connection is a background-worker instance, so relaunching the server does not require reopening `sidepanel.html`
- Each registration includes a stable `browserId`, and the server keeps only one connected instance per browser id
- `browser.newPage()` reuses the latest Puppet-controlled tab by default; across separate Codex script runs it first binds an existing browser tab, then navigates that tab
- use `{ newTab: true }` for intentional multi-page comparisons
- Page sessions are in memory and disappear if the server restarts or the owning extension instance disconnects
- Custom-port extension pages must stay open while SDK or REST work is running on that custom port
- The packaged extension artifact is `/Users/abeer/dev/chrome_extension_utils/artifacts/puppet.crx`
