const ytdl = require('ytdl-core');
const path = require('path');
const axios = require('axios');
const youtubesearchapi = require("youtube-search-api");
const fs = require('fs')

const solitudeLink = "https://www.youtube.com/watch?v=xiU-O8arVa8"

const ADMIN = "PASTE_YOUR_DISCORD_USER_ID_HERE"

const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    StreamType,
    AudioPlayerStatus
} = require('@discordjs/voice');
const botToken = 'PASTE_YOUR_DISCORD_TOKEN_HERE';

var channelId

var playing, vidId, connection, filePath, downloading, repeat, current, awaiting

var creatingPlaylist = false

var interactions = []

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

function del() { //deletes everything in the files folder. Just to make sure theres no exploits that destroy my machine
    fs.readdir("./files/", (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            return;
        }
        files.forEach(file => {
            const filePath = path.join("./files/", file);
            fs.unlink(filePath, err => {
                if (err) {} else {}
            });
        });

    });
}

function stop() { //stop the current song
    if (playing) {
        playing = false
        try {
            connection.destroy();
        } catch {}
        del()
        return true
    } else {
        message.reply('I am not currently in a voice channel.');
        return false
    }
}

function waitDownload(song) { //a looping function to make sure there is only a download at the time
    if (downloading) {
        setTimeout(function () {
            waitDownload(song)
        }, 1000)
    } else {
        play(song)
    }
}

