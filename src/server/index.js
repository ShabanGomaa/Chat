var app = require('http').createServer()
var io = module.exports.io = require('socket.io')(app)

// The server side port
const PORT = process.env.PORT || 3231

// The server is listening to some client messages
io.on('connection', function (socket) {
    console.log("user is connected");
    socket.on('disconnect', function () {
        console.log("user is disconnected");
    });

    socket.on('chat-message', function (response) {        
        io.emit('chat-message', { 'user': response.user, 'message': response.message });
    });

    socket.on('user-typing', function (response) {
        socket.broadcast.emit({ 'user': response.user });
    });
});

// The server is listening on this port
app.listen(PORT, () => {
    console.log("Connected to port:" + PORT)
})