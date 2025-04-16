import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { Ticket } from './Ticket';

@Entity('ticket_attachments')
export class Attachment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'file_name' })
  fileName: string;

  @Column({ name: 'file_size' })
  fileSize: number;

  @Column({ name: 'file_type' })
  fileType: string;

  @Column({ name: 'file_path' })
  filePath: string;

  @Column({ nullable: true, name: 'content_id' })
  contentId: string;

  @ManyToOne(() => Ticket, ticket => ticket.attachments)
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column({ name: 'ticket_id', type: 'bigint' })
  ticketId: number;

  @ManyToOne(() => User, user => user.attachments)
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User;

  @Column({ name: 'uploaded_by', type: 'bigint' })
  uploadedById: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
} 