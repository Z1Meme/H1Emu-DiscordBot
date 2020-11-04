module.exports = {
    name: 'ping',
    description: 'Responds with bot response time in milliseconds',
    execute(msg, args) {
        msg.reply(`pong! ${args.client.ws.ping}ms`);
    },
};