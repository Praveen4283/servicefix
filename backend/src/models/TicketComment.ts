import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User';
import { Ticket } from './Ticket';

@Entity('ticket_comments')
export class TicketComment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column('text')
  content: string;

  @Column({ type: 'boolean', name: 'is_internal', default: false })
  isInternal: boolean;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Ticket, ticket => ticket.comments, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}