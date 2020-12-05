/* eslint-disable no-case-declarations */
module.exports = {
    name: 'view',
    aliases: ['view', 'v'],
    description: 'Returns the value of a specified field in bot config',
    arguments: ['<field>'],
    requiredPermissions: ['MANAGE_MESSAGES'],
    execute(msg, args) {
        const content = args.content;
        const config = args.config;

        if(content.length < module.exports.arguments.length + 1) {
            msg.reply(`Missing parameter ${module.exports.arguments[content.length - 1]}`);
            return;
        }

        // parses 'field' aliases and executes function
        let found = false;
        const fields = module.exports.fields;
        for(let i = 0;i < fields.length;i++) {
            for(let j = 0;j < fields[i].aliases.length;j++) {
                if(content[1] === fields[i].aliases[j]) {
                    content[1] = fields[i].field;
                    if(Array.isArray(config[content[1]])) {
                        msg.reply(`'${content[1]}' contains: ${config[content[1]]}`);
                    }
                    else{
                        msg.reply(`'${content[1]}' is set to: '${config[content[1]]}'`);
                    }
                    found = true;
                    break;
                }
            }
        }
        if(!found) {
            msg.reply(`Invalid field '${content[1].toLowerCase()}'`);
        }

    },
    fields: [
        {
            field: 'blacklistedWords',
            aliases: ['blacklistedwords', 'blacklistedword', 'bword', 'bw'],
        },
        {
            field: 'disallowedFiletypes',
            aliases: ['disallowedfiletypes', 'disallowedfiles', 'disallowedfile', 'dfiles', 'dfile', 'df'],
        },
        {
            field: 'virustotalFiletypes',
            aliases: ['virustotalfiletypes', 'virustotalfiles', 'virustotalfile', 'vtfiles', 'vtfile', 'vtf'],
        },
        {
            field: 'immuneUsers',
            aliases: ['immuneusers', 'immuneuser', 'iusers', 'iuser', 'iu'],
        },
        {
            field: 'immuneRoles',
            aliases: ['immuneroles', 'immunerole', 'iroles', 'irole', 'ir'],
        },
        {
            field: 'virustotalRetryTime',
            aliases: ['virustotalretrytime', 'vtretrytime', 'vtrt'],
        },
        {
            field: 'virustotalRetryCount',
            aliases: ['virustotalretrycount', 'vtretrycount', 'vtrc'],
        },
        {
            field: 'virustotalScanningEnabled',
            aliases: ['virustotalscanningenabled', 'vtscanningenabled', 'vtse'],
        },
        {
            field: 'maxCharactersPerMessage',
            aliases: ['maxcharacterspermessage', 'maxcharspermessage', 'maxcharspermsg', 'mcpm'],
        },
    ],
};