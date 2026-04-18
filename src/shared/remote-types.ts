import { PageAction } from '@/src/shared/page-action';
import { LivePage, OpenPagesPayload, PageActionsPayload, PageBrowserPayload, PageClosePayload, PageDataPayload, PageDiffPayload, PageFramesPayload, PageHtmlPayload, PageRunPayload, PageScreenshotPayload } from '@/src/shared/page-session';

export interface RemoteSettings {
    debugForeground: boolean;
    remoteEnabled: boolean;
    serverUrl: string;
    updatedAt: number;
}

export interface RemoteEvent {
    at: number;
    text: string;
    tone: 'base' | 'warn' | 'danger';
}

export interface RemoteInstance {
    browserId: string;
    connectedAt: number;
    events: RemoteEvent[];
    extensionId: string;
    extensionUrl: string;
    id: string;
    lastSeen: number;
    pageUrl: string;
    socketId: string;
    status: 'connected' | 'connecting' | 'disconnected';
}

export interface RemoteMessage {
    data?: Record<string, unknown>;
    error?: string;
    id?: string;
    instance?: RemoteInstance;
    instanceId?: string;
    jobId?: string;
    kind?: RemoteJobKind;
    name?: string;
    payload?: Record<string, unknown>;
    progress?: string;
    result?: Record<string, unknown>;
    sessionId?: string;
    type: string;
}

export type RemoteJobKind = 'compare-pages' | 'compare-selector' | 'inspect-selector' | 'pages-actions' | 'pages-active' | 'pages-browser' | 'pages-close' | 'pages-data' | 'pages-diff' | 'pages-frames' | 'pages-html' | 'pages-open' | 'pages-run' | 'pages-screenshot';
export interface ScreenSize {
    height: number;
    name: string;
    width: number;
}

export type ScreenSizeInput = 'all' | ScreenSize[];

export interface ComparePagesPayload {
    actions?: PageAction[];
    leftUrl: string;
    path: string;
    rightUrl: string;
    selector: string;
    snapshot?: boolean;
    sizes?: ScreenSizeInput;
}

export interface CompareSelectorPayload {
    actions?: PageAction[];
    leftUrl: string;
    rightUrl: string;
    selector: string;
    snapshot?: boolean;
    sizes?: ScreenSizeInput;
}

export interface InspectSelectorPayload {
    actions?: PageAction[];
    path: string;
    snapshot?: boolean;
    selector: string;
    url: string;
}

export interface RemoteJob {
    id: string;
    kind: RemoteJobKind;
    payload: Record<string, unknown>;
}

export const remoteSettingsKey = 'remote-settings';
export const remoteServerUrl = 'http://127.0.0.1:4017';
export const presetSizes: ScreenSize[] = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 1024, height: 1366 },
    { name: 'mobile', width: 390, height: 844 }
];

export type LiveJobPayload = ComparePagesPayload | CompareSelectorPayload | InspectSelectorPayload | OpenPagesPayload | PageActionsPayload | PageBrowserPayload | PageClosePayload | PageDataPayload | PageDiffPayload | PageFramesPayload | PageHtmlPayload | PageRunPayload | PageScreenshotPayload;
export type { LivePage };
