import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Ticket } from './Ticket';
import { Organization } from './Organization';
import { DepartmentMember } from './DepartmentMember';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @ManyToOne(() => Organization, organization => organization.departments, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number;

  @OneToMany(() => Ticket, ticket => ticket.department)
  tickets: Ticket[];

  @OneToMany(() => DepartmentMember, member => member.department)
  members: DepartmentMember[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 