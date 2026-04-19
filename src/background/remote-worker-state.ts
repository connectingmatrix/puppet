import { RemoteEvent, remoteServerUrl } from '@/src/shared/remote-types';
import { RemoteSocketStatus, RemoteStatus } from '@/src/shared/remote-status';

const events: RemoteEvent[] = [];
let status: RemoteStatus = 'connecting';

export const addRemoteWorkerEvent = (text: string, tone: 'base' | 'warn' | 'danger' = 'base') => {
    events.unshift({ at: Date.now(), text, tone });
    if (events.length > 40) events.length = 40;
};

export const markRemoteWorkerStatus = (next: RemoteStatus, text = '', tone: 'base' | 'warn' | 'danger' = 'base') => {
    status = next;
    if (text) addRemoteWorkerEvent(text, tone);
};

export const readRemoteWorkerStatus = (instanceId: string): RemoteSocketStatus => ({
    entries: [...events],
    instanceId,
    serverUrl: remoteServerUrl,
    source: 'background',
    status
});
