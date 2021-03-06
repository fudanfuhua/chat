var FADE_TIME = 150; // ms
var TYPING_TIMER_LENGTH = 400; // ms
var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
];

// Initialize varibles
var $window = $(window);
var $usernameInput = $('.usernameInput'); // Input for username
var $messages = $('.messages'); // Messages area
var $inputMessage = $('.inputMessage'); // Input message input box
var $inputImg = $('.inputImg'); // Input message input box

var $loginPage = $('.login.page'); // The login page
var $chatPage = $('.chat.page'); // The chatroom page
var username;
var connected = false;
var typing = false;
var lastTypingTime;
var $currentInput = $usernameInput.focus();

var socket = io('http://localhost:8360');

function addParticipantsMessage(data) {
    var message = '';
    if (data.numUsers === 1) {
        message += "现在群里只有您一个人, 快去邀请好友吧";
    } else {
        message += "共有 " + data.numUsers + " 人加入了聊天";
    }
    log(message);
}

// Sets the client's username
function setUsername() {
    username = cleanInput($.trim($usernameInput.val()));
    // If the username is valid
    if (username) {
        $loginPage.fadeOut();
        $chatPage.show();
        $loginPage.off('click');
        $currentInput = $inputMessage.focus();

        // Tell the server your username
        socket.emit('adduser', username);
    }
}

//img
$('#file').click(function() {
    $(".inputImage").trigger("click");
});
$('.inputImage').on('change', function() {
    if (this.files.length != 0) {
        var file = this.files[0],
            reader = new FileReader();
        if (!reader) {
            alert('system', '!your browser doesn\'t support fileReader', 'red');
            this.value = '';
            return;
        };
        reader.onload = function(e) {
            this.value = '';
            socket.emit('img', e.target.result);

            addChatImg({
                username: username,
                img: e.target.result
            },true);
            // that._displayImage('me', e.target.result);
        };
        reader.readAsDataURL(file);
    };
});

//emoji
initialEmoji();
document.getElementById('emoji').addEventListener('click', function(e) {
    var emojiwrapper = document.getElementById('emojiWrapper');
    emojiwrapper.style.display = 'block';
    e.stopPropagation();
}, false);
document.body.addEventListener('click', function(e) {
    var emojiwrapper = document.getElementById('emojiWrapper');
    if (e.target != emojiwrapper) {
        emojiwrapper.style.display = 'none';
    };
});
document.getElementById('emojiWrapper').addEventListener('click', function(e) {
    var target = e.target;
    if (target.nodeName.toLowerCase() == 'img') {
        $('.inputMessage')
            .focus()
            .val($('.inputMessage').val() + '[emoji:' + target.title + ']');
    };
}, false);

function initialEmoji() {
    var emojiContainer = document.getElementById('emojiWrapper'),
        docFragment = document.createDocumentFragment();
    for (var i = 69; i > 0; i--) {
        var emojiItem = document.createElement('img');
        emojiItem.src = '/static/img/emoji/' + i + '.gif';
        emojiItem.title = i;
        docFragment.appendChild(emojiItem);
    };
    emojiContainer.appendChild(docFragment);
}

function showEmoji(msg) {
    var match, result = msg,
        reg = /\[emoji:\d+\]/g,
        emojiIndex,
        totalEmojiNum = document.getElementById('emojiWrapper').children.length;
    while (match = reg.exec(msg)) {
        emojiIndex = match[0].slice(7, -1);
        if (emojiIndex > totalEmojiNum) {
            result = result.replace(match[0], '[X]');
        } else {
            result = result.replace(match[0], '<img class="emoji" src="/static/img/emoji/' + emojiIndex + '.gif" />'); //todo:fix this in chrome it will cause a new request for the image
        };
    };
    return result;
}

// Sends a chat message
function sendMessage() {
    var message = $inputMessage.val();
    // Prevent markup from being injected into the message
    if(!message.trim()){
        return false;
    }
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
        $inputMessage.val('');
        addChatMessage({
            username: username,
            message: message
        },{isMy:true});
        socket.emit('chat', message);
    }
}

// Log a message
function log(message, options) {
    var $el = $('<li style="display:block"/>').addClass('log').text(message);
    addMessageElement($el, options);
}

// Adds the visual chat message to the message list
function addChatMessage(data, options) {
    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
        options.fade = false;
        $typingMessages.remove();
    }
    var msg = showEmoji(data.message);

    if(options.isMy){
        var $usernameDiv = $('<span class="username" />')
            .text(':'+data.username)
            .css('color', getUsernameColor(data.username));
        var $messageBodyDiv = $('<span class="messageBody" />')
            .html(msg);

        var typingClass = data.typing ? 'typing' : '';
        var $messageDiv = $('<li class="message mymessage"></li>')
            .data('username', data.username)
            .addClass(typingClass);

        addMessageElement($messageDiv, options);
    
        $messageDiv.append($messageBodyDiv);

        // $messageDiv.append($usernameDiv);
    }else{
        var $usernameDiv = $('<span class="username" />')
        .text(data.username + ":")
        .css('color', getUsernameColor(data.username));
        var $messageBodyDiv = $('<span class="messageBody" />')
        .html(msg).css('backgroundColor',getUsernameColor(data.username));

        var typingClass = data.typing ? 'typing' : '';
        var $messageDiv = $('<li class="message"></li>')
            .data('username', data.username)
            .addClass(typingClass);

        addMessageElement($messageDiv, options);
    
        $messageDiv.append($usernameDiv);
        $messageDiv.append($messageBodyDiv);
    }
}

