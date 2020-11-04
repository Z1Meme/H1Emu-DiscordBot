module.exports = {
    name: 'addblacklistedword',
    description: '',
    execute(msg, args) {
        const content = args.content;
        const config = args.config;
        const updateConfig = args.updateConfig;

        if(!content[2]) {
            msg.reply('missing parameter \'blacklistedWord\'');
            return;
        }
        if(config.blacklistedWords.includes(content[2])) {
            msg.reply(`'${content[2]}' is already a part of blacklistedWords!`);
            return;
        }


        config.blacklistedWords.push(content[2]);
        updateConfig((err)=>{
            if(err) {
                msg.reply('An error occured when saving config.json, unable to save changes.');
            }
            else{
                msg.reply(`'${content[2]}' was removed from blacklistedWords`);
            }
        });
    },
};