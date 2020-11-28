/* eslint-disable no-case-declarations */
module.exports = {
    name: 'remove',
    aliases: ['remove', 'r'],
    description: 'Removes a value from a specified field in bot config',
    arguments: ['<field>', '<item(s)>'],
    requiredPermissions: ['MANAGE_MESSAGES'],
    execute(msg, args) {
        const content = args.content;
        const config = args.config;
        const updateConfig = args.updateConfig;

        if(content.length < module.exports.arguments.length + 1) {
            msg.reply(`Missing parameter ${module.exports.arguments[content.length - 1]}`);
            return;
        }

        function getUserFromMention(mention) {
            if (!mention) return;
            if (mention.startsWith('<@') && mention.endsWith('>')) {
                mention = mention.slice(2, -1);
                if (mention.startsWith('!')) {
                    mention = mention.slice(1);
                }
                return args.client.users.cache.get(mention);
            }
        }

        function getRoleFromMention(mention) {
            if (!mention) return;
            if (mention.startsWith('<@') && mention.endsWith('>')) {
                mention = mention.slice(2, -1);
                if (mention.startsWith('&')) {
                    mention = mention.slice(1);
                }
                const guild = args.client.guilds.cache.get(msg.guild.id);
                return guild.roles.cache.get(mention);
            }
        }

        let update = false;
        const removedFields = [];
        const missingFields = [];

        const fields = [
            {
                field: 'blacklistedWords',
                aliases: ['blacklistedwords', 'blacklistedword', 'bword', 'bw'],
                execute() {
                    for(let i = 2; i < content.length; i++) {
                        if(config.blacklistedWords.includes(content[i].toLowerCase())) {
                            for(let j = 0; j < config.blacklistedWords.length; j++) {
                                if (config.blacklistedWords[j] === content[i].toLowerCase()) {
                                    config.blacklistedWords.splice(j, 1);
                                    removedFields.push(content[i].toLowerCase());
                                    break;
                                }
                            }
                            update = true;
                        }
                        else {
                            missingFields.push(content[i].toLowerCase());
                        }
                    }
                },
            },
            {
                field: 'disallowedFiletypes',
                aliases: ['disallowedfiletypes', 'disallowedfiles', 'disallowedfile', 'dfiles', 'dfile', 'df'],
                execute() {
                    // removes . from filetypes if present
                    for(let i = 2; i < content.length; i++) {
                        content[i] = content[i].split('.')[content[i].split('.').length - 1];
                    }
                    for(let i = 2; i < content.length; i++) {
                        if(config.disallowedFiletypes.includes(content[i])) {
                            for(let j = 0; j < config.disallowedFiletypes.length; j++) {
                                if (config.disallowedFiletypes[j] === content[i].toLowerCase()) {
                                    config.disallowedFiletypes.splice(j, 1);
                                    removedFields.push(content[i].toLowerCase());
                                    break;
                                }
                            }
                            update = true;
                        }
                        else {
                            missingFields.push(content[i].toLowerCase());
                        }
                    }
                },
            },
            {
                field: 'virustotalFiletypes',
                aliases: ['virustotalfiletypes', 'virustotalfiles', 'virustotalfile', 'vtfiles', 'vtfile', 'vtf'],
                execute() {
                    // removes . from filetypes if present
                    for(let i = 2; i < content.length; i++) {
                        content[i] = content[i].split('.')[content[i].split('.').length - 1];
                    }
                    for(let i = 2; i < content.length; i++) {
                        if(config.virustotalFiletypes.includes(content[i])) {
                            for(let j = 0; j < config.virustotalFiletypes.length; j++) {
                                if (config.virustotalFiletypes[j] === content[i].toLowerCase()) {
                                    config.virustotalFiletypes.splice(j, 1);
                                    removedFields.push(content[i].toLowerCase());
                                    break;
                                }
                            }
                            update = true;
                        }
                        else {
                            missingFields.push(content[i].toLowerCase());
                        }
                    }
                },
            },
            {
                field: 'immuneUsers',
                aliases: ['immuneusers', 'immuneuser', 'iusers', 'iuser', 'iu'],
                execute() {
                    const invalidUsers = [];
                    for(let i = 2; i < content.length; i++) {
                        let user;
                        if (!getUserFromMention(content[i]) && !args.client.users.cache.find(u => u.tag === content[i]) && !args.client.users.cache.find(u => u.id === content[i])) {
                            invalidUsers.push(content[i]);
                        }
                        else {
                            user = getUserFromMention(content[i]) || args.client.users.cache.find(u => u.tag === content[i]) || args.client.users.cache.find(u => u.id === content[i]);
                            if(config.immuneUsers.includes(user.id)) {
                                for(let j = 0; j < config.immuneUsers.length; j++) {
                                    if (config.immuneUsers[j] === user.id) {
                                        config.immuneUsers.splice(j, 1);
                                        removedFields.push(content[i]);
                                        break;
                                    }
                                }
                                update = true;
                            }
                            else {
                                missingFields.push(content[i]);
                            }
                        }
                    }
                    if(invalidUsers.length > 1) {
                        msg.reply(`${invalidUsers} are not valid users, and were not removed. Please mention a user or use a tag such as 'DiscordUser#1234'`);
                    }
                    else if(invalidUsers.length === 1) {
                        msg.reply(`${invalidUsers[0]} is not a valid user, and was not removed. Please mention a user or use a tag such as 'DiscordUser#1234'`);
                    }
                },
            },
            {
                field: 'immuneRoles',
                aliases: ['immuneroles', 'immunerole', 'iroles', 'irole', 'ir'],
                execute() {
                    const invalidRoles = [];
                    const guild = args.client.guilds.cache.get(msg.guild.id);
                    for(let i = 2; i < content.length; i++) {
                        let role;
                        if (!getRoleFromMention(content[i]) && !guild.roles.cache.find(r => r.name === content[i]) && !guild.roles.cache.find(r => r.id === content[i])) {
                            invalidRoles.push(content[i]);
                        }
                        else {
                            role = getRoleFromMention(content[i]) || guild.roles.cache.find(r => r.name === content[i]) || guild.roles.cache.find(r => r.id === content[i]);
                            if(config.immuneRoles.includes(role.id)) {
                                for(let j = 0; j < config.immuneRoles.length; j++) {
                                    if (config.immuneRoles[j] === role.id) {
                                        config.immuneRoles.splice(j, 1);
                                        removedFields.push(content[i]);
                                        break;
                                    }
                                }
                                update = true;
                            }
                            else {
                                missingFields.push(content[i]);
                            }
                        }
                    }
                    if(invalidRoles.length > 1) {
                        msg.reply(`${invalidRoles} are not valid roles, and were not removed. Please mention a valid role, type a role name, or use a role id.'`);
                    }
                    else if(invalidRoles.length === 1) {
                        msg.reply(`${invalidRoles[0]} is not a valid role, and was not removed. Please mention a valid role, type a role name, or use a role id.`);
                    }
                },
            },
        ];

        // parses 'field' aliases executes attached function
        let found = false;
        for(let i = 0;i < fields.length;i++) {
            for(let j = 0;j < fields[i].aliases.length;j++) {
                if(content[1] === fields[i].aliases[j]) {
                    content[1] = fields[i].field;
                    fields[i].execute();
                    found = true;
                    break;
                }
            }
        }
        if(!found) {
            msg.reply(`Invalid field '${content[1].toLowerCase()}'`);
        }

        // updates config file if an update is pending
        if(update) {
            updateConfig((err)=>{
                if(err) {
                    msg.reply('An error occured when saving config.json, unable to save changes.');
                }
                else {
                    if(removedFields.length > 1) {
                        msg.reply(`Items ${removedFields} were removed from ${content[1]}.`);
                    }
                    else if(removedFields.length === 1) {
                        msg.reply(`Item '${removedFields[0]}' was removed from ${content[1]}.`);
                    }
                    if(missingFields.length > 1) {
                        msg.reply(`${missingFields} were not found in ${content[1]}.`);
                    }
                    else if(missingFields.length === 1) {
                        msg.reply(`'${missingFields[0]}' was not found in ${content[1]}.`);
                    }
                }
            });
        }
        else if(missingFields.length > 1) {
            msg.reply(`${missingFields} were not found in ${content[1]}. No changes were made.`);
        }
        else if(missingFields.length === 1) {
            msg.reply(`'${missingFields[0]}' was not found in ${content[1]}. No changes were made.`);
        }
    },
};