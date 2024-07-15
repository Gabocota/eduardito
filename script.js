const output = document.getElementById('output')
var pastCommands = []
var valid = false
var automaticScrolling = true
var invkeymsgDisappear = 0
var invkeymsgcheckerRunning = false
const menuCont = document.getElementById("menuCont")
var smthElse = false //for when something else is on the output

function showMenu() {
    menuCont.style.display = "flex"
    menuCont.style.transform = "translateX(0%)"
}

function hideMenu() {
    menuCont.style.display = "none"
    menuCont.style.transform = "translateX(50%)"
}

function commandLogShow() {
    var key = document.getElementById("key").value
    smthElse = true
    fetch('./cl', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key: key
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status != "success") {
                invkey(data.status)
            } else {
                let output = document.getElementById("output")
                output.innerHTML = ""
                var commandLog = data.data
                var toAdd = []
                for (let i = 0; i < commandLog.length; i++) {
                    let currentCommand = commandLog[i]
                    toAdd.push("Creator of key: " + currentCommand.creator)
                    toAdd.push("Time of creation: " + currentCommand.keyTime)
                    toAdd.push("Key: " + currentCommand.key)
                    toAdd.push("Time: " + currentCommand.time)
                    toAdd.push("Action: " + currentCommand.command + "<br>")
                }
                addElements(toAdd, output)
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function scrollSwitch() {
    if (automaticScrolling != document.getElementById("slider").checked) {
        automaticScrolling = document.getElementById("slider").checked
    }
}

function invkey(text) {
    invkeymsgDisappear = new Date().getTime() + 1200
    document.getElementById("invkeymsg").style.opacity = 1
    document.getElementById("invkeymsg").style.userSelect = "auto"
    document.getElementById("invkeymsg").innerHTML = text
    if (!invkeymsgcheckerRunning) {
        checkinvkey()
    }
}

function checkinvkey() {
    invkeymsgcheckerRunning = true
    if (new Date().getTime() >= invkeymsgDisappear) {
        document.getElementById("invkeymsg").style.opacity = 0
        document.getElementById("invkeymsg").style.userSelect = "none"
        invkeymsgcheckerRunning = false
    } else {
        setTimeout(checkinvkey, 1000)
    }
}

function hideInvalidScreen() {
    document.getElementById("invscr").style.opacity = 0
    setTimeout(function () {
        document.getElementById("invscr").style.display = "none"
    }, 500)
}

function showInvalidScreen() {
    document.getElementById("invscr").style.display = "flex"
    setTimeout(function () {
        document.getElementById("invscr").style.opacity = .8
    }, 10)

}

function sendCommand() {
    var command = document.getElementById("input").value
    var key = document.getElementById("key").value
    fetch('./api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key: key,
                command: command,
                log: false
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status != "success") {
                invkey(data.status)
            } else {
                pastCommands.push(command)
                document.getElementById("input").value = ""
                if (automaticScrolling) {
                    output.scrollBy(0, 10000000)
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function addElements(data, output) {
    for (var i = 0; i < data.length; i++) {
        let p = document.createElement("p")
        p.innerHTML = data[i]
        output.appendChild(p)
    }

    if (automaticScrolling) {
        output.scrollBy(0, 10000000)
    }
}

function getCookie(name) {
    let nameEQ = name + "=";
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=None; Secure";
}

function loadConsole() {
    var key = document.getElementById("key").value;
    fetch('./api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key: key,
                command: "",
                log: true
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status != "success") {
                setCookie("key", encodeURIComponent("invalid"), 1);
                invkey(data.status);
                showInvalidScreen();
                document.getElementById("output").innerHTML = "";
                document.getElementById("key").value = "";
                valid = false;
            } else {
                valid = true;
                var lines = data.data;
                lines = lines.map(str => str.replace(/[<>]/g, match => `&${match === "<" ? "lt" : "gt"};`));
                var elems = output.getElementsByTagName('p');
                if (!smthElse) {
                    if (elems.length != 0) {
                        if (elems[elems.length - 1].innerHTML != lines[lines.length - 1]) {
                            for (let i = 98; i >= 0; i--) {
                                if (lines[i] == elems[elems.length - 1].innerHTML) {
                                    addElements(lines.slice(i + 1), output);
                                    break;
                                }
                                if (i == 0) {
                                    addElements(lines, output);
                                }
                            }
                        }
                    } else {
                        addElements(lines, output);
                    }
                }
                setTimeout(loadConsole, 1000);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function reloadButton() {
    if (smthElse) {
        smthElse = false
        document.getElementById("reload").classList.add("spinning")
        setTimeout(function () {
            document.getElementById("reload").classList.remove("spinning")
        }, 1000)
    } else {
        reload(document.getElementById("key").value, false)
    }
}

function reload(key, onLoad) {
    if (!valid) {
        fetch('./api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    key: key,
                    command: "loadUp",
                    log: true
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.status != "success") {
                    if (onLoad) {
                        setCookie("key", encodeURIComponent("invalid"), 1);
                    }
                    invkey(data.status)
                    valid = false
                    document.getElementById("reload").classList.add("shaking")
                    setTimeout(function () {
                        document.getElementById("reload").classList.remove("shaking")
                    }, 1000)
                } else {
                    if (!onLoad) {
                        setCookie("key", encodeURIComponent(key), 1);
                    } else {
                        document.getElementById("key").value = key
                    }
                    valid = true
                    var lines = data.data
                    lines = lines.map(str => str.replace(/[<>]/g, match => `&${match === "<" ? "lt" : "gt"};`));
                    output.innerHTML = ""
                    addElements(lines, output)
                    setTimeout(loadConsole, 1000)
                    document.getElementById("reload").classList.add("spinning")
                    setTimeout(function () {
                        document.getElementById("reload").classList.remove("spinning")
                    }, 1000)
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
    } else {
        document.getElementById("reload").classList.add("shaking")
        setTimeout(function () {
            document.getElementById("reload").classList.remove("shaking")
        }, 1000)
    }
}
const keys = "abcdefghijklmnñopqrstuvwxyz"
const inputField = document.getElementById("input")
isInputFocused = false;
inputField.addEventListener('focus', () => {
    isInputFocused = true;
});

inputField.addEventListener('blur', () => {
    isInputFocused = false;
});

const pathInputField = document.getElementById("pathInput")

pathInputField.addEventListener('focus', () => {
    isInputFocused = true;
});

pathInputField.addEventListener('blur', () => {
    isInputFocused = false;
});

const keyInputField = document.getElementById("key")

keyInputField.addEventListener('focus', () => {
    isInputFocused = true;
});

keyInputField.addEventListener('blur', () => {
    isInputFocused = false;
});

const deletePathInput = document.getElementById("deletePathInput")

deletePathInput.addEventListener('focus', () => {
    isInputFocused = true;
});

deletePathInput.addEventListener('blur', () => {
    isInputFocused = false;
});

const downloadPathInput = document.getElementById("downloadPathInput")

downloadPathInput.addEventListener('focus', () => {
    isInputFocused = true;
});

downloadPathInput.addEventListener('blur', () => {
    isInputFocused = false;
});

const seeDirPathInput = document.getElementById("seeDirPathInput")

seeDirPathInput.addEventListener('focus', () => {
    isInputFocused = true;
});

seeDirPathInput.addEventListener('blur', () => {
    isInputFocused = false;
});

var lastKey = ""
var arrowUp = 0
document.addEventListener("keydown", function (e) {
    if (!smthElse) {
        if (e.code === "Enter") {
            sendCommand()
        }
        if (keys.includes(e.key) && !isInputFocused && valid && window.getSelection().isCollapsed) {
            inputField.select()
        }
        if (e.code === "ArrowUp") {
            if (lastKey == "ArrowUp") {
                arrowUp = arrowUp + 1
            } else {
                arrowUp = 0
            }
            if (pastCommands.length >= arrowUp + 1) {
                document.getElementById("input").value = pastCommands[(pastCommands.length - 1) - arrowUp]
            }
        }
        lastKey = e.code
    }
});

document.getElementById('upload').addEventListener('submit', function (event) {
    event.preventDefault();

    const fileInput = document.getElementById("fileInput").files[0];
    const key = document.getElementById("key").value;
    const path = document.getElementById("pathInput").value;

    if (typeof fileInput == undefined) {
        invkey("no file :/")
        return
    }

    const formData = new FormData();
    formData.append("file", fileInput);
    formData.append("key", key);
    formData.append("path", path);

    fetch('up', {
            method: 'POST',
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            if (data.status !== "success") {
                invkey(data.status);
            } else {
                document.getElementById("fileInput").value = ""
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
});

function deleteFile() {
    let key = document.getElementById("key").value
    let path = document.getElementById("deletePathInput").value
    fetch('rm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "key": key,
                "path": path
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status !== "success") {
                invkey(data.status);
            } else {
                document.getElementById("deletePathInput").value = ""
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function downloadFile() {
    let key = document.getElementById("key").value;
    let path = document.getElementById("downloadPathInput").value;
    let fileName = path.split("/").length == 0 ? "error" : path.split("/")[path.split("/").length - 1];

    fetch('down', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "key": key,
                "path": path
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json().then(data => {
                    if (data.status === "success") {
                        throw new Error('Unexpected JSON response with status "success"');
                    } else {
                        throw new Error(data.status);
                    }
                });
            } else {
                return response.blob();
            }
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        })
        .catch(error => {
            console.error('Error:', error.message);
            invkey(error.message);
        });
}

function seeDir() {
    let key = document.getElementById("key").value
    let path = document.getElementById("seeDirPathInput").value
    smthElse = true
    fetch('ls', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "key": key,
                "path": path
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status !== "success") {
                invkey(data.status);
            } else {
                document.getElementById("output").innerHTML = ""
                let items = data.data
                if (items.length > 0) {
                    var toAdd = []
                    for (let i = 0; i < items.length; i++) {
                        toAdd.push(items[i])
                    }
                    addElements(toAdd, document.getElementById("output"))
                    document.getElementById("seeDirPathInput").value = ""
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

if (decodeURIComponent(getCookie("key")) != "invalid" && decodeURIComponent(getCookie("key")) != "") {
    reload(decodeURIComponent(getCookie("key")), true)
}