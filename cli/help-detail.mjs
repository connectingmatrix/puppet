const detail = `Puppet Detailed API Reference

Discovery:
  puppet help is the short menu. puppet help detail gives this reference. puppet help md or puppet api GET / prints README.md.

Server and instance APIs:
  GET  /api/health            Returns { ok }.
  GET  /api/instances         Returns connected extension instances with browserId, events, extensionUrl, pageUrl, socketId, status.
  puppet server start         Starts or reuses the listener and prints health plus instances.
  puppet server status        Prints health plus instances without starting a new process.
  puppet instances            CLI wrapper for GET /api/instances. puppet extension open binds configured URL to custom ports.
  puppet configure URL        Stores the extension sidepanel URL in ~/.puppet/config.json.
  WS   /api/live and /api/socket are client and extension socket control channels.

Live page APIs:
  GET  /api/pages/active      Returns { ok, items } for live pages. Use --session-id with CLI.
  GET  /api/pages/browser     Returns all visible browser tabs as bindable pages.
  POST /api/pages/open        Body { pages, sessionId?, snapshot?, actions? }. Returns { sessionId, pages }.
  POST /api/pages/actions     Body { actions }. Returns { results }.
  POST /api/pages/data        Body { pageId, selector, path?, snapshot?, raw? }. Compact by default when large.
  POST /api/pages/diff        Body { leftPageId, rightPageId, selector, path?, snapshot?, raw? }. Compact by default when large.
  POST /api/pages/html        Body { pageId, selector?, frameId?, index?, raw? }. Compact by default when large.
  POST /api/pages/frames      Body { pageId }. Returns frame metadata.
  POST /api/pages/screenshot Body { pageId, selector?, current?, raw? }. Compact by default when large.
  POST /api/pages/close       Body { pageId }. Returns { pageId }.
  POST /api/pages/run         Body { script, sessionId?, pages?, args?, timeoutMs?, closeOnExit?, raw? }. Compact by default when large.

Legacy one-shot APIs:
  POST /api/compare/routes    Body { oldBase, currentBase, routes, selectors?, artifactPath?, waitUntil?, settleMs? }. Returns compact summary and artifactPath.
  POST /api/compare/pages     Body { leftUrl, rightUrl, selector?, path?, sizes?, snapshot?, actions? }.
  POST /api/compare/selector  Body { leftUrl, rightUrl, selector, sizes?, snapshot?, actions? }.
  POST /api/inspect/selector  Body { url, selector, path?, snapshot?, actions? }.

CLI API equivalents:
  puppet pages open --json '{"pages":[{"url":"https://example.com","waitUntil":"load"}]}'
  puppet pages active --session-id SESSION
  puppet pages browser
  puppet pages actions --json '{"actions":[{"type":"click","pageId":"PAGE","selector":"button"}]}'
  puppet pages data --json '{"pageId":"PAGE","selector":"body"}'
  puppet pages diff --json '{"leftPageId":"LEFT","rightPageId":"RIGHT","selector":"body"}'
  puppet pages html --json '{"pageId":"PAGE","selector":"main"}'
  puppet pages frames --json '{"pageId":"PAGE"}'; puppet pages screenshot --json '{"pageId":"PAGE","current":true}'
  puppet pages close --json '{"pageId":"PAGE"}'
  puppet compare routes --json '{"oldBase":"http://127.0.0.1:64925","currentBase":"http://127.0.0.1:5001","routes":["/dashboard","/settings"]}'
  puppet run ./script.mjs --timeout-ms 180000
  puppet exec --eval "const state = await server.start({port:4017}); return state.status"
  puppet configure chrome-extension://EXTENSION_ID/sidepanel.html
  puppet extension open --port 4021
  puppet api METHOD /api/path --json '{}'

Action types:
  Input: click, dblclick via clickCount, hover, type_text, send_key, select_option, drag_drop, scroll, submit, upload_files.
  Page: wait_for_selector, reload_page, navigate_to_url, change_screen_size, execute_script, close_page.
  Capture/diff: get_page_data, get_page_diff, get_page_html, screenshot_page, record_start, record_stop.
  Network: intercept_request, set_request_interception, resolve_request.

SDK browser helpers and returns:
  server.start({ port }) -> { browser, status, port, baseUrl, extensionUrl, instanceId }.
  browser.newPage(url?, options?) -> Page. Reuses a controlled page unless newTab or reuse:false is passed.
  browser.pages() -> Page[] for visible tabs. browser.sessionPages() -> Page[] for the current session.
  browser.close() -> closes session pages and clears live socket state.

SDK page helpers and returns:
  page.goto(url, options?), page.reload(options?), page.setViewport(size) -> public page metadata.
  page.waitForSelector(selector, options?) -> ElementHandle.
  page.locator(selector) -> Locator.
  page.contains(text) or page.contains(selector, text) -> ElementHandle.
  page.click/type/select/scroll/submit/hover/dblclick/dragAndDrop -> action result data.
  page.keyboard.press(key) -> { key }.
  page.evaluate(fnOrScript, ...args) -> serializable page-context result.
  page.html(selector?) -> { ok, pageId, html, selector, url }.
  page.data(selector, { snapshot, compact }) -> selector detail and optional snapshot.
  page.screenshot({ path?, selector?, current? }) -> writes path when supplied and omits base64 from the returned object unless raw:true is passed.
  page.compare(page2, options?) and page.compareSelector(selector, page2.selectorTree(selector), options?) -> compare result.
  page.frames(), page.iframes() -> frame metadata array. page.frame(frameId), page.iframe[frameId] -> frame-scoped Page.
  page.request(options) -> HTTP response data from current session context.
  page.graphql(query, options) -> GraphQL response data.
  page.localStorage.get/set/remove/all -> localStorage values.

Locator and handle helpers:
  locator.click/fill/press/wait/waitHandle/html/data/screenshot/uploadFile -> page action or capture result.
  locator.find(selector) -> nested Locator. locator.closest(selector) -> ElementHandle.
  locator.text() -> string. locator.count() -> number. locator.exists() -> boolean.
  locator.attribute(name) -> string. locator.outerHeight() -> number. locator.checked() -> boolean.
  handle.evaluate(fn) -> serializable element result. handle.click() -> action result. handle.uploadFile(files) -> upload result.

Network helpers:
  page.setRequestInterception(true) -> enables callback interception.
  page.on('request', request => request.continue() || request.abort() || request.respond()).
  request.url(), request.method(), request.isInterceptResolutionHandled() -> primitive values.
  page.intercept(match, { alias, mode, status, headers, body }) -> alias/rule result.
  page.waitForRequest(match), page.waitForResponse(match), page.waitForGraphql(match) -> matching network event.

Output rules:
  Use puppet compare routes for broad old-vs-current UI route checks. It returns per-route body/count/style summary keys and writes full details to artifactPath.
  Large REST/CLI payloads return { compact:true, summary, artifact }. Read artifact.path only when a full payload is truly needed.
  SDK helpers request raw data internally so scripts can inspect data; /api/pages/run compacts the final returned value by default.
  Prefer page.evaluate() for targeted facts. Avoid snapshot:true, full HTML, screenshots, and all-size compare unless necessary.
  classes, snapshot.classes, snapshot.style, diff.classes_diff, diff.styles_diff, tree styles, and tree diff styles are key-value objects.
  snapshot is omitted unless snapshot:true is requested.
  runs are keyed by viewport, for example runs["1024x700"].`;

export const helpDetailCommand = () => {
    console.log(detail);
};
