import { ensureDebugEvents } from '@/src/background/debug-live-work';
import { ensureNetworkEvents } from '@/src/background/network-event-work';
import { ensureInterceptWork } from '@/src/background/intercept-work';
import { ScreenSize } from '@/src/shared/remote-types';
import { runWithLimit } from '@/src/shared/time-limit';

const attached = new Set<number>();
const enabled = new Set<number>();
const version = '1.3';
const readTarget = (tabId: number) => ({ tabId });
const runCommand = (tabId: number, method: string, command = {}, timeoutMs = 45000) => runWithLimit(chrome.debugger.sendCommand(readTarget(tabId), method, command), timeoutMs, method);

export const ensureDebugTab = async (tabId: number) => {
    ensureDebugEvents();
    ensureNetworkEvents();
    ensureInterceptWork();
    if (!attached.has(tabId)) {
        await runWithLimit(chrome.debugger.attach(readTarget(tabId), version), 30000, 'debugger attach');
        attached.add(tabId);
    }
    if (enabled.has(tabId)) return;
    await runCommand(tabId, 'Page.enable');
    await runCommand(tabId, 'Runtime.enable');
    await runCommand(tabId, 'Network.enable');
    enabled.add(tabId);
};

export const sendDebug = async (tabId: number, method: string, command = {}, timeoutMs = 45000) => {
    await ensureDebugTab(tabId);
    return runCommand(tabId, method, command, timeoutMs);
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
    await runCommand(tabId, 'Emulation.clearDeviceMetricsOverride');
};

const readFullClip = async (tabId: number) => {
    const metrics = await sendDebug(tabId, 'Page.getLayoutMetrics');
    const size = metrics.cssContentSize || metrics.contentSize || {};
    return { height: Math.max(size.height || 1, 1), scale: 1, width: Math.max(size.width || 1, 1), x: 0, y: 0 };
};

const readCurrentClip = async (tabId: number) => {
    const metrics = await sendDebug(tabId, 'Page.getLayoutMetrics');
    const view = metrics.cssVisualViewport || metrics.visualViewport || {};
    return { height: Math.max(view.clientHeight || 1, 1), scale: 1, width: Math.max(view.clientWidth || 1, 1), x: Math.max(view.pageX || 0, 0), y: Math.max(view.pageY || 0, 0) };
};

export const readScreenshotMime = (format = 'jpeg') => format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';

const readNumber = (value, next: number) => Number.isFinite(Number(value)) ? Number(value) : next;
const readShot = (options: any = {}) => {
    const format = options.format === 'png' || options.format === 'webp' ? options.format : 'jpeg';
    return { format, maxHeight: readNumber(options.maxHeight, 2600), maxWidth: readNumber(options.maxWidth, 1100), quality: Math.max(1, Math.min(100, Math.round(readNumber(options.quality, 28)))), scale: readNumber(options.scale, 0) };
};
const readScaledClip = (clip, shot) => {
    if (!clip) return null;
    const width = Math.max(readNumber(clip.width, 1), 1);
    const height = Math.max(readNumber(clip.height, 1), 1);
    const scale = shot.scale || Math.max(0.35, Math.min(1, shot.maxWidth / width, shot.maxHeight / height));
    return { ...clip, height, scale: Math.min(1, scale), width };
};

export const captureScreenshot = async (tabId: number, clip = null, current = false, options: any = {}) => {
    const shot = readShot(options);
    const nextClip = readScaledClip(clip || (current ? await readCurrentClip(tabId) : await readFullClip(tabId)), shot);
    const command: any = { captureBeyondViewport: true, clip: nextClip, format: shot.format, fromSurface: true };
    if (shot.format === 'jpeg' || shot.format === 'webp') command.quality = shot.quality;
    const result = await sendDebug(tabId, 'Page.captureScreenshot', command, 90000);
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
    await runWithLimit(chrome.debugger.detach(readTarget(tabId)), 30000, 'debugger detach');
    attached.delete(tabId);
    enabled.delete(tabId);
};
