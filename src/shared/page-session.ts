import { PageAction } from '@/src/shared/page-action';

export interface PageOpenItem {
    frameId?: number;
    height?: number;
    role?: string;
    url: string;
    waitUntil?: string;
    width?: number;
}

export interface PageStats {
    cpu: number;
    heapUsage: number;
    ram: number;
}

export interface LivePage {
    height: number;
    instanceId: string;
    pageId: string;
    pageName: string;
    pageStats: PageStats;
    pageUrl: string;
    recordingIds: string[];
    role: string;
    sessionId: string;
    status: string;
    tabId?: number;
    title: string;
    url: string;
    width: number;
}

export interface OpenPagesPayload {
    actions?: PageAction[];
    pages: PageOpenItem[];
    sessionId?: string;
    snapshot?: boolean;
}

export interface PageActionsPayload {
    actions: PageAction[];
}

export interface PageClosePayload {
    pageId: string;
}

export interface PageDataPayload {
    pageId: string;
    path?: string;
    selector: string;
    snapshot?: boolean;
}

export interface PageDiffPayload {
    leftPageId: string;
    path?: string;
    rightPageId: string;
    selector: string;
    snapshot?: boolean;
}

export interface PageHtmlPayload {
    frameId?: number;
    index?: number;
    pageId: string;
    selector?: string;
}

export interface PageFramesPayload {
    pageId: string;
}

export interface PageBrowserPayload {
    sessionId?: string;
}

export interface PageScreenshotPayload {
    current?: boolean;
    fullPage?: boolean;
    pageId: string;
    selector?: string;
}

export interface PageRunPayload {
    args?: unknown[];
    closeOnExit?: boolean;
    pages?: PageOpenItem[];
    script: string;
    sessionId?: string;
    timeoutMs?: number;
}
