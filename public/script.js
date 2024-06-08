const createRoomButton = document.getElementById('createRoom');
const joinRoomButton = document.getElementById('joinRoom');
const roomIdInput = document.getElementById('roomId');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let localStream;
let remoteStream;
let peerConnection;
let roomId;

const socket = io();

// ICE servers for peer connection
const configuration = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302'
        }
    ]
};

// Set up media stream
async function setupMedia() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
    } catch (err) {
        console.error('Error accessing media devices.', err);
    }
}

// Create peer connection
function createPeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);

    peerConnection.addEventListener('icecandidate', event => {
        if (event.candidate) {
            socket.emit('candidate', { candidate: event.candidate, roomID: roomId });
        }
    });

    peerConnection.addEventListener('track', event => {
        if (!remoteStream) {
            remoteStream = new MediaStream();
            remoteVideo.srcObject = remoteStream;
        }
        remoteStream.addTrack(event.track);
    });

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });
}

// Handle signaling messages
socket.on('offer', async (data) => {
    console.log('Received offer:', data);
    if (!peerConnection) createPeerConnection();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', { answer: answer, roomID: data.roomID });
});

socket.on('answer', async (data) => {
    console.log('Received answer:', data);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
});

socket.on('candidate', async (data) => {
    console.log('Received candidate:', data);
    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
});

socket.on('ready', async (data) => {
    console.log('Received ready:', data);
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', { offer: offer, roomID: data.roomID });
});

// Handle errors
socket.on('error', (data) => {
    alert(data.message);
});

// Create room
createRoomButton.addEventListener('click', () => {
    roomId = Math.random().toString(36).substring(2, 15);
    socket.emit('createRoom', { roomID: roomId });
    alert(`Room created with ID: ${roomId}`);
    createPeerConnection();
});

// Join room
joinRoomButton.addEventListener('click', () => {
    roomId = roomIdInput.value;
    socket.emit('joinRoom', { roomID: roomId });
    createPeerConnection();
});

setupMedia();
