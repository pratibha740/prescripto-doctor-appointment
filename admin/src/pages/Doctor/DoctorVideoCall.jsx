import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:9000");

function DoctorVideoCall() {
  const [joined, setJoined] = useState(false);

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peer = useRef(null);

  // Doctor ID from URL
  const doctorId = window.location.pathname.split("/")[3];
  const roomId = `room_${doctorId}`;

  useEffect(() => {
    if (!peer.current) return;
    socket.on("user-joined", async () => {
      const offer = await peer.current.createOffer();
      await peer.current.setLocalDescription(offer);
      socket.emit("offer", { offer, roomId });
    });

    socket.on("offer", async (offer) => {
      await peer.current.setRemoteDescription(offer);
      const answer = await peer.current.createAnswer();
      await peer.current.setLocalDescription(answer);
      socket.emit("answer", { answer, roomId });
    });

    socket.on("answer", async (answer) => {
      await peer.current.setRemoteDescription(answer);
    });

    socket.on("ice-candidate", async (candidate) => {
      try {
        await peer.current.addIceCandidate(candidate);
      } catch (err) {
        console.error("Error adding ICE candidate:", err);
      }
    });
  return () => {
    socket.off("user-joined");
    socket.off("offer");
    socket.off("answer");
    socket.off("ice-candidate");
  };
}, [joined]);

  const startCall = async () => {
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
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    const stream = await navigator.mediaDevices.getUserMedia({
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
    <div style={{ padding: 20 }}>
      <h2>Doctor Telemedicine Video Call</h2>
      <h4>Room: {roomId}</h4>

      {!joined ? (
        <button onClick={startCall} style={{ padding: "10px 20px" }}>
          Start Video Call
        </button>
      ) : (
        <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            width="300"
            height="200"
            style={{ background: "#000" }}
          />
          <video
            ref={remoteVideoRef}
            autoPlay
            width="300"
            height="200"
            style={{ background: "#000" }}
          />
        </div>
      )}
    </div>
  );
}

export default DoctorVideoCall;
