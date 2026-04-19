import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  ArrowLeft,
  Send,
  Search,
  ShoppingBag,
  Lock,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { apiGetMyRooms, apiGetRoomMessages, apiSendMessage } from "@/lib/api";
import {
  connectSocket,
  disconnectSocket,
  joinRoom,
  leaveRoom,
  emitTyping,
  emitStopTyping,
  onNewMessage,
  onUserTyping,
  onUserStoppedTyping,
} from "@/lib/socket";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";

export default function ChatPage({ user, chatId, onBack }) {
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(chatId);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typingUser, setTypingUser] = useState(null);
  const [showMobileChat, setShowMobileChat] = useState(!!chatId);

  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const userId = (user._id || user.id)?.toString();

  // Connect socket on mount
  useEffect(() => {
    connectSocket();
    return () => {
      disconnectSocket();
    };
  }, []);

  // Fetch rooms on mount
  useEffect(() => {
    fetchRooms();
  }, []);

  // If chatId prop changes, select that room
  useEffect(() => {
    if (chatId) {
      setActiveRoomId(chatId);
      setShowMobileChat(true);
    }
  }, [chatId]);

  // When active room changes, fetch messages and join socket room
  useEffect(() => {
    if (activeRoomId) {
      fetchMessages(activeRoomId);
      joinRoom(activeRoomId);

      return () => {
        leaveRoom(activeRoomId);
      };
    }
  }, [activeRoomId]);

  // Listen for real-time messages from OTHER users
  useEffect(() => {
    const unsubMessage = onNewMessage((message) => {
      // Skip messages from self — we handle those via REST optimistic rendering
      if (message.sender_id?.toString() === userId) {
        // But still update sidebar for self-messages from other rooms
        updateRoomSidebar(message);
        return;
      }

      // Add message from the other user to the active conversation
      if (message.room_id === activeRoomId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }

      // Update sidebar
      updateRoomSidebar(message);
    });

    const unsubTyping = onUserTyping((data) => {
      if (data.userId !== userId) {
        setTypingUser(data.username);
      }
    });

    const unsubStopTyping = onUserStoppedTyping((data) => {
      if (data.userId !== userId) {
        setTypingUser(null);
      }
    });

    return () => {
      unsubMessage();
      unsubTyping();
      unsubStopTyping();
    };
  }, [activeRoomId, userId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const updateRoomSidebar = (message) => {
    setRooms((prev) =>
      prev.map((room) => {
        const roomId = (room._id || room.id)?.toString();
        if (roomId === message.room_id) {
          return {
            ...room,
            last_message: {
              id: message.id,
              text:
                message.text.length > 60
                  ? message.text.substring(0, 60) + "..."
                  : message.text,
              sender_id: message.sender_id,
              sender_name: message.sender?.username || "Unknown",
              created_at: message.created_at || new Date().toISOString(),
            },
            last_message_at: message.created_at || new Date().toISOString(),
          };
        }
        return room;
      }),
    );
  };

  const fetchRooms = async () => {
    try {
      setIsLoadingRooms(true);
      const data = await apiGetMyRooms();
      setRooms(data);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      toast.error("Failed to load conversations");
    } finally {
      setIsLoadingRooms(false);
    }
  };

  const fetchMessages = async (roomId) => {
    try {
      setIsLoadingMessages(true);
      const data = await apiGetRoomMessages(roomId);
      setMessages(data);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !activeRoomId || isSending) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    setIsSending(true);
    emitStopTyping(activeRoomId);

    // Optimistic: show the message immediately with a temporary ID
    const tempId = `optimistic-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      room_id: activeRoomId,
      sender_id: userId,
      text: messageText,
      created_at: new Date().toISOString(),
      sender: { username: user.username, avatar_url: user.avatar_url },
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    // Also update sidebar optimistically
    updateRoomSidebar(optimisticMsg);

    try {
      // Send via REST API — reliable, returns the saved message
      const savedMsg = await apiSendMessage(activeRoomId, messageText);

      // Replace optimistic message with the real server-confirmed message
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...savedMsg } : m)),
      );
    } catch (error) {
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error(error.message || "Failed to send message");
    } finally {
      setIsSending(false);
      // Re-focus input
      messageInputRef.current?.focus();
    }
  }, [
    newMessage,
    activeRoomId,
    isSending,
    userId,
    user.username,
    user.avatar_url,
  ]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);

    if (activeRoomId) {
      emitTyping(activeRoomId);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        if (activeRoomId) emitStopTyping(activeRoomId);
      }, 2000);
    }
  };

  const selectRoom = (room) => {
    const roomId = (room._id || room.id)?.toString();
    setActiveRoomId(roomId);
    setShowMobileChat(true);
    setTypingUser(null);
  };

  const handleBackToList = () => {
    setShowMobileChat(false);
    setActiveRoomId(null);
    setMessages([]);
    setTypingUser(null);
  };

  const getOtherUser = (room) => {
    const isBuyer = room.buyer_id?.toString() === userId;
    const other = isBuyer ? room.seller : room.buyer;
    return {
      username: other?.username || "Unknown",
      avatar_url: other?.avatar_url,
    };
  };

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, "h:mm a");
    if (isYesterday(date)) return "Yesterday " + format(date, "h:mm a");
    return format(date, "MMM d, h:mm a");
  };

  const formatRoomTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, "h:mm a");
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d");
  };

  const activeRoom = rooms.find(
    (r) => (r._id || r.id)?.toString() === activeRoomId,
  );

  const filteredRooms = rooms.filter((room) => {
    if (!searchQuery) return true;
    const other = getOtherUser(room);
    const listingTitle = room.listing?.title || "";
    return (
      other.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listingTitle.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // ═══════════════════════════════════════════════════
  //  CONVERSATION LIST (Left Panel)
  // ═══════════════════════════════════════════════════
  const renderConversationList = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b-4 border-black bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <motion.button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg md:hidden"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <h2 className="text-2xl font-bold">Messages</h2>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Lock className="w-3 h-3" />
            <span>Encrypted</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="neo-input w-full pl-10 py-2 text-sm"
          />
        </div>
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingRooms ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 border-4 border-black border-t-[hsl(var(--neo-yellow))] rounded-full"
            />
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center py-16 px-6">
            <motion.div
              className="w-20 h-20 bg-[hsl(var(--neo-yellow))] rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-black"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <MessageCircle className="w-10 h-10" />
            </motion.div>
            <h3 className="text-xl font-bold mb-2">
              {rooms.length === 0 ? "No conversations yet" : "No results"}
            </h3>
            <p className="text-gray-500 text-sm">
              {rooms.length === 0
                ? "When you contact a seller about a listing, your conversation will appear here."
                : "Try a different search term."}
            </p>
          </div>
        ) : (
          <div>
            {filteredRooms.map((room) => {
              const roomId = (room._id || room.id)?.toString();
              const isActive = roomId === activeRoomId;
              const other = getOtherUser(room);

              return (
                <motion.div
                  key={roomId}
                  onClick={() => selectRoom(room)}
                  className={`flex items-center gap-3 p-4 cursor-pointer border-b-2 border-gray-100 transition-colors ${
                    isActive
                      ? "bg-[hsl(var(--neo-yellow))]"
                      : "hover:bg-gray-50"
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-[hsl(var(--neo-blue))] rounded-full flex items-center justify-center border-3 border-black flex-shrink-0">
                    <span className="font-bold text-white text-lg">
                      {other.username[0]?.toUpperCase()}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-sm truncate">
                        {other.username}
                      </span>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {formatRoomTime(
                          room.last_message?.created_at || room.last_message_at,
                        )}
                      </span>
                    </div>

                    {/* Listing tag */}
                    <p className="text-xs text-gray-500 truncate mb-0.5 flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3 flex-shrink-0" />
                      {room.listing?.title || "Unknown listing"}
                    </p>

                    {/* Last message preview */}
                    <p className="text-xs text-gray-600 truncate">
                      {room.last_message
                        ? (room.last_message.sender_id?.toString() === userId
                            ? "You: "
                            : "") + room.last_message.text
                        : "No messages yet"}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 md:hidden" />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════
  //  MESSAGE THREAD (Right Panel)
  // ═══════════════════════════════════════════════════
  const renderMessageThread = () => {
    if (!activeRoom) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
          <motion.div
            className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4 border-4 border-gray-200"
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <MessageCircle className="w-12 h-12 text-gray-400" />
          </motion.div>
          <h3 className="text-xl font-bold text-gray-500 mb-2">
            Select a conversation
          </h3>
          <p className="text-gray-400 text-sm">
            Choose a conversation from the list to start messaging
          </p>
        </div>
      );
    }

    const other = getOtherUser(activeRoom);

    return (
      <div className="flex flex-col h-full">
        {/* Chat Header */}
        <div className="p-4 border-b-4 border-black bg-white flex items-center gap-3">
          <motion.button
            onClick={handleBackToList}
            className="p-2 hover:bg-gray-100 rounded-lg md:hidden"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>

          <div className="w-10 h-10 bg-[hsl(var(--neo-blue))] rounded-full flex items-center justify-center border-3 border-black flex-shrink-0">
            <span className="font-bold text-white">
              {other.username[0]?.toUpperCase()}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold truncate">{other.username}</p>
            <p className="text-xs text-gray-500 truncate flex items-center gap-1">
              <ShoppingBag className="w-3 h-3" />
              {activeRoom.listing?.title} · ₹{activeRoom.listing?.price}
            </p>
          </div>

          <div className="flex items-center gap-1 text-xs px-2 py-1 bg-[hsl(var(--neo-green))] text-white border-2 border-black">
            <Lock className="w-3 h-3" />
            <span className="font-bold">E2E</span>
          </div>
        </div>

        {/* Listing Context Bar */}
        {activeRoom.listing && (
          <div className="px-4 py-2 bg-[hsl(60,100%,97%)] border-b-2 border-black flex items-center gap-3 text-sm">
            {activeRoom.listing.image_url ? (
              <img
                src={activeRoom.listing.image_url}
                alt=""
                className="w-10 h-10 object-cover border-2 border-black flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-200 border-2 border-black flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-5 h-5 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">{activeRoom.listing.title}</p>
              <p className="text-xs text-gray-500">
                {activeRoom.listing.type === "Sell" ? "For Sale" : "For Rent"} ·{" "}
                {activeRoom.listing.category}
                {activeRoom.listing.status !== "Available" && (
                  <span className="ml-1 text-red-500">
                    ({activeRoom.listing.status})
                  </span>
                )}
              </p>
            </div>
            <span className="text-lg font-bold flex-shrink-0">
              ₹{activeRoom.listing.price}
            </span>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[hsl(60,100%,97%)]">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center py-20">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 border-4 border-black border-t-[hsl(var(--neo-yellow))] rounded-full"
              />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-[hsl(var(--neo-yellow))] rounded-full flex items-center justify-center mx-auto mb-4 border-3 border-black">
                <Lock className="w-8 h-8" />
              </div>
              <p className="text-gray-500 text-sm mb-1">
                Messages are end-to-end encrypted
              </p>
              <p className="text-gray-400 text-xs">
                Say hi to start the conversation!
              </p>
            </div>
          ) : (
            <>
              {/* Encryption notice */}
              <div className="text-center mb-4">
                <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-white px-3 py-1 rounded-full border border-gray-200">
                  <Lock className="w-3 h-3" />
                  Messages are encrypted with AES-256-GCM
                </span>
              </div>

              {messages.map((msg, index) => {
                const isMine = msg.sender_id?.toString() === userId;
                const isOptimistic = msg.id
                  ?.toString()
                  .startsWith("optimistic-");
                const showTime =
                  index === 0 ||
                  new Date(msg.created_at || "").getTime() -
                    new Date(messages[index - 1]?.created_at || "").getTime() >
                    300000; // 5 minutes gap

                return (
                  <div key={msg.id}>
                    {showTime && (
                      <div className="text-center my-4">
                        <span className="text-xs text-gray-400 bg-white px-3 py-1 rounded-full border border-gray-200">
                          {formatMessageTime(msg.created_at)}
                        </span>
                      </div>
                    )}

                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{
                        opacity: isOptimistic ? 0.7 : 1,
                        y: 0,
                        scale: 1,
                      }}
                      transition={{ duration: 0.2 }}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`chat-bubble ${
                          isMine ? "chat-bubble-sent" : "chat-bubble-received"
                        }`}
                      >
                        {!isMine && (
                          <p className="text-xs font-bold text-[hsl(var(--neo-blue))] mb-1">
                            {msg.sender?.username}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {msg.text}
                        </p>
                        <p
                          className={`text-[10px] mt-1 ${isMine ? "text-gray-600" : "text-gray-400"} text-right`}
                        >
                          {isOptimistic
                            ? "Sending..."
                            : msg.created_at
                              ? format(new Date(msg.created_at), "h:mm a")
                              : ""}
                        </p>
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </>
          )}

          {/* Typing indicator */}
          <AnimatePresence>
            {typingUser && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex justify-start"
              >
                <div className="chat-bubble chat-bubble-received">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {typingUser} is typing
                    </span>
                    <motion.div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.15,
                          }}
                        />
                      ))}
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t-4 border-black bg-white">
          <div className="flex gap-2 items-center">
            <input
              ref={messageInputRef}
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="neo-input flex-1 py-3"
              maxLength={2000}
            />

            <motion.button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSending}
              className="neo-button neo-button-primary p-3 disabled:opacity-40 disabled:cursor-not-allowed"
              whileHover={newMessage.trim() ? { scale: 1.05 } : {}}
              whileTap={newMessage.trim() ? { scale: 0.95 } : {}}
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </motion.button>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════
  //  MAIN LAYOUT
  // ═══════════════════════════════════════════════════
  return (
    <div
      className="h-[calc(100vh-5rem)] md:h-[calc(100vh-5rem)] flex flex-col md:flex-row bg-white border-4 border-black mx-2 md:mx-6 my-2 md:my-4"
      style={{ boxShadow: "8px 8px 0 0 black" }}
    >
      {/* Conversation List — always visible on desktop, toggled on mobile */}
      <div
        className={`${
          showMobileChat ? "hidden md:flex" : "flex"
        } flex-col w-full md:w-[380px] md:border-r-4 md:border-black h-full`}
      >
        {renderConversationList()}
      </div>

      {/* Message Thread — always visible on desktop, toggled on mobile */}
      <div
        className={`${
          showMobileChat ? "flex" : "hidden md:flex"
        } flex-col flex-1 h-full`}
      >
        {renderMessageThread()}
      </div>
    </div>
  );
}
