const Discord = require('discord.js');
const client = new Discord.Client();
const request = require('request');
const fs = require('fs');

//mongo shit
const mongoose = require('mongoose');

//mongoose.connect('mongodb://localhost/Z1NewHopeData',{useNewUrlParser: true, useUnifiedTopology: true});
//const db = mongoose.connection;

//end of mongo shit

if(fs.existsSync('./attachments')){
    fs.rmdir('attachments', { recursive: true }, (err) => {//deletes 'attachments' folder to clear all files inside
        if (err) {
            throw err;
        }
        if (fs.existsSync('./attachments')) {//creates attachments folder again
            //file exists
            console.log('\'attachments\' folder exists');
        }else{//create attachments folder
            console.log('\'attachments\' folder not found, creating it');
            fs.mkdirSync('./attachments');
        }
    });
}
if (!fs.existsSync('./attachments')){//creates attachments folder
    console.log('\'attachments\' folder not found, creating it');
    fs.mkdirSync('./attachments');
}

let configFileTemplate = {//config.json template
    "prefix": "z1",
    "allowedFiletypes": [],
    "disallowedFiletypes": [],
    "virustotalFiletypes": [],
    "blacklistedWords": [],
    "immuneUsers": [],
    "immuneRoles": [],
    "virustotalRetryTime": 10,
    "virustotalRetryCount": 3,
    "maxCharactersPerMessage": 500
}

checkFile('config.json',JSON.stringify(configFileTemplate, null, 2),'config.json is important for general functionality, please edit it before using the bot');
checkFile('token.txt','','You must setup the bot token before using');
checkFile('virustotalAPIKey.txt','','You must setup the virustotal API key before using');

function checkFile(dir, data, msg){
    try {//checks if file exists, create it if not
        if (fs.existsSync(`./${dir}`)) {
          console.log(`'${dir}' exists`);//file exists
        }else{//create file and write data to it
            fs.writeFileSync(`./${dir}`, data);
            console.log(`'${dir}' file not found, creating it.\n${msg}`);
            return;
        }
    }catch(err) {
        console.error(err);
    }
}

let enums = {//move enums to another file
    //editEmbed field
    'description' : 0,
    'descriptionCodeBlock': 1,
    'descriptionCodeBlockReplaceLastLine': 2,
    'color': 99,
}

const virustotalAPIKey = fs.readFileSync("virustotalAPIKey.txt",{encoding:"utf-8"});//loads virustotal API key from file
let config = JSON.parse(fs.readFileSync("./config.json",{encoding:"utf-8"}));//loads config from config.json file
const prefix = config.prefix;

function updateConfig(_callback){//updates config.json with the contents of 'config'
    fs.writeFile(`./${'config.json'}`, JSON.stringify(config, null, 2), (err) =>{
        if(err){//passes err to callback
            _callback(err);
        }else{
            _callback();
        }
    });
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', (msg) => {
    if(msg.author.id != client.user.id){
        let content = msg.content.split(' ');//splits msg content into array by spaces
        if(content[0] === prefix){//checks if message starts with prefix
            //commands tested for here use 'content' in place of 'msg.content'
            //commands can be called within a DM, be careful when trying to access guild

            if(content[1] === 'ping'){
                msg.reply(`pong! ${client.ws.ping}ms`);
            }

        }
        if(msg.channel.type !== 'text'){//ignores everything in DMs besides commands
            return;
        }

        //checking if message length exceeds config.maxCharactersPerMessage
        if(msg.content.length > config.maxCharactersPerMessage){
            msg.reply(`Please use a website such as https://pastebin.com/ for messages above ${config.maxCharactersPerMessage} characters`)
                .then((reply) => {reply.delete({ timeout: 5000 });})
                .catch(console.error);
            msg.author.send(`Please use a website such as https://pastebin.com/ for messages above ${config.maxCharactersPerMessage} characters`);
            msg.delete();//deletes long message for now, maybe later upload to pastebin automatically
        }


        for(let i=0; i<config.blacklistedWords.length; i++){//blacklistedWords checking
            if(msg.content.includes(config.blacklistedWords[i])){
                msg.author.send(`Blacklisted word detected: '${config.blacklistedWords[i]}'`)
                msg.delete();
                break;
            }
        }
        
        if(msg.attachments.first()){//file checking: checks for allowed/disallowed filetypes and scans certain file types with virustotal
            let immune = false;

            for(let i=0; i<config.immuneUsers.length; i++){//ignores file checking if user is immune
                if(msg.author.id === config.immuneUsers[i]){
                    immune = true;
                    break;
                }
            }

            let roleIDs = [];
            for(let i=0; i < msg.guild.roles.cache.array().length; i++){
                roleIDs.push(msg.guild.roles.cache.array()[i].id);
            }
            for(let i=0; i<config.immuneRoles.length; i++){//ignores file checking if user's role is immune
                if(roleIDs.includes(config.immuneRoles[i])){
                    immune = true;
                    break;
                }
            }
            
            
            let split = msg.attachments.first().name.split('.');//splits name of file and extension
            if(!immune){//checks if user is allowed to post a specific file extention
                if(split.length === 1){//checks if file has extension
                    msg.author.send('Files with no extension are not allowed.');
                    msg.delete();
                }else{
                    for(let i=0; i<config.allowedFiletypes.length; i++){//compare file type to each file type in allowedFiletypes
                        if(split[split.length-1] === config.allowedFiletypes[i]){//allowedFiletypes
                            msg.react('👍');
                            scanFile(msg, split);
                            break;
                        }
                    }
                    for(let i=0; i<config.disallowedFiletypes.length; i++){//compare file type to each file type in disallowedFiletypes
                        if(split[split.length-1] === config.disallowedFiletypes[i]){
                            msg.author.send(`You don't have permission to post '.${split[split.length-1]}' files!`);
                            msg.delete();
                            break;
                        }
                    }
                }
            }else{
                scanFile(msg, split);
            }
        }
    }
});

