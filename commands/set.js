/* eslint-disable no-case-declarations */
module.exports = {
    name: 'set',
    aliases: ['set', 's'],
    description: 'Sets a specified field\'s value in bot config',
    arguments: ['<field>', '<value>'],
    requiredPermissions: ['MANAGE_MESSAGES'],
    execute(msg, { content, config, updateConfig }) {
        if(content.length < module.exports.arguments.length + 1) {
            msg.reply(`Missing parameter ${module.exports.arguments[content.length - 1]}`);
            return;
        }

        function editInteger() {
            if(!isNaN(content[2])) {
                config[content[1]] = Number.parseInt(content[2]);
                update = true;
            }
            else{
                msg.reply(`'${content[2]}' is not a valid integer`);
            }
        }
        function editBool() {
            // parses bool
            switch(content[2]) {
                case 'true': case '1': case 'yes':
                    content[2] = true;
                    break;
                case 'false': case '0': case 'no':
                    content[2] = false;
                    break;
            }
            if(content[2] === true) {
                config[content[1]] = true;
                update = true;
            }
            else if(content[2] === false) {
                config[content[1]] = false;
                update = true;
            }
            else{
                msg.reply(`'${content[2]}' is not a valid boolean`);
            }
        }
        function editString() {
            config[content[1]] = content[2];
            update = true;
        }

        let update = false;
        let oldValue = '';

        // parses 'field' aliases executes attached function
        let found = false;
        const fields = module.exports.fields;
        for(let i = 0;i < fields.length;i++) {
            for(let j = 0;j < fields[i].aliases.length;j++) {
                if(content[1] === fields[i].aliases[j]) {
                    // sets content[1] to the actual field name, rather than an alias
                    content[1] = fields[i].field;
                    // specifies oldValue for the bot reply
                    oldValue = config[content[1]];
                    // executes the edit function for a specified field
                    if(Number.isInteger(config[content[1]])) {
                        editInteger();
                    }
                    else if(typeof config[content[1]] === 'boolean') {
                        editBool();
                    }
                    else if(typeof config[content[1]] === 'string') {
                        editString();
                    }
                    found = true;
                    break;
                }
            }
        }
        if(!found) {
            msg.reply(`Invalid field '${content[1].toLowerCase()}'`);
        }

        if(update) {
            updateConfig((err)=>{
                if(err) {
                    msg.reply('An error occured when saving config.json, unable to save changes.');
                }
                else {
                    msg.reply(`'${content[1]}' was edited. Old value: '${oldValue}' --> New value: ${config[content[1]]}`);
                }
            });
        }
    },
    fields: [
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