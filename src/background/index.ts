import { readSidePanelApi } from '@/src/shared/extension-api';
import { readBackgroundRemoteSocketStatus, restartRemoteSocketWorker, startRemoteSocketWorker } from '@/src/background/remote-socket-worker';

const openSidePanel = async () => readSidePanelApi().setPanelBehavior({ openPanelOnActionClick: true });
const boot = async () => { await openSidePanel(); };

startRemoteSocketWorker();
chrome.runtime.onInstalled.addListener(() => { void boot(); });
chrome.runtime.onStartup.addListener(() => { void boot(); });
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message) return false;
    if (message.type === 'puppet.background.status') sendResponse(readBackgroundRemoteSocketStatus());
    if (message.type === 'puppet.background.restart') sendResponse(restartRemoteSocketWorker());
    return false;
});
