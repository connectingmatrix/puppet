import { dropPageEvents, keepPageEvent, savePageEvent } from './page-events.mjs';

const pages = new Map();
const subscribers = new Map();

const send = (socket, value) => {
    if (!socket || socket.readyState !== 1) return;
    socket.send(JSON.stringify(value));
};
const readPage = (pageId = '') => pages.get(pageId) || null;
const readSubscriber = (id) => subscribers.get(id) || null;

export const listPages = (sessionId = '') => {
    const items = [];
    for (const page of pages.values()) if (!sessionId || page.sessionId === sessionId) items.push(page);
    items.sort((left, right) => `${right.sessionId}${right.pageId}`.localeCompare(`${left.sessionId}${left.pageId}`));
    return items;
};

export const savePage = (page) => {
    pages.set(page.pageId, page);
    return readPage(page.pageId);
};

export const dropPage = (pageId) => {
    pages.delete(pageId);
    dropPageEvents(pageId);
};

export const readLivePage = (pageId = '') => readPage(pageId);

export const emitLive = (name, data = {}, sessionId = '') => {
    const message = { data, name, sessionId, type: 'event' };
    for (const entry of subscribers.values()) if (!entry.sessionId || !sessionId || entry.sessionId === sessionId) send(entry.socket, message);
};

export const syncLiveEvent = (name, data = {}, sessionId = '') => {
    if (data.pageId && keepPageEvent(name)) savePageEvent(data.pageId, name, data);
    if (name === 'page.opened' || name === 'page.navigated' || name === 'page.reloaded' || name === 'page.resized') savePage(data);
    if (name === 'page.closed') dropPage(data.pageId || '');
    if (name === 'record.started' || name === 'record.stopped') {
        const page = readPage(data.pageId || '');
        if (page) savePage({ ...page, recordingIds: data.recordingIds || page.recordingIds || [] });
    }
    emitLive(name, data, sessionId || data.sessionId || '');
};

export const addSubscriber = (socket, sessionId = '') => {
    const id = crypto.randomUUID();
    subscribers.set(id, { sessionId, socket });
    send(socket, { items: listPages(sessionId), type: 'pages.active' });
    return id;
};

export const updateSubscriber = (id, sessionId = '') => {
    const entry = readSubscriber(id);
    if (!entry) return;
    subscribers.set(id, { sessionId, socket: entry.socket });
    send(entry.socket, { items: listPages(sessionId), type: 'pages.active' });
};

export const dropSubscriber = (id) => {
    subscribers.delete(id);
};
