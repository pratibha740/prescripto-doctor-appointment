import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import io from "socket.io-client";

const socket = io("http://localhost:9000");

function VideoCall() {
  const { docId } = useParams();

  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peer = useRef(null);

  // Auto fill room ID using doctor id
  useEffect(() => {
    setRoomId(`room_${docId}`);
  }, [docId]);

  useEffect(() => {
    if (!roomId) return;

    socket.on("user-joined", async () => {
      console.log("User joined the room");

      const offer = await peer.current.createOffer();
      await peer.current.setLocalDescription(offer);

      socket.emit("offer", { offer, roomId });
    });

    socket.on("offer", async (offer) => {
      console.log("Offer received");

      await peer.current.setRemoteDescription(offer);

      const answer = await peer.current.createAnswer();
      await peer.current.setLocalDescription(answer);

      socket.emit("answer", { answer, roomId });
    });

    socket.on("answer", async (answer) => {
      console.log("Answer received");
      await peer.current.setRemoteDescription(answer);
    });

    socket.on("ice-candidate", (candidate) => {
      console.log("Ice candidate received");
      peer.current.addIceCandidate(candidate);
    });
  }, [roomId]);

  const startCall = async () => {
    console.log("Joining room:", roomId);
    setJoined(true);

    peer.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peer.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { candidate: event.candidate, roomId });
      }
    };

    peer.current.ontrack = (event) => {
      console.log("Remote stream received");
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    let stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    stream.getTracks().forEach((track) => {
      peer.current.addTrack(track, stream);
    });

    localVideoRef.current.srcObject = stream;

    socket.emit("join-room", roomId);
  };

  return (
    <div style={{ padding: "30px", textAlign: "center" }}>
      <h1>Telemedicine Video Call</h1>
      <p>Doctor ID: {docId}</p>
      <p>Room ID: {roomId}</p>

      {!joined ? (
        <>
          <button
            onClick={startCall}
            style={{
              marginTop: 20,
              padding: "10px 20px",
              background: "#4F46E5",
              color: "white",
              borderRadius: 8,
            }}
          >
            Join Call
          </button>
        </>
      ) : (
        <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 30 }}>
          <video ref={localVideoRef} autoPlay muted width="300" style={{ border: "2px solid black" }} />
          <video ref={remoteVideoRef} autoPlay width="300" style={{ border: "2px solid black" }} />
        </div>
      )}
    </div>
  );
}

export default VideoCall;
