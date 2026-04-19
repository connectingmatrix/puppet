import { count, runs, size } from './compact-tree.mjs';

const items = (value = []) => {
    const out = [];
    let seen = 0;
    for (const item of value || []) {
        if (seen >= 10) break;
        out.push({ id: item.id || item.pageId || '', pageId: item.pageId || '', status: item.status || '', title: item.pageName || item.title || '', url: item.pageUrl || item.url || item.extensionUrl || '' });
        seen += 1;
    }
    return out;
};

const actions = (value = []) => {
    const out = [];
    let failed = 0;
    for (const item of value || []) {
        if (!item.ok) failed += 1;
        if (out.length < 10) out.push({ actionId: item.actionId || '', error: item.error || '', ok: item.ok !== false, pageId: item.pageId || '', type: item.type || '' });
    }
    return { failed, items: out, total: (value || []).length };
};

const logs = (value = []) => {
    const out = [];
    for (const item of value || []) {
        if (out.length >= 8) break;
        out.push({ level: item.level || '', text: `${item.text || ''}`.slice(0, 180) });
    }
    return { items: out, total: (value || []).length };
};

export const summarize = (kind, value = {}, bytes = 0) => {
    const data = value.result && kind !== 'pages-run' && !value.runs && !value.pages && !value.items ? value.result : value;
    return {
        bytes,
        htmlBytes: size(data.html),
        items: data.items ? items(data.items) : undefined,
        kind,
        logs: data.logs ? logs(data.logs) : undefined,
        pageIds: data.pageIds,
        pages: data.pages ? items(data.pages) : undefined,
        resultBytes: data.result ? Buffer.byteLength(JSON.stringify(data.result || null)) : 0,
        results: data.results ? actions(data.results) : undefined,
        runCount: count(data.runs),
        runs: data.runs ? runs(data.runs) : undefined,
        sessionId: data.sessionId || '',
        screenshotBytes: size(data.dataBase64)
    };
};
