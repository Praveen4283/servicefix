import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { User } from './User';
import { Organization } from './Organization';

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

@Entity('kb_categories')
export class KnowledgeBaseCategory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column()
  slug!: string;

  @Column({ nullable: true, name: 'parent_id', type: 'bigint' })
  parentId?: number;

  @ManyToOne(() => KnowledgeBaseCategory, category => category.childCategories, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parentCategory?: KnowledgeBaseCategory;

  @OneToMany(() => KnowledgeBaseCategory, category => category.parentCategory)
  childCategories!: KnowledgeBaseCategory[];

  @Column({ nullable: true, length: 50 })
  icon?: string;

  @ManyToOne(() => Organization, { nullable: false })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @Column({ name: 'organization_id', type: 'bigint' })
  organizationId!: number;

  @Column({ name: 'is_private', default: false })
  isPrivate!: boolean;

  @OneToMany(() => KnowledgeBaseArticle, article => article.category)
  articles!: KnowledgeBaseArticle[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

@Entity('kb_articles')
export class KnowledgeBaseArticle {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column('text')
  content!: string;

  @Column()
  slug!: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: ArticleStatus.DRAFT
  })
  status!: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: ArticleVisibility.PUBLIC
  })
  visibility!: string;

  @Column('text', { nullable: true })
  excerpt?: string;

  @ManyToOne(() => KnowledgeBaseCategory, category => category.articles, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category?: KnowledgeBaseCategory;

  @Column({ name: 'category_id', type: 'bigint', nullable: true })
  categoryId?: number;

  @ManyToOne(() => User, user => user.knowledgeBaseArticles)
  @JoinColumn({ name: 'author_id' })
  author!: User;

  @Column({ name: 'author_id', type: 'bigint' })
  authorId!: number;

  @ManyToOne(() => Organization, { nullable: false })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @Column({ name: 'organization_id', type: 'bigint' })
  organizationId!: number;
  
  @Column({ default: 0, name: 'view_count' })
  viewCount!: number;

  @Column({ default: 0, name: 'helpful_count' })
  helpfulCount!: number;

  @Column({ default: 0, name: 'not_helpful_count' })
  notHelpfulCount!: number;
  
  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured?: boolean;
  
  @Column({ name: 'ai_summary', type: 'text', nullable: true })
  aiSummary?: string;

  @Column({ name: 'ai_search_vector', type: 'tsvector', nullable: true })
  aiSearchVector?: string;

  @Column({ name: 'meta_title', nullable: true })
  metaTitle?: string;

  @Column({ name: 'meta_description', type: 'text', nullable: true })
  metaDescription?: string;
  
  @Column({ name: 'published_at', type: 'timestamp with time zone', nullable: true })
  publishedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
  
  // Virtual property for tags - not stored in this table but populated from kb_article_tags
  tags?: any[];
} 