---
name: puppet
description: Use when you need live page sessions, trusted browser control, screenshots, diffs, or SDK-driven page automation through the globally installed Puppet CLI and Chrome extension service.
---

# Puppet

Use the globally installed `puppet` command. Do not call repo-local `npm run server`, curl raw endpoints, or repo-local shell launchers unless the CLI is missing.

Install on another machine:
- `npm install -g https://github.com/connectingmatrix/puppet/archive/refs/heads/main.tar.gz`

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
- Run modules: `puppet run ./script.mjs --timeout-ms 180000`
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

Programmatic modules:
- `puppet run` launches a normal Node module file. Inline eval and injected globals are disabled.
- Start modules with `import puppet from 'puppet'`.
- `puppet.start({ port })` returns `{ browser, status, port, baseUrl, extensionUrl, instanceId }`.
- Throw when `state.browser` is null: `if (!state.browser) throw new Error('Puppet not ready: ' + state.status)`.
- `state.browser.pages()` lists all currently open browser tabs the extension can bind.
- `state.browser.newPage(url, options)` reuses a page only inside the current Puppet session; a fresh script opens an isolated Puppet tab by default.
- Use `state.browser.pages()` or `state.browser.sessionPages()` when you intentionally want to bind an already-open browser tab.
- Use `await state.browser.close()` to close current-session pages opened by Puppet.
- `state.browser.close()` does not release shared pages outside the current session.
- Same-page concurrent work is allowed; callers coordinate final ordering when they intentionally share one page.
- For anti-bot sensitive sites, use `puppet.start({ keepPagesOpen: true })` and `state.browser.close({ keepPagesOpen: true })` so the SDK disconnects without closing tabs.

SDK capabilities:
- Navigation: `page.goto`, `page.back`, `page.reload`, `page.setViewport`, `page.url`, `page.location`.
- Input: `page.click`, `page.dblclick`, `page.hover`, `page.type`, `page.keyboard.press`, `page.select`, `page.dragAndDrop`, `page.scroll`, `page.MouseScroll`, `page.submit`.
- Query: `page.locator`, `page.querySelector`, `page.querySelectorAll`, `page.find`, `page.$$eval`, `page.contains`, `page.waitForSelector`, `locator.querySelector`, `locator.querySelectorAll`, `locator.$$eval`, `locator.all`, `locator.map`, `locator.find`, `locator.closest`, `locator.text`, `locator.count`, `locator.exists`, `locator.attribute`, `locator.checked`, `handle.querySelector`, `handle.querySelectorAll`, `handle.$$eval`.
- Container actions: `locator.scrollBy`, `locator.scrollToChild`, `locator.clickChild`.
- Console: `page.on('console')`, `page.on('pageerror')`, `page.console.read()`, `page.console.on()`, `page.console.write()`, `page.consoleMessages()`, `page.waitForConsole()`.
- Network: `page.intercept`, `page.waitForRequest`, `page.waitForResponse`, `page.waitForGraphql`, `page.setRequestInterception`, `page.on('request')`, `page.request.on()`, `page.network.requests()`, `page.network.socket()`, `page.socket.on()`.
- Debugger: `page.debugger.start()` and `page.debugger.stop()` for Chrome debugger-backed testing helpers.
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
