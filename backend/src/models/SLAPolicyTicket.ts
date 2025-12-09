import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Ticket } from './Ticket';
import { SLAPolicy } from './SLAPolicy';
import type { SLAMetadata } from '../types/common';

@Entity('sla_policy_tickets')
export class SLAPolicyTicket {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Ticket, ticket => ticket.slaPolicyTickets, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column({ name: 'ticket_id', type: 'bigint' })
  ticketId: number;

  @ManyToOne(() => SLAPolicy, slaPolicy => slaPolicy.slaTickets, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sla_policy_id' })
  slaPolicy: SLAPolicy;

  @Column({ name: 'sla_policy_id', type: 'bigint' })
  slaPolicyId: number;

  @Column({ name: 'first_response_due_at', type: 'timestamp with time zone', nullable: true })
  firstResponseDueAt: Date;

  @Column({ name: 'next_response_due_at', type: 'timestamp with time zone', nullable: true })
  nextResponseDueAt: Date;

  @Column({ name: 'resolution_due_at', type: 'timestamp with time zone', nullable: true })
  resolutionDueAt: Date;

  @Column({ name: 'first_response_met', type: 'boolean', nullable: true })
  firstResponseMet?: boolean;

  @Column({ name: 'next_response_met', type: 'boolean', nullable: true })
  nextResponseMet?: boolean;

  @Column({ name: 'resolution_met', type: 'boolean', nullable: true })
  resolutionMet?: boolean;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata?: SLAMetadata;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 