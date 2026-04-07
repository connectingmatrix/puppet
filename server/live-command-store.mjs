const commands = new Map();

const send = (socket, value) => {
    if (!socket || socket.readyState !== 1) return;
    socket.send(JSON.stringify(value));
};

export const saveLiveCommand = (id, socket, instanceId = '') => {
    commands.set(id, { instanceId, socket });
};

export const resolveLiveCommand = (id, result = {}, error = '') => {
    const command = commands.get(id);
    if (!command) return false;
    commands.delete(id);
    send(command.socket, error ? { error, id, type: 'request.resolve.error' } : { id, result, type: 'request.resolve.result' });
    return true;
};

export const dropLiveCommands = (socket, instanceId = '', error = '') => {
    for (const [id, command] of commands.entries()) {
        if (socket && command.socket !== socket) continue;
        if (instanceId && command.instanceId !== instanceId) continue;
        commands.delete(id);
        if (error) send(command.socket, { error, id, type: 'request.resolve.error' });
    }
};
