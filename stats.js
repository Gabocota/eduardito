const fs = require("fs")
fs.readFile('./songs.txt', 'utf-8', (err, data) => {
    if (err) {
        console.error(err);
        return;
    }
    var users = []
    var songs = data.split("\n")
    for (let i = 0; i < songs.length; i++) {
        let name = songs[i].split(":")[0]
        let found = false
        for (let u = 0; u < users.length; u++) {
            if (users[u].name == name) {
                users[u].score++
                found = true
                break
            }
        }
        if (!found && name != '') {
            users.push({
                "name": name,
                "score": 1
            })
        }

    }
    users.sort(function(a, b) {
        return parseFloat(b.score) - parseFloat(a.score);
    });
    console.log("// Top users //")
    for(let i = 0;i<users.length;i++){
        console.log(i + 1 + "- " + users[i].name + " with: " + users[i].score + " songs.")
    }
});
