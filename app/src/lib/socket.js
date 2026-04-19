import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

let socket = null;

/**
 * Connect to the Socket.IO server with JWT authentication.
 * CRITICAL: Returns existing socket even if still connecting.
 * Socket.IO client automatically buffers emits until connected.
 */
export function connectSocket() {
  // Return existing socket even if still connecting — do NOT create duplicates
  if (socket) return socket;

  const token = localStorage.getItem("cc_token");

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    console.log("🔌 Socket connected:", socket?.id);
  });

  socket.on("connect_error", (err) => {
    console.error("🔌 Socket connection error:", err.message);
  });

  socket.on("disconnect", (reason) => {
    console.log("🔌 Socket disconnected:", reason);
  });

  return socket;
}

/**
 * Disconnect from the Socket.IO server.
 */
export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/**
 * Get the current socket instance. Creates one if none exists.
 * NEVER creates a duplicate — returns the same instance every time.
 */
export function getSocket() {
  if (!socket) {
    return connectSocket();
  }
  return socket;
}

/**
 * Join a specific chat room to receive real-time messages.
 */
export function joinRoom(roomId) {
  const s = getSocket();
  // If already connected, join immediately
  if (s.connected) {
    s.emit("join_room", roomId);
  }
  // Also join on (re)connect — handles both initial connection delay and reconnects
  s.off("connect.join_" + roomId); // clean up previous
  const handler = () => s.emit("join_room", roomId);
  handler.__eventName = "connect.join_" + roomId;
  s.on("connect", handler);
}

/**
 * Leave a specific chat room.
 */
export function leaveRoom(roomId) {
  const s = getSocket();
  s.emit("leave_room", roomId);
  // Remove the auto-rejoin listener
  s.removeAllListeners("connect");
}

/**
 * Send a message via WebSocket (real-time path).
 */
export function sendSocketMessage(roomId, text) {
  const s = getSocket();
  s.emit("send_message", { roomId, text });
}

/**
 * Emit typing indicator.
 */
export function emitTyping(roomId) {
  const s = getSocket();
  s.emit("typing", roomId);
}

/**
 * Emit stop typing indicator.
 */
export function emitStopTyping(roomId) {
  const s = getSocket();
  s.emit("stop_typing", roomId);
}

/**
 * Listen for new messages in real-time.
 */
export function onNewMessage(callback) {
  const s = getSocket();
  s.on("new_message", callback);
  return () => {
    s.off("new_message", callback);
  };
}

/**
 * Listen for typing indicators.
 */
export function onUserTyping(callback) {
  const s = getSocket();
  s.on("user_typing", callback);
  return () => {
    s.off("user_typing", callback);
  };
}

/**
 * Listen for stop typing indicators.
 */
export function onUserStoppedTyping(callback) {
  const s = getSocket();
  s.on("user_stopped_typing", callback);
  return () => {
    s.off("user_stopped_typing", callback);
  };
}
