const { Server } = require("socket.io");
const { createServer } = require("http");

module.exports = (req, res) => {
    if (!res.socket.server.io) {
        console.log("Setting up socket.io");

        const httpServer = createServer((req, res) => {
            res.writeHead(404);
            res.end();
        });

        const io = new Server(httpServer, {
            path: "/api/socket",
            addTrailingSlash: false,
        });

        io.on("connection", (socket) => {
            console.log("New user connected");

            socket.on("createRoom", (data) => {
                socket.join(data.roomID);
                socket.emit("roomCreated", { roomID: data.roomID });
                console.log(`Room created: ${data.roomID}`);
            });

            socket.on("joinRoom", (data) => {
                const room = io.sockets.adapter.rooms.get(data.roomID);
                if (room) {
                    socket.join(data.roomID);
                    socket.emit("roomJoined", { roomID: data.roomID });
                    socket.to(data.roomID).emit("ready", { roomID: data.roomID });
                    console.log(`User joined room: ${data.roomID}`);
                } else {
                    socket.emit("error", { message: "Room does not exist!" });
                    console.log(`Room does not exist: ${data.roomID}`);
                }
            });

            socket.on("offer", (data) => {
                socket.to(data.roomID).emit("offer", data);
            });

            socket.on("answer", (data) => {
                socket.to(data.roomID).emit("answer", data);
            });

            socket.on("candidate", (data) => {
                socket.to(data.roomID).emit("candidate", data);
            });

            socket.on("disconnect", () => {
                console.log("User disconnected");
            });
        });

        res.socket.server.io = io;
    } else {
        console.log("Socket.io already set up");
    }

    res.end();
};
