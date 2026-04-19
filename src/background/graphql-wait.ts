const urls = { urls: ['<all_urls>'] };
const graceMs = 4000;
const idleMs = 1200;
const timeoutMs = 30000;

const readBody = (details: chrome.webRequest.WebRequestBodyDetails) => {
    const raw = details.requestBody && details.requestBody.raw && details.requestBody.raw[0] && details.requestBody.raw[0].bytes;
    if (!raw) return '';
    return new TextDecoder().decode(raw);
};

const readGraphql = (details: chrome.webRequest.WebRequestBodyDetails) => {
    if (details.url.includes('graphql')) return true;
    const body = readBody(details);
    return body.includes('"query"') || body.includes('"mutation"') || body.includes('"operationName"');
};

export const watchGraphql = (tabId: number) => {
    const active = new Set<string>();
    let lastChange = Date.now();
    let seen = false;
    const touch = () => { lastChange = Date.now(); };
    const before = (details: chrome.webRequest.WebRequestBodyDetails) => {
        if (details.tabId !== tabId || !readGraphql(details)) return;
        seen = true;
        active.add(details.requestId);
        touch();
    };
    const after = (details: chrome.webRequest.WebResponseCacheDetails) => {
        if (details.tabId !== tabId || !active.has(details.requestId)) return;
        active.delete(details.requestId);
        touch();
    };
    chrome.webRequest.onBeforeRequest.addListener(before, urls, ['requestBody']);
    chrome.webRequest.onCompleted.addListener(after, urls);
    chrome.webRequest.onErrorOccurred.addListener(after, urls);
    const close = () => {
        chrome.webRequest.onBeforeRequest.removeListener(before);
        chrome.webRequest.onCompleted.removeListener(after);
        chrome.webRequest.onErrorOccurred.removeListener(after);
    };
    const wait = () => new Promise<void>((resolve, reject) => {
        const startedAt = Date.now();
        const check = () => {
            if (seen && !active.size && Date.now() - lastChange >= idleMs) resolve();
            else if (!seen && Date.now() - startedAt >= graceMs) resolve();
            else if (Date.now() - startedAt >= timeoutMs) reject(new Error('Timed out waiting for GraphQL requests to finish.'));
            else setTimeout(check, 200);
        };
        check();
    });
    return { close, wait };
};
