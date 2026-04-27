import assert from 'node:assert/strict';
import server, { Browser } from '../sdk/index.mjs';

const state = await server.start({ keepPagesOpen: true, port: 4017 });
if (!state.browser) throw new Error(`Puppet not ready: ${state.status}. Reload the installed extension or bind the custom-port extension page.`);
const leftClient = new Browser(state.baseUrl).setInstanceId(state.instanceId);
const rightClient = new Browser(state.baseUrl).setInstanceId(state.instanceId);

try {
    const leftPage = await leftClient.newPage('https://example.com/', { waitUntil: 'load' });
    const rightPage = await rightClient.newPage('https://example.com/', { waitUntil: 'load' });
    assert.notEqual(leftPage.pageId, rightPage.pageId);
    assert.notEqual(leftPage.tabId, rightPage.tabId);
    await Promise.all([
        leftPage.goto('https://www.iana.org/domains/reserved', { waitUntil: 'load' }),
        rightPage.goto('https://www.wikipedia.org/', { waitUntil: 'load' })
    ]);
    const leftUrl = await leftPage.url();
    const rightUrl = await rightPage.url();
    assert.ok(leftUrl.includes('iana.org'));
    assert.ok(rightUrl.includes('wikipedia.org'));
    assert.notEqual(leftUrl, rightUrl);

    let sharedLeft = null;
    let sharedRight = null;
    for (const item of await leftClient.pages()) if (item.tabId === leftPage.tabId) sharedLeft = item;
    for (const item of await rightClient.pages()) if (item.tabId === leftPage.tabId) sharedRight = item;
    if (!(sharedLeft && sharedRight)) throw new Error('Could not bind the same explicit shared page in both clients.');

    const consoleLeft = [];
    const consoleRight = [];
    sharedLeft.on('console', (event) => consoleLeft.push(event.text()));
    sharedRight.on('console', (event) => consoleRight.push(event.text()));
    await sharedLeft.debugger.start();
    await sharedRight.debugger.start();
    await Promise.all([
        sharedLeft.console.write(`console.log('shared-one'); fetch(location.href + '?left=' + Date.now()).then((response) => console.log('shared-left', response.status));`),
        sharedRight.console.write(`console.log('shared-two'); fetch(location.href + '?right=' + Date.now()).then((response) => console.log('shared-right', response.status));`)
    ]);
    await sharedLeft.waitForConsole('shared-left');
    await sharedRight.waitForConsole('shared-right');
    await sharedLeft.debugger.stop();
    await sharedRight.console.write(`console.log('shared-after-stop')`);
    await sharedRight.waitForConsole('shared-after-stop');

    const requests = await sharedRight.network.requests({ limit: 20 });
    let requestCount = 0;
    for (const item of requests) if (`${item.url || ''}`.includes('iana.org')) requestCount += 1;
    assert.ok(consoleLeft.includes('shared-one'));
    assert.ok(consoleRight.includes('shared-two'));
    assert.ok(consoleRight.includes('shared-after-stop'));
    assert.ok(requestCount > 0);

    console.log(JSON.stringify({
        ok: true,
        isolated: { leftPageId: leftPage.pageId, leftTabId: leftPage.tabId, leftUrl, rightPageId: rightPage.pageId, rightTabId: rightPage.tabId, rightUrl },
        shared: { consoleLeft: consoleLeft.length, consoleRight: consoleRight.length, pageId: sharedLeft.pageId, requestCount, tabId: sharedLeft.tabId }
    }, null, 2));
} finally {
    await leftClient.close();
    await rightClient.close();
    server.stop();
}
