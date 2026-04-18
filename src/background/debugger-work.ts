import { ensureDebugEvents } from '@/src/background/debug-live-work';
import { ensureNetworkEvents } from '@/src/background/network-event-work';
import { ensureInterceptWork } from '@/src/background/intercept-work';
import { ScreenSize } from '@/src/shared/remote-types';

const attached = new Set<number>();
const enabled = new Set<number>();
const version = '1.3';
const readTarget = (tabId: number) => ({ tabId });

export const ensureDebugTab = async (tabId: number) => {
    ensureDebugEvents();
    ensureNetworkEvents();
    ensureInterceptWork();
    if (!attached.has(tabId)) {
        await chrome.debugger.attach(readTarget(tabId), version);
        attached.add(tabId);
    }
    if (enabled.has(tabId)) return;
    await chrome.debugger.sendCommand(readTarget(tabId), 'Page.enable');
    await chrome.debugger.sendCommand(readTarget(tabId), 'Runtime.enable');
    await chrome.debugger.sendCommand(readTarget(tabId), 'Network.enable');
    enabled.add(tabId);
};

export const sendDebug = async (tabId: number, method: string, command = {}) => {
    await ensureDebugTab(tabId);
    return chrome.debugger.sendCommand(readTarget(tabId), method, command);
};

export const resizeViewport = async (tabId: number, size: ScreenSize) => {
    await sendDebug(tabId, 'Emulation.setDeviceMetricsOverride', {
        deviceScaleFactor: 1,
        dontSetVisibleSize: false,
        height: size.height,
        mobile: false,
        screenHeight: size.height,
        screenWidth: size.width,
        width: size.width
    });
};

export const clearViewport = async (tabId: number) => {
    if (!attached.has(tabId)) return;
    await chrome.debugger.sendCommand(readTarget(tabId), 'Emulation.clearDeviceMetricsOverride');
};

const readFullClip = async (tabId: number) => {
    const metrics = await sendDebug(tabId, 'Page.getLayoutMetrics');
    const size = metrics.cssContentSize || metrics.contentSize || {};
    return { height: Math.max(size.height || 1, 1), scale: 1, width: Math.max(size.width || 1, 1), x: 0, y: 0 };
};

export const captureScreenshot = async (tabId: number, clip = null, current = false) => {
    const nextClip = clip || current ? clip : await readFullClip(tabId);
    const command = nextClip ? { captureBeyondViewport: true, clip: nextClip, format: 'png', fromSurface: true } : { format: 'png', fromSurface: true };
    const result = await sendDebug(tabId, 'Page.captureScreenshot', command);
    return result.data || '';
};

export const readPageStats = async (tabId: number) => {
    await sendDebug(tabId, 'Performance.enable');
    const heap = await sendDebug(tabId, 'Runtime.getHeapUsage');
    const report = await sendDebug(tabId, 'Performance.getMetrics');
    let cpu = 0;
    for (const item of report.metrics || []) if (item.name === 'TaskDuration') cpu = item.value || 0;
    return { cpu, heapUsage: heap.usedSize || 0, ram: heap.totalSize || 0 };
};

export const closeDebugTab = async (tabId: number) => {
    if (!attached.has(tabId)) return;
    await clearViewport(tabId);
    await chrome.debugger.detach(readTarget(tabId));
    attached.delete(tabId);
    enabled.delete(tabId);
};
