const ytdl = require('ytdl-core');

const path = require('path');

const axios = require('axios');
const cheerio = require('cheerio');

const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    StreamType,
    AudioPlayerStatus
} = require('@discordjs/voice');
const botToken = 'YOUR_KEY_HERE';

var channelId


const fs = require('fs');

var playing, vidId, connection, filePath, downloading, repeat, current

var queue = []

const {
    Client,
    Events,
    GatewayIntentBits
} = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildVoiceStates]
});

client.once('ready', () => {});

async function getTitleFromYouTube(url) {
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        const title = $('meta[property="og:title"]').attr('content');

        return title;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

function del() {
    fs.readdir("./files/", (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            return;
        }
        files.forEach(file => {
            const filePath = path.join("./files/", file);
            fs.unlink(filePath, err => {
                if (err) {} else {
                    console.log('\nDeleted file:', filePath);
                }
            });
        });

    });
}

function stop() {
    if (playing) {
        playing = false
        try {
            connection.destroy();
        } catch {}
        del()
        return true
    } else {
        client.channels.cache.get(channelId).send('I am not currently in a voice channel.');
        return false
    }
}

function waitDownload(song) {
    if (downloading) {
        setTimeout(function () {
            waitDownload(song)
        }, 1000)
    } else {
        play(song)
    }
}

function play(song) {
    if (playing) {
        stop(song)
    }
    downloading = true

    vidId = song.link.split("watch?v=")[1]

    console.log("\n" + song.creator + ":\n" + song.link)

    if (!ytdl.validateURL(song.link)) {
        client.channels.cache.get(channelId).send("Please give me a valid video link from youtube")
        downloading = false
        return
    }

    filePath = "./files/" + vidId + ".mp4"

    var outputStream = fs.createWriteStream(filePath);

    ytdl(song.link, {
            quality: 'lowest'
        })
        .on('error', (error) => {
            client.channels.cache.get(channelId).send('Video unreachable')
            outputStream.close();
            downloading = false
            return
        })
        .pipe(outputStream)
        .on('finish', () => {
            downloading = false
            if (!song.member || !song.member.voice.channel) {
                client.channels.cache.get(channelId).send("Can't see your channel")
                return
            }

            playing = true

            connection = joinVoiceChannel({
                channelId: song.member.voice.channel.id,
                guildId: song.guild.id,
                adapterCreator: song.guild.voiceAdapterCreator,
            });

            const player = createAudioPlayer();

            try {
                start(song, player)
                client.channels.cache.get(channelId).send("Now playing: \n" + song.link)
                current = song
            } catch (error) {
                console.error(error);
                try {
                    connection.destroy();
                } catch {}
                playing = false
                return
            }
            outputStream.close();
        });
}

function onFinish(song) {
    del()
    try {
        connection.destroy();
    } catch {}
    try {
        if (queue.indexOf(song) == 0) {
            queue.splice(0, 1)
        }
    } catch {}
    if (queue.length > 0) {
        play(queue[0])
    } else {
        playing = false
    }
}

function start(song, player) {
    const resource = createAudioResource(filePath, {
        inputType: StreamType.Arbitrary
    });

    player.play(resource);
    connection.subscribe(player);

    player.on(AudioPlayerStatus.Idle, () => {
        if (repeat) {
            start(song, player)
        } else {
            onFinish(song)
        }
    });
}

client.on('messageCreate', async (message) => {
    if (message.content.toLowerCase().split(" ")[0] == '!play') {
        repeat = false
        if (message.channel.id != channelId) {
            channelId = message.channel.id
        }
        if (message.content.toLowerCase().split(" ").length == 1) {
            message.reply("Please provide a link")
            return
        }
        try {
            let song = {
                "link": "https://" + message.content.split(" ")[1].split("&")[0].split("//")[1],
                "creator": message.author.username,
                "member": message.member,
                "guild": message.guild
            }
            console.log(song.link)

            if (downloading) {
                waitDownload(song)
            } else {
                play(song)
            }
        } catch {}
    } else if (message.content.toLowerCase() === '!stop') {
        repeat = false
        if (playing) {
            console.log("\n" + message.author.username + ":\nstop")
            playing = false
            try {
                connection.destroy();
            } catch {}
            del()
            queue = []
            message.reply("stopped")
        } else {
            message.reply('I am not currently in a voice channel.')
        }
    } else if (message.content.toLowerCase() === '!repeat') {
        if (!repeat) {
            repeat = true
            message.reply("repeat is now on")
        } else {
            repeat = false
            message.reply("repeat is now off")
        }
    } else if (message.content.toLowerCase() === '!clear') {
        queue = []
        message.reply("Queue cleared")
    } else if (message.content.toLowerCase().split(" ")[0] == '!add') {
        if (message.content.toLowerCase().split(" ").length == 1) {
            message.reply("Please provide a link")
            return
        }
        let song = {
            "link": "https://" + message.content.split(" ")[1].split("&")[0].split("//")[1],
            "creator": message.author.username,
            "member": message.member,
            "guild": message.guild
        }
        console.log(song.link)
        queue.push(song)
        message.reply("Added to queue")
    } else if (message.content.toLowerCase() === '!skip') {
        try {
            repeat = false
            onFinish(current)
        } catch {
            message.reply("That did't work")
        }
    } else if (message.content.toLowerCase() == '!h') {
        message.reply(
            "----------\nCommands:\n\n!play [link]:\nstops whatever is playing and plays the linked song (the queue will still work)\n\n!stop:\nwhat do you think genius (also deletes the queue)\n\n!repeat:\ntoggles looping (only applies to current song)\n\n!clear:\ndeletes the queue\n\n!add [link]:\nadds a song to the queue\n\n!skip:\nskips the current song\n\n!h:\nthis.\n----------"
        )
    }
});

client.login(botToken);
