import { helpDetailCommand } from './help-detail.mjs';
import { helpMdCommand } from './help-md.mjs';

const main = `Puppet CLI

Usage:
  puppet server start [--port 4017]
  puppet configure chrome-extension://EXTENSION_ID/sidepanel.html
  puppet configure show
  puppet server foreground [--port 4017]; puppet server status [--port 4017]
  puppet instances [--port 4017]
  puppet pages open --json '{"pages":[{"url":"https://example.com"}]}'
  puppet pages actions --json '{"actions":[{"type":"click","pageId":"...","selector":"button"}]}'
  puppet compare routes --json '{"oldBase":"http://127.0.0.1:64925","currentBase":"http://127.0.0.1:5001","routes":["/dashboard"]}'
  puppet run ./script.mjs [--port 4017] [--timeout-ms 120000]
  puppet run ./script.mjs --keep-pages-open
  puppet exec --eval "const state = await server.start(); return state.status"
  puppet api GET /api/health
  puppet api POST /api/pages/data --json '{"pageId":"...","selector":"body"}'
  puppet help detail
  puppet help md

Global options:
  --port <port>       Target local server port. Default: 4017
  --server <url>      Target full server URL.
  --json <json>       Request JSON body.
  --file <path>       Read request JSON from a file. --stdin reads request JSON from stdin.

Help:
  puppet configure    Stores the extension URL in ~/.puppet/config.json.
  Default API output is compact. Large full JSON is written to ~/.puppet/artifacts; pass "raw":true only when necessary.
  Prefer SDK selector helpers such as page.find, page.$$eval, locator.$$eval, and locator.clickChild before page.evaluate for DOM work.
  puppet help detail  Lists all APIs, CLI usage, helper functions, and return shapes.
  puppet help md      Prints the current README.md integration guide.
  puppet help COMMAND Prints focused examples for pages, run, compare, or server.`;

const pages = `Puppet page API commands

Commands:
  puppet pages open --json '{"pages":[{"role":"page","url":"https://example.com","waitUntil":"load"}]}'
  puppet pages active [--session-id SESSION]
  puppet pages browser
  puppet pages actions --json '{"actions":[{"type":"scroll","pageId":"...","deltaY":800}]}'
  puppet pages data --json '{"pageId":"...","selector":"body"}'
  puppet pages diff --json '{"leftPageId":"...","rightPageId":"...","selector":"body"}'
  puppet pages html --json '{"pageId":"...","selector":"main"}'; puppet pages screenshot --json '{"pageId":"...","path":"/tmp/shot.jpg"}'
  puppet pages release --json '{"pageId":"..."}'
  puppet pages close --json '{"pageId":"..."}'

Action array example:
  puppet pages actions --json '{"actions":[
    {"type":"wait_for_selector","pageId":"PAGE","selector":"input[name=q]","visible":true},
    {"type":"type_text","pageId":"PAGE","selector":"input[name=q]","value":"browser automation","clearFirst":true},
    {"type":"send_key","pageId":"PAGE","key":"Enter"}
  ]}'`;

const run = `Puppet script execution

Run a server-side SDK script:
  puppet run ./inspect.mjs --timeout-ms 180000
  puppet exec --eval "const state = await server.start({port:4017}); return state.status"

Script scope:
  args      Array passed in the JSON body.
  browser   Active browser object when connected.
  server    Object with start() and stop().
  console   Captured console object returned in logs.

Sample script:
  const state = await server.start({ port: 4017 });
  if (!state.browser) throw new Error('Puppet not ready: ' + state.status);
  const page = await state.browser.newPage('https://example.com');
  await page.waitForSelector('body');
  const link = await page.find('a', (node) => Boolean(node.href));
  const [body] = await page.locator('body').map((node) => ({ title: document.title, text: node.innerText.slice(0, 200) }));
  return { ...body, hasLink: Boolean(link) };`;

const compare = `Puppet compare and inspect

Commands:
  puppet compare routes --json '{"oldBase":"http://127.0.0.1:64925","currentBase":"http://127.0.0.1:5001","routes":["/dashboard","/settings"]}'
  puppet compare pages --json '{"leftUrl":"https://a.test","rightUrl":"https://b.test","selector":"body"}'
  puppet compare selector --json '{"leftUrl":"https://a.test","rightUrl":"https://b.test","selector":".app"}'
  puppet inspect selector --json '{"url":"https://example.com","selector":"body"}'

Route compare writes the full per-route artifact to .tmp and returns only summary keys by default.
Default output is compact when a payload is large. Add "raw":true only when code needs the full JSON.`;

const server = `Puppet server

Commands:
  puppet configure chrome-extension://EXTENSION_ID/sidepanel.html
  puppet configure --extension-url chrome-extension://EXTENSION_ID/sidepanel.html; puppet configure show; puppet configure reset
  puppet server start --port 4017
  puppet server foreground --port 4017; puppet server status --port 4017
  puppet extension open --port 4021

The extension uses one background-worker socket per Chrome profile. For custom ports, save the server URL in the extension settings so the singleton background worker reconnects.`;

export const helpCommand = async (args) => {
    const key = args[0] || '';
    if (key === 'detail') return helpDetailCommand();
    if (key === 'md') return helpMdCommand();
    if (key === 'pages' || key === 'actions') return console.log(pages);
    if (key === 'run' || key === 'exec' || key === 'script') return console.log(run);
    if (key === 'compare' || key === 'inspect') return console.log(compare);
    if (key === 'server' || key === 'extension') return console.log(server);
    console.log(main);
};
