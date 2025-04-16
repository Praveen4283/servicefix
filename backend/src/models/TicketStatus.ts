import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Ticket } from './Ticket';
import { Organization } from './Organization';

@Entity('ticket_statuses')
export class TicketStatus {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 7 })
  color: string;

  @Column({ default: false, name: 'is_default' })
  isDefault: boolean;

  @Column({ default: false, name: 'is_resolved' })
  isResolved: boolean;

  @ManyToOne(() => Organization, organization => organization.ticketStatuses, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number;

  @OneToMany(() => Ticket, ticket => ticket.status)
  tickets: Ticket[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 