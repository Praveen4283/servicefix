import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { ChatbotConversation } from './ChatbotConversation';
import { User } from './User';

export type SenderType = 'user' | 'bot' | 'agent';

@Entity('chatbot_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'conversation_id', type: 'bigint' })
  @Index()
  conversationId: number;

  @ManyToOne(() => ChatbotConversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: ChatbotConversation;

  @Column({ name: 'sender_type', type: 'varchar', length: 50 })
  senderType: SenderType;

  @Column({ name: 'sender_id', type: 'bigint', nullable: true })
  @Index()
  senderId?: number;

  // Optional relation if you want to link messages directly to a user (e.g., agent messages)
  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL'
  })
  @JoinColumn({ name: 'sender_id' })
  sender?: User;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
