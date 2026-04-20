import { clickPoint, dragPoint, insertText, movePoint, scrollPoint, sendChord, sendKey } from '@/src/background/input-work';
import { runPageDomAction } from '@/src/background/page-dom-work';
import { readPageTarget } from '@/src/background/page-target-read';
import { runFrameScript } from '@/src/background/page-script-work';
import { PageAction } from '@/src/shared/page-action';

const readTarget = (tabId: number, action: PageAction, selector = '') => runFrameScript(tabId, action.frameId || 0, readPageTarget, [selector || action.selector || '', action.index || 0, true]);
const clearField = async (tabId: number) => {
    await sendChord(tabId, 'A', 4);
    await sendKey(tabId, 'Backspace');
    await sendChord(tabId, 'A', 2);
    await sendKey(tabId, 'Backspace');
};

export const runUserAction = async (tabId: number, action: PageAction) => {
    await chrome.tabs.update(tabId, { active: true });
    if (action.type === 'click') {
        const target = await readTarget(tabId, action);
        if (!target.found) throw new Error(`No element matches ${action.selector || ''}`);
        await clickPoint(tabId, target.x || 0, target.y || 0, action.button || 'left', action.clickCount || 1);
        return target;
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
        await clickPoint(tabId, target.x || 0, target.y || 0);
        if (action.clearFirst) await clearField(tabId);
        await insertText(tabId, action.value || '');
        return target;
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
        const tab = await chrome.tabs.get(tabId);
        const x = action.x || action.x === 0 ? action.x : (tab.width || 1200) / 2;
        const y = action.y || action.y === 0 ? action.y : (tab.height || 800) / 2;
        const target = action.selector ? await readTarget(tabId, action) : { x, y };
        await scrollPoint(tabId, target.x || 0, target.y || 0, action.deltaX || 0, action.deltaY || 0);
        return target;
    }
    if (action.type === 'select_option') {
        return runFrameScript(tabId, action.frameId || 0, runPageDomAction, [action]);
    }
    throw new Error(`User action ${action.type} is not available.`);
};
