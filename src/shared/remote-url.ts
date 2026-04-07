export const readRemoteUrlOverride = (search = window.location.search) => {
    const params = new URLSearchParams(search || '');
    const server = params.get('server') || '';
    if (server) return server;
    const port = params.get('port') || '';
    return port ? `http://127.0.0.1:${port}` : '';
};
