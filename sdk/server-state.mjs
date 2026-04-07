import { readBaseUrl } from './http.mjs';

const readConnected = (baseUrl, items = []) => {
    const item = items[0] || null;
    return {
        baseUrl,
        extensionUrl: item && item.extensionUrl || '',
        instanceId: item && item.id || '',
        status: item ? 'connected' : 'server_ready_no_instance'
    };
};

export const readServerState = async (baseUrl = '') => {
    const url = readBaseUrl(baseUrl);
    const health = await fetch(`${url}/api/health`);
    if (!health.ok) throw new Error(`CTM Puppet is not healthy on ${url}`);
    const response = await fetch(`${url}/api/instances`);
    if (!response.ok) throw new Error(`Could not read CTM Puppet instances on ${url}`);
    const data = await response.json();
    return readConnected(url, data.items || []);
};
