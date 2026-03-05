import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserStatusDocument = UserStatus & Document;

@Schema({ timestamps: true })
export class UserStatus {
  @Prop({ required: true, unique: true })
  userId: string; // User ID from SQLite

  @Prop({ default: false })
  isOnline: boolean;

  @Prop({ type: Date })
  lastSeen: Date;

  @Prop({ type: [String], default: [] })
  activeConversations: string[]; // Currently viewing conversations

  @Prop({ type: String })
  currentlyTypingIn: string; // Conversation ID where user is typing

  @Prop({ type: String })
  socketId: string; // Current socket connection ID

  // Push notification settings
  @Prop({ default: true })
  pushEnabled: boolean;

  @Prop({ type: [String], default: [] })
  pushTokens: string[]; // FCM/Web push tokens

  @Prop({ default: true })
  emailNotifications: boolean;

  @Prop({ default: true })
  soundEnabled: boolean;
}

export const UserStatusSchema = SchemaFactory.createForClass(UserStatus);

// Indexes (userId already has unique index from @Prop({ unique: true }), do not duplicate)
UserStatusSchema.index({ isOnline: 1 });
UserStatusSchema.index({ socketId: 1 });
