import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index
} from 'typeorm';
import { User } from './User';
import { Organization } from './Organization';
import { ChatMessage } from './ChatMessage';

@Entity('chatbot_conversations')
export class ChatbotConversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  @Index()
  userId?: number;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL'
  })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'visitor_id', type: 'varchar', length: 255, nullable: true })
  visitorId?: string;

  @Column({ name: 'organization_id', type: 'bigint' })
  @Index()
  organizationId: number;

  @ManyToOne(() => Organization, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @Column({ name: 'ended_at', type: 'timestamp with time zone', nullable: true })
  endedAt?: Date;

  @OneToMany(() => ChatMessage, (message) => message.conversation)
  messages: ChatMessage[];
}
