import { clickPoint, dragPoint, movePoint, sendKey } from '@/src/background/input-work';
import { clickPageTarget } from '@/src/background/page-click-read';
import { scrollPageTarget } from '@/src/background/page-scroll-read';
import { readSelectTarget } from '@/src/background/page-select-read';
import { readPageTarget } from '@/src/background/page-target-read';
import { typePageTarget } from '@/src/background/page-type-read';
import { runFrameScript } from '@/src/background/page-script-work';
import { PageAction } from '@/src/shared/page-action';

const readTarget = (tabId: number, action: PageAction, selector = '') => runFrameScript(tabId, action.frameId || 0, readPageTarget, [selector || action.selector || '', action.index || 0, true]);
export const runUserAction = async (tabId: number, action: PageAction) => {
    if (action.type === 'click') {
        const target = await readTarget(tabId, action);
        if (!target.found) throw new Error(`No element matches ${action.selector || ''}`);
        const clicked = await runFrameScript(tabId, action.frameId || 0, clickPageTarget, [action.selector || '', action.index || 0, action.clickCount || 1], 60000, 'MAIN');
        return { ...target, clicked };
    }
    if (action.type === 'hover') {
        const target = await readTarget(tabId, action);
        if (!target.found) throw new Error(`No element matches ${action.selector || ''}`);
        await movePoint(tabId, target.x || 0, target.y || 0);
        return target;
    }
    if (action.type === 'type_text') {
        const target = await readTarget(tabId, action);
        if (!target.found) throw new Error(`No element matches ${action.selector || ''}`);
        const typed = await runFrameScript(tabId, action.frameId || 0, typePageTarget, [action.selector || '', action.index || 0, action.value || '', Boolean(action.clearFirst)], 60000, 'MAIN');
        return { ...target, typed };
    }
    if (action.type === 'send_key') {
        if (action.selector) {
            const target = await readTarget(tabId, action);
            if (!target.found) throw new Error(`No element matches ${action.selector || ''}`);
            await clickPoint(tabId, target.x || 0, target.y || 0);
        }
        await sendKey(tabId, action.key || '');
        return { key: action.key || '' };
    }
    if (action.type === 'drag_drop') {
        const left = await readTarget(tabId, action, action.sourceSelector || '');
        const right = await readTarget(tabId, action, action.targetSelector || '');
        if (!left.found || !right.found) throw new Error('Drag and drop requires both source and target.');
        await dragPoint(tabId, { x: left.x || 0, y: left.y || 0 }, { x: right.x || 0, y: right.y || 0 });
        return { left, right };
    }
    if (action.type === 'scroll') {
        return runFrameScript(tabId, action.frameId || 0, scrollPageTarget, [action.selector || '', action.index || 0, action.deltaX || 0, action.deltaY || 0], 60000, 'MAIN');
    }
    if (action.type === 'select_option') {
        return runFrameScript(tabId, action.frameId || 0, readSelectTarget, [action.selector || '', action.value || '', action.index || 0], 60000, 'MAIN');
    }
    throw new Error(`User action ${action.type} is not available.`);
};
