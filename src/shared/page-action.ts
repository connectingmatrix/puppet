export type RecordField = 'box' | 'classes' | 'html' | 'styles' | 'tree';
export type ScrollBehaviorType = 'auto' | 'smooth';
export type ButtonType = 'left' | 'middle' | 'right';
export type InterceptMode = 'abort' | 'fulfill' | 'observe';
export type WaitUntilType = 'document' | 'domcontentloaded' | 'load' | 'networkidle0' | 'networkidle2';
export type PageActionType = 'change_screen_size' | 'click' | 'close_page' | 'drag_drop' | 'execute_script' | 'get_page_data' | 'get_page_diff' | 'get_page_html' | 'hover' | 'intercept_request' | 'navigate_to_url' | 'record_start' | 'record_stop' | 'reload_page' | 'resolve_request' | 'screenshot_page' | 'scroll' | 'select_option' | 'send_key' | 'set_request_interception' | 'submit' | 'type_text' | 'upload_files' | 'wait_for_selector';

export interface InterceptMatch {
    method?: string;
    operationName?: string;
    resourceTypes?: string[];
    urlPattern?: string;
}

export interface InterceptFulfill {
    bodyBase64?: string;
    headers?: Record<string, string>;
    status: number;
}

export interface PageAction {
    actionId?: string;
    args?: unknown[];
    behavior?: ScrollBehaviorType;
    bodyBase64?: string;
    button?: ButtonType;
    clearFirst?: boolean;
    clickCount?: number;
    current?: boolean;
    deltaX?: number;
    deltaY?: number;
    enabled?: boolean;
    files?: string[];
    frameId?: number;
    fullPage?: boolean;
    fulfill?: InterceptFulfill;
    height?: number;
    headers?: Record<string, string>;
    include?: RecordField[];
    index?: number;
    key?: string;
    leftPageId?: string;
    match?: InterceptMatch;
    mode?: InterceptMode;
    pageId?: string;
    path?: string;
    recordId?: string;
    requestId?: string;
    rightPageId?: string;
    role?: string;
    ruleId?: string;
    script?: string;
    selector?: string;
    snapshot?: boolean;
    sourceSelector?: string;
    status?: number;
    targetSelector?: string;
    timeoutMs?: number;
    type: PageActionType;
    url?: string;
    value?: string;
    visible?: boolean;
    waitUntil?: WaitUntilType;
    width?: number;
    x?: number;
    y?: number;
}
