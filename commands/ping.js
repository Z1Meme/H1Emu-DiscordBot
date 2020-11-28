module.exports = {
    name: 'ping',
    aliases: ['ping'],
    description: 'Responds with bot response time in milliseconds',
    arguments: [],
    requiredPermissions: [],
    execute(msg, args) {
        msg.reply(`pong! ${args.client.ws.ping}ms`);
    },
};