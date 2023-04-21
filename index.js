// Setup basic express server
const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 3000;
const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const storeMessage = async(roomName, messageData) => {
    try {
        const messagesRef = db.collection('Messages');
        console.log("Message data: ", messageData)
        await messagesRef.add({
            roomName: roomName,
            message: messageData,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('Message stored in database');
    }
    catch (error) {
        console.error('Error storing message in database', error);
    }
}

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
        storeMessage(data.roomName, data);
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
