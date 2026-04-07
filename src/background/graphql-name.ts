export const readGraphqlName = (value = '') => {
    const body = `${value || ''}`.trim();
    if (!body) return '';
    try {
        const data = JSON.parse(body);
        const name = `${data.operationName || ''}`.trim();
        if (name) return name;
        const query = `${data.query || ''}`.trim();
        const match = query.match(/(?:query|mutation|subscription)\s+([A-Za-z_][A-Za-z0-9_]*)/);
        return match && match[1] || '';
    } catch {
        const match = body.match(/(?:query|mutation|subscription)\s+([A-Za-z_][A-Za-z0-9_]*)/);
        return match && match[1] || '';
    }
};
