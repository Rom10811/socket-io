// Setup basic express server
const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 3000;
const admin = require('firebase-admin');
const {Storage} = require('@google-cloud/storage');
const {v4: uuidv4} = require('uuid');

// Config for Google Cloud Run if in local use the files
// const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
const serviceAccount = require('./firebaseKey.json');

const storage = new Storage({
    projectId: serviceAccount.project_id,
    credentials: serviceAccount,
});

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const storeMessage = async (roomName, messageData) => {
    try {
        const messagesRef = db.collection('Messages');
        await messagesRef.add({
            roomName: roomName,
            message: messageData,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('Message stored in database');
    } catch (error) {
        console.error('Error storing message in database', error);
    }
}

// Function to store the audio data in GCP bucket
const storeAudioMessage = async (roomName, audioData) => {
    try {
        const bucketName = 'jdr-maker-audio-message'; // Replace with your Firebase Storage bucket name
        // Create filename with roomName and date
        const fileName = `${roomName}-${Date.now()}.mp3`;
        const filePath = `audioMessages/${roomName}/${fileName}`;

        const bucket = storage.bucket(bucketName);
        const file = bucket.file(filePath);

        await file.save(audioData);
        // Make the file public
        await file.makePublic();

        return file.publicUrl();
    } catch (error) {
        console.error('Error storing audio message in Firebase Storage:', error);
        return null;
    }
};

// Helper function to get all messages for a room
const getAllMessagesForRoom = async (roomName) => {
    try {
        const messagesRef = db.collection('Messages');
        const snapshot = await messagesRef.where('roomName', '==', roomName).orderBy('timestamp').get();
        const messages = [];
        snapshot.forEach((doc) => {
            messages.push(doc.data().message);
        });

        console.log(`Retrieved ${messages.length} messages for room ${roomName}`);
        return messages;
    } catch (error) {
        console.error('Error retrieving messages for room:', error);
        return [];
    }
};

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
        storeMessage(data.roomName, data);
        // we tell the client to execute 'message'
        io.to(data.roomName).emit('message', {
            data
        });
    });

    // when the client emits 'audio', this listens and executes
    socket.on('audio', async (data) => {
        console.log(data);
        console.log(data.message);
        // Store the audio data in the GCP bucket
        // The audio message is stored in data.message
        try {
            const filePath = await storeAudioMessage(data.roomName, data.message);
            // Update the data.message with the audio file path in the bucket
            data.message = filePath;
            console.log(`Audio data stored in Firebase bucket: ${filePath}`);
            await storeMessage(data.roomName, data);
        } catch (error) {
            console.error('Error storing audio data in Firebase bucket:', error);
        }
        console.log(data)
        // print the bytes of the audio file to the console in data.data
        io.to(data.roomName).emit('audio', {
            data
        });
    });

    socket.on('reload', (data) => {
        const key = Object.keys(data)[0];
        if (grillesRoom[key] !== undefined) {
            io.to(key).emit('fromServer', grillesRoom[key]);
        } else {
            grillesRoom[key] = list;
            io.to(key).emit('fromServer', grillesRoom[key]);
        }
    })

    socket.on('moove', (data) => {
        const key = Object.keys(data)[0];
        grillesRoom[key] = Object.values(data)[0];
        io.to(key).emit('fromServer', grillesRoom[key]);
    })

    socket.on('join', async (roomName) => {
        socket.join(roomName);

        // Get all messages for the room
        const messages = await getAllMessagesForRoom(roomName);
        console.log(messages);


        const clientsInRoom = io.sockets.adapter.rooms.get(roomName);
        const numClients = clientsInRoom ? clientsInRoom.size : 0;
        console.log(`There are ${numClients} clients in ${roomName}`);
        console.log('room joined: %s', roomName);
        console.log(grillesRoom[roomName]);
        socket.emit('previousMessages', messages);
    })
});
