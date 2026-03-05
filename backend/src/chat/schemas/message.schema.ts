import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
  SYSTEM = 'SYSTEM',       // Auto messages like "Order created", "Dispute opened"
  PRODUCT = 'PRODUCT',     // Product card embed
}

// System message sub-types for enriched display
export enum SystemMessageAction {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_PAID = 'ORDER_PAID',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  ORDER_COMPLETED = 'ORDER_COMPLETED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  DISPUTE_OPENED = 'DISPUTE_OPENED',
  DISPUTE_JOINED = 'DISPUTE_JOINED',
  DISPUTE_RESOLVED = 'DISPUTE_RESOLVED',
  CONVERSATION_COMPLETED = 'CONVERSATION_COMPLETED',
  ADMIN_JOINED = 'ADMIN_JOINED',
  GENERAL = 'GENERAL',
}

export interface Attachment {
  url: string;
  type: string;       // image/jpeg, application/pdf, etc.
  name: string;
  size: number;       // in bytes
  thumbnailUrl?: string;
}

export interface ProductEmbed {
  productId: string;
  title: string;
  price: number;
  image: string;
}

export interface ReadReceipt {
  userId: string;
  readAt: Date;
}

// Reply reference
export interface ReplyTo {
  messageId: string;
  senderId: string;
  senderName: string;
  content: string;      // Truncated preview of original message
  type: MessageType;
}

// Emoji reaction
export interface Reaction {
  emoji: string;        // 👍❤️😂🔥👏
  userId: string;
  userName: string;
  createdAt: Date;
}

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Types.ObjectId;

  @Prop({ required: true })
  senderId: string; // User ID from SQLite

  @Prop({ required: true })
  senderRole: string; // 'BUYER', 'SELLER', 'ADMIN'

  @Prop({ type: String })
  senderName: string; // Cache name for display

  @Prop({ type: String })
  senderAvatar: string; // Cache avatar for display

  @Prop({ default: '' })
  content: string;

  @Prop({ default: MessageType.TEXT, enum: MessageType })
  type: MessageType;

  // System message action for enriched display
  @Prop({ type: String, enum: SystemMessageAction })
  systemAction: SystemMessageAction;

  // Attachments
  @Prop({ type: [Object], default: [] })
  attachments: Attachment[];

  // Product embed
  @Prop({ type: Object })
  productEmbed: ProductEmbed;

  // Reply to another message
  @Prop({ type: Object })
  replyTo: ReplyTo;

  // Emoji reactions
  @Prop({ type: [Object], default: [] })
  reactions: Reaction[];

  // Read status
  @Prop({ type: [Object], default: [] })
  readBy: ReadReceipt[];

  // Admin moderation
  @Prop({ default: false })
  isHidden: boolean;

  @Prop({ type: String })
  hiddenBy: string;

  @Prop({ type: String })
  hiddenReason: string;

  @Prop({ type: Date })
  hiddenAt: Date;

  // Edit history
  @Prop({ default: false })
  isEdited: boolean;

  @Prop({ type: Date })
  editedAt: Date;

  @Prop({ type: String })
  originalContent: string; // Store original content before edit

  // Soft delete
  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: Date })
  deletedAt: Date;

  // Message recall (thu hồi) - sender can recall, admin can still see original
  @Prop({ default: false })
  isRecalled: boolean;

  @Prop({ type: Date })
  recalledAt: Date;

  @Prop({ type: String })
  recalledContent: string; // Store original content for admin viewing

  @Prop({ type: [Object] })
  recalledAttachments: Attachment[]; // Store original attachments for admin viewing

  // Pinned
  @Prop({ default: false })
  isPinned: boolean;

  @Prop({ type: String })
  pinnedBy: string;

  @Prop({ type: Date })
  pinnedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Indexes
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ conversationId: 1, isHidden: 1 });
MessageSchema.index({ conversationId: 1, isPinned: 1 });
MessageSchema.index({ content: 'text' }); // Text search index
