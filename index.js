// needed for env variables
require('dotenv').config();

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
    'disallowedFiletypes': [],
    'virustotalFiletypes': [],
    'blacklistedWords': [],
    'immuneUsers': [],
	'immuneRoles': [],
	'virustotalScanningEnabled': true,
    'virustotalRetryTime': 30,
    'virustotalRetryCount': 10,
    'maxCharactersPerMessage': 500,
};

// checks if config.json exists and contains all fields, if not, creates and/or updates it
if(fileExists('config.json')) {
	console.log('\'config.json\' exists');
	const cfg = JSON.parse(fs.readFileSync('./config.json', { encoding:'utf-8' }));
	let update = false;
	for(const attributename in configFileTemplate) {
		if(!cfg[attributename]) {
			console.log(`${attributename} not found in config.json, adding it with default value: ${configFileTemplate[attributename]}`);
			cfg[attributename] = configFileTemplate[attributename];
			update = true;
		}
	}
	if(update) {
		console.log('Some fields are missing in config.json, updating');
		fs.writeFileSync(`./${'config.json'}`, JSON.stringify(cfg, null, 2));
	}
	else {
		console.log('All fields found in config.json');
	}
}
else {
	fs.writeFileSync('./config.json', JSON.stringify(configFileTemplate, null, 2));
	console.log('\'config.json\' file not found, creating it using default values');
	console.log('config.json is important for general functionality, please edit it before using the bot');
}

// checks for bot token, exits process if not found
if(!process.env.DiscordToken) {
	console.log('You must setup the bot token before using');
	process.exitCode(0);
}

// checks for virustotal api key
if(!process.env.virustotalAPIKey) console.log('You must setup the virustotal API key before using');

// returns true if specified file exists
function fileExists(dir) {
	try {
		if (fs.existsSync(`./${dir}`)) {
			return true;
        }
        else{
			return false;
		}
    }
    catch(err) {
		console.error(`There was an issue in determining if config.json exists, aborting. ${err}`);
		process.exitCode(0);
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

			// ignores everything in DMs
			if(msg.channel.type !== 'text') {
				return;
			}

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
				client.commands.get(content[0]).execute(msg, { client, content, config, updateConfig });
            }
            catch(error) {
				console.error(error);
				msg.reply(`Error executing command: ${content[0]}`);
				log(`There was an error executing command: ${content[0]}`);
			}

		}

		// checks if message exceeds config.maxCharactersPerMessage
		checkMessageLength(msg);
        // blacklistedWords checking
		checkBlacklistedWords(msg);
		// file checking: checks for disallowed filetypes and scans certain file types with virustotal
		checkFile(msg);
	}
});

