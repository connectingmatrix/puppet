export const submitPageTarget = (selector: string, index: number) => {
    const items = document.querySelectorAll(selector || '');
    const node = items[index || 0] as HTMLElement | null;
    if (!node) throw new Error(`No element matches ${selector || ''}`);
    const form = node.tagName.toLowerCase() === 'form' ? node as HTMLFormElement : node.closest('form') as HTMLFormElement | null;
    if (!form) throw new Error('No form is available for submit.');
    const event = new Event('submit', { bubbles: true, cancelable: true });
    if (form.dispatchEvent(event)) form.submit();
    return true;
};
