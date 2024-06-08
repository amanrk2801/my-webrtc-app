const socket = io(window.location.origin, { path: '/api/socket' });

const createRoomButton = document.getElementById('createRoom');
const joinRoomButton = document.getElementById('joinRoom');
const roomIdInput = document.getElementById('roomId');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let localStream;
let remoteStream;
let peerConnection;

const servers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

createRoomButton.onclick = async () => {
    const roomID = Math.random().toString(36).substring(2, 10);
    socket.emit('createRoom', { roomID });
};

joinRoomButton.onclick = () => {
    const roomID = roomIdInput.value;
    socket.emit('joinRoom', { roomID });
};

socket.on('roomCreated', async ({ roomID }) => {
    console.log(`Created room ${roomID}`);
    await setupLocalStream();
    peerConnection = createPeerConnection(roomID);
});

socket.on('roomJoined', async ({ roomID }) => {
    console.log(`Joined room ${roomID}`);
    await setupLocalStream();
    peerConnection = createPeerConnection(roomID);
    createOffer();
});

socket.on('ready', async ({ roomID }) => {
    console.log(`Ready in room ${roomID}`);
    if (!peerConnection) {
        peerConnection = createPeerConnection(roomID);
        createOffer();
    }
});

socket.on('offer', async ({ sdp }) => {
    await handleOffer(sdp);
});

socket.on('answer', async ({ sdp }) => {
    await handleAnswer(sdp);
});

socket.on('candidate', async ({ candidate }) => {
    await handleCandidate(candidate);
});

async function setupLocalStream() {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
}

function createPeerConnection(roomID) {
    const pc = new RTCPeerConnection(servers);

    pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
            socket.emit('candidate', { roomID, candidate });
        }
    };

    pc.ontrack = ({ streams }) => {
        remoteStream = streams[0];
        remoteVideo.srcObject = remoteStream;
    };

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    
    return pc;
}

async function createOffer() {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', { sdp: offer.sdp });
}

async function handleOffer(sdp) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', { sdp: answer.sdp });
}

async function handleAnswer(sdp) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
}

async function handleCandidate(candidate) {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
}
