export const snapshotFeatureEnabled = false;

export const readSnapshotFlag = () => snapshotFeatureEnabled;

export const readActions = (actions = []) => {
    const items = [];
    for (const action of actions || []) items.push({ ...action, snapshot: readSnapshotFlag() });
    return items;
};
