module.exports = {
    name: 'removeblacklistedword',
    description: '',
    arguments: ['<filetype>'],
    requiredPermissions: ['MANAGE_MESSAGES'],
    execute(msg, args) {
        const content = args.content;
        const config = args.config;
        const updateConfig = args.updateConfig;

        if(!content[1]) {
            msg.reply('missing parameter \'blacklistedWord\'');
            return;
        }
        let found = false;
        for(let i = 0; i < config.blacklistedWords.length; i++) {
            if (config.blacklistedWords[i] === content[1]) {
                found = true;
                config.blacklistedWords.splice(i, 1);
                updateConfig((err)=>{
                    if(err) {
                        msg.reply('An error occured when saving config.json, unable to save changes.');
                    }
                    else{
                        msg.reply(`'${content[1]}' was removed from blacklistedWords`);
                    }
                });
                break;
            }
        }
        if(!found) {
            msg.reply(`'${content[1]}' was not found in blacklistedWords`);
        }
    },
};