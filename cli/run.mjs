import { readFile } from 'node:fs/promises';
import { printJson, requestJson } from './http.mjs';
import { hasFlag, readBody, readOption } from './options.mjs';

const readScript = async (args) => {
    const text = readOption(args, '--eval') || readOption(args, '--script');
    if (text) return text;
    const valueFlags = '--port --server --timeout-ms --session-id --json --file';
    let file = '';
    for (let index = 0; index < args.length; index += 1) {
        if (valueFlags.includes(args[index])) {
            index += 1;
        } else if (args[index].startsWith('-')) {
            continue;
        } else if (!file) {
            file = args[index];
        }
    }
    if (!file) throw new Error('Pass a script file or --eval "code".');
    return readFile(file, 'utf8');
};

export const runCommand = async (args) => {
    const extra = await readBody(args).catch(() => ({}));
    const body = {
        ...extra,
        closeOnExit: hasFlag(args, '--close-on-exit') || Boolean(extra.closeOnExit),
        keepPagesOpen: hasFlag(args, '--keep-pages-open') || Boolean(extra.keepPagesOpen),
        script: await readScript(args),
        sessionId: readOption(args, '--session-id') || extra.sessionId || '',
        timeoutMs: Number(readOption(args, '--timeout-ms')) || extra.timeoutMs || 120000
    };
    printJson(await requestJson(args, '/api/pages/run', 'POST', body));
};
