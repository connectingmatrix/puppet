const instances = new Map();
const jobs = new Map();
const eventLimit = 40;

const readNow = () => Date.now();
const readOpen = (entry) => entry && entry.socket && entry.socket.readyState === 1;
const readEvents = (entry) => {
    const items = [];
    for (const event of entry.events) items.push(event);
    return items;
};
const readItem = (id, entry) => ({ browserId: entry.browserId || '', connectedAt: entry.connectedAt, events: readEvents(entry), extensionId: entry.extensionId, extensionUrl: entry.extensionUrl, id, lastSeen: entry.lastSeen, pageUrl: entry.pageUrl, socketId: entry.socketId, status: 'connected' });
const pushEvent = (entry, text, tone = 'base') => {
    entry.events.unshift({ at: readNow(), text, tone });
    if (entry.events.length > eventLimit) entry.events.length = eventLimit;
};
export const addInstanceEvent = (instanceId, text, tone = 'base') => {
    const entry = instances.get(instanceId);
    if (!entry) return;
    pushEvent(entry, text, tone);
};
const rejectJobs = (instanceId, error) => {
    for (const [jobId, job] of jobs.entries()) {
        if (job.instanceId !== instanceId) continue;
        clearTimeout(job.timer);
        jobs.delete(jobId);
        job.reject(new Error(error));
    }
};
const startTimer = (job) => setTimeout(() => {
    jobs.delete(job.id);
    job.reject(new Error('Timed out waiting for the extension response.'));
}, job.timeoutMs);

const readTargetInstance = (instanceId = '') => {
    if (instanceId && readOpen(instances.get(instanceId))) return instanceId;
    for (const item of listInstances()) return item.id;
    return '';
};

export const listInstances = () => {
    const items = [];
    for (const [id, entry] of instances.entries()) if (readOpen(entry)) items.push(readItem(id, entry));
    items.sort((left, right) => right.connectedAt - left.connectedAt);
    return items;
};

export const registerInstance = (instanceId, socket, payload) => {
    const current = instances.get(instanceId);
    if (current && current.socket !== socket && readOpen(current)) current.socket.close();
    for (const [id, entry] of instances.entries()) if (payload.browserId && entry.browserId === payload.browserId && id !== instanceId && readOpen(entry)) entry.socket.close();
    const entry = { browserId: payload.browserId || '', connectedAt: readNow(), events: [], extensionId: payload.extensionId || '', extensionUrl: payload.extensionUrl || '', lastSeen: readNow(), pageUrl: payload.pageUrl || '', socket, socketId: crypto.randomUUID() };
    pushEvent(entry, 'Socket connected.');
    instances.set(instanceId, entry);
    return readItem(instanceId, entry);
};

export const heartbeatInstance = (instanceId) => {
    const entry = instances.get(instanceId);
    if (!entry) return null;
    entry.lastSeen = readNow();
    return readItem(instanceId, entry);
};

export const disconnectInstance = (instanceId, error, socket = null) => {
    const entry = instances.get(instanceId);
    if (!entry) return false;
    if (socket && entry.socket !== socket) return false;
    rejectJobs(instanceId, error);
    instances.delete(instanceId);
    return true;
};

export const createJob = (kind, payload, instanceId = '', timeoutMs = 45000) => {
    const target = readTargetInstance(instanceId);
    if (!target) throw new Error('No active extension instance is connected.');
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
        const entry = instances.get(target);
        const job = { id, instanceId: target, kind, payload, reject, resolve, timeoutMs, timer: 0 };
        job.timer = startTimer(job);
        jobs.set(id, job);
        if (!entry || !readOpen(entry)) {
            clearTimeout(job.timer);
            jobs.delete(id);
            reject(new Error('No active extension instance is connected.'));
            return;
        }
        pushEvent(entry, `Job ${kind} dispatched.`, 'warn');
        try {
            entry.socket.send(JSON.stringify({ type: 'job.dispatch', jobId: id, kind, payload }));
        } catch (error) {
            clearTimeout(job.timer);
            jobs.delete(id);
            reject(error);
        }
    });
};

export const sendInstanceMessage = (instanceId, value, text = '') => {
    const entry = instances.get(instanceId);
    if (!readOpen(entry)) return false;
    if (text) pushEvent(entry, text, 'warn');
    entry.socket.send(JSON.stringify(value));
    return true;
};

export const touchJob = (jobId, progress = '') => {
    const job = jobs.get(jobId);
    if (!job) return false;
    clearTimeout(job.timer);
    job.timer = startTimer(job);
    const entry = instances.get(job.instanceId);
    if (entry) {
        entry.lastSeen = readNow();
        if (progress) pushEvent(entry, progress, 'warn');
    }
    return true;
};

export const resolveJob = (jobId, success, result) => {
    const job = jobs.get(jobId);
    if (!job) return false;
    clearTimeout(job.timer);
    jobs.delete(jobId);
    const entry = instances.get(job.instanceId);
    if (entry) {
        entry.lastSeen = readNow();
        pushEvent(entry, success ? `Job ${job.kind} completed.` : result.error || 'Job failed.', success ? 'base' : 'danger');
    }
    if (success) job.resolve({ instanceId: job.instanceId, jobId, result });
    if (!success) job.reject(new Error(result.error || 'The extension reported an error.'));
    return true;
};
