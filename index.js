const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require('fs');
//mongo shit
const mongoose = require('mongoose')
mongoose.connect('mongodb://localhost/Z1NewHopeData',{useNewUrlParser: true, useUnifiedTopology: true});
const db = mongoose.connection;
//end of mongo shit

const prefix = "z1";


client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', (msg) => {
  if(msg.content.substring(0,prefix.length) === prefix){//checks if message starts with prefix
    let content = msg.content.substring(prefix.length+1).toLowerCase();//removes prefix from message content
    //commands tested for here using 'content' in place of 'msg.content'

    if(content === 'ping'){
        msg.reply('pong');
    }

    //file cheacking
    




  }
});

client.login(fs.readFileSync("./token.txt",{encoding:"utf-8"}));