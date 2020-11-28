require("dotenv").config(); // needed for env variables

const Discord = require('discord.js');
const client = new Discord.Client();
const request = require('request');
const fs = require('fs');

// mongo shit

// const mongoose = require('mongoose');

// mongoose.connect('mongodb://localhost/Z1NewHopeData',{useNewUrlParser: true, useUnifiedTopology: true});
// const db = mongoose.connection;

// end of mongo shit

// command loading
client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for(const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}

if(fs.existsSync('./attachments')) {
    // deletes 'attachments' folder to clear all files inside
	fs.rmdir('attachments', { recursive: true }, (err) => {
		if (err) {
			throw err;
        }
        // creates attachments folder again
		if (fs.existsSync('./attachments')) {
			// file exists
			console.log('\'attachments\' folder exists');
        }
        else{
            // create attachments folder
			console.log('\'attachments\' folder not found, creating it');
			fs.mkdirSync('./attachments');
		}
	});
}
// creates attachments folder
if (!fs.existsSync('./attachments')) {
	console.log('\'attachments\' folder not found, creating it');
	fs.mkdirSync('./attachments');
}

// TODO: check for token.txt and virustotalAPIKey.txt files, create them and return error if not
// return error if files are below a certain size / amount of characters

// config.json template
const configFileTemplate = {
    'prefix': 'z1',
    'allowedFiletypes': [],
    'disallowedFiletypes': [],
    'virustotalFiletypes': [],
    'blacklistedWords': [],
    'immuneUsers': [],
    'immuneRoles': [],
    'virustotalRetryTime': 10,
    'virustotalRetryCount': 3,
    'maxCharactersPerMessage': 500,
};

checkFileExists('config.json', JSON.stringify(configFileTemplate, null, 2), 'config.json is important for general functionality, please edit it before using the bot');
if(!process.env.DiscordToken){
	console.log('You must setup the bot token before using');
	process.exitCode(0);
}

if(!process.env.virustotalAPIKey) console.log('You must setup the virustotal API key before using');

function checkFileExists(dir, data, msg) {
    // checks if file exists, create it if not
	try {
		if (fs.existsSync(`./${dir}`)) {
            // file exists
            console.log(`'${dir}' exists`);
            // create file and write data to it
        }
        else{
			fs.writeFileSync(`./${dir}`, data);
			console.log(`'${dir}' file not found, creating it.\n${msg}`);
			return;
		}
    }
    catch(err) {
		console.error(err);
	}
}

// move enums to another file
const enums = {
	// editEmbed field
	'description' : 0,
	'descriptionCodeBlock': 1,
	'descriptionCodeBlockReplaceLastLine': 2,
	'color': 99,
};

// loads virustotal API key from .env
const virustotalAPIKey = process.env.virustotalAPIKey;
// loads config from config.json file
const config = JSON.parse(fs.readFileSync('./config.json', { encoding:'utf-8' }));

// updates config.json with the contents of 'config'
function updateConfig(_callback) {
	fs.writeFile(`./${'config.json'}`, JSON.stringify(config, null, 2), (err) =>{
        // passes err to callback
		if(err) {
			_callback(err);
        }
        else{
			_callback();
		}
	});
}

