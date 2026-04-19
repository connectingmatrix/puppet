import { compactText } from './route-compare-inspect.mjs';

const same = (left, right) => JSON.stringify(left || null) === JSON.stringify(right || null);

const countDiffs = (left = {}, right = {}) => {
    const out = {};
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of keys) if (left[key] !== right[key]) out[key] = { current: right[key], old: left[key] };
    return out;
};

const styleDiffs = (left = {}, right = {}, selectors = {}, keys = []) => {
    const out = {};
    for (const name of Object.keys(selectors)) {
        const oldSample = left[name];
        const currentSample = right[name];
        if (!oldSample || !currentSample) {
            if (Boolean(oldSample) !== Boolean(currentSample)) out[name] = { current: Boolean(currentSample), old: Boolean(oldSample) };
            continue;
        }
        const changes = {};
        for (const key of keys) {
            const oldValue = oldSample.styles[key];
            const currentValue = currentSample.styles[key];
            if (oldValue !== currentValue) changes[key] = { current: currentValue, old: oldValue };
        }
        if (Object.keys(changes).length) out[name] = changes;
    }
    return out;
};

export const diffRoute = (oldData, currentData, options) => ({
    bodyLength: { current: currentData.bodyLength, old: oldData.bodyLength },
    countDiffs: countDiffs(oldData.counts, currentData.counts),
    currentFinalUrl: currentData.finalUrl,
    currentHeadings: currentData.headings,
    currentMs: currentData.ms,
    currentStart: compactText(currentData.bodyStart),
    errors: { current: currentData.error, old: oldData.error },
    headingChanged: !same(oldData.headings, currentData.headings),
    oldFinalUrl: oldData.finalUrl,
    oldHeadings: oldData.headings,
    oldMs: oldData.ms,
    oldStart: compactText(oldData.bodyStart),
    requestFailures: { current: currentData.failures, old: oldData.failures },
    route: oldData.route,
    styleDiffs: styleDiffs(oldData.samples, currentData.samples, options.selectors, options.styleKeys),
    textStartChanged: compactText(oldData.bodyStart) !== compactText(currentData.bodyStart)
});

export const routeSummary = (diffs = []) => {
    const out = [];
    for (const item of diffs) out.push({
        bodyDelta: Number(item.bodyLength.current || 0) - Number(item.bodyLength.old || 0),
        countDiffKeys: Object.keys(item.countDiffs || {}),
        currentMs: item.currentMs,
        errors: item.errors,
        failures: { current: (item.requestFailures.current || []).length, old: (item.requestFailures.old || []).length },
        oldMs: item.oldMs,
        route: item.route,
        styleDiffKeys: Object.keys(item.styleDiffs || {})
    });
    return out;
};
