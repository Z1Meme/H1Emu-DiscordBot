module.exports = {
    name: 'adddisallowedfile',
    description: '',
    arguments: ['<filetype>'],
    requiredPermissions: ['MANAGE_MESSAGES'],
    execute(msg, args) {
        const content = args.content;
        const config = args.config;
        const updateConfig = args.updateConfig;

        if(!content[1] || content[1] === '.') {
            msg.reply('missing parameter \'filetype\'');
            return;
        }
        // removes the . from filetype
        const filetype = content[1].split('.')[content[1].split('.').length - 1];
        if(config.disallowedFiletypes.includes(filetype)) {
            msg.reply(`${filetype} is already a part of disallowedFileTypes!`);
            return;
        }

        config.disallowedFiletypes.push(filetype);
        updateConfig((err)=>{
            if(err) {
                msg.reply('An error occured when saving config.json, unable to save changes.');
            }
            else{
                msg.reply(`Filetype ${filetype} was added to disallowedFileTypes`);
            }
        });
    },
};