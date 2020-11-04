module.exports = {
    name: 'adddisallowedfile',
    description: '',
    execute(msg, args) {
        const content = args.content;
        const config = args.config;
        const updateConfig = args.updateConfig;

        if(!content[2] || content[2] === '.') {
            msg.reply('missing parameter \'filetype\'');
            return;
        }
        // removes the . from filetype
        const filetype = content[2].split('.')[content[2].split('.').length - 1];
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