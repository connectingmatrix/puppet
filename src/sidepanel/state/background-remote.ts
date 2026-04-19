import { readRuntimeApi } from '@/src/shared/extension-api';
import { RemoteSocketStatus } from '@/src/shared/remote-status';

const sendBackgroundMessage = (type: string) => new Promise<RemoteSocketStatus>((resolve, reject) => {
    readRuntimeApi().sendMessage({ type }, (response: RemoteSocketStatus) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(response);
    });
});

export const readBackgroundRemoteStatus = () => sendBackgroundMessage('puppet.background.status');

export const restartBackgroundRemote = () => sendBackgroundMessage('puppet.background.restart');
