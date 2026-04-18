import { readFile } from 'node:fs/promises';

export const helpMdCommand = async () => {
    const text = await readFile(new URL('../README.md', import.meta.url), 'utf8');
    console.log(text);
};
