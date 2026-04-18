import { readBrowserId } from '@/src/background/browser-id-work';
import { runRemoteJob } from '@/src/background/job-runner';
import { setLiveEmitter } from '@/src/background/live-event-work';
import { runRequestResolve } from '@/src/background/request-resolve-work';
import { readRuntimeApi } from '@/src/shared/extension-api';
import { readRemoteSettings } from '@/src/shared/remote-store';
import { remoteServerUrl, RemoteMessage } from '@/src/shared/remote-types';
import { runWithLimit } from '@/src/shared/time-limit';

let busy = false;
let heartbeat = 0;
let retry = 0;
let socket: WebSocket | null = null;
let instanceId = '';
const jobs: RemoteMessage[] = [];
const readText = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
const readSocketUrl = (serverUrl: string) => {
    const url = new URL('/api/socket', serverUrl || remoteServerUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${url}`;
};
const send = (message: RemoteMessage) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(message));
};
const emit = (name: string, data: Record<string, unknown>, sessionId = '') => send({ data, name, sessionId, type: 'live.event' });
const retryConnect = () => {
    clearTimeout(retry);
    retry = setTimeout(() => void connect(), 1500) as unknown as number;
};
const runResolve = async (message: RemoteMessage) => {
    try {
        send({ id: message.id, result: await runRequestResolve(message), type: 'request.resolve.result' });
    } catch (error) {
        send({ error: readText(error, 'Could not resolve request.'), id: message.id, type: 'request.resolve.error' });
    }
};
const runNext = async () => {
    if (busy) return;
    const message = jobs.shift();
    if (!message) return;
    busy = true;
    const progress = setInterval(() => send({ jobId: message.jobId, progress: `Working on ${message.kind || 'inspect-selector'}.`, type: 'job.progress' }), 5000);
    try {
        send({ jobId: message.jobId, progress: `Started ${message.kind || 'inspect-selector'}.`, type: 'job.progress' });
        const result = await runWithLimit(runRemoteJob({ id: message.jobId || '', kind: message.kind || 'inspect-selector', payload: message.payload || {}, timeoutMs: message.timeoutMs }, instanceId, emit), Number(message.timeoutMs) || 45000, `${message.kind || 'remote'} job`);
        send({ jobId: message.jobId, result, type: 'job.result' });
    } catch (error) {
        send({ error: readText(error, 'Remote job failed.'), jobId: message.jobId, type: 'job.error' });
    } finally {
        clearInterval(progress);
        busy = false;
        void runNext();
    }
};
const connect = async () => {
    try {
        const settings = await readRemoteSettings();
        if (!settings.remoteEnabled) return;
        const browserId = await readBrowserId();
        instanceId = browserId;
        if (socket && socket.readyState === WebSocket.OPEN) return;
        if (socket && socket.readyState === WebSocket.CONNECTING) return;
        if (socket) socket.close();
        const runtime = readRuntimeApi();
        socket = new WebSocket(readSocketUrl(remoteServerUrl));
        socket.onopen = () => {
            clearInterval(heartbeat);
            setLiveEmitter(emit);
            send({ instanceId, payload: { browserId, extensionId: runtime.id, extensionUrl: runtime.getURL('sidepanel.html'), pageUrl: 'background' }, type: 'instance.register' });
            heartbeat = setInterval(() => send({ instanceId, type: 'instance.heartbeat' }), 10000) as unknown as number;
        };
        socket.onmessage = (event) => {
            const message = JSON.parse(event.data) as RemoteMessage;
            if (message.type === 'request.resolve') void runResolve(message);
            if (message.type === 'job.dispatch') {
                jobs.push(message);
                void runNext();
            }
        };
        socket.onclose = () => {
            clearInterval(heartbeat);
            retryConnect();
        };
        socket.onerror = () => {};
    } catch {
        retryConnect();
    }
};

export const startRemoteSocketWorker = () => {
    void connect();
    chrome.alarms.create('puppet-socket', { periodInMinutes: 1 });
    chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === 'puppet-socket') void connect(); });
};
