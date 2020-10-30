const Discord = require('discord.js');
const client = new Discord.Client();
const request = require('request');
//const http = require('http');
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
    "allowedFiletypes": [],
    "disallowedFiletypes": [],
    "virustotalFiletypes": [],
    "blacklistedWords": [],
    "immuneUsers": [],
    "immuneRoles": [],
    "virustotalRetryTime": 10,
    "virustotalRetryCount": 3
}
checkFile('config.json',JSON.stringify(configFileTemplate),'config.json is important for general functionality, please edit it before using the bot');
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
    'description' : 0,
    'descriptionCodeBlockStart': 1,
    'descriptionCodeBlock': 2,
    'color': 3,
}

//TODO: create function to refresh config file (edits config variable and replaces config.json with updated variable)

const virustotalAPIKey = fs.readFileSync("virustotalAPIKey.txt",{encoding:"utf-8"});//loads virustotal API key from file
let config = JSON.parse(fs.readFileSync("./config.json",{encoding:"utf-8"}));//loads config from config.json file

const prefix = "z1";

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', (msg) => {
    if(msg.author.id != client.user.id){
        if(msg.content.substring(0,prefix.length) === prefix){//checks if message starts with prefix
            let content = msg.content.substring(prefix.length+1).toLowerCase();//removes prefix from message content

            //TODO: replace msg.content.substring with string.split so each param is in an array

            //commands tested for here use 'content' in place of 'msg.content'
    
            if(content === 'ping'){
                msg.reply(`pong! ${Date.now()-msg.createdAt}ms`);
            }
        }
        
        //blacklistedWords checking
        for(let i=0; i<config.blacklistedWords.length; i++){
            if(msg.content.includes(config.blacklistedWords[i]) && msg.channel.type === 'text'){
                msg.author.send(`Blacklisted word detected: '${config.blacklistedWords[i]}'`)
                msg.delete();
                break;
            }
        }
            
        //file checking
        if(msg.attachments.first()){
            //checks for allowed/disallowed filetypes
            let immune = false;
            for(let i=0; i<config.immuneUsers.length; i++){//ignores file checking if user is immune
                if(msg.author.id === config.immuneUsers[i]){
                    //msg.reply('id match');
                    immune = true;
                    break;
                }
            }
            for(let i=0; i<config.immuneRoles.length; i++){//ignores file checking if user's role is immune
                //msg.guild.roles

                //TODO

            }
            
            //checks if user is allowed to post a specific file extention
            let split = msg.attachments.first().name.split('.');//splits name of file and extension
            if(!immune){
                if(split.length === 1){//checks if file has extension
                    msg.author.send('Files with no extension are not allowed.');
                    msg.delete();
                }else{
                    for(let i=0; i<config.allowedFiletypes.length; i++){//compare file type to each file type in allowedFiletypes
                        if(split[split.length-1] === config.allowedFiletypes[i]){//allowedFiletypes
                            msg.react('👍');
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
            }
            
            //scans file
            if(!immune){//TODO: if unauthorized user posts virustotal file and it gets deleted, don't scan it
                return;
            }
            for(let i=0; i<config.virustotalFiletypes.length; i++){
                if(split[split.length-1] === config.virustotalFiletypes[i]){
                    let virustotalEmbed = new Discord.MessageEmbed()
                    .setColor(0xffffff)
                    .setAuthor('VirusTotal Scan', 'https://pbs.twimg.com/profile_images/903041019331174400/BIaetD1J_200x200.jpg')
                    .setDescription(``)
                    .setTimestamp(new Date())
                    .setFooter(msg.author.username, msg.author.displayAvatarURL())

                    msg.channel.send({embed: virustotalEmbed}).then((message) => {//sends original virustotal embed
                        let botMsg = message;
                        download(message, msg.attachments.first().url, msg.attachments.first().name, () => {
                            virustotal(message, `./attachments/${msg.attachments.first().name}`);
                        });
                    }) 
                }
            }
        }
    }
});

function virustotal(message, dir){//scans file with virustotal and returns file report (todo)
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
        console.log(`body: ${body}`);
        console.log(`res: ${res}`);

        body = JSON.parse(body);
        editEmbed(message, enums.descriptionCodeBlock, `VirusTotal upload finished: ${Date.now()-time}ms\nGetting report...`);
        
        console.log(`Deleting leftover file: ${dir}`);
        fs.unlink(dir, (err) => {//deletes leftover file from 'attachments' folder
            if (err) {
              console.error(err);
              return;
            }
        });

        console.log(body);

        //TODO: timeout after x tries (virustotalRetryCount)
        let report = setInterval(() => {
            let retrys = 0;
            request.get({url: 'http://www.virustotal.com/vtapi/v2/file/report', useQuerystring: true, qs: {apikey: virustotalAPIKey, resource: body.resource}}, (err, res, reportBody) => {//gets report
                retrys++;
                if (retrys>config.virustotalRetryCount){
                    editEmbed(message, enums.descriptionCodeBlock, 'Request timed out');
                    clearInterval(report);//stops retrying
                    return;
                }
                if(err){
                    message.reply(`ERROR: ${err}`);
                    return;
                }

                reportBody = JSON.parse(reportBody);//parses JSON
                console.log(reportBody);//temp

                if(body.sha256 !== reportBody.sha256){//todo: needs testing, may cause problems
                    editEmbed(message, enums.descriptionCodeBlock, `Report not ready, retrying in ${config.virustotalRetryTime} seconds. ${body.sha256}, ${reportBody.sha256}`);//sha256 is temp
                }else{
                    console.log('Interval cleared');//todo: edit later
                    editEmbed(message, enums.descriptionCodeBlock, `Scan finished, positive readings: ${reportBody.positives}\nFull report below:`);
                    editEmbed(message, enums.description, `[Scan results](${reportBody.permalink})`);
                    clearInterval(report);//stops retrying
                }
            });
        }, config.virustotalRetryTime*1000);
    });
    var form = req.form();
    form.append('apikey', virustotalAPIKey);//adds apikey to file scan post request
    form.append('file', fs.createReadStream(dir));//adds file to file scan post request
}

