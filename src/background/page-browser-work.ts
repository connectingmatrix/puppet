import { readPageStats } from '@/src/background/debugger-work';
import { readTabPage, saveLivePage, saveTabPage } from '@/src/background/page-store';
import { readPublicPage } from '@/src/background/page-session-work';
import { LivePage } from '@/src/shared/page-session';

const keepTab = (url = '') => url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://') || url === 'about:blank';

const bindTab = async (instanceId: string, tab: chrome.tabs.Tab) => {
    const tabId = tab.id || 0;
    const current = readTabPage(tabId);
    const stats = await readPageStats(tabId);
    const values = { active: Boolean(tab.active), height: tab.height || 0, index: tab.index || 0, instanceId, pageName: tab.title || '', pageStats: stats, pageUrl: tab.url || '', status: 'ready', tabId, title: tab.title || '', url: tab.url || '', width: tab.width || 0, windowId: tab.windowId || 0 };
    if (current) return readPublicPage(saveTabPage(tabId, values) as LivePage);
    const page = saveLivePage({ ...values, pageId: crypto.randomUUID(), recordingIds: [], role: 'browser', sessionId: '' } as LivePage);
    return readPublicPage(page as LivePage);
};

export const listBrowserPages = async (instanceId: string) => {
    const tabs = await chrome.tabs.query({ windowType: 'normal' });
    const items = [];
    for (const tab of tabs) {
        if (!(tab.id && keepTab(tab.url || ''))) continue;
        items.push(await bindTab(instanceId, tab));
    }
    items.sort((left, right) => Number(right.active) - Number(left.active) || `${left.pageName || ''}`.localeCompare(`${right.pageName || ''}`));
    return items;
};
