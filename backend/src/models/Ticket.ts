import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './User';
import { Comment } from './Comment';
import { Attachment } from './Attachment';
import { TicketStatus } from './TicketStatus';
import { TicketPriority } from './TicketPriority';
import { TicketType } from './TicketType';
import { Department } from './Department';
import { Organization } from './Organization';

export enum TicketSource {
  EMAIL = 'email',
  PORTAL = 'portal',
  PHONE = 'phone',
  CHAT = 'chat',
  SOCIAL = 'social'
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  subject: string;

  @Column('text')
  description: string;

  @ManyToOne(() => TicketStatus, (status) => status.tickets, { nullable: false })
  @JoinColumn({ name: 'status_id' })
  status: TicketStatus;

  @Column({ name: 'status_id', type: 'bigint' })
  statusId: number;

  @ManyToOne(() => TicketPriority, (priority) => priority.tickets, { nullable: true })
  @JoinColumn({ name: 'priority_id' })
  priority: TicketPriority;

  @Column({ name: 'priority_id', type: 'bigint', nullable: true })
  priorityId: number;

  @ManyToOne(() => TicketType, (type) => type.tickets, { nullable: true })
  @JoinColumn({ name: 'type_id' })
  type: TicketType;

  @Column({ name: 'type_id', type: 'bigint', nullable: true })
  typeId: number;

  @ManyToOne(() => Department, (department) => department.tickets, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'department_id', type: 'bigint', nullable: true })
  departmentId: number;

  @Column({
    type: 'enum',
    enum: TicketSource,
    default: TicketSource.PORTAL
  })
  source: TicketSource;

  @Column({ nullable: true, name: 'due_date' })
  dueDate: Date;

  @Column({ nullable: true, type: 'decimal', precision: 3, scale: 2, name: 'sentiment_score' })
  sentimentScore: number;

  @Column({ nullable: true, name: 'ai_summary' })
  aiSummary: string;

  @Column({ default: false, name: 'is_spam' })
  isSpam: boolean;

  @ManyToOne(() => User, user => user.assignedTickets, { nullable: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee: User;

  @Column({ name: 'assignee_id', type: 'bigint', nullable: true })
  assigneeId: number;

  @ManyToOne(() => User, user => user.requestedTickets, { nullable: false })
  @JoinColumn({ name: 'requester_id' })
  requester: User;

  @Column({ name: 'requester_id', type: 'bigint' })
  requesterId: number;

  @ManyToOne(() => Organization, organization => organization.tickets, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number;

  @ManyToOne(() => Ticket, ticket => ticket.childTickets, { nullable: true })
  @JoinColumn({ name: 'parent_ticket_id' })
  parentTicket: Ticket;

  @Column({ name: 'parent_ticket_id', type: 'bigint', nullable: true })
  parentTicketId: number;

  @OneToMany(() => Ticket, ticket => ticket.parentTicket)
  childTickets: Ticket[];

  @OneToMany(() => Comment, comment => comment.ticket)
  comments: Comment[];

  @OneToMany(() => Attachment, attachment => attachment.ticket)
  attachments: Attachment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ nullable: true, name: 'resolved_at' })
  resolvedAt: Date;

  @Column({ nullable: true, name: 'closed_at' })
  closedAt: Date;
} 