function play(song) { //function to play a song
    if (playing) {
        stop(song)
    } //stop previous one
    downloading = true //make sure no other song downloads at the same time

    vidId = song.link.split("watch?v=")[1]

    console.log(song.message.author.username + ": " + song.link)

    if (!ytdl.validateURL(song.link)) { //make sure the link is valid
        client.channels.cache.get(channelId).send("Please give me a valid video link from youtube")
        downloading = false
        return
    }

    filePath = "./files/" + vidId + ".mp4"

    var outputStream = fs.createWriteStream(filePath);

    ytdl(song.link, {
            quality: 'lowest' //never really experimented with any other qualities 
        })
        .on('error', (error) => {
            song.message.reply('Video unreachable ' + error) // some videos have a special protection that triggers this
            console.log(error)
            outputStream.close();
            downloading = false
            return
        })
        .pipe(outputStream)
        .on('finish', () => {
            downloading = false
            if (!song.message.member || !song.message.member.voice.channel) {
                song.message.reply("Can't see your channel") // check here instead of before the download in case the user leaves for some reason during the download
                return
            }

            connection = joinVoiceChannel({
                channelId: song.message.member.voice.channel.id,
                guildId: song.message.guild.id,
                adapterCreator: song.message.guild.voiceAdapterCreator,
            });

            const player = createAudioPlayer();

            try {
                start(song, player)
                current = song
                var playingMessage = ""
                playing = true
                if (song.name == "No name yet") { //wacky way to get the name of the song
                    axios.get(song.link)
                        .then(response => {
                            var title = response.data.split("<title>")[1].split("</title>")[0].split(" - YouTube")[0]
                            if (title) {
                                playingMessage = 'Now Playing:\n**' + title + "**"
                            } else {
                                song.message.reply('Failed to retrieve video title.');
                                playingMessage = "Error getting title lmao"
                            }
                            song.message.channel.send(playingMessage)
                        })
                        .catch(error => {
                            console.error('Error:', error);
                        });
                } else {
                    playingMessage = 'Now Playing:\n**' + song.name + "**"
                    song.message.channel.send(playingMessage)
                }
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

function onFinish(song) { // on finish actions for a song
    if (!repeat) {
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
    } else {
        const player = createAudioPlayer();
        start(song, player)
    }
}

function start(song, player) { //maybe i should join the start and the play functions
    const resource = createAudioResource(filePath, {
        inputType: StreamType.Arbitrary
    });

    player.play(resource);
    connection.subscribe(player);

    fs.appendFile("./songs.txt", song.message.author.username + ": " + song.link + "\n", (err) => {})

    player.on(AudioPlayerStatus.Idle, () => {
        onFinish(song)
    });
}

async function search(query) { //works surprisingly bad
    try {
        const data = await youtubesearchapi.GetListByKeyword(query, {
            limit: 5
        })
        let result = data.items.splice(0, 5)
        for (let i = 0; i < result.length; i++) {
            if (result[i].type != "video") {
                result.splice(i, 1)
            }
        }
        return result;
    } catch (error) {
        console.error('Error in search:', error);
        return [];
    }
}

function iInteractions(name) { //get the index of the interaction
    let result = -1
    for (let i = 0; i < interactions.length; i++) {
        if (interactions[i].name == name) {
            result = i
        }
    }
    return result
}

function getSpotyName(link) { //get a name from spotify
    return axios.get(link)
        .then(response => {
            var name = response.data.split("<h1 class=\"Type__TypeElement-sc-goli3j-0 gyivyS gj6rSoF7K4FohS2DJDEm\" data-encore-id=\"type\">")[1].split("</h1>")[0];
            name += " " + response.data.split("<div dir=\"ltr\" class=\"Type__TypeElement-sc-goli3j-0 bkjCej t5WPFlGTY6GCd9UOFfLu\" data-encore-id=\"type\">")[1].split("</div>")[0]
            if (name == "") {
                return "NE";
            } else {
                return name;
            }
        })
        .catch(error => {
            return "RE";
        });
}

function sendResult(output, message, action) { //send the results of a youtube search and start waiting for a response from the user
    if (output == []) {
        message.reply("Error in search")
        return
    }
    let toSend = "Youtube search: (Choose one sending the number)\n"
    for (let i = 0; i < output.length; i++) {
        toSend += i + 1 + "- **" + output[i].title + "** (" + output[i].length.simpleText + ")\n"
    }
    message.reply(toSend)
    interactions.push({
        "name": message.author.username,
        "result": output,
        "action": action
    })
    awaiting = true
}

function userRequest(message, action) {
    if (message.channel.id != channelId) {
        channelId = message.channel.id
    }
    if (message.content.toLowerCase().split(" ").length == 1) { //if nothing said
        message.reply("Please provide a link or a search term")
        return
    }
    if (message.content.split(" ")[1].split("track/")[0] == "https://open.spotify.com/") { //if spoty link
        getSpotyName(message.content.split(" ")[1])
            .then(name => {
                search(name)
                    .then(output => {
                        sendResult(output, message, action)
                    })
            })
    } else if (message.content.split(" ")[1].split("www.youtube.com")[0] == "https://") { //if direct youtube link
        try {
            let song = {
                "link": "https://" + message.content.split(" ")[1].split("&")[0].split("//")[1],
                "name": "No name yet",
                "message": message
            }
            if (action == "play") {
                if (downloading) {
                    waitDownload(song)
                } else {
                    play(song)
                }
            } else if (action == "add") {
                queue.push(song)
                message.reply("Added to queue")
            }
        } catch {}
    } else { // else just search the terms
        search(message.content.split(" ").slice(1, 3000).join(" "))
            .then(output => {
                sendResult(output, message, action)
            })
    }
}

function decodeHexUnicodeEntities(input) { //decode hex
    const regex = /&#x([0-9A-Fa-f]+);/g;
    const decodedString = input.replace(regex, (match, hex) => String.fromCodePoint(parseInt(hex, 16)));
    return decodedString;
}

function returnChunksArray(str, chunkSize) { //split messages that are longer than 2000 chars
    var arr = [];
    while (str !== '') {
        arr.push(str.slice(0, chunkSize));
        str = str.slice(chunkSize);
    }
    return arr;
}

async function createPlaylist(url, message) { //open a spotify playlist and look for each song in youtube
    creatingPlaylist = true
    try {
        if (url.split('https://open.spotify.com/')[1].split("/")[0] == "album") {
            if (url.split("https://open.spotify.com/")[1].split("/album/")[0] != "embed") {
                url = `https://open.spotify.com/embed/album/${url.split("https://open.spotify.com/album/")[1].split("?")[0]}?utm_source=generator`
            }
        } else if (url.split("https://open.spotify.com/")[1].split("/playlist/")[0] != "embed") {
            url = `https://open.spotify.com/embed/playlist/${url.split("https://open.spotify.com/playlist/")[1].split("?")[0]}?utm_source=generator`
        }
    } catch {
        message.reply("Thats not valid bruh")
        creatingPlaylist = false
        return
    }
    var songs = []
    message.reply("Adding to queue...")
    var response = await axios.get(url)
    try {
        var TracklistRow_tag__ = "TracklistRow_tag__" + response.data.split('TracklistRow_tag__')[1].split('"')[0] //there may not be an explicit song
    } catch {}
    classes = { //the class names change every few weeks
        "TrackList_trackListContainer__": 'TrackList_trackListContainer__' + response.data.split('TrackList_trackListContainer__')[1].split('"')[0],
        "TracklistRow_title__": "TracklistRow_title__" + response.data.split('TracklistRow_title__')[1].split('"')[0],
        "TracklistRow_subtitle__": "TracklistRow_subtitle__" + response.data.split('TracklistRow_subtitle__')[1].split('"')[0],
        "Tag_container__": "Tag_container__" + response.data.split('Tag_container__')[1].split('"')[0],
        "TracklistRow_tag__": TracklistRow_tag__
    }
    let data = response.data.split('<ol class="' + classes.TrackList_trackListContainer__ + '" aria-label="Track list">')[1].split("</ol>")[0].split("</li>")
    for (let i = 0; i < data.length - 1; i++) {
        let name, artist
        name = data[i].split('<h3 dir="auto" class="' + classes.TracklistRow_title__ + '">')[1].split("</h3>")[0]
        artist = data[i].split('<h4 dir="auto" class="' + classes.TracklistRow_subtitle__ + '">')[1].split("</h4>")[0]
        name = decodeHexUnicodeEntities(name)
        artist = decodeHexUnicodeEntities(artist)
        if (artist.split(" ")[0] == "<span") {
            artist = artist.split('<span aria-label="Explicit" class="' + classes.Tag_container__ + ' ' + classes.TracklistRow_tag__ + '" title="Explicit">E</span>')[1]
        }
        // console.log(name, artist)
        songs.push({
            "name": name,
            "artist": artist
        })
    }

    console.log("\nBeginning search...")

    var done = 0

    var firstSong

    for (let i = 0; i < songs.length; i++) {
        try {
            search(songs[i].name + " " + songs[i].artist)
                .then(searchResults => {
                    try {
                        console.log(searchResults[0].title, "/////", songs[i].name + " " + songs[i].artist)
                        let song = {
                            "link": "https://www.youtube.com/watch?v=" + searchResults[0].id,
                            "name": songs[i].name,
                            "message": message
                        }
                        queue[i] = song
                        done++
                        if (i == 0) {
                            firstSong = song
                        }
                        if (done == songs.length) {
                            creatingPlaylist = false
                            console.log("Done.\n")
                            play(firstSong)
                        }
                    } catch {
                        done++
                        message.reply("Error looking for:" + songs[i].name)
                        creatingPlaylist = false
                        queue = []
                        return
                    }

                })
        } catch {

        }

    }
}

client.on('messageCreate', async (message) => {
    if (awaiting && iInteractions(message.author.username) > -1) { //if theres an interaction awaiting for the user
        if (message.content.toLowerCase() == "cancel") {
            message.reply("cancelled")
            awaiting = false
            interactions.splice(iInteractions(message.author.username), 1)
            return
        }
        if (message.content.toLowerCase().split(" ")[0] == "!c") {
            message.content = "!" + interactions[iInteractions(message.author.username)].action + " " + message.content.toLowerCase().split(" ").splice(1, 10000).join()
            if (message.content.trim().split(" ").length == 1) {
                message.reply("Please use !c with a prompt after or use cancel to cancel the operation")
            } else {
                var action = interactions[iInteractions(message.author.username)].action
                interactions.splice(iInteractions(message.author.username), 1)
                userRequest(message, action)
                return
            }

        }
        var decision = parseInt(message.content)

        if (isNaN(decision)) {
            message.reply("Please write a number as a reply or send \"cancel\" to cancel the query")
            return
        }
        if (decision > interactions[iInteractions(message.author.username)].result.length + 1 || decision <= 0) {
            message.reply("From the list please")
            return
        }
        try {
            let song = {
                "link": "https://www.youtube.com/watch?v=" + interactions[iInteractions(message.author.username)].result[decision - 1].id,
                "name": interactions[iInteractions(message.author.username)].result[decision - 1].title,
                "message": message
            }

            if (interactions[iInteractions(message.author.username)].action == "play") {
                if (downloading) {
                    waitDownload(song)
                } else {
                    play(song)
                }
            } else if (interactions[iInteractions(message.author.username)].action == "add") {
                queue.push(song)
                message.reply("Added to queue")
            }
            repeat = false
            awaiting = false
            interactions.splice(iInteractions(message.author.username), 1)
        } catch (e) {}
    }
    if (message.content.toLowerCase().split(" ")[0] == '!play' || message.content.toLowerCase().split(" ")[0] == '!p') {
        userRequest(message, "play")
    } else if (message.content.toLowerCase() === '!stop') {
        repeat = false
        if (playing) {
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
    } else if (message.content.toLowerCase() === '!repeat' || message.content.toLowerCase() === '!r') {
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
    } else if (message.content.toLowerCase().split(" ")[0] == '!add' || message.content.toLowerCase().split(" ")[0] == '!a') {
        if (playing) {
            userRequest(message, "add")
        } else {
            userRequest(message, "play")
        }
    } else if (message.content.toLowerCase() === '!skip' || message.content.toLowerCase() === '!s') {
        try {
            if (playing) {
                repeat = false
                onFinish(current)
            } else {
                message.reply("I'm not playing anything rn")
            }
        } catch {
            message.reply("That did't work")
        }
    } else if (message.content.toLowerCase().split(" ")[0] == '!playlist') {
        if (creatingPlaylist) {
            message.reply("Please wait for the previous playlist/album to load")
            return
        }
        try {
            if (message.content.split(" ").length == 1) {
                message.reply("Can't work with no link boss")
                return
            }
            queue = []
            if (playing) {
                stop()
            }
            createPlaylist(message.content.split(" ")[1], message)
        } catch {
            message.reply("Your shit failed contact gabocota idk")
        }
    } else if (message.content.toLowerCase() == '!queue' || message.content.toLowerCase() == '!q') {
        if (queue.length == 0) {
            message.reply("there is nothing on the queue")
        } else {
            var toSend = "Queue:\n"
            for (let i = 0; i < queue.length; i++) {
                try {
                    toSend += (i + 1) + "- **" + queue[i].name + "**\n"
                } catch {}
            }
            if (toSend.length <= 1990) {
                message.reply(toSend)
            } else {
                message.reply("**I think your queue is too long**\n")
            }

        }
    } else if ((message.content.toLowerCase().split(" ")[0] == '!album')) {
        if (creatingPlaylist) {
            message.reply("Please wait for the previous playlist/album to load")
            return
        }
        try {
            if (message.content.split(" ").length == 1) {
                message.reply("Can't work with no link boss")
                return
            }
            queue = []
            if (playing) {
                stop()
            }
            createPlaylist(message.content.split(" ")[1], message)
        } catch {
            message.reply("Your shit failed contact gabocota idk")
        }
    } else if (message.content.toLowerCase().split(" ")[0] == "!lyrics" || message.content.toLowerCase().split(" ")[0] == "!l") { //looks for the lyrics in azlyrics.com
        if (message.content.toLowerCase().split(" ").length == 1) {
            try {
                var searchQuery = current.name.split(" ").join("%20")
                if (searchQuery.indexOf("–") != -1 && searchQuery.split("–%20")[1] != "") { // – this is dumb
                    searchQuery = searchQuery.split("–%20")[1]
                }
                if (searchQuery.indexOf("-") != -1 && searchQuery.split("-%20")[1] != "") { // - but theres two different characters
                    searchQuery = searchQuery.split("-%20")[1]
                }
                if (searchQuery.indexOf("(") != -1 && searchQuery.replace(/\([^)]*\)/g, '')) { // delete ()
                    searchQuery = searchQuery.replace(/\([^)]*\)/g, '')
                }
                if (searchQuery.indexOf("[") != -1 && searchQuery.replace(/\[[^\]]*\]/g, '')) { // delete []
                    searchQuery = searchQuery.replace(/\[[^\]]*\]/g, '')
                }
            } catch {
                message.reply("Please add a song name lmao")
                return
            }
        } else {
            var searchQuery = message.content.toLowerCase().split(" ").slice(1).join("%20")
        }
        axios.get("https://search.azlyrics.com/suggest.php?q=" + searchQuery)
            .then(data => {
                try {
                    var link = data.data.songs[0].url
                } catch {
                    message.reply("No result found, please enter the name after the command to brute force it")
                    return
                }
                axios.get(link)
                    .then(data => {
                        try {
                            var lyrics = data.data.split("Sorry about that. -->")[1].split("</div>")[0].split("<br>").join("").trim().replace(/<[^>]*>/g, "")
                            if (lyrics.length <= 1950) {
                                message.reply("**" + lyrics + "**")
                            } else {
                                var messages = returnChunksArray(lyrics, 1950)
                                for (let i = 0; i < messages.length; i++) {
                                    message.reply("**" + messages[i] + "**")
                                }
                            }
                        } catch (e) {
                            message.reply("Failed getting lyrics" + e)
                            return
                        }

                    })
            })

    } else if (message.content.toLowerCase().split(" ")[0] == "!leave" && message.author.id == ADMIN) { //just to make sure you can leave any server you want without having admin
        message.reply("bye")
        message.guild.leave()
    } else if (message.content.toLowerCase().split(" ")[0] == "!solitude") {
        repeat = true
        message.content = "!play " + solitudeLink
        userRequest(message, "play")
        message.reply("U okay?")
    }

});

client.login(botToken);