import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './User';
import { Comment } from './Comment';
import { Attachment } from './Attachment';
import { TicketStatus } from './TicketStatus';
import { TicketPriority } from './TicketPriority';
import { TicketType } from './TicketType';
import { Department } from './Department';
import { Organization } from './Organization';
import { SLAPolicyTicket } from './SLAPolicyTicket';

// Frontend format type for API responses
export interface TicketFrontendFormat {
  id: string;
  subject: string;
  description: string;
  status: { id: string; name: string; color: string; isDefault: boolean; isResolved: boolean } | null;
  priority: { id: string; name: string; color: string; slaHours: number } | null;
  department: { id: string; name: string; description: string } | null;
  type: { id: string; name: string; description: string } | null;
  requester: { id: string; email: string; firstName: string; lastName: string; avatar: string | null } | null;
  assignee: { id: string; email: string; firstName: string; lastName: string; avatar: string | null } | null;
  organization: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  resolvedAt?: string;
  closedAt?: string;
  slaStatus: string | null;
  sentimentScore: number | null;
  aiSummary: string | null;
  source: string;
  isSpam: boolean;
}

export enum TicketSource {
  EMAIL = 'email',
  PORTAL = 'portal',
  PHONE = 'phone',
  CHAT = 'chat',
  SOCIAL = 'social'
}

export enum SLAStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  BREACHED = 'breached',
  COMPLETED = 'completed',
  INACTIVE = 'inactive'
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
    type: 'varchar',
    default: TicketSource.PORTAL
  })
  source: string;

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

  @OneToMany(() => SLAPolicyTicket, slaPolicyTicket => slaPolicyTicket.ticket)
  slaPolicyTickets: SLAPolicyTicket[];

  @Column({ nullable: true, name: 'sla_status', length: 50 })
  slaStatus: string;

  @Column({ name: 'first_response_sla_breached', default: false })
  firstResponseSlaBreached: boolean;

  @Column({ name: 'resolution_sla_breached', default: false })
  resolutionSlaBreached: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ nullable: true, name: 'resolved_at' })
  resolvedAt: Date;

  @Column({ nullable: true, name: 'closed_at' })
  closedAt: Date;

  // Helper method to convert to frontend format
  toFrontendFormat(): TicketFrontendFormat {
    return {
      id: String(this.id),
      subject: this.subject,
      description: this.description,
      status: this.status ? {
        id: String(this.status.id),
        name: this.status.name,
        color: this.status.color,
        isDefault: this.status.isDefault,
        isResolved: this.status.isResolved
      } : null,
      priority: this.priority ? {
        id: String(this.priority.id),
        name: this.priority.name,
        color: this.priority.color,
        slaHours: this.priority.slaHours
      } : null,
      department: this.department ? {
        id: String(this.department.id),
        name: this.department.name,
        description: this.department.description
      } : null,
      type: this.type ? {
        id: String(this.type.id),
        name: this.type.name,
        description: this.type.description
      } : null,
      requester: this.requester ? {
        id: String(this.requester.id),
        email: this.requester.email,
        firstName: this.requester.firstName,
        lastName: this.requester.lastName,
        avatar: this.requester.avatarUrl
      } : null,
      assignee: this.assignee ? {
        id: String(this.assignee.id),
        email: this.assignee.email,
        firstName: this.assignee.firstName,
        lastName: this.assignee.lastName,
        avatar: this.assignee.avatarUrl
      } : null,
      organization: this.organization ? {
        id: String(this.organization.id),
        name: this.organization.name
      } : null,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      dueDate: this.dueDate?.toISOString(),
      resolvedAt: this.resolvedAt?.toISOString(),
      closedAt: this.closedAt?.toISOString(),
      slaStatus: this.slaStatus,
      sentimentScore: this.sentimentScore,
      aiSummary: this.aiSummary,
      source: this.source,
      isSpam: this.isSpam
    };
  }
} 