//img
function addChatImg(data, isMy) {
    // Don't fade the message in if there is an 'X was typing'
    if(isMy){
        var $usernameDiv = $('<span class="username" />')
            .text(":"+data.username)
            .css('color', getUsernameColor(data.username));
        var $messageBodyDiv = $('<span class="messageBody" />')
            .append('<img src= "' + data.img + '" width="300";/>');

        var typingClass = data.typing ? 'typing' : '';
        var $messageDiv = $('<li class="message mymessage"></li>')
            .data('username', data.username)    
            .addClass(typingClass);
        addMessageElement($messageDiv);
        $messageDiv.append($messageBodyDiv);
        // $messageDiv.append($usernameDiv);

    }else{
        var $usernameDiv = $('<span class="username" />')
            .text(data.username + ":")
            .css('color', getUsernameColor(data.username));
        var $messageBodyDiv = $('<span class="messageBody" />')
            .append('<img src= "' + data.img + '" width="300";/>');

        var typingClass = data.typing ? 'typing' : '';
        var $messageDiv = $('<li class="message"></li>')
            .data('username', data.username)    
            .addClass(typingClass);
        addMessageElement($messageDiv);
        $messageDiv.append($usernameDiv);
        $messageDiv.append($messageBodyDiv);
    }
}

// Adds the visual chat typing message
function addChatTyping(data) {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
}

// Removes the visual chat typing message
function removeChatTyping(data) {
    getTypingMessages(data).fadeOut(function() {
        $(this).remove();
    });
}

// Adds a message element to the messages and scrolls to the bottom
// el - The element to add as a message
// options.fade - If the element should fade-in (default = true)
// options.prepend - If the element should prepend
//   all other messages (default = false)
function addMessageElement(el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
        options = {};
    }
    if (typeof options.fade === 'undefined') {
        options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
        options.prepend = false;
    }

    // Apply options
    if (options.fade) {
        $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
        $messages.prepend($el);
    } else {
        $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
}



// Prevents input from having injected markup
function cleanInput(input) {
    return $('<div/>').text(input).text();
}

// Updates the typing event
function updateTyping() {
    if (connected) {
        if (!typing) {
            typing = true;
            socket.emit('typing');
        }
        lastTypingTime = (new Date()).getTime();

        setTimeout(function() {
            var typingTimer = (new Date()).getTime();
            var timeDiff = typingTimer - lastTypingTime;
            if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
                socket.emit('stoptyping');
                typing = false;
            }
        }, TYPING_TIMER_LENGTH);
    }
}

// Gets the 'X is typing' messages of a user
function getTypingMessages(data) {
    return $('.typing.message').filter(function(i) {
        return $(this).data('username') === data.username;
    });
}

// Gets the color of a username through our hash function
function getUsernameColor(username) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
}

var keydown = function(event) {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
        $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
        if (username) {
            sendMessage();
            socket.emit('stoptyping');
            typing = false;
        } else {
            setUsername();
        }
    }
}

$usernameInput.keydown(keydown);
$inputMessage.keydown(keydown);
// Keyboard events
//$window.keypress(keydown);

$inputMessage.on('input', function() {
    updateTyping();
});

// Click events

// Focus input when clicking anywhere on login page
$loginPage.click(function() {
    $currentInput.focus();
});

// Focus input when clicking on the message input's border
$inputMessage.click(function() {
    $inputMessage.focus();
});

// Socket events

// Whenever the server emits 'login', log the login message
socket.on('login', function(data) {
    connected = true;
    // Display the welcome message
    var message = "";
    log(message, {
        prepend: true
    });
    addParticipantsMessage(data);
});

// Whenever the server emits 'new message', update the chat body
socket.on('chat', function(data) {
    addChatMessage(data);
});

//img
socket.on('img', function(data) {
    addChatImg(data);
});

// Whenever the server emits 'user joined', log it in the chat body
socket.on('userjoin', function(data) {
    log(data.username + ' 加入了聊天');
    addParticipantsMessage(data);
});

// Whenever the server emits 'user left', log it in the chat body
socket.on('userleft', function(data) {
    log(data.username + ' 离开了聊天');
    addParticipantsMessage(data);
    removeChatTyping(data);
});

// Whenever the server emits 'typing', show the typing message
socket.on('typing', function(data) {
    addChatTyping(data);
});

// Whenever the server emits 'stop typing', kill the typing message
socket.on('stoptyping', function(data) {
    removeChatTyping(data);
});