function scanFile(msg, split){//checks if file type is included in config.virustotalFiletypes, scans it with virustotal and returns the result in chat if true
    for(let i=0; i<config.virustotalFiletypes.length; i++){
        if(split[split.length-1] === config.virustotalFiletypes[i]){
            let virustotalEmbed = new Discord.MessageEmbed()
            .setTitle(msg.attachments.first().name)
            .setColor(0xfafafa)
            .setAuthor('VirusTotal Scan', 'https://pbs.twimg.com/profile_images/903041019331174400/BIaetD1J_200x200.jpg')
            .setDescription('')
            .setTimestamp(new Date())
            .setFooter(`${msg.author.tag}`, msg.author.displayAvatarURL())

            msg.channel.send({embed: virustotalEmbed}).then((message)=>{//sends original virustotal embed
                download(message, msg.attachments.first().url, msg.attachments.first().name,()=>{
                    virustotal(message, `./attachments/${msg.attachments.first().name}`);
                });
            });
        }
    }
}

async function virustotal(message, dir){//scans file with virustotal and returns file report
    let stats = fs.statSync(dir);//checks if file is over 32 MB
    if(stats['size']>=32000000){
        editEmbed(message, enums.descriptionCodeBlock, 'Files 32 Megabytes and above in size are not yet supported, aborting');
        editEmbed(message, enums.description, '[Scan manually](https://www.virustotal.com/gui/)');
        editEmbed(message, enums.color, 0xff0000);
        return;
    }

    let time = Date.now();
    editEmbed(message, enums.descriptionCodeBlock, 'VirusTotal upload started...');
    var req = request.post('http://www.virustotal.com/vtapi/v2/file/scan', (err, res, body) => {//uploads file and gets report link
        if(err){
            message.reply(`err: ${err}`);
            return;
        }

        body = JSON.parse(body);
        editEmbed(message, enums.descriptionCodeBlockReplaceLastLine, `VirusTotal upload finished: ${Date.now()-time}ms\nGetting report...`);
        
        console.log(`Deleting leftover file: ${dir}`);
        fs.unlink(dir, (err) => {//deletes leftover file from 'attachments' folder
            if (err) {
              console.error(err);
              return;
            }
        });

        setTimeout(()=>{//first attempt at getting virustotal report
            let retrys = 0;
            getVirustotalResult(body, message, retrys, (done) => {//callback hell
                if(!done){//if scan isn't finished first time around, start retrying every config.virustotalRetryTime seconds
                    let interval = setInterval(() => {
                        retrys++;
                        getVirustotalResult(body, message ,retrys, (done) => {
                            if(done){//stops retrying if scan returns a value or errors out
                                clearInterval(interval);
                            }
                        });
                    }, config.virustotalRetryTime*1000);
                }
            });
        }, (stats['size'] / 1000) * 2);//edit the multiplied amount to change the time relative to filesize to wait
    });
    var form = req.form();
    form.append('apikey', virustotalAPIKey);//adds apikey to file scan post request
    form.append('file', fs.createReadStream(dir));//adds file to file scan post request
}

