module.exports = {
    name: 'ping',
    description: 'Responds with bot response time in milliseconds',
    arguments: [],
    requiredPermissions: [],
    execute(msg, args) {
        msg.reply('todo', args);
    },
};