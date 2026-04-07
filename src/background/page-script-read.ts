const readValue = (value: unknown) => value === undefined ? { empty: true } : { value };

export const runPageScript = async (script: string, args: unknown[]) => {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const execute = new AsyncFunction('args', script || '');
    return JSON.stringify(readValue(await execute(args || [])));
};

export const readPageScriptResult = (value = '') => {
    const data = JSON.parse(value || '{"empty":true}');
    return data.empty ? undefined : data.value;
};
