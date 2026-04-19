import { readBrowserId } from '@/src/background/browser-id-work';
import { runRemoteJob } from '@/src/background/job-runner';
import { setLiveEmitter } from '@/src/background/live-event-work';
import { runRequestResolve } from '@/src/background/request-resolve-work';
import { addRemoteWorkerEvent, markRemoteWorkerStatus, readRemoteWorkerStatus } from '@/src/background/remote-worker-state';
import { readRuntimeApi } from '@/src/shared/extension-api';
import { readRemoteSettings } from '@/src/shared/remote-store';
import { remoteServerUrl, RemoteMessage } from '@/src/shared/remote-types';
import { runWithLimit } from '@/src/shared/time-limit';

let busy = false;
let heartbeat = 0;
let retry = 0;
let socket: WebSocket | null = null;
let instanceId = '';
let socketToken = 0;
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
    markRemoteWorkerStatus('connecting', 'Retrying background socket.', 'warn');
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
        if (!settings.remoteEnabled) {
            markRemoteWorkerStatus('disconnected', 'Remote control is disabled.', 'danger');
            return;
        }
        const browserId = await readBrowserId();
        instanceId = browserId;
        if (socket && socket.readyState === WebSocket.OPEN) return;
        if (socket && socket.readyState === WebSocket.CONNECTING) return;
        if (socket) socket.close();
        const runtime = readRuntimeApi();
        markRemoteWorkerStatus('connecting', 'Connecting background socket.', 'warn');
        const token = socketToken + 1;
        socketToken = token;
        socket = new WebSocket(readSocketUrl(remoteServerUrl));
        socket.onopen = () => {
            if (token !== socketToken) return;
            clearInterval(heartbeat);
            setLiveEmitter(emit);
            markRemoteWorkerStatus('connected', 'Background socket connected.');
            send({ instanceId, payload: { browserId, extensionId: runtime.id, extensionUrl: runtime.getURL('sidepanel.html'), pageUrl: 'background' }, type: 'instance.register' });
            heartbeat = setInterval(() => send({ instanceId, type: 'instance.heartbeat' }), 10000) as unknown as number;
        };
        socket.onmessage = (event) => {
            if (token !== socketToken) return;
            const message = JSON.parse(event.data) as RemoteMessage;
            if (message.type === 'instance.registered') addRemoteWorkerEvent('Background instance registered.');
            if (message.type === 'request.resolve') void runResolve(message);
            if (message.type === 'job.dispatch') {
                jobs.push(message);
                void runNext();
            }
        };
        socket.onclose = () => {
            if (token !== socketToken) return;
            clearInterval(heartbeat);
            markRemoteWorkerStatus('disconnected', 'Background socket disconnected.', 'danger');
            retryConnect();
        };
        socket.onerror = () => {
            if (token === socketToken) markRemoteWorkerStatus('disconnected', 'Background socket error.', 'danger');
        };
    } catch {
        markRemoteWorkerStatus('disconnected', 'Background socket failed.', 'danger');
        retryConnect();
    }
};

export const readBackgroundRemoteSocketStatus = () => readRemoteWorkerStatus(instanceId);

export const restartRemoteSocketWorker = () => {
    markRemoteWorkerStatus('connecting', 'Background restart requested.', 'warn');
    clearInterval(heartbeat);
    clearTimeout(retry);
    socketToken += 1;
    if (socket) socket.close();
    socket = null;
    void connect();
    return readBackgroundRemoteSocketStatus();
};

export const startRemoteSocketWorker = () => {
    void connect();
    chrome.alarms.create('puppet-socket', { periodInMinutes: 1 });
    chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === 'puppet-socket') void connect(); });
};
