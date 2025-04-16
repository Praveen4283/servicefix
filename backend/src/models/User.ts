import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, OneToOne, JoinColumn } from 'typeorm';
import { Ticket } from './Ticket';
import { Comment } from './Comment';
import { Organization } from './Organization';
import { Attachment } from './Attachment';
import { KnowledgeBaseArticle } from './KnowledgeBase';
import { DepartmentMember } from './DepartmentMember';

export enum UserRole {
  ADMIN = 'admin',
  AGENT = 'agent',
  CUSTOMER = 'customer'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER
  })
  role: UserRole;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ManyToOne(() => Organization, organization => organization.users, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id', type: 'bigint', nullable: true })
  organizationId: number;

  @Column({ name: 'designation', nullable: true })
  jobTitle: string;

  @Column({ name: 'phone', nullable: true })
  phoneNumber: string;

  @Column({ name: 'timezone', nullable: true, default: 'UTC' })
  timezone: string;

  @Column({ name: 'language', nullable: true, default: 'en' })
  language: string;

  @Column({ name: 'last_login_at', nullable: true })
  lastLoginAt: Date;

  @OneToMany(() => Ticket, ticket => ticket.assignee)
  assignedTickets: Ticket[];

  @OneToMany(() => Ticket, ticket => ticket.requester)
  requestedTickets: Ticket[];

  @OneToMany(() => Comment, comment => comment.user)
  comments: Comment[];

  @OneToMany(() => Attachment, attachment => attachment.uploadedBy)
  attachments: Attachment[];

  @OneToMany(() => KnowledgeBaseArticle, article => article.author)
  knowledgeBaseArticles: KnowledgeBaseArticle[];

  @OneToOne(() => DepartmentMember, (departmentMember: DepartmentMember) => departmentMember.user)
  departmentMember: DepartmentMember;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 