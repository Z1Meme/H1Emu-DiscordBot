const Discord = require('discord.js');
const client = new Discord.Client();
const request = require('request');
const fs = require('fs');
const virustotalAPIKey = fs.readFileSync("virustotalAPIKey.txt",{encoding:"utf-8"});//loads virustotal API key from file
//mongo shit
const mongoose = require('mongoose');
const { Http2ServerRequest } = require('http2');

//mongoose.connect('mongodb://localhost/Z1NewHopeData',{useNewUrlParser: true, useUnifiedTopology: true});
//const db = mongoose.connection;

//end of mongo shit

const prefix = "z1";
let allowedFiletypes = JSON.parse(fs.readFileSync("./allowedFiletypes.json",{encoding:"utf-8"}));

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', (msg) => {
    if(msg.author.id != client.user.id){
        if(msg.content.substring(0,prefix.length) === prefix){//checks if message starts with prefix
            let content = msg.content.substring(prefix.length+1).toLowerCase();//removes prefix from message content
            //commands tested for here using 'content' in place of 'msg.content'
    
            if(content === 'ping'){
                msg.reply(`pong! ${Date.now()-msg.createdAt}ms`);
            }
        }
    
        //file checking
        if(msg.attachments.first()){
            let split = msg.attachments.first().name.split('.');//splits name of file and extension
            console.log(split);
    
            if(split.length === 1){//checks if file has extension
                msg.reply('Files with no extension are not allowed.');
            }else{
                for(let i=0; i<allowedFiletypes.allowedFiletypes.length; i++){//compare file type to each file type in allowedFiletypes
                    console.log(allowedFiletypes.allowedFiletypes[i]);
                    if(split[split.length-1] === allowedFiletypes.allowedFiletypes[i]){
                        msg.react('👍');

                        download(msg.attachments.first().url, msg.attachments.first().name, () => {
                            virustotal(msg, `attachments/${msg.attachments.first().name}`)
                        });

                        break;
                    }
                }
                for(let i=0; i<allowedFiletypes.disallowedFiletypes.length; i++){//compare file type to each file type in disallowedFiletypes
                    console.log(allowedFiletypes.disallowedFiletypes[i]);
                    if(split[split.length-1] === allowedFiletypes.disallowedFiletypes[i]){
                        msg.reply(`File extension '${split[split.length-1]}' is not allowed!`);
                        msg.delete();
                        break;
                    }
                }
                console.log(`**** ${split[split.length-1]}`);//temp
            }
            
            
            
        }
    }
    
  //console.log(msg.attachments);

});

function virustotal(msg, dir){
    /*request.post({url:'https://www.virustotal.com/vtapi/v2/file/scan', form: {apikey:virustotalAPIKey, file:dir}}, (err, res, body) => {//uploads file and gets report link
        if(err){
            msg.reply(err);
            return;
        }
        body = JSON.parse(body);
        msg.reply('scan finished');
        console.log(body);
        console.log(body.permalink)
        /*request.get({url:'https://www.virustotal.com/vtapi/v2/file/report', form: {apikey:virustotalAPIKey, resource: body.resource}}, (err, res, body) => {//gets report
            if(err){
                msg.reply(err);
                return;
            }
            //body = JSON.parse(body);
            msg.reply(body);
        });
        request(`https://www.virustotal.com/vtapi/v2/file/report?apikey=${virustotalAPIKey}&resource=${body.resource}`, {json : true}, (err, res, body) => {
            if(err){
                return console.log(`error: ${error}`);//todo: better error handling
            }
            if(!err && res.statusCode == 200){
                msg.reply(body);
            }
        });*/

    //});
    request.post({url:'https://www.virustotal.com/api/v3/files', form: {'file': dir}, headers: {'x-apikey': virustotalAPIKey}}, (err, res, body) => {
        msg.reply(body);//todo
    });
}


function download(url, name, _callback){
    request.get(url)
        .on('error', console.error)
        .pipe(fs.createWriteStream(`attachments/${name}`))
    _callback()
}


client.login(fs.readFileSync("./token.txt",{encoding:"utf-8"}));



//TODO:
/*
    delete long messages and tell user to use pastebin instead (config file entry for max allowed characters)
    delete unknown or disallowed file types


*/