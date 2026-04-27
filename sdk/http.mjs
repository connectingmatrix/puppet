const base = process.env.PUPPET_SERVER_URL || 'http://127.0.0.1:4017';

export const readBaseUrl = (value = '') => value || base;

export const requestJson = async (baseUrl, path, method = 'GET', body = null) => {
    const init = { headers: { 'content-type': 'application/json' }, method };
    const url = `${readBaseUrl(baseUrl)}${path}`;
    if (body) init.body = JSON.stringify(body);
    let response = null;
    try {
        response = await fetch(url, init);
    } catch (error) {
        throw new Error(`Could not reach Puppet server at ${readBaseUrl(baseUrl)}. ${error && error.message || 'fetch failed'}`);
    }
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok || data.ok === false) throw new Error(data.error || `Request failed for ${path}`);
    return data;
};
