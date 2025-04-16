import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

export enum ArticleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export enum ArticleVisibility {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  RESTRICTED = 'restricted'
}

@Entity('kb_articles')
export class KnowledgeBaseArticle {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column('text')
  content!: string;

  @Column({ nullable: true })
  slug!: string;

  @Column({
    type: 'enum',
    enum: ArticleStatus,
    default: ArticleStatus.DRAFT
  })
  status!: ArticleStatus;

  @Column({
    type: 'enum',
    enum: ArticleVisibility,
    default: ArticleVisibility.INTERNAL
  })
  visibility!: ArticleVisibility;

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({ nullable: true })
  category?: string;

  @Column({ default: 0, name: 'view_count' })
  viewCount!: number;

  @Column({ default: 0, name: 'helpful_count' })
  helpfulCount!: number;

  @Column({ default: 0, name: 'not_helpful_count' })
  notHelpfulCount!: number;

  @ManyToOne(() => User, user => user.knowledgeBaseArticles)
  @JoinColumn({ name: 'author_id' })
  author!: User;

  @Column({ name: 'author_id', type: 'bigint' })
  authorId!: number;

  @Column({ name: 'organization_id', type: 'bigint' })
  organizationId!: number;
  
  @Column({ name: 'category_id', type: 'bigint', nullable: true })
  categoryId?: number;
  
  @Column({ type: 'text', nullable: true })
  excerpt?: string;
  
  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured?: boolean;
  
  @Column({ name: 'ai_summary', type: 'text', nullable: true })
  aiSummary?: string;
  
  @Column({ name: 'published_at', type: 'timestamp with time zone', nullable: true })
  publishedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
} 