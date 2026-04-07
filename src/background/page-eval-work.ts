import { sendDebug } from '@/src/background/debugger-work';

const readText = (result: Record<string, any>) => result.exceptionDetails && result.exceptionDetails.exception && result.exceptionDetails.exception.description || result.exceptionDetails && result.exceptionDetails.text || 'Could not evaluate script.';
const readExpression = (script: string, args: unknown[]) => `(async()=>{const args=${JSON.stringify(args || [])};${script || ''}})()`;

export const runPageEval = async (tabId: number, script: string, args: unknown[]) => {
    const result = await sendDebug(tabId, 'Runtime.evaluate', {
        awaitPromise: true,
        expression: readExpression(script, args),
        includeCommandLineAPI: false,
        returnByValue: true
    });
    if (result.exceptionDetails) throw new Error(readText(result));
    return result.result ? result.result.value : undefined;
};
