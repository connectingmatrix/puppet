import { readServer } from './options.mjs';

export const requestJson = async (args, path, method = 'GET', body = null) => {
    const init = { headers: { 'content-type': 'application/json' }, method };
    const url = `${readServer(args)}${path}`;
    if (body) init.body = JSON.stringify(body);
    let response = null;
    try {
        response = await fetch(url, init);
    } catch (error) {
        throw new Error(`Could not reach Puppet server at ${readServer(args)}. ${error && error.message || 'fetch failed'}`);
    }
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok || data.ok === false) throw new Error(data.error || `Request failed for ${path}`);
    return data;
};

export const printJson = (value) => {
    console.log(JSON.stringify(value, null, 2));
};
