#!/usr/bin/env node
import { apiCommand } from '../cli/api.mjs';
import { configureCommand } from '../cli/configure.mjs';
import { extensionCommand } from '../cli/extension.mjs';
import { helpCommand } from '../cli/help.mjs';
import { runCommand } from '../cli/run.mjs';
import { serverCommand } from '../cli/server.mjs';

const args = process.argv.slice(2);
const command = args.shift() || 'help';

const main = async () => {
    if (command === 'help' || command === '--help' || command === '-h') return helpCommand(args);
    if (command === 'server' || command === 'start') return serverCommand(command === 'start' ? ['start', ...args] : args);
    if (command === 'configure' || command === 'config') return configureCommand(args);
    if (command === 'run' || command === 'exec' || command === 'script') return runCommand(args);
    if (command === 'extension') return extensionCommand(args);
    if (command === 'api' || command === 'health' || command === 'instances' || command === 'pages' || command === 'compare' || command === 'inspect') {
        return apiCommand([command, ...args]);
    }
    throw new Error(`Unknown command: ${command}. Run puppet help.`);
};

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
