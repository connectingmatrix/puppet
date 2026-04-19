import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const dir = join(homedir(), '.puppet', 'artifacts');

export const readJsonBytes = (value) => Buffer.byteLength(JSON.stringify(value || null));

export const writeArtifact = async (kind, value) => {
    await mkdir(dir, { recursive: true });
    const id = `${Date.now()}-${crypto.randomUUID()}`;
    const path = join(dir, `${id}.json`);
    const text = JSON.stringify(value, null, 2);
    await writeFile(path, text);
    return {
        approxTokens: Math.ceil(Buffer.byteLength(text) / 4),
        bytes: Buffer.byteLength(text),
        id,
        kind,
        path
    };
};
