import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from './User';
import { Ticket } from './Ticket';
import { TicketStatus } from './TicketStatus';
import { TicketPriority } from './TicketPriority';
import { TicketType } from './TicketType';
import { Department } from './Department';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ nullable: true, length: 255 })
  domain: string;

  @Column({ nullable: true, length: 255, name: 'logo_url' })
  logoUrl: string;

  @OneToMany(() => User, user => user.organization)
  users: User[];

  @OneToMany(() => Ticket, ticket => ticket.organization)
  tickets: Ticket[];

  @OneToMany(() => TicketStatus, status => status.organization)
  ticketStatuses: TicketStatus[];

  @OneToMany(() => TicketPriority, priority => priority.organization)
  ticketPriorities: TicketPriority[];

  @OneToMany(() => TicketType, type => type.organization)
  ticketTypes: TicketType[];

  @OneToMany(() => Department, department => department.organization)
  departments: Department[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 