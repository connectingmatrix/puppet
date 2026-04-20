import { readCompareResult, readInspectResult } from '@/src/background/result-shape';
import { listBrowserPages } from '@/src/background/page-browser-work';
import { bindPageActions, runLiveActions } from '@/src/background/page-action-work';
import { fetchPageRequest } from '@/src/background/page-request-work';
import { closeLiveSessionPage, listPageFrames, LiveEmit, openLivePages, readLiveHtml, readLiveShot, readPageState, readPublicPage, releaseLivePage } from '@/src/background/page-session-work';
import { captureLiveTab, capturePageTab } from '@/src/background/tab-work';
import { readSizes } from '@/src/shared/size-work';
import { ComparePagesPayload, CompareSelectorPayload, InspectSelectorPayload, RemoteJob } from '@/src/shared/remote-types';

const closePages = async (pages, emit: LiveEmit) => {
    for (const page of pages) await closeLiveSessionPage(page.pageId, emit);
};
const readPages = async (pages, selector: string, path: string) => {
    const left = await capturePageTab(pages[0].tabId || 0, selector, path);
    const right = await capturePageTab(pages[1].tabId || 0, selector, path);
    return { left, right };
};
const openTemp = (instanceId: string, urls, emit: LiveEmit) => openLivePages(instanceId, crypto.randomUUID(), urls, emit);

const readComparePair = async (instanceId: string, urls, actions, selector: string, path: string, snapshot: boolean, emit: LiveEmit) => {
    const pages = await openTemp(instanceId, urls, emit);
    try {
        if (actions && actions.length) await runLiveActions(bindPageActions(actions, pages), emit);
        const pair = await readPages(pages, selector, path);
        return readCompareResult(pair.left, pair.right, snapshot);
    } finally {
        await closePages(pages, emit);
    }
};

const readSizedCompare = async (instanceId: string, payload: ComparePagesPayload | CompareSelectorPayload, path: string, emit: LiveEmit) => {
    const pages = await openTemp(instanceId, [{ role: 'left', url: payload.leftUrl }, { role: 'right', url: payload.rightUrl }], emit);
    const runs = {};
    try {
        if (payload.actions && payload.actions.length) await runLiveActions(bindPageActions(payload.actions, pages), emit);
        for (const size of readSizes(payload.sizes)) {
            await runLiveActions([{ actionId: crypto.randomUUID(), height: size.height, pageId: pages[0].pageId, type: 'change_screen_size', width: size.width }, { actionId: crypto.randomUUID(), height: size.height, pageId: pages[1].pageId, type: 'change_screen_size', width: size.width }], emit);
            const pair = await readPages(pages, payload.selector || 'body', path);
            runs[`${size.width}x${size.height}`] = readCompareResult(pair.left, pair.right, Boolean(payload.snapshot));
        }
        return { runs };
    } finally {
        await closePages(pages, emit);
    }
};

const readInspect = async (instanceId: string, payload: InspectSelectorPayload, emit: LiveEmit) => {
    const pages = await openTemp(instanceId, [{ role: 'page', url: payload.url }], emit);
    try {
        if (payload.actions && payload.actions.length) await runLiveActions(bindPageActions(payload.actions, pages), emit);
        return readInspectResult(await capturePageTab(pages[0].tabId || 0, payload.selector, payload.path || 'root'), Boolean(payload.snapshot));
    } finally {
        await closePages(pages, emit);
    }
};

export const runRemoteJob = async (job: RemoteJob, instanceId: string, emit: LiveEmit) => {
    if (job.kind === 'compare-pages') {
        const payload = job.payload as ComparePagesPayload;
        if (payload.sizes) return readSizedCompare(instanceId, payload, payload.path || 'root', emit);
        return readComparePair(instanceId, [{ role: 'left', url: payload.leftUrl }, { role: 'right', url: payload.rightUrl }], payload.actions || [], payload.selector || 'body', payload.path || 'root', Boolean(payload.snapshot), emit);
    }
    if (job.kind === 'compare-selector') {
        const payload = job.payload as CompareSelectorPayload;
        if (payload.sizes) return readSizedCompare(instanceId, payload, 'root', emit);
        return readComparePair(instanceId, [{ role: 'left', url: payload.leftUrl }, { role: 'right', url: payload.rightUrl }], payload.actions || [], payload.selector, 'root', Boolean(payload.snapshot), emit);
    }
    if (job.kind === 'inspect-selector') return readInspect(instanceId, job.payload as InspectSelectorPayload, emit);
    if (job.kind === 'pages-open') {
        const payload = job.payload as any;
        const pages = await openLivePages(instanceId, payload.sessionId || crypto.randomUUID(), payload.pages || [], emit);
        if (payload.actions && payload.actions.length) await runLiveActions(bindPageActions(payload.actions, pages), emit);
        const items = [];
        for (const page of pages) items.push(readPublicPage(page));
        return { pages: items, sessionId: pages[0] ? pages[0].sessionId : payload.sessionId || '' };
    }
    if (job.kind === 'pages-browser') return { items: await listBrowserPages(instanceId) };
    if (job.kind === 'pages-actions') return { results: await runLiveActions((job.payload as any).actions || [], emit) };
    if (job.kind === 'pages-data') return readInspectResult(await captureLiveTab(readPageState((job.payload as any).pageId).tabId || 0, (job.payload as any).selector, (job.payload as any).path || 'root'), Boolean((job.payload as any).snapshot));
    if (job.kind === 'pages-diff') {
        const left = readPageState((job.payload as any).leftPageId);
        const right = readPageState((job.payload as any).rightPageId);
        return readCompareResult(await captureLiveTab(left.tabId || 0, (job.payload as any).leftSelector || (job.payload as any).selector, (job.payload as any).path || 'root'), await captureLiveTab(right.tabId || 0, (job.payload as any).rightSelector || (job.payload as any).selector, (job.payload as any).path || 'root'), Boolean((job.payload as any).snapshot));
    }
    if (job.kind === 'pages-frames') return { items: await listPageFrames((job.payload as any).pageId) };
    if (job.kind === 'pages-html') return readLiveHtml((job.payload as any).pageId, (job.payload as any).selector || '', (job.payload as any).frameId || 0, (job.payload as any).index || 0);
    if (job.kind === 'pages-request') return fetchPageRequest(job.payload as any);
    if (job.kind === 'pages-screenshot') return readLiveShot((job.payload as any).pageId, (job.payload as any).selector || '', Boolean((job.payload as any).current) || (job.payload as any).fullPage === false);
    if (job.kind === 'pages-release') return releaseLivePage((job.payload as any).pageId, emit);
    if (job.kind === 'pages-close') return closeLiveSessionPage((job.payload as any).pageId, emit);
    return readInspect(instanceId, job.payload as InspectSelectorPayload, emit);
};