client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`);
});


client.on('message', (msg) => {
	if(msg.author.id != client.user.id) {
		// checks for command prefix
		if(msg.content.startsWith(config.prefix)) {
			// removes prefix and splits msg content into array by spaces
			const content = msg.content.substring(config.prefix.length).split(' ');
			// commands can be called within a DM, be careful when trying to access guild

            // makes sure command exists
			if(!client.commands.has(content[0])) {
				msg.reply('Command does not exist');
				return;
			}
			// makes sure user has all required permissions before executing command
			if(!msg.guild.member(msg.author).hasPermission(client.commands.get(content[0]).requiredPermissions)) {
				msg.reply('You don\'t have permission to use that command');
				log(`User '${msg.author.tag}' attempted to use command '${content[0]}' without permission.`);
				return;
			}
			// tries to execute command, replies with error if error
            try{
                // defines args for commands
				const args = {
					client: client,
					content: content,
					config: config,
					updateConfig: updateConfig,
				};
				client.commands.get(content[0]).execute(msg, args);
            }
            catch(error) {
				console.error(error);
				msg.reply(`Error executing command: ${content[0]}`);
				log(`There was an error executing command: ${content[0]}`);
			}

        }

        // ignores everything in DMs besides commands
		if(msg.channel.type !== 'text') {
			return;
		}

		// checks if message exceeds config.maxCharactersPerMessage
		checkMessageLength(msg);
        // blacklistedWords checking
		checkBlacklistedWords(msg);
		// file checking: checks for allowed/disallowed filetypes and scans certain file types with virustotal
		checkFile(msg);
	}
});

// checking if message length exceeds config.maxCharactersPerMessage
function checkMessageLength(msg) {
	if(msg.content.length > config.maxCharactersPerMessage) {
		msg.reply(`Please use a website such as https://pastebin.com/ for messages above ${config.maxCharactersPerMessage} characters`)
			.then((reply) => {reply.delete({ timeout: 5000 });})
			.catch(console.error);
		msg.author.send(`Please use a website such as https://pastebin.com/ for messages above ${config.maxCharactersPerMessage} characters`);
		// TODO: deletes long message for now, maybe later upload to pastebin automatically
		msg.delete();
	}
}

// checks if blacklisted word is detected
function checkBlacklistedWords(msg) {
	for(let i = 0; i < config.blacklistedWords.length; i++) {
		if(msg.content.toLowerCase().includes(config.blacklistedWords[i].toLowerCase())) {
			msg.author.send(`Blacklisted word detected: '${config.blacklistedWords[i]}'`);
			msg.delete();
			break;
		}
	}
}

// returns whether a user can post a filetype or not
function checkFile(msg) {
	if(msg.attachments.first()) {
		let immune = false;

		// ignores file checking if user is immune
		for(let i = 0; i < config.immuneUsers.length; i++) {
			if(msg.author.id === config.immuneUsers[i]) {
				immune = true;
				break;
			}
		}

		// ignores file checking if user's role is immune
		const roleIDs = [];
		for(let i = 0; i < msg.guild.roles.cache.array().length; i++) {
			roleIDs.push(msg.guild.roles.cache.array()[i].id);
		}
		for(let i = 0; i < config.immuneRoles.length; i++) {
			if(roleIDs.includes(config.immuneRoles[i])) {
				immune = true;
				break;
			}
		}

		// splits name of file and extension
		const split = msg.attachments.first().name.split('.');
		// checks if user is allowed to post a specific file extention
		if(!immune) {
			// checks if file has extension
			if(split.length === 1) {
				msg.author.send('Files with no extension are not allowed.');
				msg.delete();
			}
			else{
				// compare file type to each file type in allowedFiletypes
				for(let i = 0; i < config.allowedFiletypes.length; i++) {
					if(split[split.length - 1] === config.allowedFiletypes[i]) {
						msg.react('👍');
						scanFile(msg, split);
						break;
					}
				}
				// compare file type to each file type in disallowedFiletypes
				for(let i = 0; i < config.disallowedFiletypes.length; i++) {
					if(split[split.length - 1] === config.disallowedFiletypes[i]) {
						msg.author.send(`You don't have permission to post '.${split[split.length - 1]}' files!`);
						msg.delete();
						break;
					}
				}
			}
		}
		else{
			scanFile(msg, split);
		}
	}
}

