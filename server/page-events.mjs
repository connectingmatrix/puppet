const limit = 200;
const items = new Map();
const readKey = (pageId = '', name = '') => `${pageId}:${name}`;
const keepName = (name = '') => name === 'console' || name === 'network.request' || name === 'network.response' || name === 'socket';
const readItems = (pageId = '', name = '') => items.get(readKey(pageId, name)) || [];

export const keepPageEvent = (name = '') => keepName(name);
export const listPageEvents = (pageId = '', name = '', next = limit) => readItems(pageId, name).slice(0, Number(next) || limit);
export const savePageEvent = (pageId = '', name = '', value = {}) => {
    const list = [];
    for (const item of readItems(pageId, name)) list.push(item);
    list.unshift(value);
    if (list.length > limit) list.length = limit;
    items.set(readKey(pageId, name), list);
};
export const dropPageEvents = (pageId = '') => {
    for (const name of items.keys()) if (name.startsWith(`${pageId}:`)) items.delete(name);
};
