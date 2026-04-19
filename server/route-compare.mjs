import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Browser } from '../sdk/browser.mjs';
import { readServerState } from '../sdk/server-state.mjs';
import { runWithLimit } from './time-limit.mjs';
import { diffRoute, routeSummary } from './route-compare-diff.mjs';
import { inspectRoute } from './route-compare-inspect.mjs';
import { readRouteOptions } from './route-compare-defaults.mjs';

const id = (value = '') => `${value || ''}`.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 80);

const readArtifactPath = (options) => {
    if (options.artifactPath) return resolve(options.artifactPath);
    return resolve('.tmp', `ui-route-compare-${id(options.oldBase)}-vs-${id(options.currentBase)}.json`);
};

const requireOptions = (options) => {
    if (!options.oldBase || !options.currentBase) throw new Error('oldBase and currentBase are required.');
    if (!options.routes.length) throw new Error('routes must contain at least one route.');
};

const writeRouteArtifact = async (path, value) => {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(value, null, 2));
};

const runCompare = async (baseUrl, options) => {
    const state = await readServerState(baseUrl);
    if (state.status !== 'connected') throw new Error(`Puppet not ready: ${state.status}`);
    const browser = new Browser(baseUrl);
    const page = await browser.newPage('about:blank', { height: options.height, waitUntil: 'load', width: options.width });
    const diffs = [];
    for (const route of options.routes) {
        const oldData = await inspectRoute(page, options.oldBase, route, options);
        const currentData = await inspectRoute(page, options.currentBase, route, options);
        diffs.push(diffRoute(oldData, currentData, options));
    }
    return diffs;
};

export const runRouteCompare = async (baseUrl, body = {}) => {
    const options = readRouteOptions(body);
    requireOptions(options);
    const path = readArtifactPath(options);
    const diffs = await runWithLimit(runCompare(baseUrl, options), options.timeoutMs, 'route compare');
    const artifact = {
        currentBase: options.currentBase,
        diffs,
        generatedAt: new Date().toISOString(),
        oldBase: options.oldBase,
        routesChecked: options.routes.length
    };
    await writeRouteArtifact(path, artifact);
    return {
        artifactPath: path,
        currentBase: options.currentBase,
        oldBase: options.oldBase,
        routesChecked: options.routes.length,
        summary: routeSummary(diffs)
    };
};
