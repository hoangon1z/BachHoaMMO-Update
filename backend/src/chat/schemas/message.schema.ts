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

  // Attachments
  @Prop({ type: [Object], default: [] })
  attachments: Attachment[];

  // Product embed
  @Prop({ type: Object })
  productEmbed: ProductEmbed;

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

  // Soft delete
  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: Date })
  deletedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Indexes
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ conversationId: 1, isHidden: 1 });
MessageSchema.index({ content: 'text' }); // Text search index
