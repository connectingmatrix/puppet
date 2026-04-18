import { printJson, requestJson } from './http.mjs';
import { readBody, readOption } from './options.mjs';

const route = (args) => {
    const first = args[0] || '';
    const second = args[1] || '';
    if (first === 'health') return ['GET', '/api/health'];
    if (first === 'instances') return ['GET', '/api/instances'];
    if (first === 'pages' && second === 'active') return ['GET', `/api/pages/active?sessionId=${encodeURIComponent(readOption(args, '--session-id'))}`];
    if (first === 'pages' && second === 'browser') return ['GET', '/api/pages/browser'];
    if (first === 'pages') return ['POST', `/api/pages/${second}`];
    if (first === 'compare') return ['POST', `/api/compare/${second}`];
    if (first === 'inspect') return ['POST', `/api/inspect/${second}`];
    return ['', ''];
};

export const apiCommand = async (args) => {
    if (args[0] === 'api') {
        const method = args[1] || 'GET';
        const path = args[2] || '/api/health';
        const body = method === 'GET' ? null : await readBody(args.slice(3));
        return printJson(await requestJson(args, path, method, body));
    }
    const item = route(args);
    if (!item[0]) throw new Error(`Unknown API command: ${args.join(' ')}`);
    const body = item[0] === 'GET' ? null : await readBody(args.slice(2));
    printJson(await requestJson(args, item[1], item[0], body));
};
