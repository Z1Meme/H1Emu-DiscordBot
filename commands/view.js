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

        // todo
        const fields = [
            {
                field: 'blacklistedWords',
                aliases: ['blacklistedwords', 'blacklistedword', 'bword', 'bw'],
                execute() {

                },
            },
            {
                field: 'disallowedFiletypes',
                aliases: ['disallowedfiletypes', 'disallowedfiles', 'disallowedfile', 'dfiles', 'dfile', 'df'],
                execute() {

                }
            },
            {
                field: 'virustotalFiletypes',
                aliases: ['virustotalfiletypes', 'virustotalfiles', 'virustotalfile', 'vtfiles', 'vtfile', 'vtf'],
                execute() {

                }
            },
            {
                field: 'immuneUsers',
                aliases: ['immuneusers', 'immuneuser', 'iusers', 'iuser', 'iu'],
                execute() {
                
                }
            },
            {
                field: 'immuneRoles',
                aliases: ['immuneroles', 'immunerole', 'iroles', 'irole', 'ir'],
                execute() {

                }
            },
            {
                field: 'virustotalRetryTime',
                aliases: ['virustotalretrytime', 'vtretrytime', 'vtrt'],
                execute() {

                },
            },
            {
                field: 'virustotalRetryCount',
                aliases: ['virustotalretrycount', 'vtretrycount', 'vtrc'],
                execute() {

                },
            },
            {
                field: 'virustotalScanningEnabled',
                aliases: ['virustotalscanningenabled', 'vtscanningenabled', 'vtse'],
                execute() {

                },
            },
            {
                field: 'maxCharactersPerMessage',
                aliases: ['maxcharacterspermessage', 'maxcharspermessage', 'maxcharspermsg', 'mcpm'],
                execute() {

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

        msg.reply('Command unfinished, coming soon.');
    },
};