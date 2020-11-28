module.exports = {
    name: 'help',
    aliases: ['help', 'commands'],
    description: 'Responds with bot response time in milliseconds',
    arguments: [],
    requiredPermissions: [],
    execute(msg, args) {
        msg.reply('todo', args);
    },
};