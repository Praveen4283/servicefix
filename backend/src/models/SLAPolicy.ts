import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Organization } from './Organization';
import { SLAPolicyTicket } from './SLAPolicyTicket';
import { TicketPriority } from './TicketPriority';

@Entity('sla_policies')
export class SLAPolicy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @ManyToOne(() => Organization, organization => organization.slaPolicies, { nullable: false })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id', type: 'bigint' })
  organizationId: number;

  @ManyToOne(() => TicketPriority, priority => priority.slaPolicies, { nullable: false })
  @JoinColumn({ name: 'ticket_priority_id' })
  ticketPriority: TicketPriority;

  @Column({ name: 'ticket_priority_id', type: 'bigint' })
  ticketPriorityId: number;

  @Column({ name: 'first_response_hours', type: 'int' })
  firstResponseHours: number;

  @Column({ name: 'next_response_hours', type: 'int', nullable: true })
  nextResponseHours: number;

  @Column({ name: 'resolution_hours', type: 'int' })
  resolutionHours: number;

  @Column({ name: 'business_hours_only', type: 'boolean', default: true })
  businessHoursOnly: boolean;

  @OneToMany(() => SLAPolicyTicket, slaTicket => slaTicket.slaPolicy)
  slaTickets: SLAPolicyTicket[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 