import { RemoteEvent } from '@/src/shared/remote-types';

export type RemoteStatus = 'connected' | 'connecting' | 'disconnected';

export interface RemoteSocketStatus {
    entries: RemoteEvent[];
    instanceId: string;
    serverUrl: string;
    source: 'background' | 'sidepanel';
    status: RemoteStatus;
}

export const readRemoteOrigin = (value: string) => {
    try {
        return new URL(value).origin;
    } catch {
        return '';
    }
};
