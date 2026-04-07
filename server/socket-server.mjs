import { WebSocketServer } from 'ws';
import { dropLiveCommands, resolveLiveCommand, saveLiveCommand } from './live-command-store.mjs';
import { addSubscriber, dropSubscriber, emitLive, readLivePage, syncLiveEvent, updateSubscriber } from './live-store.mjs';
import { addInstanceEvent, createJob, disconnectInstance, heartbeatInstance, registerInstance, resolveJob, sendInstanceMessage, touchJob } from './store.mjs';

const readMessage = (value) => {
    try {
        return JSON.parse(value.toString());
    } catch {
        return null;
    }
};
const send = (socket, value) => {
    if (!socket || socket.readyState !== 1) return;
    socket.send(JSON.stringify(value));
};
const readPath = (request) => new URL(request.url || '/', 'http://127.0.0.1').pathname;
const readActionInstance = (actions = []) => {
    for (const action of actions) {
        const page = readLivePage(action.pageId || action.leftPageId || action.rightPageId || '');
        if (page) return page.instanceId;
    }
    return '';
};
const readResolvePage = (message) => readLivePage(message.payload && `${message.payload.pageId || ''}` || '');

export const attachSocketServer = (server) => {
    const extensionSocket = new WebSocketServer({ noServer: true });
    const liveSocket = new WebSocketServer({ noServer: true });
    server.on('upgrade', (request, socket, head) => {
        const path = readPath(request);
        if (path === '/api/socket') return extensionSocket.handleUpgrade(request, socket, head, (client) => extensionSocket.emit('connection', client));
        if (path === '/api/live') return liveSocket.handleUpgrade(request, socket, head, (client) => liveSocket.emit('connection', client));
        socket.destroy();
    });
    extensionSocket.on('connection', (socket) => {
        let instanceId = '';
        socket.on('message', (value) => {
            const message = readMessage(value);
            if (!message || !message.type) return;
            if (message.type === 'instance.register') {
                instanceId = message.instanceId || '';
                send(socket, { type: 'instance.registered', instance: registerInstance(instanceId, socket, message.payload || {}) });
            }
            if (message.type === 'instance.heartbeat' && instanceId) heartbeatInstance(instanceId);
            if (message.type === 'job.progress') touchJob(message.jobId || '', message.progress || '');
            if (message.type === 'job.result') resolveJob(message.jobId || '', true, message.result || {});
            if (message.type === 'job.error') resolveJob(message.jobId || '', false, { error: message.error || 'Remote job failed.' });
            if (message.type === 'request.resolve.result') resolveLiveCommand(message.id || '', message.result || {});
            if (message.type === 'request.resolve.error') resolveLiveCommand(message.id || '', {}, message.error || 'Could not resolve request.');
            if (message.type === 'live.event') {
                if (instanceId) addInstanceEvent(instanceId, `${message.name || 'event'} received.`, message.name === 'action.failed' ? 'danger' : 'warn');
                syncLiveEvent(message.name || 'event', message.data || {}, message.sessionId || '');
            }
        });
        socket.on('close', () => {
            dropLiveCommands(null, instanceId, 'Extension disconnected.');
            if (instanceId) disconnectInstance(instanceId, 'Socket closed.');
        });
        socket.on('error', () => {
            dropLiveCommands(null, instanceId, 'Extension disconnected.');
            if (instanceId) disconnectInstance(instanceId, 'Socket error.');
        });
    });
    liveSocket.on('connection', (socket) => {
        let subscriberId = addSubscriber(socket);
        socket.on('message', async (value) => {
            const message = readMessage(value);
            if (!message || !message.type) return;
            if (message.type === 'subscribe') return updateSubscriber(subscriberId, message.sessionId || '');
            if (message.type === 'request.resolve') {
                const id = message.id || crypto.randomUUID();
                const page = readResolvePage(message);
                if (!page) return send(socket, { error: `No active page matches ${message.payload && message.payload.pageId || ''}`, id, type: 'request.resolve.error' });
                saveLiveCommand(id, socket, page.instanceId || '');
                if (sendInstanceMessage(page.instanceId || '', { id, payload: message.payload || {}, type: 'request.resolve' }, 'Request resolve dispatched.')) return;
                return resolveLiveCommand(id, {}, 'No active extension instance is connected.');
            }
            if (message.type !== 'actions.run') return;
            try {
                const result = await createJob('pages-actions', { actions: message.actions || [] }, readActionInstance(message.actions || []), Number(message.timeoutMs) || 45000);
                send(socket, { result, type: 'actions.completed' });
            } catch (error) {
                send(socket, { error: error.message, type: 'actions.failed' });
            }
        });
        socket.on('close', () => {
            dropLiveCommands(socket, '', 'Live socket closed.');
            dropSubscriber(subscriberId);
        });
        socket.on('error', () => {
            dropLiveCommands(socket, '', 'Live socket closed.');
            dropSubscriber(subscriberId);
        });
    });
};