// checking if message length exceeds config.maxCharactersPerMessage
function checkMessageLength(msg) {
	if(msg.content.length > config.maxCharactersPerMessage && !msg.guild.member(msg.author).hasPermission('MANAGE_MESSAGES')) {
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

		// ignores file deletion if user is immune
		for(let i = 0; i < config.immuneUsers.length; i++) {
			if(msg.author.id === config.immuneUsers[i]) {
				immune = true;
				break;
			}
		}

		// ignores file deletion if user's role is immune
		for(let i = 0; i < config.immuneRoles.length; i++) {
			if(msg.member.roles.cache.find(r => r.id === config.immuneRoles[i])) {
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
				let deleted = false;
				// compare file type to each file type in disallowedFiletypes
				for(let i = 0; i < config.disallowedFiletypes.length; i++) {
					if(split[split.length - 1] === config.disallowedFiletypes[i]) {
						msg.author.send(`You don't have permission to post '.${split[split.length - 1]}' files!`);
						msg.delete();
						deleted = true;
						break;
					}
				}
				if(!deleted) {
					scanFile(msg, split);
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
	// disables virustotal scanning if disabled in config
	if(!config.virustotalScanningEnabled) {
		return;
	}
	for(let i = 0; i < config.virustotalFiletypes.length; i++) {
		if(split[split.length - 1] === config.virustotalFiletypes[i]) {
			const virustotalEmbed = new Discord.MessageEmbed()
				.setTitle(msg.attachments.first().name)
				.setColor(0xffffff)
				.setAuthor('VirusTotal Scan', 'https://pbs.twimg.com/profile_images/903041019331174400/BIaetD1J_200x200.jpg')
				.setDescription('')
				.setTimestamp(new Date())
                .setFooter(`${msg.author.tag}`, msg.author.displayAvatarURL());

            // sends original virustotal embed
			msg.channel.send({ embed: virustotalEmbed }).then((message)=>{
				const startTime = Date.now();
				editEmbed(message, enums.descriptionCodeBlock, 'Download started...');
				downloadFile(msg.attachments.first().url, msg.attachments.first().name, ()=>{
					editEmbed(message, enums.descriptionCodeBlockReplaceLastLine, `Download finished: ${Date.now() - startTime}ms`);
					postVirustotalFile(message, `./attachments/${msg.attachments.first().name}`);
				});
			});
		}
	}
}

// posts file to virustotal using v3 api
async function postVirustotalFile(message, dir) {
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
	console.log(`Virustotal upload started: '${dir}'`);

    // uploads file and gets report link
	const req = request.post({ url: 'https://www.virustotal.com/api/v3/files', headers: { 'x-apikey': virustotalAPIKey } }, (err, res, body) => {
		if(err) {
			message.reply(`err: ${err}`);
			return;
		}

		body = JSON.parse(body);
		editEmbed(message, enums.descriptionCodeBlockReplaceLastLine, `VirusTotal upload finished: ${Date.now() - time}ms\nGetting report...`);
		console.log(`Virustotal upload finished: '${dir}' [${Date.now() - time}ms]`);

        console.log(`Deleting leftover file: ${dir}`);
        // deletes leftover file from 'attachments' folder
		fs.unlink(dir, (err) => {
			if (err) {
				console.error(err);
				return;
			}
        });

		getVirustotalResult(body.data.id, message, 0, stats['size']);
	});

    const form = req.form();
    // adds file to file scan post request
	form.append('file', fs.createReadStream(dir));
}

// gets virustotal result using v3 api
function getVirustotalResult(id, message, retries, fileSize) {
	let retryTime;
	if(retries > 0) {
		retryTime = config.virustotalRetryTime * 1000;
	}
	else {
		retryTime = 10000 + ((fileSize / 1000) * 2);
	}

	retries++;
	if (retries > config.virustotalRetryCount) {
		editEmbed(message, enums.descriptionCodeBlockReplaceLastLine, 'Request timed out');
		return;
	}
	setTimeout(() => {
		// gets report
		request.get({ url: `https://www.virustotal.com/api/v3/analyses/${id}`, headers: { 'x-apikey': virustotalAPIKey } }, (err, res, reportBody) => {
			if(err) {
				message.reply(`ERROR: ${err}`);
				return;
			}

			// sends error in discord if error
			if(reportBody.error) {
				editEmbed(message, enums.descriptionCodeBlockReplaceLastLine, `${reportBody.error.code}: ${reportBody.error.message}`);
				return;
			}
			if(!reportBody) {
				console.log('getVirustotalResult Error: reportBody is not defined');
				editEmbed(message, enums.descriptionCodeBlockReplaceLastLine, `Error, retrying in ${config.virustotalRetryTime} seconds [${retries}].`);
				// retries
				getVirustotalResult(id, message, retries, fileSize);
			}
			else{
				reportBody = JSON.parse(reportBody);
				if(reportBody.data.attributes.status === 'queued') {
					console.log(`File status: ${reportBody.data.attributes.status}\nId: ${reportBody.meta.file_info.md5}`);
					editEmbed(message, enums.descriptionCodeBlockReplaceLastLine, `Report not ready, retrying in ${config.virustotalRetryTime} seconds [${retries}].`);
					// retries
					getVirustotalResult(id, message, retries, fileSize);
				}
				else {
					console.log('Scan finished, no longer retrying');
					editEmbed(message, enums.descriptionCodeBlockReplaceLastLine, `Scan finished, positives: ${reportBody.data.attributes.stats.malicious} / 70\nFull report below:`);
					editEmbed(message, enums.description, `[Scan results](https://www.virustotal.com/gui/file/${reportBody.meta.file_info.md5}/detection)`);
					editEmbed(message, enums.color, resolveColor(reportBody.data.attributes.stats.malicious));
				}
			}
		});
	}, retryTime);
}

// downloads file, executes callback after download is finished
function downloadFile(url, name, _callback) {
	const file = fs.createWriteStream(`./attachments/${name}`);
	request.get(url)
		.on('error', console.error)
		.pipe(file);
	file.on('finish', function() {
		file.close(() => {
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

/*
function sendEmbed(msg, content, color) {
	// todo
}
*/

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
function log(msg, message) {
	console.log(message);
}
log(null, 'test');

client.login(process.env.DiscordToken);

/* TODO:

    use promises instead of callbacks for a bunch of shit 😀

    possibly use pastebin api to put messages that are longer than config.maxCharactersPerMessage into a pastebin automatically

    Virustotal:
        -introduce file 'queueing' so multiple files can be scanned at once if multiple files are posted back-to-back
        -each message should update normally when multiple files are queued
        -allow files larger than 32MB to be uploaded using the get link feature of the virustotal API
        -(ongoing) try and calculate how long it'll take to scan a file, to reduce the time it takes for the result to be put into discord
        -(bug) sometimes 'download started' / 'download finished' will not show in the embed
		-check if file hash already exists on virustotal before uploading

    may need to introduce classes on a larger scale in case the bot is being used on multiple discord servers (later)
    (ongoing) add commands to edit each config file entry
    log more in console
    whenever a file/msg is deleted, log it to a text channel (optional in config.json)
	allow files without an extension to be scanned

	while an embed is actively being edited, store the description in a variable and edit that var instead of the description directly
	(might fix the missing 'download finished' / 'virustotal upload finished' bug)

*/

