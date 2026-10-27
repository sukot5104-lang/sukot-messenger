export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarColor: string;
  isVerified: boolean;
  isAdmin: boolean;
  lastSeen: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  clientId?: string;
  status?: "pending" | "sent" | "failed";
}

export interface ConvOther {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  isVerified: boolean;
  online: boolean;
  lastSeen: string;
  deleted: boolean;
}

export interface ConversationItem {
  conversationId: string;
  lastMessageAt: string;
  unread: number;
  lastMessage: { id: string; senderId: string; content: string; createdAt: string } | null;
  other: ConvOther | null;
  otherLastReadAt: string | null;
  otherLastDeliveredAt: string | null;
}

export interface SearchResult {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  isVerified: boolean;
  lastSeen: string;
  online: boolean;
}

export interface PresenceEvent {
  userId: string;
  online: boolean;
  lastSeen: string | null;
}

export interface MessageStatusEvent {
  conversationId: string;
  userId: string;
  kind: "delivered" | "read";
  at: string;
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}
