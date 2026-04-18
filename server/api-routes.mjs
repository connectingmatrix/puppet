import express from 'express';
import { listPages, readLivePage } from './live-store.mjs';
import { runScript } from './script-runner.mjs';
import { createJob, listInstances } from './store.mjs';

const router = express.Router();
const readTimeout = (body) => Number(body.timeoutMs) || (body.sizes ? 180000 : 45000);
const readPageInstance = (pageId = '') => {
    const page = readLivePage(pageId);
    return page ? page.instanceId : '';
};
const readJobInstance = (body) => body.instanceId || readPageInstance(body.pageId || '') || readPageInstance(body.leftPageId || '') || readPageInstance(body.rightPageId || '');
const readBaseUrl = (request) => `${request.protocol}://${request.get('host')}`;
const runLegacyJob = async (response, kind, payload, body) => {
    try {
        const result = await createJob(kind, payload, body.instanceId || '', readTimeout(body));
        response.json({ ok: true, ...result });
    } catch (error) {
        response.status(409).json({ error: error.message, ok: false });
    }
};
const runLiveJob = async (response, kind, payload, body) => {
    try {
        const result = await createJob(kind, payload, readJobInstance(body), readTimeout(body));
        response.json({ ok: true, ...result.result });
    } catch (error) {
        response.status(409).json({ error: error.message, ok: false });
    }
};

router.get('/health', (_request, response) => response.json({ ok: true }));
router.get('/instances', (_request, response) => response.json({ items: listInstances(), ok: true }));
router.get('/pages/active', (request, response) => response.json({ items: listPages(request.query.sessionId || ''), ok: true }));
router.get('/pages/browser', async (request, response) => {
    try {
        const result = await createJob('pages-browser', { sessionId: request.query.sessionId || '' }, `${request.query.instanceId || ''}`, 45000);
        response.json({ ok: true, ...result.result });
    } catch (error) {
        response.status(409).json({ error: error.message, ok: false });
    }
});
router.post('/compare/pages', (request, response) => runLegacyJob(response, 'compare-pages', { actions: request.body.actions || [], leftUrl: request.body.leftUrl, path: request.body.path || 'root', rightUrl: request.body.rightUrl, selector: request.body.selector || 'body', sizes: request.body.sizes, snapshot: Boolean(request.body.snapshot) }, request.body));
router.post('/compare/selector', (request, response) => runLegacyJob(response, 'compare-selector', { actions: request.body.actions || [], leftUrl: request.body.leftUrl, rightUrl: request.body.rightUrl, selector: request.body.selector, sizes: request.body.sizes, snapshot: Boolean(request.body.snapshot) }, request.body));
router.post('/inspect/selector', (request, response) => runLegacyJob(response, 'inspect-selector', { actions: request.body.actions || [], path: request.body.path || 'root', selector: request.body.selector, snapshot: Boolean(request.body.snapshot), url: request.body.url }, request.body));
router.post('/pages/open', (request, response) => runLiveJob(response, 'pages-open', { actions: request.body.actions || [], pages: request.body.pages || [], sessionId: request.body.sessionId || crypto.randomUUID(), snapshot: Boolean(request.body.snapshot) }, request.body));
router.post('/pages/actions', (request, response) => runLiveJob(response, 'pages-actions', { actions: request.body.actions || [] }, request.body));
router.post('/pages/diff', (request, response) => runLiveJob(response, 'pages-diff', { leftPageId: request.body.leftPageId, leftSelector: request.body.leftSelector || request.body.selector, path: request.body.path || 'root', rightPageId: request.body.rightPageId, rightSelector: request.body.rightSelector || request.body.selector, selector: request.body.selector, snapshot: Boolean(request.body.snapshot) }, request.body));
router.post('/pages/data', (request, response) => runLiveJob(response, 'pages-data', { pageId: request.body.pageId, path: request.body.path || 'root', selector: request.body.selector, snapshot: Boolean(request.body.snapshot) }, request.body));
router.post('/pages/frames', (request, response) => runLiveJob(response, 'pages-frames', { pageId: request.body.pageId }, request.body));
router.post('/pages/html', (request, response) => runLiveJob(response, 'pages-html', { frameId: request.body.frameId || 0, index: request.body.index || 0, pageId: request.body.pageId, selector: request.body.selector || '' }, request.body));
router.post('/pages/run', async (request, response) => {
    try {
        const result = await runScript(readBaseUrl(request), request.body || {});
        response.json({ ok: true, ...result });
    } catch (error) {
        response.status(409).json({ error: error.message, ok: false });
    }
});
router.post('/pages/screenshot', (request, response) => runLiveJob(response, 'pages-screenshot', { current: Boolean(request.body.current) || request.body.fullPage === false, pageId: request.body.pageId, selector: request.body.selector || '' }, request.body));
router.post('/pages/close', (request, response) => runLiveJob(response, 'pages-close', { pageId: request.body.pageId }, request.body));

export default router;
