export const keys = (value, limit = 16) => {
    const items = [];
    for (const key of Object.keys(value || {})) {
        if (items.length >= limit) break;
        items.push(key);
    }
    return items;
};

export const count = (value) => Object.keys(value || {}).length;

export const size = (value = '') => Buffer.byteLength(`${value || ''}`);

const treeStats = (tree) => {
    const stats = { nodes: 0, styleCount: 0 };
    const stack = [tree || {}];
    while (stack.length) {
        const item = stack.pop() || {};
        for (const label of Object.keys(item)) {
            const node = item[label] || {};
            stats.nodes += 1;
            stats.styleCount += count(node.styles);
            if (node.childeren) stack.push(node.childeren);
            if (node.children) stack.push(node.children);
        }
    }
    return stats;
};

export const side = (value = {}) => {
    const diff = value.diff || {};
    const snapshot = value.snapshot || {};
    return {
        box: value.box || snapshot.box,
        classCount: count(value.classes || snapshot.classes),
        classes: keys(value.classes || snapshot.classes, 10),
        diff: {
            classCount: count(diff.classes_diff),
            classes: keys(diff.classes_diff),
            styleCount: count(diff.styles_diff),
            styles: keys(diff.styles_diff),
            tree: treeStats(diff.tree_diff)
        },
        error: value.error || '',
        htmlBytes: size(value.html),
        label: value.label || value.selector || '',
        path: value.path || '',
        styleCount: count(value.style || snapshot.style)
    };
};

export const runs = (value = {}) => {
    const out = {};
    let seen = 0;
    for (const name of Object.keys(value || {})) {
        if (seen >= 6) break;
        const item = value[name] || {};
        out[name] = { left: side(item.left || {}), right: side(item.right || {}) };
        seen += 1;
    }
    return out;
};
