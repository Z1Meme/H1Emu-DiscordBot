module.exports = {
    name: 'help',
    aliases: ['help', 'commands'],
    description: 'Responds with a full list of commands',
    arguments: [],
    requiredPermissions: [],
    execute(msg, { content }) {
        msg.reply('todo', content[0]);
    },
};