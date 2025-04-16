import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Ticket } from './Ticket';
import { Organization } from './Organization';

@Entity('ticket_priorities')
export class TicketPriority {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 7 })
  color: string;

  @Column({ nullable: true, name: 'sla_hours' })
  slaHours: number;

  @ManyToOne(() => Organization, organization => organization.ticketPriorities, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number;

  @OneToMany(() => Ticket, ticket => ticket.priority)
  tickets: Ticket[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 