---
name: puppet
description: Use when you need live page sessions, trusted browser control, screenshots, diffs, or SDK-driven page automation through the globally installed Puppet CLI and Chrome extension service.
---

# Puppet

Use the globally installed `puppet` command. Do not call repo-local `npm run server`, curl raw endpoints, or repo-local shell launchers unless the CLI is missing.

Install on another machine:
- `npm install -g git+ssh://git@github.com/connectingmatrix/puppet.git`

Start and inspect state:
- `puppet server start --port 4017`
- `puppet server status --port 4017`
- `puppet instances --port 4017`
- `puppet help`
- `puppet help pages`
- `puppet help run`
- `puppet configure show`
- `puppet extension open --port PORT`

Default port behavior:
- Port `4017` is owned by the extension background worker and should not require an extension tab.
- If `puppet instances` is empty but `puppet server status` is healthy, wait for the extension background worker or reload the installed extension once.
- The sidepanel lamp mirrors the singleton background worker; sidepanels do not register separate socket instances.
- Custom ports are handled by saving the server URL in extension settings, then the background worker reconnects as the same browser instance.
- Configure once with `puppet configure chrome-extension://EXTENSION_ID/sidepanel.html`.
- For a custom Chrome profile/port, run `puppet server start --port PORT`, then `puppet extension open --port PORT`.

Preferred CLI workflows:
- Open pages: `puppet pages open --json '{"pages":[{"url":"https://example.com","waitUntil":"load"}]}'`
- List live pages: `puppet pages active`
- Run actions: `puppet pages actions --json '{"actions":[{"type":"click","pageId":"PAGE","selector":"button"}]}'`
- Capture data: `puppet pages data --json '{"pageId":"PAGE","selector":"body"}'`
- Compare pages: `puppet compare selector --json '{"leftUrl":"https://a.test","rightUrl":"https://b.test","selector":"body"}'`
- Compare many routes compactly: `puppet compare routes --json '{"oldBase":"http://127.0.0.1:64925","currentBase":"http://127.0.0.1:5001","routes":["/dashboard","/settings"]}'`
- Use the route compare example: `puppet compare routes --file /Users/abeer/dev/chrome_extension_utils/examples/route-compare.json`
- Run scripts: `puppet run ./script.mjs --timeout-ms 180000`
- Execute inline scripts: `puppet exec --eval "const state = await server.start({port:4017}); return state.status"`
- Configure extension URL: `puppet configure chrome-extension://EXTENSION_ID/sidepanel.html`
- Print API/helper reference only when needed: `puppet help detail`
- Print full integration docs only when needed: `puppet help md`

Token budget rules:
- Prefer `page.querySelector`, `page.querySelectorAll`, `page.find`, `page.$$eval`, `locator` scoped queries, `locator.all`, and `locator.map` for DOM extraction.
- Prefer `locator.scrollBy`, `locator.scrollToChild`, and `locator.clickChild` for scrollable panels and nested click targets.
- Use `page.evaluate()` only for browser globals, app state such as `window.__NUXT__`, or other non-DOM escape hatches.
- Snapshot output is hard disabled in Puppet. Do not pass `snapshot:true`; it is ignored.
- Do not return full HTML, base64 screenshots, or broad compare payloads into Codex unless the user explicitly needs them.
- REST and CLI responses compact large output into `{ compact:true, summary, artifact }`; read `artifact.path` from disk instead of pasting the full payload into chat.
- Add `"raw": true` only when code needs the full JSON object.
- For `giga-ai-ui` workflow checks, prefer `examples/giga-workflow-actions.mjs` or its short markdown guide.
- For broad route regressions, use `puppet compare routes`. It reuses one tab, returns a small summary, and writes the full route artifact to `.tmp`.

Script scope for `puppet run` and `puppet exec`:
- Script files are server-side function bodies, not standalone Node modules.
- `server.start({ port })` returns `{ browser, status, port, baseUrl, extensionUrl, instanceId }`.
- Throw when `browser` is null: `if (!state.browser) throw new Error('Puppet not ready: ' + state.status)`.
- `browser.pages()` lists all currently open browser tabs the extension can bind.
- `browser.newPage(url, options)` reuses a controlled tab by default; pass `{ newTab: true }` only for intentional extra tabs.
- Use `await browser.close()` to close current-session pages opened by Puppet.
- `browser.close()` releases debugger bindings from bound tabs that it does not close.
- For anti-bot sensitive sites, use `server.start({ keepPagesOpen: true })` and `browser.close({ keepPagesOpen: true })` so the SDK disconnects without closing tabs.

SDK capabilities:
- Navigation: `page.goto`, `page.back`, `page.reload`, `page.setViewport`, `page.url`, `page.location`.
- Input: `page.click`, `page.dblclick`, `page.hover`, `page.type`, `page.keyboard.press`, `page.select`, `page.dragAndDrop`, `page.scroll`, `page.MouseScroll`, `page.submit`.
- Query: `page.locator`, `page.querySelector`, `page.querySelectorAll`, `page.find`, `page.$$eval`, `page.contains`, `page.waitForSelector`, `locator.querySelector`, `locator.querySelectorAll`, `locator.$$eval`, `locator.all`, `locator.map`, `locator.find`, `locator.closest`, `locator.text`, `locator.count`, `locator.exists`, `locator.attribute`, `locator.checked`, `handle.querySelector`, `handle.querySelectorAll`, `handle.$$eval`.
- Container actions: `locator.scrollBy`, `locator.scrollToChild`, `locator.clickChild`.
- Network: `page.intercept`, `page.waitForRequest`, `page.waitForResponse`, `page.waitForGraphql`, `page.setRequestInterception`, `page.on('request')`.
- Data: `page.html`, `page.data`, `page.screenshot` (compressed JPEG by default), `page.frames`, `page.iframes`, `page.request`, `page.request.fetch`, `page.graphql`, `page.localStorage`, `page.evaluate` for non-DOM escape hatches.
- Diff: `page.compare(otherPage)` and `page.compareSelector(selector, otherPage.selectorTree(selector), { compact: true })`.

Output rules:
- `classes`, `diff.classes_diff`, `diff.styles_diff`, tree `styles`, and tree diff `styles` are key-value objects.
- `diff.classes_diff[className]` is `applied` or `missing class`.
- `diff.styles_diff[propertyName]` is that side's changed computed value.
- `runs` is keyed by viewport like `runs["1024x700"]`.
- `snapshot` is always omitted because snapshot output is hard disabled.
- large REST/CLI payloads are stored in `~/.puppet/artifacts` and summarized by default.

Troubleshooting:
- `server_ready_no_instance` means the server is healthy but no extension instance is registered.
- If the background worker is stuck, open the sidepanel lamp popup and click `Restart background worker`.
- `Timed out waiting for script run` means the CLI/server returned correctly; split or raise `--timeout-ms` if the browser work is expected to be long.
- For custom ports, `puppet extension open --port PORT` saves the custom server URL; after the background worker reconnects, the extension page is not a separate control instance.
