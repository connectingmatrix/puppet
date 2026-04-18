import { useEffect, useRef, useState } from 'react';
import { runRemoteJob } from '@/src/background/job-runner';
import { closeAllLivePages } from '@/src/background/page-session-work';
import { setLiveEmitter } from '@/src/background/live-event-work';
import { runRequestResolve } from '@/src/sidepanel/state/request-resolve';
import { readBrowserId } from '@/src/background/browser-id-work';
import { readRuntimeApi } from '@/src/shared/extension-api';
import { RemoteEvent, RemoteMessage, RemoteSettings } from '@/src/shared/remote-types';

const readSocketUrl = (serverUrl: string) => {
    const url = new URL('/api/socket', serverUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${url}`;
};

const readText = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

export const useRemoteSocket = (loading: boolean, settings: RemoteSettings, enabled = true) => {
    const [entries, setEntries] = useState<RemoteEvent[]>([]);
    const [instanceId] = useState(() => crypto.randomUUID());
    const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
    const busyRef = useRef(false);
    const closedRef = useRef(false);
    const heartbeatRef = useRef(0);
    const retryRef = useRef(0);
    const socketRef = useRef<WebSocket | null>(null);
    const jobsRef = useRef<RemoteMessage[]>([]);
    const addEntry = (text: string, tone: 'base' | 'warn' | 'danger' = 'base') => setEntries((current) => {
        const next = [{ at: Date.now(), text, tone }, ...current];
        if (next.length > 40) next.length = 40;
        return next;
    });
    const send = (message: RemoteMessage) => {
        const socket = socketRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) return;
        socket.send(JSON.stringify(message));
    };
    const runResolve = async (message: RemoteMessage) => {
        try {
            send({ id: message.id, result: await runRequestResolve(message), type: 'request.resolve.result' });
        } catch (error) {
            send({ error: readText(error, 'Could not resolve request.'), id: message.id, type: 'request.resolve.error' });
        }
    };
    const emit = (name: string, data: Record<string, unknown>, sessionId = '') => {
        send({ data, name, sessionId, type: 'live.event' });
        if (name === 'intercept.hit') addEntry(`Intercept hit for ${data.ruleId || ''}.`, 'warn');
    };
    const runNext = async () => {
        if (busyRef.current) return;
        const message = jobsRef.current.shift();
        if (!message) return;
        busyRef.current = true;
        const progressRef = window.setInterval(() => {
            send({ type: 'job.progress', jobId: message.jobId, progress: `Working on ${message.kind || 'inspect-selector'}.` });
        }, 5000);
        try {
            send({ type: 'job.progress', jobId: message.jobId, progress: `Started ${message.kind || 'inspect-selector'}.` });
            const result = await runRemoteJob({ id: message.jobId || '', kind: message.kind || 'inspect-selector', payload: message.payload || {} }, instanceId, emit);
            send({ type: 'job.result', jobId: message.jobId, result });
            addEntry(`Job ${message.kind || 'inspect-selector'} completed.`, 'base');
        } catch (error) {
            const text = readText(error, 'Remote job failed.');
            send({ type: 'job.error', error: text, jobId: message.jobId });
            addEntry(text, 'danger');
        } finally {
            window.clearInterval(progressRef);
            busyRef.current = false;
            void runNext();
        }
    };
    useEffect(() => {
        closedRef.current = false;
        jobsRef.current = [];
        if (!enabled) {
            setStatus('connecting');
            return () => { closedRef.current = true; };
        }
        if (loading) {
            setStatus('connecting');
            return () => { closedRef.current = true; };
        }
        if (!settings.remoteEnabled || !settings.serverUrl) {
            setStatus('disconnected');
            return () => { closedRef.current = true; };
        }
        let runtime;
        try {
            runtime = readRuntimeApi();
        } catch (error) {
            setStatus('disconnected');
            addEntry(readText(error, 'Chrome runtime is not available.'), 'danger');
            return () => { closedRef.current = true; };
        }
        setLiveEmitter(emit);
        const connect = () => {
            if (closedRef.current) return;
            setStatus('connecting');
            addEntry('Connecting to remote server.', 'warn');
            socketRef.current = new WebSocket(readSocketUrl(settings.serverUrl));
            socketRef.current.onopen = () => {
                window.clearInterval(heartbeatRef.current);
                setStatus('connected');
                addEntry('Socket connected.', 'base');
                readBrowserId().then((browserId) => {
                    send({ type: 'instance.register', instanceId, payload: { browserId, extensionId: runtime.id, extensionUrl: runtime.getURL('sidepanel.html'), pageUrl: window.location.href } });
                }).catch(() => send({ type: 'instance.register', instanceId, payload: { extensionId: runtime.id, extensionUrl: runtime.getURL('sidepanel.html'), pageUrl: window.location.href } }));
                heartbeatRef.current = window.setInterval(() => {
                    send({ type: 'instance.heartbeat', instanceId });
                    addEntry('Heartbeat sent.', 'warn');
                }, 10000);
            };
            socketRef.current.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data) as RemoteMessage;
                    if (message.type === 'instance.registered') addEntry('Instance registered on server.', 'base');
                    if (message.type === 'request.resolve') void runResolve(message);
                    if (message.type === 'job.dispatch') {
                        jobsRef.current.push(message);
                        addEntry(`Job ${message.kind || 'inspect-selector'} received.`, 'warn');
                        void runNext();
                    }
                } catch (error) {
                    addEntry(readText(error, 'Could not read socket message.'), 'danger');
                }
            };
            socketRef.current.onerror = () => addEntry('Socket error.', 'danger');
            socketRef.current.onclose = () => {
                window.clearInterval(heartbeatRef.current);
                setStatus('disconnected');
                if (closedRef.current) return;
                addEntry('Socket disconnected.', 'danger');
                retryRef.current = window.setTimeout(connect, 1500);
            };
        };
        connect();
        return () => {
            closedRef.current = true;
            window.clearInterval(heartbeatRef.current);
            window.clearTimeout(retryRef.current);
             void closeAllLivePages(emit);
            if (socketRef.current) socketRef.current.close();
            socketRef.current = null;
        };
    }, [enabled, instanceId, loading, settings.remoteEnabled, settings.serverUrl, settings.updatedAt]);
    return { entries, instanceId, status };
};
