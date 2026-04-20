import express from 'express';
import { readCompactResult } from './compact-result.mjs';
import { readLivePage, savePage } from './live-store.mjs';
import { runRouteCompare } from './route-compare.mjs';
import { runScript } from './script-runner.mjs';
import { readActions, readSnapshotFlag } from './snapshot-policy.mjs';
import { createJob, listInstances } from './store.mjs';

const router = express.Router();
const readTimeout = (body) => Number(body.timeoutMs) || (body.sizes ? 180000 : 45000);
const readPageInstance = (pageId = '') => {
    const page = readLivePage(pageId);
    return page ? page.instanceId : '';
};
const readJobInstance = (body) => body.instanceId || readPageInstance(body.pageId || '') || readPageInstance(body.leftPageId || '') || readPageInstance(body.rightPageId || '');
const readBaseUrl = (request) => `${request.protocol}://${request.get('host')}`;
const send = async (request, response, kind, value) => response.json(await readCompactResult(kind, value, request));
const syncBrowserPages = (value = {}) => {
    for (const item of value.items || []) savePage(item);
    return value;
};
const sendBrowserPages = async (request, response, kind) => {
    try {
        const result = await createJob('pages-browser', { sessionId: request.query.sessionId || '' }, `${request.query.instanceId || ''}`, 45000);
        await send(request, response, kind, syncBrowserPages({ ok: true, ...result.result }));
    } catch (error) {
        response.status(409).json({ error: error.message, ok: false });
    }
};
const runLegacyJob = async (request, response, kind, payload, body) => {
    try {
        const result = await createJob(kind, payload, body.instanceId || '', readTimeout(body));
        await send(request, response, kind, { ok: true, ...result });
    } catch (error) {
        response.status(409).json({ error: error.message, ok: false });
    }
};
const runLiveJob = async (request, response, kind, payload, body) => {
    try {
        const result = await createJob(kind, payload, readJobInstance(body), readTimeout(body));
        await send(request, response, kind, { ok: true, ...result.result });
    } catch (error) {
        response.status(409).json({ error: error.message, ok: false });
    }
};

router.get('/health', (_request, response) => response.json({ ok: true }));
router.get('/instances', (request, response) => send(request, response, 'instances', { items: listInstances(), ok: true }));
router.get('/pages/active', (request, response) => sendBrowserPages(request, response, 'pages-active'));
router.get('/pages/browser', (request, response) => sendBrowserPages(request, response, 'pages-browser'));
router.post('/compare/routes', async (request, response) => {
    try {
        const result = await runRouteCompare(readBaseUrl(request), request.body || {});
        await send(request, response, 'compare-routes', { ok: true, ...result });
    } catch (error) {
        response.status(409).json({ error: error.message, ok: false });
    }
});
router.post('/compare/pages', (request, response) => runLegacyJob(request, response, 'compare-pages', { actions: readActions(request.body.actions), leftUrl: request.body.leftUrl, path: request.body.path || 'root', rightUrl: request.body.rightUrl, selector: request.body.selector || 'body', sizes: request.body.sizes, snapshot: readSnapshotFlag() }, request.body));
router.post('/compare/selector', (request, response) => runLegacyJob(request, response, 'compare-selector', { actions: readActions(request.body.actions), leftUrl: request.body.leftUrl, rightUrl: request.body.rightUrl, selector: request.body.selector, sizes: request.body.sizes, snapshot: readSnapshotFlag() }, request.body));
router.post('/inspect/selector', (request, response) => runLegacyJob(request, response, 'inspect-selector', { actions: readActions(request.body.actions), path: request.body.path || 'root', selector: request.body.selector, snapshot: readSnapshotFlag(), url: request.body.url }, request.body));
router.post('/pages/open', (request, response) => runLiveJob(request, response, 'pages-open', { actions: readActions(request.body.actions), pages: request.body.pages || [], sessionId: request.body.sessionId || crypto.randomUUID(), snapshot: readSnapshotFlag() }, request.body));
router.post('/pages/actions', (request, response) => runLiveJob(request, response, 'pages-actions', { actions: readActions(request.body.actions) }, request.body));
router.post('/pages/diff', (request, response) => runLiveJob(request, response, 'pages-diff', { leftPageId: request.body.leftPageId, leftSelector: request.body.leftSelector || request.body.selector, path: request.body.path || 'root', rightPageId: request.body.rightPageId, rightSelector: request.body.rightSelector || request.body.selector, selector: request.body.selector, snapshot: readSnapshotFlag() }, request.body));
router.post('/pages/data', (request, response) => runLiveJob(request, response, 'pages-data', { pageId: request.body.pageId, path: request.body.path || 'root', selector: request.body.selector, snapshot: readSnapshotFlag() }, request.body));
router.post('/pages/frames', (request, response) => runLiveJob(request, response, 'pages-frames', { pageId: request.body.pageId }, request.body));
router.post('/pages/html', (request, response) => runLiveJob(request, response, 'pages-html', { frameId: request.body.frameId || 0, index: request.body.index || 0, pageId: request.body.pageId, selector: request.body.selector || '' }, request.body));
router.post('/pages/run', async (request, response) => {
    try {
        const result = await runScript(readBaseUrl(request), request.body || {});
        await send(request, response, 'pages-run', { ok: true, ...result });
    } catch (error) {
        response.status(409).json({ error: error.message, ok: false });
    }
});
router.post('/pages/screenshot', (request, response) => runLiveJob(request, response, 'pages-screenshot', { current: Boolean(request.body.current) || request.body.fullPage === false, pageId: request.body.pageId, selector: request.body.selector || '' }, request.body));
router.post('/pages/release', (request, response) => runLiveJob(request, response, 'pages-release', { pageId: request.body.pageId }, request.body));
router.post('/pages/close', (request, response) => runLiveJob(request, response, 'pages-close', { pageId: request.body.pageId }, request.body));

export default router;
