import { readPageStats } from '@/src/background/debugger-work';
import { readTabPage, saveLivePage, saveTabPage } from '@/src/background/page-store';
import { readPublicPage } from '@/src/background/page-session-work';
import { LivePage } from '@/src/shared/page-session';

const blockedTab = (url = '') => url.startsWith('https://chromewebstore.google.com/') || url.startsWith('https://chrome.google.com/webstore');
const keepTab = (url = '') => !blockedTab(url) && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://') || url === 'about:blank');
const readPageTargets = async () => {
    const targets = await chrome.debugger.getTargets();
    const items: chrome.debugger.TargetInfo[] = [];
    for (const target of targets) if (Number(target.tabId) > 0 && keepTab(target.url || '')) items.push(target);
    return items;
};

const bindTab = async (instanceId: string, tab: chrome.tabs.Tab) => {
    const tabId = tab.id || 0;
    const current = readTabPage(tabId);
    const stats = await readPageStats(tabId);
    const values = { active: Boolean(tab.active), height: tab.height || 0, index: tab.index || 0, instanceId, pageName: tab.title || '', pageStats: stats, pageUrl: tab.url || '', status: 'ready', tabId, title: tab.title || '', url: tab.url || '', width: tab.width || 0, windowId: tab.windowId || 0 };
    if (current) return readPublicPage(saveTabPage(tabId, values) as LivePage);
    const page = saveLivePage({ ...values, pageId: crypto.randomUUID(), recordingIds: [], role: 'browser', sessionId: '' } as LivePage);
    return readPublicPage(page as LivePage);
};
const bindTarget = async (instanceId: string, target: chrome.debugger.TargetInfo) => {
    const tab = await chrome.tabs.get(target.tabId || 0);
    if (!keepTab(tab.url || '')) return null;
    return bindTab(instanceId, { ...tab, title: target.title || tab.title, url: target.url || tab.url });
};

export const listBrowserPages = async (instanceId: string) => {
    const targets = await readPageTargets();
    const items = [];
    for (const target of targets) {
        const page = await bindTarget(instanceId, target);
        if (page) items.push(page);
    }
    items.sort((left, right) => Number(right.active) - Number(left.active) || `${left.pageName || ''}`.localeCompare(`${right.pageName || ''}`));
    return items;
};
