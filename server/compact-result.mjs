import { readJsonBytes, writeArtifact } from './artifact-store.mjs';
import { summarize } from './compact-summary.mjs';

const limit = 2000;

const readRaw = (request) => {
    const body = request.body || {};
    const query = request.query || {};
    return body.raw || body.full || body.compact === false || query.raw || query.full || query.compact === 'false';
};

const trimInstances = (value = {}) => {
    const items = [];
    for (const item of value.items || []) items.push({
        browserId: item.browserId || '',
        connectedAt: item.connectedAt || 0,
        eventCount: (item.events || []).length,
        extensionId: item.extensionId || '',
        extensionUrl: item.extensionUrl || '',
        id: item.id || '',
        lastSeen: item.lastSeen || 0,
        pageUrl: item.pageUrl || '',
        socketId: item.socketId || '',
        status: item.status || ''
    });
    return { ...value, compact: true, items };
};

export const readCompactResult = async (kind, value, request) => {
    if (readRaw(request)) return value;
    if (kind === 'instances') return trimInstances(value);
    if (kind === 'compare-routes') return value;
    const bytes = readJsonBytes(value);
    if (bytes <= limit) return value;
    const artifact = await writeArtifact(kind, value);
    return {
        artifact,
        compact: true,
        ok: value.ok !== false,
        summary: summarize(kind, value, bytes)
    };
};
