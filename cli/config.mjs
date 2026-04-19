import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const configDir = join(homedir(), '.puppet');
export const configPath = join(configDir, 'config.json');

export const readConfig = async () => {
    try {
        return JSON.parse(await readFile(configPath, 'utf8'));
    } catch {
        return {};
    }
};

export const writeConfig = async (value) => {
    await mkdir(configDir, { recursive: true });
    await writeFile(configPath, JSON.stringify(value, null, 2));
    return value;
};

export const clearConfig = async () => {
    await rm(configPath, { force: true });
};
