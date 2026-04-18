---
name: puppet
description: Use when you need live page sessions, trusted browser control, screenshots, diffs, or SDK-driven page automation through the globally installed Puppet CLI and Chrome extension service.
---

# Puppet

Use the globally installed `puppet` command. Do not call repo-local `npm run server`, curl raw endpoints, or repo-local shell launchers unless the CLI is missing.

Start and inspect state:
- `puppet server start --port 4017`
- `puppet server status --port 4017`
- `puppet instances --port 4017`
- `puppet help`
- `puppet help pages`
- `puppet help run`

Default port behavior:
- Port `4017` is owned by the extension background worker and should not require an extension tab.
- If `puppet instances` is empty but `puppet server status` is healthy, wait for the extension background worker or reload the installed extension once.
- For a custom Chrome profile/port, run `puppet server start --port PORT`, then `puppet extension open chrome-extension://EXTENSION_ID/sidepanel.html --port PORT`.

Preferred CLI workflows:
- Open pages: `puppet pages open --json '{"pages":[{"url":"https://example.com","waitUntil":"load"}]}'`
- List live pages: `puppet pages active`
- Run actions: `puppet pages actions --json '{"actions":[{"type":"click","pageId":"PAGE","selector":"button"}]}'`
- Capture data: `puppet pages data --json '{"pageId":"PAGE","selector":"body","snapshot":true}'`
- Compare pages: `puppet compare selector --json '{"leftUrl":"https://a.test","rightUrl":"https://b.test","selector":"body"}'`
- Run scripts: `puppet run ./script.mjs --timeout-ms 180000`
- Execute inline scripts: `puppet exec --eval "const state = await server.start({port:4017}); return state.status"`

Script scope for `puppet run` and `puppet exec`:
- Script files are server-side function bodies, not standalone Node modules.
- `server.start({ port })` returns `{ browser, status, port, baseUrl, extensionUrl, instanceId }`.
- Throw when `browser` is null: `if (!state.browser) throw new Error('Puppet not ready: ' + state.status)`.
- `browser.pages()` lists all currently open browser tabs the extension can bind.
- `browser.newPage(url, options)` reuses a controlled tab by default; pass `{ newTab: true }` only for intentional extra tabs.
- Use `await browser.close()` to close session pages opened by that browser.

SDK capabilities:
- Navigation: `page.goto`, `page.reload`, `page.setViewport`, `page.url`, `page.location`.
- Input: `page.click`, `page.dblclick`, `page.hover`, `page.type`, `page.keyboard.press`, `page.select`, `page.dragAndDrop`, `page.scroll`, `page.submit`.
- Query: `page.locator`, `page.contains`, `page.waitForSelector`, `locator.find`, `locator.closest`, `locator.text`, `locator.count`, `locator.exists`, `locator.attribute`, `locator.checked`.
- Network: `page.intercept`, `page.waitForRequest`, `page.waitForResponse`, `page.waitForGraphql`, `page.setRequestInterception`, `page.on('request')`.
- Data: `page.evaluate`, `page.html`, `page.data`, `page.screenshot`, `page.frames`, `page.iframes`, `page.request`, `page.graphql`, `page.localStorage`.
- Diff: `page.compare(otherPage)` and `page.compareSelector(selector, otherPage.selectorTree(selector), { snapshot: true })`.

Output rules:
- `classes`, `snapshot.classes`, `snapshot.style`, `diff.classes_diff`, `diff.styles_diff`, tree `styles`, and tree diff `styles` are key-value objects.
- `diff.classes_diff[className]` is `applied` or `missing class`.
- `diff.styles_diff[propertyName]` is that side's changed computed value.
- `runs` is keyed by viewport like `runs["1024x700"]`.
- `snapshot` is omitted unless `"snapshot": true` is passed.

Troubleshooting:
- `server_ready_no_instance` means the server is healthy but no extension instance is registered.
- `Timed out waiting for script run` means the CLI/server returned correctly; split or raise `--timeout-ms` if the browser work is expected to be long.
- For custom ports, keep the URL-bound extension page open for that port.
