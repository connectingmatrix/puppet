import { readServer } from './options.mjs';

export const requestJson = async (args, path, method = 'GET', body = null) => {
    const init = { headers: { 'content-type': 'application/json' }, method };
    if (body) init.body = JSON.stringify(body);
    const response = await fetch(`${readServer(args)}${path}`, init);
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok || data.ok === false) throw new Error(data.error || `Request failed for ${path}`);
    return data;
};

export const printJson = (value) => {
    console.log(JSON.stringify(value, null, 2));
};
