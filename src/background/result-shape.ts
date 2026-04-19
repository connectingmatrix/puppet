import { readTreeDiff, readTreeSnapshot } from '@/src/background/tree-shape';
import { readSnapshotFlag } from '@/src/shared/snapshot-policy';

const readClasses = (names) => {
    const result = {};
    for (const name of [...names].sort()) result[name] = 'applied';
    return result;
};
const readStyles = (styles) => {
    const result = {};
    for (const name of Object.keys(styles).sort()) result[name] = styles[name];
    return result;
};
const readClassDiff = (page, other) => {
    const result = {};
    const names = new Set();
    for (const name of page.detail.classes) names.add(name);
    for (const name of other.detail.classes) names.add(name);
    for (const name of names) if (page.detail.classes.includes(name) || other.detail.classes.includes(name)) result[name] = page.detail.classes.includes(name) ? 'applied' : 'missing class';
    return result;
};
const readStyleDiff = (page, other) => {
    const result = {};
    const names = new Set();
    for (const name of Object.keys(page.detail.styles)) names.add(name);
    for (const name of Object.keys(other.detail.styles)) names.add(name);
    for (const name of names) if ((page.detail.styles[name] || '') !== (other.detail.styles[name] || '')) result[name] = page.detail.styles[name] || '';
    return result;
};
const readSnapshot = (page) => ({ classes: readClasses(page.detail.classes), error: page.snapshot.error, html: page.snapshot.html, rootLabel: page.snapshot.rootLabel, selector: page.snapshot.selector, style: readStyles(page.detail.styles), tree: readTreeSnapshot(page.snapshot.tree) });
const readSide = (page, other, _snapshot, tree_diff) => {
    const result = { box: page.detail.box, classes: readClasses(page.detail.classes), diff: { classes_diff: readClassDiff(page, other), styles_diff: readStyleDiff(page, other), tree_diff }, error: page.detail.error || page.snapshot.error, html: page.detail.html, label: page.detail.label, path: page.detail.path };
    if (readSnapshotFlag()) result.snapshot = readSnapshot(page);
    return result;
};

export const readCompareResult = (left, right, snapshot) => {
    const tree = readTreeDiff(left.snapshot.tree, right.snapshot.tree);
    return { left: readSide(left, right, snapshot, tree.left), right: readSide(right, left, snapshot, tree.right) };
};

export const readInspectResult = (page, _snapshot) => {
    const result = { box: page.detail.box, classes: readClasses(page.detail.classes), error: page.detail.error || page.snapshot.error, html: page.detail.html, label: page.detail.label, path: page.detail.path };
    if (readSnapshotFlag()) result.snapshot = readSnapshot(page);
    return result;
};
