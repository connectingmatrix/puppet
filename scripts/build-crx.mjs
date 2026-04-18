import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';

const keyPath = 'artifacts/puppet.pem';
const crxPath = 'artifacts/puppet.crx';

const run = (command, args) => new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
    child.on('exit', (code) => {
        if (code || code === null) reject(new Error(`${command} ${args.join(' ')} failed`));
        else resolve();
    });
});

const ensureKey = async () => {
    if (existsSync(keyPath)) return;
    const pair = generateKeyPairSync('rsa', { modulusLength: 4096 });
    const privateKey = pair.privateKey.export({ type: 'pkcs8', format: 'pem' });
    await writeFile(keyPath, privateKey);
};

const main = async () => {
    await mkdir('artifacts', { recursive: true });
    await ensureKey();
    await run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build']);
    await run(process.platform === 'win32' ? 'npx.cmd' : 'npx', [
        'crx3',
        '-p', keyPath,
        '-o', crxPath,
        'dist'
    ]);
};

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