function download(message, url, name, _callback){//downloads file, executes callback after download is finished
    let time = Date.now();
    editEmbed(message, enums.descriptionCodeBlockStart, 'Download started...')
    let file = fs.createWriteStream(`./attachments/${name}`);
    request.get(url)
        .on('error', console.error)
        .pipe(file)
    file.on('finish', function() {
        file.close(() => {
            editEmbed(message, enums.descriptionCodeBlock, `Download finished: ${Date.now()-time}ms`)
            _callback();
        });
    });
}

function editEmbed(message, field, edit){//edits a specific field of an embed without affecting other fields
    switch(field){//need to set up enums for each additional case
        case 0://description
            message.edit(message.embeds[0].setDescription(`${message.embeds[0].description}${edit}`));
            break;
        case 1://descriptionCodeBlockStart
        message.edit(message.embeds[0].setDescription(`\`\`\`${edit}\`\`\``));
            break;
        case 2://descriptionCodeBlock
            message.edit(message.embeds[0].setDescription(`${message.embeds[0].description.slice(0, message.embeds[0].description.length-3)}\n${edit}\`\`\``));
            break;
        case 3://color
            message.edit(message.embeds[0].setColor(edit));
            break;
        default://default is case 0 (description)
            message.edit(message.embeds[0].setDescription(edit));
            break;
    }
}

function resolveColor(){//returns hex color in 0xffffff form using a number between 0-70 (0 is brightest green, 70 is brightest red) used for virustotal embeds
    //TODO
}



client.login(fs.readFileSync("./token.txt",{encoding:"utf-8"}));



//TODO:
/*
    delete long messages and tell user to use pastebin instead (config file entry for max allowed characters)

    allow files larger than 32MB to be uploaded using the get link feature of the virustotal API

    switch to virustotal API v3

    send user a PM containing the reason their file was deleted
    (in progress) scan certain filetypes with virustotal

    (ongoing) replace a lot of msg.reply's with one single message that gets edited

    print any detected scans cleanly to chat
    
    depending on how many positive readings there are, change embed color to different shades of green/yellow/orange/red

    (ongoing) finish editEmbed function, add functionality for all relevant fields

    TODO (IMPORTANT):
        -introduce file 'queueing' so multiple files can be scanned at once if multiple files are posted back-to-back
        -each message should update normally when multiple files are queued
        -may need to use classes?

    may need to introduce classes on a larger scale in case the bot is being used on multiple discord servers (later)

    add timestamp for getting report / scan finished

    log more in console
    whenever a file/msg is deleted, log it to a text channel (optional in config.json)
*/