function getVirustotalResult(body, message, retrys, _callback){
    request.get({url: 'http://www.virustotal.com/vtapi/v2/file/report', useQuerystring: true, qs: {apikey: virustotalAPIKey, resource: body.resource}}, (err, res, reportBody) => {//gets report
        if (retrys>config.virustotalRetryCount){
            editEmbed(message, enums.descriptionCodeBlockReplaceLastLine, 'Request timed out');
            _callback(true);
            return;
        }
        if(err){
            message.reply(`ERROR: ${err}`);
            _callback(true);
            return;
        }

        if(reportBody){//if reportBody is null, we're probably making too many requests in a short time
            reportBody = JSON.parse(reportBody);//parses JSON
        }else{
            //console.log('FORCING TIMEOUT');//need to handle this better (TODO)
            //console.log('retrying');
            editEmbed(message, enums.descriptionCodeBlockReplaceLastLine, `Report not ready, retrying in ${config.virustotalRetryTime} seconds [${retrys}].`);
            _callback(false);
            return;
        }

        if(body.sha256 !== reportBody.sha256){
            editEmbed(message, enums.descriptionCodeBlockReplaceLastLine, `Report not ready, retrying in ${config.virustotalRetryTime} seconds [${retrys}].`);
            _callback(false);
        }else{
            console.log('Scan finished, no longer retrying');//todo: edit later
            editEmbed(message, enums.descriptionCodeBlockReplaceLastLine, `Scan finished, positives: ${reportBody.positives} / ${reportBody.total}\nFull report below:`);
            editEmbed(message, enums.description, `[Scan results](${reportBody.permalink})`);
            editEmbed(message, enums.color, resolveColor(reportBody.positives));
            _callback(true);//returns true to indicate that the scan is finished
        }
    });
}

function download(message, url, name, _callback){//downloads file, executes callback after download is finished
    let time = Date.now();
    editEmbed(message, enums.descriptionCodeBlock, 'Download started...')
    let file = fs.createWriteStream(`./attachments/${name}`);
    request.get(url)
        .on('error', console.error)
        .pipe(file)
    file.on('finish', function() {
        file.close(() => {
            editEmbed(message, enums.descriptionCodeBlockReplaceLastLine, `Download finished: ${Date.now()-time}ms`)
            _callback();
        });
    });
}

function editEmbed(message, field, edit){//edits a specific field of an embed without affecting other fields
    switch(field){
        case 0://description
            message.edit(message.embeds[0].setDescription(`${message.embeds[0].description}${edit}`));
            break;
        case 1://descriptionCodeBlock
            if(message.embeds[0].description){//embed.description is not blank
                if(message.embeds[0].description.includes(`\`\`\``)){//is not start of code block
                    message.edit(message.embeds[0].setDescription(`${message.embeds[0].description.slice(0, message.embeds[0].description.length-3)}\n${edit}\`\`\``));
                }else{//is start of code block
                    message.edit(message.embeds[0].setDescription(`\`\`\`${edit}\`\`\``));
                }
            }else{//embed.description is blank
                message.edit(message.embeds[0].setDescription(`\`\`\`${edit}\`\`\``));
            }
            break;
        case 2://descriptionCodeBlockReplaceLastLine
            if(message.embeds[0].description){
                let split = message.embeds[0].description.split('\n');//splits embed description into array by newlines
                let description = '';
                for(let i=0; i < split.length - 1; i++){//adds all lines besides last to description
                    description += `${split[i]}\n`;//newlines gets removed when using split, re-adds them
                }
                if(description.includes(`\`\`\``)){//makes sure code block has beginning ```, if not, adds it
                    message.edit(message.embeds[0].setDescription(`${description}${edit}\`\`\``));
                }else{
                    message.edit(message.embeds[0].setDescription(`\`\`\`${description}${edit}\`\`\``));
                }
            }
            break;
        case 99://color
            message.edit(message.embeds[0].setColor(edit));
            break;
        default://default is case 0 (description)
            message.edit(message.embeds[0].setDescription(edit));
            break;
    }
}

function resolveColor(num){//returns hex color in #ffffff form using a number between 0-70 (0 is brightest green, 70 is brightest red) used for virustotal embeds
    switch(true){
        case (num >= 0 && num < 5):
            return 0x00ff00;//bright greeen
        case (num > 5 && num < 15):
            return 0xffff00;//green
        case (num > 15 && num < 30):
            return 0xff8000;//yellow
        case (num > 30 && num < 50):
            return 0xff4400;//orange
        case (num > 50 && num < 100):
            return 0xff0000;//red
        default:
            return 0x000000;//black
    }
}

client.login(fs.readFileSync("./token.txt",{encoding:"utf-8"}));

/* TODO:

    use promises instead of callbacks for a bunch of shit

    possibly use pastebin api to put messages that are longer than config.maxCharactersPerMessage into a pastebin automatically

    Virustotal:
        -introduce file 'queueing' so multiple files can be scanned at once if multiple files are posted back-to-back
        -each message should update normally when multiple files are queued
        -may need to use classes?
        -switch to virustotal API v3
        -allow files larger than 32MB to be uploaded using the get link feature of the virustotal API
        -add timestamp for getting report / scan finished

        -(ongoing) try and calculate how long it'll take to scan a file, to reduce the time it takes for the result to be put into discord
        -(bug) sometimes 'download started' / 'download finished' will not show in the embed

    may need to introduce classes on a larger scale in case the bot is being used on multiple discord servers (later)
    add commands to edit each config file entry
    log more in console
    whenever a file/msg is deleted, log it to a text channel (optional in config.json)

*/

