// Setup basic express server
const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 3000;

server.listen(port, () => {
    console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));

// Chatroom

let numUsers = 0;

io.on('connection', (socket) => {
    console.log("connected")
    // when the client emits 'message', this listens and executes
    socket.on('message', (data) => {
        console.log(data)
        // we tell the client to execute 'message'
        socket.to(data.roomName).emit('message', {
            data
        });
    });

    // when the client emits 'audio', this listens and executes
    socket.on('audio', (data) => {
        console.log(data)
        // print the bytes of the audio file to the console in data.data
        socket.to(data.roomName).emit('audio', {
           data
        });
    });

    socket.on('join', (roomName) => {
        socket.join(roomName);
        const clientsInRoom = io.sockets.adapter.rooms.get(roomName);
        const numClients = clientsInRoom ? clientsInRoom.size : 0;
        console.log(`There are ${numClients} clients in ${roomName}`);
        console.log('room joined: %s', roomName);

    })
});
