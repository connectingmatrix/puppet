---
name: CTM-puppet
description: Use when you need live page sessions, trusted browser control, screenshots, diffs, or SDK-driven page automation through the local CTM Puppet Chrome extension service.
---

# CTM Puppet

Run `skills/CTM-puppet/scripts/start_ctm_puppet.sh` first. The default `4017` port uses the extension background worker and does not need an extension page. Pass the extension page URL and a second argument only for a custom server port.

Use this skill for:
- opening one or two persistent pages and keeping their `pageId`s
- binding existing browser tabs through `browser.pages()`
- driving pages with clicks, typing, keys, drag/drop, scroll, navigation, resize, screenshots, uploads, and scripts
- diffing DOM trees, classes, styles, and layout data across two live pages
- running Puppeteer-style `browser/page/locator` scripts through the SDK or `POST /api/pages/run`

Workflow:
1. Start the default server:
   `skills/CTM-puppet/scripts/start_ctm_puppet.sh`
2. For another Chrome instance use a custom port:
   `skills/CTM-puppet/scripts/start_ctm_puppet.sh chrome-extension://efnpdobifdpehhodkecgddbplgkkeogo/sidepanel.html 4021`
3. Treat the port state explicitly:
- if `GET /api/health` fails, the server is down
- if `GET /api/health` works and `GET /api/instances` is empty, the server is ready but no extension instance has registered yet
- if `GET /api/instances` has an item, the server is connected
4. For default `4017`, wait for the background worker or reload the installed extension once; for a custom port, keep that URL-bound extension page open.
5. For persistent work call `POST /api/pages/open`, keep the returned `sessionId` and `pageId`s, then use:
- `POST /api/pages/actions`
- `POST /api/pages/data`
- `POST /api/pages/diff`
- `POST /api/pages/html`
- `POST /api/pages/frames`
- `POST /api/pages/screenshot`
- `POST /api/pages/run`
- `POST /api/pages/close`
6. For one-shot compare flows you can still use:
- `POST /api/compare/pages`
- `POST /api/compare/selector`
- `POST /api/inspect/selector`

SDK shape:
- `import server from 'ctm-puppet'`
- `const { browser, status, port, baseUrl, extensionUrl, instanceId } = await server.start({ port: 4017 })`
- `if (!browser) throw new Error(\`CTM Puppet not ready: ${status}\`)`
- `await browser.pages()` for all open browser tabs
- `await browser.sessionPages()` for CTM Puppet session tabs only
- `const page = await browser.newPage()` reuses the latest CTM Puppet page by default and binds an existing browser tab first when a new script process has no session memory
- `const page = await browser.newPage(url, { newTab: true })` only when a fresh tab is intentional
- `await page.goto(url)`
- `await page.locator(selector).fill(value)`
- `await page.waitForSelector(selector)`
- `await page.intercept(match, { alias, mode, status, headers, body })`
- `await page.waitForRequest('@alias')`
- `await page.waitForResponse('@alias')`
- `await page.waitForGraphql('@alias')`
- `await page.contains(text)` and `await page.contains(selector, text)`
- `await page.dblclick(selector)` and `await page.hover(selector)`
- `await page.graphql(query, { variables })`
- `await page.request({ method, url, body, auth })`
- `await page.localStorage.get/set/remove/all()`
- `await page.screenshot({ path })` captures the whole page by default
- `await page.screenshot({ current: true, path })` captures only the visible viewport
- `page.on('console', msg => msg.text())`
- `page.on('request', request => request.abort() || request.continue() || request.respond(...))`
- `await browser.close()`
- callback interception works during `page.reload()` and `page.goto()` without a special action queue

Selector support:
- CSS selectors
- `::-p-text(...)`
- `::-p-aria(...)`

How to read output:
- `classes`, `snapshot.classes`, `snapshot.style`, `diff.classes_diff`, `diff.styles_diff`, tree `styles`, and tree diff `styles` are key-value objects.
- `diff.classes_diff[className]` is `applied` or `missing class`.
- `diff.styles_diff[propertyName]` is that side's changed computed value.
- `snapshot.tree` is keyed by labels like `< span >.classA.classB`.
- `diff.tree_diff` contains only changed nodes and changed styles.
- `runs` is keyed by viewport like `runs["1024x700"]`.
- `snapshot` is omitted unless you pass `"snapshot": true`.

Useful routes:
- `GET /api/health`
- `GET /api/instances`
- `GET /api/pages/active`
- `GET /` or `GET /docs` for the full integration guide

Useful files:
- `/Users/abeer/dev/chrome_extension_utils/README.md`
- `/Users/abeer/dev/chrome_extension_utils/examples/google-suite.mjs`
- `/Users/abeer/dev/chrome_extension_utils/examples/boilerplate/run.mjs`

Notes:
- The opener resolves the extension URL from the explicit argument, `CTM_PUPPET_EXTENSION_URL`, live `/api/instances`, or `.ctm-puppet.local.json`.
- `server.start({ port: CUSTOM_PORT })` returns structured port state and lets you target another CTM Puppet server for another Chrome instance.
- `server.stop()` only clears the local SDK browser binding; it does not stop the shared listener.
- Use `server.stop({ force: true })` only when intentionally killing an SDK-started listener.
- `skills/CTM-puppet/scripts/start_ctm_puppet.sh EXTENSION_URL CUSTOM_PORT` starts and opens the matching port pair.
- the default `4017` server connects through the extension background worker without opening `sidepanel.html`
- custom ports still use `sidepanel.html?port=...&server=...` because a custom-port binding is page-scoped
- each connection includes a stable `browserId`, and the server keeps only one connected instance per browser id
- the opener exits without opening a new extension tab when the target server already has a connected instance
- Each Chrome profile broadcasts one stable `browserId`, and a server keeps one active instance per browser id.
- `browser.newPage()` reuses an existing controlled page by default; across repeated Codex automation processes it binds an already-open browser tab before opening anything new.
- Use `{ newTab: true }` for intentional multi-page comparisons.
- Page sessions are in memory and disappear if the server restarts or the owning extension instance disconnects.
