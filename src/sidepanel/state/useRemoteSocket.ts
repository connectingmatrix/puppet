import { useEffect, useState } from 'react';
import { readBackgroundRemoteStatus, restartBackgroundRemote } from '@/src/sidepanel/state/background-remote';
import { RemoteEvent, RemoteSettings } from '@/src/shared/remote-types';
import { RemoteSocketStatus } from '@/src/shared/remote-status';

const readText = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
const readFallback = (settings: RemoteSettings, error: unknown): RemoteSocketStatus => ({
    entries: [{ at: Date.now(), text: readText(error, 'Could not read background worker status.'), tone: 'danger' }],
    instanceId: 'background',
    serverUrl: settings.serverUrl,
    source: 'background',
    status: 'disconnected'
});

export const useRemoteSocket = (loading: boolean, settings: RemoteSettings) => {
    const [status, setStatus] = useState<RemoteSocketStatus>({
        entries: [] as RemoteEvent[],
        instanceId: 'background',
        serverUrl: settings.serverUrl,
        source: 'background',
        status: 'connecting'
    });
    const readStatus = (closed: { value: boolean }) => readBackgroundRemoteStatus()
        .then((next) => { if (!closed.value) setStatus(next); })
        .catch((error) => { if (!closed.value) setStatus(readFallback(settings, error)); });
    const restartBackground = async () => {
        try {
            setStatus(await restartBackgroundRemote());
        } catch (error) {
            setStatus(readFallback(settings, error));
        }
    };
    useEffect(() => {
        if (loading) return;
        const closed = { value: false };
        void readStatus(closed);
        const timer = window.setInterval(() => void readStatus(closed), 1500);
        return () => {
            closed.value = true;
            window.clearInterval(timer);
        };
    }, [loading, settings.serverUrl, settings.updatedAt]);
    return { ...status, restartBackground };
};
