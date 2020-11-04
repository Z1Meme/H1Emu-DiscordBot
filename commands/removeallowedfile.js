module.exports = {
    name: 'removeallowedfile',
    description: '',
    execute(msg, args) {
        const content = args.content;
        const config = args.config;
        const updateConfig = args.updateConfig;

        if(!content[2]) {
            msg.reply('missing parameter \'filetype\'');
            return;
        }
        let found = false;
        for(let i = 0; i < config.allowedFiletypes.length; i++) {
            if (config.allowedFiletypes[i] === content[2]) {
                found = true;
                config.allowedFiletypes.splice(i, 1);
                updateConfig((err)=>{
                    if(err) {
                        msg.reply('An error occured when saving config.json, unable to save changes.');
                    }
                    else{
                        msg.reply(`'${content[2]}' was removed from allowedFiletypes`);
                    }
                });
                break;
            }
        }
        if(!found) {
            msg.reply(`'${content[2]}' was not found in allowedFiletypes`);
        }
    },
};