import { spawn } from 'node:child_process';
import { openSync } from 'node:fs';
import { readServer } from './options.mjs';
import { printJson, requestJson } from './http.mjs';

const root = new URL('..', import.meta.url);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const readPort = (args) => new URL(readServer(args)).port || '4017';
const readLog = (port) => `/tmp/puppet-server-${port}.log`;

const readState = async (args) => {
    const health = await requestJson(args, '/api/health');
    const instances = await requestJson(args, '/api/instances');
    return { health, instances, server: readServer(args) };
};

const waitStarted = async (args) => {
    const endsAt = Date.now() + 10000;
    while (Date.now() < endsAt) {
        try {
            return await readState(args);
        } catch {
            await wait(250);
        }
    }
    throw new Error(`Timed out waiting for ${readServer(args)}.`);
};

export const serverCommand = async (args) => {
    const mode = args[0] || 'start';
    if (mode === 'status') return printJson(await readState(args));
    if (mode === 'foreground') {
        process.env.PORT = readPort(args);
        await import('../server/index.mjs');
        return;
    }
    try {
        return printJson(await readState(args));
    } catch {}
    const port = readPort(args);
    const log = readLog(port);
    const output = openSync(log, 'a');
    const child = spawn(process.execPath, ['server/index.mjs'], {
        cwd: root,
        detached: true,
        env: { ...process.env, PORT: port },
        stdio: ['ignore', output, output]
    });
    child.unref();
    const state = await waitStarted(args);
    printJson({ ...state, log, started: true });
};
