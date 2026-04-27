import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { hasFlag, readOption, readPort, readServer } from './options.mjs';

const valueFlags = new Set(['--port', '--server', '--timeout-ms', '--session-id']);
const readFile = (args) => {
    if (readOption(args, '--eval') || readOption(args, '--script')) throw new Error('Injected Puppet script execution is disabled. Put the code in a module that imports puppet, then run that file.');
    for (let index = 0; index < args.length; index += 1) {
        if (args[index] === '--') return '';
        if (valueFlags.has(args[index])) index += 1;
        else if (!args[index].startsWith('-')) return args[index];
    }
    return '';
};
const readArgs = (args) => {
    const index = args.indexOf('--');
    return index < 0 ? [] : args.slice(index + 1);
};
const runNode = (file, args, env, timeoutMs) => new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [file, ...args], { env: { ...process.env, ...env }, stdio: 'inherit' });
    const timer = setTimeout(() => {
        child.kill('SIGTERM');
        rejectRun(new Error(`Timed out waiting for ${file}.`));
    }, timeoutMs);
    child.on('error', (error) => {
        clearTimeout(timer);
        rejectRun(error);
    });
    child.on('exit', (code) => {
        clearTimeout(timer);
        if (!code) resolveRun();
        else rejectRun(new Error(`${file} exited with code ${code}.`));
    });
});

export const runCommand = async (args) => {
    const file = readFile(args);
    if (!file) throw new Error('Pass a module file to puppet run. Inline eval is disabled.');
    const path = resolve(file);
    await access(path);
    await runNode(path, readArgs(args), {
        PUPPET_KEEP_PAGES_OPEN: hasFlag(args, '--keep-pages-open') ? '1' : '',
        PUPPET_PORT: readPort(args),
        PUPPET_SERVER_URL: readServer(args),
        PUPPET_SESSION_ID: readOption(args, '--session-id') || ''
    }, Number(readOption(args, '--timeout-ms')) || 120000);
};
