export const typePageTarget = (selector: string, index: number, value: string, clearFirst: boolean) => {
    const node = document.querySelectorAll(selector || '')[index || 0] as HTMLInputElement | HTMLTextAreaElement | null;
    if (!node) throw new Error(`No element matches ${selector || ''}`);
    const next = clearFirst ? value || '' : `${node.value || ''}${value || ''}`;
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node), 'value');
    if (descriptor && descriptor.set) descriptor.set.call(node, next);
    else node.value = next;
    node.focus();
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
    return { value: node.value };
};
