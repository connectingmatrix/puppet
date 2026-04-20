import { captureScreenshot, closeDebugTab, resizeViewport } from '@/src/background/debugger-work';
import { readPageFrames } from '@/src/background/page-frame-work';
import { dropLivePage, listLivePages, patchLivePage, readLivePage, saveLivePage } from '@/src/background/page-store';
import { closePageTab as closeTab, openPageTab, readPageBox, readPageHtml, readTabMeta } from '@/src/background/tab-work';
import { readRemoteSettings } from '@/src/shared/remote-store';
import { LivePage, PageOpenItem } from '@/src/shared/page-session';

export interface LiveEmit {
    (name: string, data: Record<string, unknown>, sessionId?: string): void;
}

const readPage = (pageId: string) => {
    const page = readLivePage(pageId);
    if (!page) throw new Error(`No active page matches ${pageId}`);
    return page;
};
export const readPublicPage = (page: LivePage) => ({ active: Boolean(page.active), height: page.height, index: page.index || 0, instanceId: page.instanceId, pageId: page.pageId, pageName: page.pageName, pageStats: page.pageStats, pageUrl: page.pageUrl, recordingIds: [...page.recordingIds], role: page.role, sessionId: page.sessionId, status: page.status, tabId: page.tabId || 0, title: page.title, url: page.url, width: page.width, windowId: page.windowId || 0 });
const readMeta = async (pageId: string, status = 'ready') => {
    const page = readPage(pageId);
    const meta = await readTabMeta(page.tabId || 0);
    return patchLivePage(pageId, { ...meta, pageName: meta.title, pageUrl: meta.url, status }) as LivePage;
};

export const openLivePages = async (instanceId: string, sessionId: string, items: PageOpenItem[], emit: LiveEmit) => {
    const settings = await readRemoteSettings();
    const pages: LivePage[] = [];
    emit('session.opened', { instanceId, sessionId }, sessionId);
    for (const item of items) {
        const pageId = crypto.randomUUID();
        const tabId = await openPageTab(item.url, settings.debugForeground, item.waitUntil || 'load');
        if (item.width && item.height) await resizeViewport(tabId, { height: item.height, name: item.role || 'page', width: item.width });
        const meta = await readTabMeta(tabId);
        const page = saveLivePage({ height: item.height || meta.height, instanceId, pageId, pageName: meta.title, pageStats: { cpu: 0, heapUsage: 0, ram: 0 }, pageUrl: meta.url, recordingIds: [], role: item.role || 'page', sessionId, status: 'ready', tabId, title: meta.title, url: meta.url, width: item.width || meta.width }) as LivePage;
        emit('page.opened', readPublicPage(page), sessionId);
        pages.push(page);
    }
    return pages;
};

export const listSessionPages = (sessionId = '') => listLivePages().filter((page) => !sessionId || page.sessionId === sessionId);

export const closeLiveSessionPage = async (pageId: string, emit: LiveEmit) => {
    const page = readPage(pageId);
    await closeTab(page.tabId || 0);
    dropLivePage(pageId);
    emit('page.closed', { pageId, sessionId: page.sessionId }, page.sessionId);
    return { pageId };
};
export const releaseLivePage = async (pageId: string, emit: LiveEmit) => {
    const page = readPage(pageId);
    await closeDebugTab(page.tabId || 0);
    dropLivePage(pageId);
    emit('page.closed', { pageId, sessionId: page.sessionId }, page.sessionId);
    return { pageId };
};

export const closeAllLivePages = async (emit: LiveEmit) => {
    const pages = listLivePages();
    for (const page of pages) await closeLiveSessionPage(page.pageId, emit);
};

export const updatePageStatus = (pageId: string, status: string) => patchLivePage(pageId, { status }) as LivePage;

export const refreshPageMeta = (pageId: string, status = 'ready') => readMeta(pageId, status);

export const readPageState = (pageId: string) => readPage(pageId);

export const readLiveHtml = async (pageId: string, selector = '', frameId = 0, index = 0) => {
    const page = await readMeta(pageId);
    return { html: await readPageHtml(page.tabId || 0, selector, frameId, index), pageId, selector, url: page.url };
};

export const readLiveShot = async (pageId: string, selector = '', current = false) => {
    const page = readPage(pageId);
    const box = selector ? await readPageBox(page.tabId || 0, selector) : null;
    const clip = box ? { height: Math.max(box.height, 1), scale: 1, width: Math.max(box.width, 1), x: Math.max(box.left, 0), y: Math.max(box.top, 0) } : null;
    return { dataBase64: await captureScreenshot(page.tabId || 0, clip, current), mimeType: 'image/png', pageId };
};

export const listPageFrames = async (pageId: string) => {
    const page = readPage(pageId);
    return readPageFrames(page.tabId || 0);
};
