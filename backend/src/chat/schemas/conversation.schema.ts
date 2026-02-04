import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

export enum ConversationType {
  BUYER_SELLER = 'BUYER_SELLER',
  BUYER_ADMIN = 'BUYER_ADMIN',
  SELLER_ADMIN = 'SELLER_ADMIN',
}

export enum ConversationStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  ARCHIVED = 'ARCHIVED',
  DISPUTED = 'DISPUTED', // Khi có tranh chấp cần admin can thiệp
}

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ required: true, enum: ConversationType })
  type: ConversationType;

  // Participants (store user IDs from SQLite)
  @Prop({ type: String })
  buyerId: string;

  @Prop({ type: String })
  sellerId: string;

  @Prop({ type: String })
  adminId: string; // Admin được assign khi có dispute

  // Related entities
  @Prop({ type: String })
  productId: string;

  @Prop({ type: String })
  orderId: string;

  // Conversation metadata
  @Prop({ default: ConversationStatus.ACTIVE, enum: ConversationStatus })
  status: ConversationStatus;

  @Prop({ type: String })
  subject: string; // Tiêu đề conversation

  @Prop({ type: Date })
  lastMessageAt: Date;

  @Prop({ type: String })
  lastMessagePreview: string; // Preview của tin nhắn cuối

  // Unread counts
  @Prop({ default: 0 })
  buyerUnreadCount: number;

  @Prop({ default: 0 })
  sellerUnreadCount: number;

  @Prop({ default: 0 })
  adminUnreadCount: number;

  // Dispute info
  @Prop({ type: String })
  disputeReason: string;

  @Prop({ type: Date })
  disputedAt: Date;

  @Prop({ type: Date })
  resolvedAt: Date;

  @Prop({ type: String })
  resolution: string; // Kết quả giải quyết dispute

  // Completion confirmation (both parties must confirm after resolution)
  @Prop({ default: false })
  buyerCompleted: boolean;

  @Prop({ default: false })
  sellerCompleted: boolean;

  @Prop({ type: Date })
  completedAt: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Indexes for faster queries
ConversationSchema.index({ buyerId: 1, status: 1 });
ConversationSchema.index({ sellerId: 1, status: 1 });
ConversationSchema.index({ adminId: 1, status: 1 });
ConversationSchema.index({ orderId: 1 });
ConversationSchema.index({ productId: 1 });
ConversationSchema.index({ lastMessageAt: -1 });
ConversationSchema.index({ status: 1, type: 1 });
