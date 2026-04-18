const tabWaitMs = 45000;

export const waitForTab = (tabId: number, timeoutMs = tabWaitMs) => new Promise<void>((resolve, reject) => {
    let done = false;
    let timer = 0 as unknown as ReturnType<typeof setTimeout>;
    const finish = (error = '') => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        if (error) reject(new Error(error));
        else resolve();
    };
    const listener = (updatedId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (updatedId !== tabId || changeInfo.status !== 'complete') return;
        finish();
    };
    timer = setTimeout(() => finish(`Timed out waiting for tab ${tabId} to complete.`), timeoutMs);
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tabId).then((tab) => {
        if (tab.status === 'complete') finish();
    }).catch((error) => finish(error.message || `Could not read tab ${tabId}.`));
});
