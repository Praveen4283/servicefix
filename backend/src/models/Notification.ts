import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import type { NotificationMetadata } from '../types/common';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  title: string;

  @Column()
  message: string;

  @Column({ nullable: true })
  link: string;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  @Column()
  type: string; // 'ticket_assigned', 'ticket_updated', 'mention', etc.

  @Column({ type: 'jsonb', nullable: true })
  metadata: NotificationMetadata;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
} 