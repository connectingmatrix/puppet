import { readFile } from 'node:fs/promises';

const readPair = (args, name) => {
    for (let index = 0; index < args.length; index += 1) {
        if (args[index] === name) return args[index + 1] || '';
        if (`${args[index]}`.startsWith(`${name}=`)) return `${args[index]}`.slice(name.length + 1);
    }
    return '';
};

export const hasFlag = (args, name) => args.includes(name);
export const readPort = (args) => readPair(args, '--port') || process.env.PUPPET_PORT || '4017';
export const readServer = (args) => readPair(args, '--server') || process.env.PUPPET_SERVER_URL || `http://127.0.0.1:${readPort(args)}`;
export const readOption = readPair;

export const readBody = async (args) => {
    const text = readPair(args, '--json');
    if (text) return JSON.parse(text);
    const file = readPair(args, '--file');
    if (file) return JSON.parse(await readFile(file, 'utf8'));
    if (hasFlag(args, '--stdin') || args.includes('-')) {
        const chunks = [];
        for await (const chunk of process.stdin) chunks.push(chunk);
        return JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));
    }
    return {};
};
