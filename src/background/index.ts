import { readSidePanelApi } from '@/src/shared/extension-api';
import { startRemoteSocketWorker } from '@/src/background/remote-socket-worker';

const openSidePanel = async () => readSidePanelApi().setPanelBehavior({ openPanelOnActionClick: true });
const boot = async () => { await openSidePanel(); };

startRemoteSocketWorker();
chrome.runtime.onInstalled.addListener(() => { void boot(); });
chrome.runtime.onStartup.addListener(() => { void boot(); });