// checks if file type is included in config.virustotalFiletypes, scans it with virustotal and returns the result in chat if true
function scanFile(msg, split) {
	for(let i = 0; i < config.virustotalFiletypes.length; i++) {
		if(split[split.length - 1] === config.virustotalFiletypes[i]) {
			const virustotalEmbed = new Discord.MessageEmbed()
				.setTitle(msg.attachments.first().name)
				.setColor(0xfafafa)
				.setAuthor('VirusTotal Scan', 'https://pbs.twimg.com/profile_images/903041019331174400/BIaetD1J_200x200.jpg')
				.setDescription('')
				.setTimestamp(new Date())
                .setFooter(`${msg.author.tag}`, msg.author.displayAvatarURL());

            // sends original virustotal embed
			msg.channel.send({ embed: virustotalEmbed }).then((message)=>{
				download(message, msg.attachments.first().url, msg.attachments.first().name, ()=>{
					virustotal(message, `./attachments/${msg.attachments.first().name}`);
				});
			});
		}
	}
}

// scans file with virustotal and returns file report
async function virustotal(message, dir) {
    // checks if file is over 32 MB
	const stats = fs.statSync(dir);
	if(stats['size'] >= 32000000) {
		editEmbed(message, enums.descriptionCodeBlock, 'Files 32 Megabytes and above in size are not yet supported, aborting');
		editEmbed(message, enums.description, '[Scan manually](https://www.virustotal.com/gui/)');
		editEmbed(message, enums.color, 0xff0000);
		return;
	}

	const time = Date.now();
    editEmbed(message, enums.descriptionCodeBlock, 'VirusTotal upload started...');
    // uploads file and gets report link
	const req = request.post('http://www.virustotal.com/vtapi/v2/file/scan', (err, res, body) => {
		if(err) {
			message.reply(`err: ${err}`);
			return;
		}

		body = JSON.parse(body);
		editEmbed(message, enums.descriptionCodeBlockReplaceLastLine, `VirusTotal upload finished: ${Date.now() - time}ms\nGetting report...`);

        console.log(`Deleting leftover file: ${dir}`);
        // deletes leftover file from 'attachments' folder
		fs.unlink(dir, (err) => {
			if (err) {
				console.error(err);
				return;
			}
        });

        // first attempt at getting virustotal report
		setTimeout(()=>{
            let retrys = 0;
            // TODO: fix callback hell
            getVirustotalResult(body, message, retrys, (done) => {
                // if scan isn't finished first time around, start retrying every config.virustotalRetryTime seconds
				if(!done) {
					const interval = setInterval(() => {
						retrys++;
						getVirustotalResult(body, message, retrys, () => {
                            // stops retrying if scan returns a value or errors out
							if(done) {
								clearInterval(interval);
							}
						});
					}, config.virustotalRetryTime * 1000);
				}
            });
			// edit the multiplied amount to change the time relative to filesize to wait
			// **TODO: scale the multiplier with the filesize
		}, (stats['size'] / 1000) * 2);
	});
    const form = req.form();
    // adds apikey to file scan post request
    form.append('apikey', virustotalAPIKey);
    // adds file to file scan post request
	form.append('file', fs.createReadStream(dir));
}

function getVirustotalResult(body, message, retrys, _callback) {
    // gets report
	request.get({ url: 'http://www.virustotal.com/vtapi/v2/file/report', useQuerystring: true, qs: { apikey: virustotalAPIKey, resource: body.resource } }, (err, res, reportBody) => {
		if (retrys > config.virustotalRetryCount) {
			editEmbed(message, enums.descriptionCodeBlockReplaceLastLine, 'Request timed out');
			_callback(true);
			return;
		}
		if(err) {
			message.reply(`ERROR: ${err}`);
			_callback(true);
			return;
		}

        // if reportBody is null, we're probably making too many requests in a short time
        if(reportBody) {
			reportBody = JSON.parse(reportBody);
        }
        else{
			// console.log('FORCING TIMEOUT');//need to handle this better (TODO)
			// console.log('retrying');
			editEmbed(message, enums.descriptionCodeBlockReplaceLastLine, `Report not ready, retrying in ${config.virustotalRetryTime} seconds [${retrys}].`);
			_callback(false);
			return;
		}

		if(body.sha256 !== reportBody.sha256) {
			editEmbed(message, enums.descriptionCodeBlockReplaceLastLine, `Report not ready, retrying in ${config.virustotalRetryTime} seconds [${retrys}].`);
			_callback(false);
        }
        else{
            console.log('Scan finished, no longer retrying');
			editEmbed(message, enums.descriptionCodeBlockReplaceLastLine, `Scan finished, positives: ${reportBody.positives} / ${reportBody.total}\nFull report below:`);
			editEmbed(message, enums.description, `[Scan results](${reportBody.permalink})`);
            editEmbed(message, enums.color, resolveColor(reportBody.positives));
            // returns true to indicate that the scan is finished
			_callback(true);
		}
	});
}

