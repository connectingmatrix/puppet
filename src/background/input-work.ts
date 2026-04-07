import { sendDebug } from '@/src/background/debugger-work';
import { readKeyData } from '@/src/background/key-read';

const readButton = (button: string) => button === 'middle' ? 'middle' : button === 'right' ? 'right' : 'left';

export const movePoint = async (tabId: number, x: number, y: number, button = 'left') => {
    const next = readButton(button);
    await sendDebug(tabId, 'Input.dispatchMouseEvent', { button: next, clickCount: 1, type: 'mouseMoved', x, y });
};

export const clickPoint = async (tabId: number, x: number, y: number, button = 'left', count = 1) => {
    const next = readButton(button);
    await movePoint(tabId, x, y, button);
    for (let index = 0; index < count; index += 1) {
        await sendDebug(tabId, 'Input.dispatchMouseEvent', { button: next, clickCount: count, type: 'mousePressed', x, y });
        await sendDebug(tabId, 'Input.dispatchMouseEvent', { button: next, clickCount: count, type: 'mouseReleased', x, y });
    }
};

export const dragPoint = async (tabId: number, left: { x: number; y: number }, right: { x: number; y: number }) => {
    await sendDebug(tabId, 'Input.dispatchMouseEvent', { button: 'left', type: 'mouseMoved', x: left.x, y: left.y });
    await sendDebug(tabId, 'Input.dispatchMouseEvent', { button: 'left', clickCount: 1, type: 'mousePressed', x: left.x, y: left.y });
    await sendDebug(tabId, 'Input.dispatchMouseEvent', { button: 'left', type: 'mouseMoved', x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 });
    await sendDebug(tabId, 'Input.dispatchMouseEvent', { button: 'left', type: 'mouseMoved', x: right.x, y: right.y });
    await sendDebug(tabId, 'Input.dispatchMouseEvent', { button: 'left', clickCount: 1, type: 'mouseReleased', x: right.x, y: right.y });
};

export const scrollPoint = async (tabId: number, x: number, y: number, deltaX: number, deltaY: number) => {
    await sendDebug(tabId, 'Input.dispatchMouseEvent', { deltaX, deltaY, type: 'mouseWheel', x, y });
};

export const sendKey = async (tabId: number, key: string) => {
    const value = readKeyData(key);
    await sendDebug(tabId, 'Input.dispatchKeyEvent', { code: value.code, key, text: value.text, type: 'keyDown', windowsVirtualKeyCode: value.value });
    if (value.text) await sendDebug(tabId, 'Input.dispatchKeyEvent', { code: value.code, key, text: value.text, type: 'char', windowsVirtualKeyCode: value.value });
    await sendDebug(tabId, 'Input.dispatchKeyEvent', { code: value.code, key, type: 'keyUp', windowsVirtualKeyCode: value.value });
};

export const sendChord = async (tabId: number, key: string, modifiers: number) => {
    const value = readKeyData(key);
    await sendDebug(tabId, 'Input.dispatchKeyEvent', { code: value.code, key, modifiers, type: 'rawKeyDown', windowsVirtualKeyCode: value.value });
    await sendDebug(tabId, 'Input.dispatchKeyEvent', { code: value.code, key, modifiers, type: 'keyUp', windowsVirtualKeyCode: value.value });
};

export const insertText = async (tabId: number, text: string) => {
    if (!text) return;
    await sendDebug(tabId, 'Input.insertText', { text });
};
