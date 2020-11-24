module.exports = {
    name: 'addblacklistedword',
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
        if(config.blacklistedWords.includes(content[1])) {
            msg.reply(`'${content[1]}' is already a part of blacklistedWords!`);
            return;
        }


        config.blacklistedWords.push(content[1]);
        updateConfig((err)=>{
            if(err) {
                msg.reply('An error occured when saving config.json, unable to save changes.');
            }
            else{
                msg.reply(`'${content[1]}' was removed from blacklistedWords`);
            }
        });
    },
};