// downloads file, executes callback after download is finished
function download(message, url, name, _callback) {
	const time = Date.now();
	editEmbed(message, enums.descriptionCodeBlock, 'Download started...');
	const file = fs.createWriteStream(`./attachments/${name}`);
	request.get(url)
		.on('error', console.error)
		.pipe(file);
	file.on('finish', function() {
		file.close(() => {
			editEmbed(message, enums.descriptionCodeBlockReplaceLastLine, `Download finished: ${Date.now() - time}ms`);
			_callback();
		});
	});
}

// edits a specific field of an embed without affecting other fields
function editEmbed(message, field, edit) {
    switch(field) {
	case 0:
        // description
		message.edit(message.embeds[0].setDescription(`${message.embeds[0].description}${edit}`));
		break;
	case 1:
        // descriptionCodeBlock
		if(message.embeds[0].description) {
            // embed.description is not blank
			if(message.embeds[0].description.includes('```')) {
                // is not start of code block
				message.edit(message.embeds[0].setDescription(`${message.embeds[0].description.slice(0, message.embeds[0].description.length - 3)}\n${edit}\`\`\``));
            }
            else{
                // is start of code block
				message.edit(message.embeds[0].setDescription(`\`\`\`${edit}\`\`\``));
			}
        }
        else{
            // embed.description is blank
			message.edit(message.embeds[0].setDescription(`\`\`\`${edit}\`\`\``));
		}
        break;

	case 2:
        // descriptionCodeBlockReplaceLastLine
		if(message.embeds[0].description) {
            // splits embed description into array by newlines
			const split = message.embeds[0].description.split('\n');
            let description = '';
            // adds all lines besides last to description
            for(let i = 0; i < split.length - 1; i++) {
                // newlines gets removed when using split, re-adds them
				description += `${split[i]}\n`;
            }
            // makes sure code block has beginning ```, if not, adds it
			if(description.includes('```')) {
				message.edit(message.embeds[0].setDescription(`${description}${edit}\`\`\``));
			}
            else{
				message.edit(message.embeds[0].setDescription(`\`\`\`${description}${edit}\`\`\``));
			}
		}
		break;
	case 99:
        // color
		message.edit(message.embeds[0].setColor(edit));
		break;
	default:
        // default is case 0 (description)
		message.edit(message.embeds[0].setDescription(edit));
		break;
	}
}

function sendEmbed(msg, content, color) {

}

// returns hex color in #ffffff form using a number between 0-70 (0 is brightest green, 70 is brightest red) used for virustotal embeds
function resolveColor(num) {
	switch(true) {
	case (num >= 0 && num < 5):
        // bright green
		return 0x00ff00;
	case (num > 5 && num < 15):
        // green
		return 0xffff00;
	case (num > 15 && num < 30):
        // yellow
		return 0xff8000;
	case (num > 30 && num < 50):
        // orange
		return 0xff4400;
	case (num > 50 && num < 100):
        // red
		return 0xff0000;
	default:
        // black
		return 0x000000;
	}
}

// logs a specified message to the console and a logs text channel
// todo
function log(message) {
	console.log(message);
}
log('test');

client.login(process.env.DiscordToken);

/* TODO:

    use promises instead of callbacks for a bunch of shit 😀

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
		-check if file hash already exists on virustotal before uploading

    may need to introduce classes on a larger scale in case the bot is being used on multiple discord servers (later)
    (ongoing) add commands to edit each config file entry
    log more in console
    whenever a file/msg is deleted, log it to a text channel (optional in config.json)
	allow files without an extension to be scanned

*/

