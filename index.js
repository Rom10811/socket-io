// Setup basic express server
const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 3000;

//generate list with list of integers
var list = [];
for (var i = 0; i < 200; i++) {
    list.push(-1);
}
list[0] = 0;
list[1] = 0;


var grillesRoom = {};

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

    socket.on('reload', (data) => {
        const key = Object.keys(data)[0];
        if(grillesRoom[key] !== undefined){
            io.to(key).emit('fromServer',  grillesRoom[key]);
        }else{
            grillesRoom[key] = list;
            io.to(key).emit('fromServer',  grillesRoom[key]);
        }
    })

    socket.on('moove', (data) =>{
    const key = Object.keys(data)[0];
        grillesRoom[key] = Object.values(data)[0];
        io.to(key).emit('fromServer', grillesRoom[key]);
    })

    socket.on('join', (roomName) => {
        socket.join(roomName);
        const clientsInRoom = io.sockets.adapter.rooms.get(roomName);
        const numClients = clientsInRoom ? clientsInRoom.size : 0;
        console.log(`There are ${numClients} clients in ${roomName}`);
        console.log('room joined: %s', roomName);
        console.log(grillesRoom[roomName]);
    })
});
