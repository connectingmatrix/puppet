import { requestJson } from './http.mjs';

export const runActions = async (page, actions) => {
    const items = [];
    for (const action of actions) items.push({ ...action, frameId: action.frameId || page.frameId, pageId: action.pageId || page.pageId });
    const data = await requestJson(page.baseUrl, '/api/pages/actions', 'POST', { actions: items, raw: true });
    return data.results || [];
};

export const runAction = async (page, action) => {
    const result = (await runActions(page, [action]))[0] || {};
    if (!result.ok) throw new Error(result.error || `Action ${action.type} failed.`);
    return result.data;
};
