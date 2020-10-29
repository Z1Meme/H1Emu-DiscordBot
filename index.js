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

const virustotalAPIKey = fs.readFileSync("virustotalAPIKey.txt",{encoding:"utf-8"});//loads virustotal API key from file
let config = JSON.parse(fs.readFileSync("./config.json",{encoding:"utf-8"}));

const prefix = "z1";


//TODO: check if config.json and attachments folder exists, if not, create them
//TODO: create function to refresh config file (edits config variable and replaces config.json with updated variable)

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});



client.on('message', (msg) => {
    if(msg.author.id != client.user.id){
        if(msg.content.substring(0,prefix.length) === prefix){//checks if message starts with prefix
            let content = msg.content.substring(prefix.length+1).toLowerCase();//removes prefix from message content
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
                        console.log(config.disallowedFiletypes[i]);
                        if(split[split.length-1] === config.disallowedFiletypes[i]){
                            msg.author.send(`File extension '${split[split.length-1]}' is not allowed!`);
                            msg.delete();
                            break;
                        }
                    }
                }
            }
            
            //scans file
            for(let i=0; i<config.virustotalFiletypes.length; i++){
                if(split[split.length-1] === config.virustotalFiletypes[i]){
                    let virustotalEmbed = new Discord.MessageEmbed()
                    .setColor(0x0015ff)
                    .setAuthor('VirusTotal Scan', 'https://pbs.twimg.com/profile_images/903041019331174400/BIaetD1J_200x200.jpg')
                    .setDescription(`\`\`\`\`\`\``)
                    .setTimestamp(new Date())
                    .setFooter(msg.author.username, msg.author.displayAvatarURL())

                    msg.channel.send({embed: virustotalEmbed}).then((message) => {
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
    let time = Date.now();
    message.edit(message.embeds[0].setDescription(`${message.embeds[0].description.slice(0, message.embeds[0].description.length-3)}\nVirusTotal upload started\`\`\``));
    var req = request.post('http://www.virustotal.com/vtapi/v2/file/scan', (err, res, body) => {//uploads file and gets report link
        if(err){
            message.reply(`err: ${err}`);
            return;
        }
        body = JSON.parse(body);
        message.edit(message.embeds[0].setDescription(`${message.embeds[0].description.slice(0, message.embeds[0].description.length-3)}\nVirusTotal upload finished: ${Date.now()-time}ms\`\`\``));
        console.log(body);

        //TODO: timeout after x tries
        let report = setInterval(() => {
            request.get({url: 'http://www.virustotal.com/vtapi/v2/file/report', useQuerystring: true, qs: {apikey: virustotalAPIKey, resource: body.resource}}, (err, res, reportBody) => {//gets report
                if(err){
                    message.reply(`ERROR: ${err}`);
                    return;
                }
                reportBody = JSON.parse(reportBody);//parses JSON

                console.log(reportBody);

                if(body.sha256 !== reportBody.sha256){
                    message.reply(`sha256 mismatch, retrying in 10 seconds. ${body.sha256}, ${reportBody.sha256}`)
                }else{
                    console.log('Interval cleared');
                    //message.reply(`sha256 ${body.sha256}, ${reportBody.sha256}`);

                    message.reply(` ${reportBody.positives}`);

                    clearInterval(report);//stops retrying
                }
            });
        }, 10000);//called every 10 seconds
    });
    var form = req.form();
    form.append('apikey', virustotalAPIKey);//adds apikey to file scan post request
    form.append('file', fs.createReadStream(dir));//adds file to file scan post request
}


function download(message, url, name, _callback){//downloads file, executes callback after download is finished
    let time = Date.now();
    message.edit(message.embeds[0].setDescription(`${message.embeds[0].description.slice(0, message.embeds[0].description.length-3)}Download started\`\`\``));
    let file = fs.createWriteStream(`./attachments/${name}`);
    request.get(url)
        .on('error', console.error)
        .pipe(file)
    file.on('finish', function() {
        file.close(() => {
            message.edit(message.embeds[0].setDescription(`${message.embeds[0].description.slice(0, message.embeds[0].description.length-3)}\nDownload finished: ${Date.now()-time}ms\`\`\``));
            _callback();
        });// close() is async, calls callback after close completes.
    });
}


client.login(fs.readFileSync("./token.txt",{encoding:"utf-8"}));



//TODO:
/*
    delete long messages and tell user to use pastebin instead (config file entry for max allowed characters)
    (DONE) delete unknown or disallowed file types
    (DONE) delete messages containing blacklisted words
        send user a PM containing the reason their message was deleted
    scan certain filetypes with virustotal

    replace a lot of msg.reply's with one single message that gets edited
    delete file in attachments folder after it's finished uploading to virustotal
*/