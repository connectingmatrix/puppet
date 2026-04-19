#!/usr/bin/env node

const PUPPET_URL = process.env.PUPPET_URL || 'http://127.0.0.1:4017';
const APP_URL = process.env.APP_URL || 'http://localhost:5173/workflows';
const WORKFLOW_NAME = process.env.WORKFLOW_NAME || '';
const NODE_ID = process.env.NODE_ID || '';
const ACTION = process.argv[2] || 'open-designer';

const pageScript = `
const workflowName = ${JSON.stringify(WORKFLOW_NAME)};
const nodeId = ${JSON.stringify(NODE_ID)};
const page = await browser.newPage(${JSON.stringify(APP_URL)}, { waitUntil: 'load', width: 1680, height: 1050 });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitFor = (selector) => page.waitForSelector(selector, { timeoutMs: 30000 });
const click = async (selector) => { await waitFor(selector); await page.click(selector); };
const pickWorkflow = async () => {
    await waitFor('[data-cy^="workflow-record-"]');
    const result = await page.evaluate((name) => {
        const records = [...document.querySelectorAll('[data-cy^="workflow-record-"]')];
        const target = records.find((item) => item.dataset.workflowName === name) || records.find((item) => (item.dataset.workflowName || '').includes(name)) || records[0];
        if (!target) throw new Error('No workflow record found.');
        target.scrollIntoView({ block: 'center' });
        target.click();
        return { id: target.dataset.workflowId || '', name: target.dataset.workflowName || '' };
    }, workflowName);
    await sleep(500);
    return result;
};
const openDesigner = async () => {
    const record = await pickWorkflow();
    await click('[data-cy="open-workflow-designer"]');
    await waitFor('[data-cy="workflow-canvas"]');
    return record;
};
const nodeSelector = () => nodeId ? '[data-cy="workflow-node"][data-node-id="' + CSS.escape(nodeId) + '"]' : '[data-cy="workflow-node"]';
const openNodeInspector = async () => {
    const record = await openDesigner();
    await waitFor(nodeSelector());
    await page.dblclick(nodeSelector());
    await waitFor('[data-cy="workflow-node-inspector"]');
    return record;
};
const clickRunMenuItem = async (selector) => {
    await click('[data-cy="workflow-run-menu"]');
    await click(selector);
    await sleep(1000);
};
const snapshot = async () => page.evaluate(() => ({
    canvas: Boolean(document.querySelector('[data-cy="workflow-canvas"]')),
    inspector: Boolean(document.querySelector('[data-cy="workflow-node-inspector"]')),
    url: location.href
}));
`;

const actions = {
    'close-inspector': 'const record = await openNodeInspector(); await click("[data-cy=\\"workflow-inspector-action-close-node\\"]"); await sleep(500); return { record, snapshot: await snapshot() };',
    'export-workflow': 'const record = await openDesigner(); await click("[data-cy=\\"workflow-export-menu\\"]"); await click("[data-cy=\\"workflow-export-only\\"]"); return { record, snapshot: await snapshot() };',
    'open-designer': 'const record = await openDesigner(); return { record, snapshot: await snapshot() };',
    'open-node-inspector': 'const record = await openNodeInspector(); return { record, snapshot: await snapshot() };',
    'open-workflow': 'const record = await pickWorkflow(); return { record, snapshot: await snapshot() };',
    'play-local': 'const record = await openDesigner(); await clickRunMenuItem("[data-cy=\\"workflow-play-local\\"]"); return { record, snapshot: await snapshot() };',
    'play-server': 'const record = await openDesigner(); await clickRunMenuItem("[data-cy=\\"workflow-play-server\\"]"); return { record, snapshot: await snapshot() };',
    'run-node': 'const record = await openNodeInspector(); await click("[data-cy=\\"workflow-inspector-action-run-node\\"]"); await sleep(1000); return { record, snapshot: await snapshot() };',
    'save-node': 'const record = await openNodeInspector(); await click("[data-cy=\\"workflow-inspector-action-save-changes\\"]"); await sleep(500); return { record, snapshot: await snapshot() };'
};

if (!actions[ACTION]) throw new Error(`Unknown Puppet workflow action "${ACTION}".`);

const response = await fetch(`${PUPPET_URL}/api/pages/run`, {
    body: JSON.stringify({
        closeOnExit: false,
        script: `${pageScript}\n${actions[ACTION]}`,
        timeoutMs: 120000
    }),
    headers: { 'content-type': 'application/json' },
    method: 'POST'
});
const data = await response.json();
if (!response.ok || !data.ok) throw new Error(data.error || `Puppet action failed with ${response.status}.`);
console.log(JSON.stringify(data.summary || data.result || data, null, 2));
