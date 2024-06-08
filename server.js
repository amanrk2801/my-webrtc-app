const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('New user connected');

    socket.on('createRoom', (data) => {
        socket.join(data.roomID);
        socket.emit('roomCreated', { roomID: data.roomID });
        console.log(`Room created: ${data.roomID}`);
    });

    socket.on('joinRoom', (data) => {
        const room = io.sockets.adapter.rooms.get(data.roomID);
        if (room) {
            socket.join(data.roomID);
            socket.emit('roomJoined', { roomID: data.roomID });
            socket.to(data.roomID).emit('ready', { roomID: data.roomID });
            console.log(`User joined room: ${data.roomID}`);
        } else {
            socket.emit('error', { message: 'Room does not exist!' });
            console.log(`Room does not exist: ${data.roomID}`);
        }
    });

    socket.on('offer', (data) => {
        socket.to(data.roomID).emit('offer', data);
    });

    socket.on('answer', (data) => {
        socket.to(data.roomID).emit('answer', data);
    });

    socket.on('candidate', (data) => {
        socket.to(data.roomID).emit('candidate', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
