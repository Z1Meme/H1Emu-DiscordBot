module.exports = {
    name: 'removedisallowedfile',
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
        for(let i = 0; i < config.disallowedFiletypes.length; i++) {
            if (config.disallowedFiletypes[i] === content[2]) {
                found = true;
                config.disallowedFiletypes.splice(i, 1);
                updateConfig((err)=>{
                    if(err) {
                        msg.reply('An error occured when saving config.json, unable to save changes.');
                    }
                    else{
                        msg.reply(`'${content[2]}' was removed from disallowedFiletypes`);
                    }
                });
                break;
            }
        }
        if(!found) {
            msg.reply(`'${content[2]}' was not found in disallowedFiletypes`);
        }
    },
};