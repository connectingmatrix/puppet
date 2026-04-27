const limit = 1200;

export const readPreviewText = (value = '') => {
    const text = `${value || ''}`;
    return text.length > limit ? `${text.slice(0, limit)}...[truncated ${text.length - limit} chars]` : text;
};
