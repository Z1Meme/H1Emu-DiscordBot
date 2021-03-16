function getChannelFromMention(msg, mention) {
    if (!mention) return;
    if (mention.startsWith('<#') && mention.endsWith('>')) {
        mention = mention.slice(2, -1);
        if (mention.startsWith('!')) {
            mention = mention.slice(1);
        }
        return msg.guild.channels.cache.get(mention);
    }
}

function getMessageFromId(msg, id, callback) {
    if (!id) return;
    msg.channel.messages.fetch(id)
    .then(message => callback(message))
    .catch(console.error);
}

module.exports = {
    name: 'move',
    aliases: ['move', 'm'],
    description: 'Moves a message to another channel, and @\'s the user who posted the message',
    arguments: ['<channelid>'],
    requiredPermissions: ['MANAGE_MESSAGES'],
    execute(msg, { content }) {
        if(content.length < module.exports.arguments.length + 1) {
            msg.reply(`Missing parameter ${module.exports.arguments[content.length - 1]}`);
            msg.delete({ timeout: 5000 });
            return;
        }
        if(!msg.reference){ // checks if user replied to a message (reference = reply)
            msg.reply('Please reply to a message to move it');
            msg.delete({ timeout: 5000 });
            return;
        }
        console.log(msg.reference.messageID);
        const channel = getChannelFromMention(msg, content[1]);
        if(channel) {
            if(channel.id === msg.channel.id) { // checks if user is trying to move a message to and from the same channel
                msg.reply('You can\'t move a message to and from the same channel');
                msg.delete({ timeout: 5000 });
                return;
            }
            getMessageFromId(msg, msg.reference.messageID, message => { // gets user's message object from id, callback gets executed when finished
                if(message.attachments.first()) { // checks if message has attachment (file / picture)
                    const file = message.attachments.first()
                    channel.send({ content: `${message.author}: ${message.content}`, files: [file] }); //sends message with attachment if attachment exists
                }else {
                    channel.send(`${message.author}: ${message.content}`); // sends message with content only
                }
                msg.reply(`Moved ${message.author}'s message to <#${channel.id}>`, content[0]); // success message in original channel
                message.delete(); // deletes original poster's message
                msg.delete(); // deletes command message
            })
        }
        else {
            msg.reply('Invalid channel');
            msg.delete({ timeout: 5000 });
        }
    },
};