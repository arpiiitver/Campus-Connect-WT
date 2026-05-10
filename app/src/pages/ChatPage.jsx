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
  Paperclip,
  Trash2,
  Edit2,
  X,
  MoreVertical,
} from "lucide-react";
import { 
  apiGetMyRooms, 
  apiGetRoomMessages, 
  apiSendMessage,
  apiUploadChatMedia,
  apiEditMessage,
  apiDeleteMessage,
  apiDeleteChat,
  SERVER_URL
} from "@/lib/api";
import {
  connectSocket,
  disconnectSocket,
  joinRoom,
  leaveRoom,
  emitStopTyping,
  onNewMessage,
  onUserTyping,
  onUserStoppedTyping,
  onMessageEdited,
  onMessageDeleted,
  onChatDeleted,
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

  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [activeMessageOptions, setActiveMessageOptions] = useState(null);

  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

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

    const unsubEdited = onMessageEdited((msg) => {
      if (msg.sender_id !== userId) {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)));
      }
    });

    const unsubDeleted = onMessageDeleted((data) => {
      setMessages((prev) => prev.map((m) => {
        if (m.id === data.id) {
          return { ...m, is_deleted: true, media_url: null, media_type: null, text: "" };
        }
        return m;
      }));
    });

    const unsubChatDeleted = onChatDeleted((data) => {
      if (data.room_id === activeRoomId) {
        toast.error("This conversation was deleted.");
        handleBackToList();
        fetchRooms();
      } else {
        fetchRooms();
      }
    });

    return () => {
      unsubMessage();
      unsubTyping();
      unsubStopTyping();
      unsubEdited();
      unsubDeleted();
      unsubChatDeleted();
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
    if ((!newMessage.trim() && !mediaFile) || !activeRoomId || isSending) return;

    if (editingMessageId) {
      // Handle Edit Action
      setIsSending(true);
      try {
        const res = await apiEditMessage(activeRoomId, editingMessageId, newMessage.trim());
        setMessages((prev) => prev.map((m) => (m.id === editingMessageId ? { ...m, ...res } : m)));
        setEditingMessageId(null);
        setNewMessage("");
        toast.success("Message edited successfully.");
      } catch(e) { 
        toast.error("Failed to edit message."); 
      } finally { 
        setIsSending(false); 
      }
      return;
    }

    const messageText = newMessage.trim();
    const currentMedia = mediaFile;
    const currentPreview = mediaPreview;

    setNewMessage("");
    clearMedia();
    setIsSending(true);
    emitStopTyping(activeRoomId);

    // Optimistic message
    const tempId = `optimistic-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      room_id: activeRoomId,
      sender_id: userId,
      text: messageText,
      media_url: currentPreview?.url,
      media_type: currentPreview?.type,
      created_at: new Date().toISOString(),
      sender: { username: user.username, avatar_url: user.avatar_url },
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    updateRoomSidebar(optimisticMsg);

    try {
      let uploadedMediaUrl = null;
      let uploadedMediaType = currentPreview?.type || null;

      if (currentMedia) {
        const res = await apiUploadChatMedia(activeRoomId, currentMedia);
        uploadedMediaUrl = res.url;
      }

      const savedMsg = await apiSendMessage(activeRoomId, messageText, uploadedMediaUrl, uploadedMediaType);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...savedMsg } : m)));
    } catch (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error(error.message || "Failed to send message");
    } finally {
      setIsSending(false);
      messageInputRef.current?.focus();
    }
  }, [
    newMessage, mediaFile, activeRoomId, isSending, userId, user.username, user.avatar_url, editingMessageId, mediaPreview
  ]);

  const handleMediaSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File is too large (max 25MB).");
      return;
    }
    setMediaFile(file);
    const url = URL.createObjectURL(file);
    setMediaPreview({ url, type: file.type.startsWith('video/') ? 'video' : 'image' });
  };
  
  const clearMedia = () => {
    setMediaFile(null);
    if (mediaPreview) URL.revokeObjectURL(mediaPreview.url);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      await apiDeleteMessage(activeRoomId, msgId);
      setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, is_deleted: true, text: "", media_url: null, media_type: null, is_edited: false } : m));
      toast.success("Message deleted");
    } catch (error) {
      toast.error("Failed to delete message");
    }
    setActiveMessageOptions(null);
  };

  const handleDeleteChat = async () => {
    if (!window.confirm("Are you sure you want to delete this chat completely? This action is permanent and applies to both you and the other user.")) return;
    try {
      await apiDeleteChat(activeRoomId);
      toast.success("Chat deleted successfully");
      handleBackToList();
      fetchRooms();
    } catch (e) {
      toast.error("Failed to delete chat");
    }
  };

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
      <div className="p-4 border-b-4 border-[hsl(var(--neo-border))]" style={{ background: "hsl(var(--neo-surface))" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <motion.button
              onClick={onBack}
              className="p-2 rounded-lg md:hidden"
              style={{ color: "hsl(var(--neo-text))" }}
              whileHover={{ scale: 1.1, background: "hsl(var(--neo-surface-raised))" }}
              whileTap={{ scale: 0.9 }}
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <h2 className="text-2xl font-bold">Messages</h2>
          </div>
          <div className="flex items-center gap-1 text-xs" style={{ color: "hsl(var(--neo-text-muted))" }}>
            <Lock className="w-3 h-3" />
            <span>Encrypted</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(var(--neo-text-muted))" }} />
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
              className="w-20 h-20 bg-[hsl(var(--neo-yellow))] rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-[hsl(var(--neo-border))]"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <MessageCircle className="w-10 h-10" />
            </motion.div>
            <h3 className="text-xl font-bold mb-2">
              {rooms.length === 0 ? "No conversations yet" : "No results"}
            </h3>
            <p style={{ color: "hsl(var(--neo-text-muted))" }} className="text-sm">
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
                  className={`flex items-center gap-3 p-4 cursor-pointer border-b-2 transition-colors ${
                    isActive
                      ? "bg-[hsl(var(--neo-yellow))] text-black"
                      : ""
                  }`}
                  style={{
                    borderColor: "hsl(var(--neo-border))",
                    ...(!isActive ? { background: "hsl(var(--neo-surface))" } : {}),
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-[hsl(var(--neo-blue))] rounded-full flex items-center justify-center border-3 border-[hsl(var(--neo-border))] flex-shrink-0">
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
                      <span className="text-xs flex-shrink-0 ml-2" style={{ color: "hsl(var(--neo-text-muted))" }}>
                        {formatRoomTime(
                          room.last_message?.created_at || room.last_message_at,
                        )}
                      </span>
                    </div>

                    {/* Listing tag */}
                    <p className="text-xs truncate mb-0.5 flex items-center gap-1" style={{ color: "hsl(var(--neo-text-muted))" }}>
                      <ShoppingBag className="w-3 h-3 flex-shrink-0" />
                      {room.listing?.title || "Unknown listing"}
                    </p>

                    {/* Last message preview */}
                    <p className="text-xs truncate" style={{ color: "hsl(var(--neo-text-muted))" }}>
                      {room.last_message
                        ? (room.last_message.sender_id?.toString() === userId
                            ? "You: "
                            : "") + (room.last_message.is_deleted ? "🚫 Message deleted" : (room.last_message.media_url ? "📷 Media" : room.last_message.text))
                        : "No messages yet"}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 flex-shrink-0 md:hidden" style={{ color: "hsl(var(--neo-text-muted))" }} />
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
            className="w-24 h-24 rounded-full flex items-center justify-center mb-4 border-4" 
            style={{ background: "hsl(var(--neo-surface-raised))", borderColor: "hsl(var(--neo-border))" }}
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <MessageCircle className="w-12 h-12" style={{ color: "hsl(var(--neo-text-muted))" }} />
          </motion.div>
          <h3 className="text-xl font-bold mb-2" style={{ color: "hsl(var(--neo-text-muted))" }}>
            Select a conversation
          </h3>
          <p className="text-sm" style={{ color: "hsl(var(--neo-text-muted))" }}>
            Choose a conversation from the list to start messaging
          </p>
        </div>
      );
    }

    const other = getOtherUser(activeRoom);

    return (
      <div className="flex flex-col h-full">
        {/* Chat Header */}
        <div className="p-4 border-b-4 border-[hsl(var(--neo-border))] flex items-center gap-3" style={{ background: "hsl(var(--neo-surface))" }}>
          <motion.button
            onClick={handleBackToList}
            className="p-2 rounded-lg md:hidden"
            style={{ color: "hsl(var(--neo-text))" }}
            whileHover={{ scale: 1.1, background: "hsl(var(--neo-surface-raised))" }}
            whileTap={{ scale: 0.9 }}
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>

          <div className="w-10 h-10 bg-[hsl(var(--neo-blue))] rounded-full flex items-center justify-center border-3 border-[hsl(var(--neo-border))] flex-shrink-0">
            <span className="font-bold text-white">
              {other.username[0]?.toUpperCase()}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold truncate">{other.username}</p>
            <p className="text-xs truncate flex items-center gap-1" style={{ color: "hsl(var(--neo-text-muted))" }}>
              <ShoppingBag className="w-3 h-3" />
              {activeRoom.listing?.title} · ₹{activeRoom.listing?.price}
            </p>
          </div>

          <div className="flex items-center gap-1 text-xs px-2 py-1 bg-[hsl(var(--neo-green))] text-white border-2 border-[hsl(var(--neo-border))] hidden sm:flex">
            <Lock className="w-3 h-3" />
            <span className="font-bold">E2E</span>
          </div>

          <button 
            onClick={handleDeleteChat} 
            className="p-2 ml-2 hover:bg-red-100 text-red-600 rounded-lg border-2 border-transparent hover:border-red-600 transition-colors" 
            title="Delete Conversation"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Listing Context Bar */}
        {activeRoom.listing && (
          <div className="px-4 py-2 border-b-2 border-[hsl(var(--neo-border))] flex items-center gap-3 text-sm" style={{ background: "hsl(var(--neo-surface-raised))" }}>
            {activeRoom.listing.image_url ? (
              <img
                src={activeRoom.listing.image_url}
                alt=""
                className="w-10 h-10 object-cover border-2 border-[hsl(var(--neo-border))] flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 border-2 border-[hsl(var(--neo-border))] flex items-center justify-center flex-shrink-0" style={{ background: "hsl(var(--neo-surface-raised))" }}>
                <ShoppingBag className="w-5 h-5" style={{ color: "hsl(var(--neo-text-muted))" }} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">{activeRoom.listing.title}</p>
              <p className="text-xs" style={{ color: "hsl(var(--neo-text-muted))" }}>
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
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: "hsl(var(--neo-overlay))" }}>
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
              <div className="w-16 h-16 bg-[hsl(var(--neo-yellow))] rounded-full flex items-center justify-center mx-auto mb-4 border-3 border-[hsl(var(--neo-border))] text-black">
                <Lock className="w-8 h-8" />
              </div>
              <p className="text-sm mb-1" style={{ color: "hsl(var(--neo-text-muted))" }}>
                Messages are end-to-end encrypted
              </p>
              <p className="text-xs" style={{ color: "hsl(var(--neo-text-muted))" }}>
                Say hi to start the conversation!
              </p>
            </div>
          ) : (
            <>
              {/* Encryption notice */}
              <div className="text-center mb-4">
                <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full" style={{ color: "hsl(var(--neo-text-muted))", background: "hsl(var(--neo-surface))", border: "1px solid hsl(var(--neo-border))" }}>
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
                        <span className="text-xs px-3 py-1 rounded-full" style={{ color: "hsl(var(--neo-text-muted))", background: "hsl(var(--neo-surface))", border: "1px solid hsl(var(--neo-border))" }}>
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
                      <div className={`chat-bubble ${isMine ? "chat-bubble-sent" : "chat-bubble-received"} relative group max-w-[85%]`}>
                        
                        {/* Options Menu Toggle */}
                        {isMine && !msg.is_deleted && !isOptimistic && (
                           <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setActiveMessageOptions(activeMessageOptions === msg.id ? null : msg.id)} className="p-1" style={{ color: "hsl(var(--neo-text-muted))" }}>
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              {activeMessageOptions === msg.id && (
                                <div className="absolute right-0 top-6 border-2 border-[hsl(var(--neo-border))] shadow-[2px_2px_0px_hsla(var(--neo-shadow-color),0.5)] rounded z-10 w-24" style={{ background: "hsl(var(--neo-surface))" }}>
                                  <button onClick={() => { setEditingMessageId(msg.id); setNewMessage(msg.text); setActiveMessageOptions(null); messageInputRef.current?.focus(); }} className="w-full text-left px-3 py-1.5 text-sm border-b-2 border-[hsl(var(--neo-border))] flex items-center gap-2" style={{ color: "hsl(var(--neo-text))" }}><Edit2 className="w-3 h-3"/> Edit</button>
                                  <button onClick={() => handleDeleteMessage(msg.id)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-red-100 text-red-600 flex items-center gap-2"><Trash2 className="w-3 h-3"/> Delete</button>
                                </div>
                              )}
                           </div>
                        )}

                        {!isMine && (
                          <p className="text-xs font-bold text-[hsl(var(--neo-blue))] mb-1">
                            {msg.sender?.username}
                          </p>
                        )}
                        
                        {msg.is_deleted ? (
                           <p className="text-sm italic flex items-center gap-1" style={{ color: "hsl(var(--neo-text-muted))" }}>
                             <Lock className="w-3 h-3" /> This message was deleted
                           </p>
                        ) : (
                          <>
                            {msg.media_url && (
                               <div className="mb-2 border-2 border-[hsl(var(--neo-border))] rounded overflow-hidden mt-1">
                                 {msg.media_type === 'video' ? (
                                    <video src={msg.media_url.startsWith('blob:') ? msg.media_url : `${SERVER_URL}${msg.media_url}`} controls className="max-w-full h-auto max-h-60" />
                                 ) : (
                                    <img src={msg.media_url.startsWith('blob:') ? msg.media_url : `${SERVER_URL}${msg.media_url}`} alt="Attached media" className="max-w-full h-auto max-h-60 object-contain bg-black/5" />
                                 )}
                               </div>
                            )}
                            {msg.text && (
                              <p className="text-sm whitespace-pre-wrap break-words pr-4">
                                {msg.text}
                              </p>
                            )}
                          </>
                        )}

                        <p className="text-[10px] mt-1 text-right" style={{ color: "hsl(var(--neo-text-muted))" }}>
                          {msg.is_edited && <span className="italic mr-1">(edited)</span>}
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
                    <span className="text-xs" style={{ color: "hsl(var(--neo-text-muted))" }}>
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
        <div className="p-4 border-t-4 border-[hsl(var(--neo-border))] flex flex-col gap-2 relative" style={{ background: "hsl(var(--neo-surface))" }}>
          
          {editingMessageId && (
            <div className="flex items-center justify-between bg-blue-50 border-2 border-[hsl(var(--neo-blue))] p-2 rounded text-sm text-[hsl(var(--neo-blue))]">
               <span className="flex items-center gap-2">
                 <Edit2 className="w-4 h-4"/> Editing message {messages.find(m => m.id === editingMessageId)?.text?.substring(0, 30)}...
               </span>
               <button onClick={() => { setEditingMessageId(null); setNewMessage(""); }} className="hover:bg-blue-100 p-1 rounded"><X className="w-4 h-4" /></button>
            </div>
          )}

          {mediaPreview && (
            <div className="relative inline-block w-24 h-24 border-2 border-[hsl(var(--neo-border))] rounded shadow-[2px_2px_0px_hsla(var(--neo-shadow-color),0.5)]">
              {mediaPreview.type === 'video' ? (
                 <video src={mediaPreview.url} className="w-full h-full object-cover" />
              ) : (
                 <img src={mediaPreview.url} alt="Preview" className="w-full h-full object-cover" />
              )}
              <button 
                onClick={clearMedia} 
                title="Remove Media"
                className="absolute -top-2 -right-2 bg-red-500 text-white border-2 border-[hsl(var(--neo-border))] w-6 h-6 flex items-center justify-center rounded-full shadow-[2px_2px_0px_hsla(var(--neo-shadow-color),0.5)] hover:bg-red-600 z-10"
              >
                 <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex gap-2 items-center">
            {!editingMessageId && (
              <>
                <input type="file" accept="image/*,video/*" className="hidden" ref={fileInputRef} onChange={handleMediaSelect} />
                <motion.button
                  onClick={() => fileInputRef.current?.click()}
                  className="neo-button p-3 bg-gray-100 hover:bg-gray-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Attach Photo or Video"
                >
                  <Paperclip className="w-5 h-5" style={{ color: "hsl(var(--neo-text-muted))" }} />
                </motion.button>
              </>
            )}

            <input
              ref={messageInputRef}
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={editingMessageId ? "Edit your message..." : "Type a message..."}
              className="neo-input flex-1 py-3"
              maxLength={2000}
            />

            <motion.button
              onClick={handleSendMessage}
              disabled={(!newMessage.trim() && !mediaFile) || isSending}
              className="neo-button neo-button-primary p-3 disabled:opacity-40 disabled:cursor-not-allowed"
              whileHover={(newMessage.trim() || mediaFile) ? { scale: 1.05 } : {}}
              whileTap={(newMessage.trim() || mediaFile) ? { scale: 0.95 } : {}}
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
      className="h-[calc(100vh-5rem)] md:h-[calc(100vh-5rem)] flex flex-col md:flex-row border-4 border-[hsl(var(--neo-border))] mx-2 md:mx-6 my-2 md:my-4 transition-colors duration-300"
      style={{ boxShadow: "8px 8px 0 0 hsla(var(--neo-shadow-color), 0.5)", background: "hsl(var(--neo-surface))" }}
    >
      {/* Conversation List — always visible on desktop, toggled on mobile */}
      <div
        className={`${
          showMobileChat ? "hidden md:flex" : "flex"
        } flex-col w-full md:w-[380px] md:border-r-4 md:border-[hsl(var(--neo-border))] h-full`}
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
