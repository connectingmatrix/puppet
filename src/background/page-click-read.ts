export const clickPageTarget = (selector: string, index: number, clickCount: number) => {
    const items = Array.from(document.querySelectorAll(selector || 'body'));
    const node = items[index || 0] as HTMLElement | null;
    if (!node) throw new Error(`No element matches ${selector || ''}`);
    node.scrollIntoView({ block: 'center', inline: 'center' });
    const box = node.getBoundingClientRect();
    const init = { bubbles: true, button: 0, cancelable: true, clientX: box.left + box.width / 2, clientY: box.top + box.height / 2, composed: true, view: window };
    for (const name of ['pointerover', 'pointerenter', 'mouseover', 'mouseenter', 'pointermove', 'mousemove']) node.dispatchEvent(new MouseEvent(name, init));
    for (let count = 0; count < (clickCount || 1); count += 1) {
        for (const name of ['pointerdown', 'mousedown']) node.dispatchEvent(new MouseEvent(name, init));
        node.focus && node.focus();
        for (const name of ['pointerup', 'mouseup']) node.dispatchEvent(new MouseEvent(name, init));
        node.click();
    }
    return { clicked: true, html: node.outerHTML, text: (node.textContent || '').replace(/\s+/g, ' ').trim() };
};
