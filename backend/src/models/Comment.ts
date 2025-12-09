import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { Ticket } from './Ticket';

// Frontend format type for API responses
export interface CommentFrontendFormat {
  id: string;
  content: string;
  isInternal: boolean;
  isSystem: boolean;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    email: string;
  };
}

@Entity('ticket_comments')
export class Comment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('text')
  content!: string;

  @Column({ default: false, name: 'is_internal' })
  isInternal!: boolean;

  @Column({ default: false, name: 'is_system' })
  isSystem!: boolean;

  @ManyToOne(() => User, user => user.comments)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: number;

  @ManyToOne(() => Ticket, ticket => ticket.comments)
  @JoinColumn({ name: 'ticket_id' })
  ticket!: Ticket;

  @Column({ name: 'ticket_id', type: 'bigint' })
  ticketId!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Helper method to convert to frontend format
  toFrontendFormat(): CommentFrontendFormat {
    return {
      id: String(this.id),
      content: this.content,
      isInternal: this.isInternal,
      isSystem: this.isSystem,
      createdAt: this.createdAt.toISOString(),
      user: this.user ? {
        id: String(this.user.id),
        firstName: this.user.firstName || '',
        lastName: this.user.lastName || '',
        avatar: this.user.avatarUrl,
        email: this.user.email
      } : {
        id: '0',
        firstName: 'System',
        lastName: '',
        avatar: null,
        email: 'system@example.com'
      }
    };
  }
} 