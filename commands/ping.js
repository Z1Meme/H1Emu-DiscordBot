module.exports = {
    name: 'ping',
    aliases: ['ping'],
    description: 'Responds with bot response time in milliseconds',
    arguments: [],
    requiredPermissions: [],
    execute(msg, { client }) {
        msg.reply(`pong! ${client.ws.ping}ms`);
    },
};