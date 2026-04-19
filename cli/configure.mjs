import { clearConfig, configPath, readConfig, writeConfig } from './config.mjs';
import { readOption } from './options.mjs';

const readExtensionUrl = (args) => args.find((item) => item.startsWith('chrome-extension://')) || readOption(args, '--extension-url') || '';

export const configureCommand = async (args) => {
    const mode = args[0] || '';
    if (mode === 'show') {
        console.log(JSON.stringify({ path: configPath, value: await readConfig() }, null, 2));
        return;
    }
    if (mode === 'reset') {
        await clearConfig();
        console.log(`Puppet config cleared at ${configPath}`);
        return;
    }
    const extensionUrl = readExtensionUrl(args);
    if (!extensionUrl) throw new Error('Usage: puppet configure chrome-extension://EXTENSION_ID/sidepanel.html');
    const next = { ...(await readConfig()), extensionUrl, updatedAt: Date.now() };
    await writeConfig(next);
    console.log(`Puppet extension URL saved at ${configPath}`);
};
