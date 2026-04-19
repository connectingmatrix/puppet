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
- The sidepanel lamp mirrors the background worker when it targets the same server origin; custom ports use a sidepanel socket.
- Configure once with `puppet configure chrome-extension://EXTENSION_ID/sidepanel.html`.
- For a custom Chrome profile/port, run `puppet server start --port PORT`, then `puppet extension open --port PORT`.

Preferred CLI workflows:
- Open pages: `puppet pages open --json '{"pages":[{"url":"https://example.com","waitUntil":"document"}]}'`
- List live pages: `puppet pages active`
- Run actions: `puppet pages actions --json '{"actions":[{"type":"click","pageId":"PAGE","selector":"button"}]}'`
- Capture data: `puppet pages data --json '{"pageId":"PAGE","selector":"body"}'`
- Compare pages: `puppet compare selector --json '{"leftUrl":"https://a.test","rightUrl":"https://b.test","selector":"body"}'`
- Run scripts: `puppet run ./script.mjs --timeout-ms 180000`
- Execute inline scripts: `puppet exec --eval "const state = await server.start({port:4017}); return state.status"`
- Configure extension URL: `puppet configure chrome-extension://EXTENSION_ID/sidepanel.html`
- Print API/helper reference only when needed: `puppet help detail`
- Print full integration docs only when needed: `puppet help md`

Token budget rules:
- Prefer `page.evaluate()` for targeted facts and return a small object.
- Do not return full `page.data(..., { snapshot: true })`, full HTML, base64 screenshots, or broad compare payloads into Codex unless the user explicitly needs them.
- REST and CLI responses compact large output into `{ compact:true, summary, artifact }`; read `artifact.path` from disk instead of pasting the full payload into chat.
- Add `"raw": true` only when code needs the full JSON object.
- For `giga-ai-ui` workflow checks, prefer `examples/giga-workflow-actions.mjs` or its short markdown guide.

Script scope for `puppet run` and `puppet exec`:
- Script files are server-side function bodies, not standalone Node modules.
- `server.start({ port })` returns `{ browser, status, port, baseUrl, extensionUrl, instanceId }`.
- Throw when `browser` is null: `if (!state.browser) throw new Error('Puppet not ready: ' + state.status)`.
- `browser.pages()` lists all currently open browser tabs the extension can bind.
- `browser.newPage(url, options)` reuses a controlled tab by default; pass `{ newTab: true }` only for intentional extra tabs.
- Default navigation waits for `document`, meaning the page is scriptable. Use explicit `waitForSelector(...)` for app readiness and strict `load` only when every resource must finish.
- If strict `load` or network idle times out, read the error message; it includes pending request URLs for Vite/module hangs.
- Use `await browser.close()` to close session pages opened by that browser.

SDK capabilities:
- Navigation: `page.goto`, `page.reload`, `page.setViewport`, `page.url`, `page.location`.
- Input: `page.click`, `page.dblclick`, `page.hover`, `page.type`, `page.keyboard.press`, `page.select`, `page.dragAndDrop`, `page.scroll`, `page.submit`.
- Query: `page.locator`, `page.contains`, `page.waitForSelector`, `locator.find`, `locator.closest`, `locator.text`, `locator.count`, `locator.exists`, `locator.attribute`, `locator.checked`.
- Network: `page.intercept`, `page.waitForRequest`, `page.waitForResponse`, `page.waitForGraphql`, `page.setRequestInterception`, `page.on('request')`.
- Data: `page.evaluate`, `page.html`, `page.data`, `page.screenshot`, `page.frames`, `page.iframes`, `page.request`, `page.graphql`, `page.localStorage`.
- Diff: `page.compare(otherPage)` and `page.compareSelector(selector, otherPage.selectorTree(selector), { compact: true })`.

Output rules:
- `classes`, `snapshot.classes`, `snapshot.style`, `diff.classes_diff`, `diff.styles_diff`, tree `styles`, and tree diff `styles` are key-value objects.
- `diff.classes_diff[className]` is `applied` or `missing class`.
- `diff.styles_diff[propertyName]` is that side's changed computed value.
- `runs` is keyed by viewport like `runs["1024x700"]`.
- `snapshot` is omitted unless `"snapshot": true` is passed.
- large REST/CLI payloads are stored in `~/.puppet/artifacts` and summarized by default.

Troubleshooting:
- `server_ready_no_instance` means the server is healthy but no extension instance is registered.
- If the background worker is stuck, open the sidepanel lamp popup and click `Restart background worker`.
- `Timed out waiting for script run` means the CLI/server returned correctly; split or raise `--timeout-ms` if the browser work is expected to be long.
- For custom ports, keep the URL-bound extension page open for that port.
