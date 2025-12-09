import { KnowledgeBaseArticle, KnowledgeBaseCategory } from '../models/KnowledgeBase';
import { AppDataSource } from '../config/database';
import { FindManyOptions, FindOneOptions, FindOperator, ILike, Like, In } from 'typeorm';
import { query, pool } from '../config/database';

const articleRepository = AppDataSource.getRepository(KnowledgeBaseArticle);
const categoryRepository = AppDataSource.getRepository(KnowledgeBaseCategory);

class KnowledgeBaseService {
  /**
   * Create a new knowledge base article
   * @param articleData Article data to create
   * @returns Created article
   */
  async createArticle(articleData: Partial<KnowledgeBaseArticle> & { tags?: number[] }): Promise<KnowledgeBaseArticle> {
    const newArticleData = {
      ...articleData,
      authorId: typeof articleData.authorId === 'string' ? parseInt(articleData.authorId, 10) : articleData.authorId,
      categoryId: typeof articleData.categoryId === 'string' ? parseInt(articleData.categoryId, 10) : articleData.categoryId,
      slug: articleData.slug || this.generateSlug(articleData.title as string)
    };

    const newArticle = articleRepository.create(newArticleData);
    const savedArticle = await articleRepository.save(newArticle);

    // Handle tag associations using direct SQL if tags are provided
    if (articleData.tags && Array.isArray(articleData.tags) && articleData.tags.length > 0) {
      for (const tagId of articleData.tags) {
        await pool.query(
          'INSERT INTO kb_article_tags (article_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [savedArticle.id, tagId]
        );
      }
    }

    return savedArticle;
  }

  /**
   * Update an existing knowledge base article
   * @param id Article ID
   * @param articleData Article data to update
   * @returns Updated article
   */
  async updateArticle(id: string, articleData: Partial<KnowledgeBaseArticle> & { tags?: number[] }): Promise<KnowledgeBaseArticle | null> {
    const articleIdNumber = parseInt(id, 10);
    if (isNaN(articleIdNumber)) {
      throw new Error('Invalid article ID format');
    }

    const article = await articleRepository.findOneBy({ id: articleIdNumber });

    if (!article) {
      return null; // Article not found
    }

    // If title changed, update slug too unless slug is explicitly set
    if (articleData.title && articleData.title !== article.title && !articleData.slug) {
      articleData.slug = this.generateSlug(articleData.title);
    }

    Object.assign(article, {
      ...articleData,
      authorId: articleData.authorId !== undefined ? (typeof articleData.authorId === 'string' ? parseInt(articleData.authorId, 10) : articleData.authorId) : article.authorId,
      categoryId: articleData.categoryId !== undefined ? (typeof articleData.categoryId === 'string' ? parseInt(articleData.categoryId, 10) : articleData.categoryId) : article.categoryId,
    });

    article.updatedAt = new Date();
    const savedArticle = await articleRepository.save(article);

    // Handle tag associations using direct SQL if tags are provided
    if (articleData.tags && Array.isArray(articleData.tags)) {
      // First remove all existing tags
      await pool.query('DELETE FROM kb_article_tags WHERE article_id = $1', [article.id]);

      // Then add new tags
      for (const tagId of articleData.tags) {
        await pool.query(
          'INSERT INTO kb_article_tags (article_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [article.id, tagId]
        );
      }
    }

    return savedArticle;
  }

  /**
   * Get an article by ID
   * @param id Article ID
   * @returns Article if found, null otherwise
   */
  async getArticleById(id: string): Promise<KnowledgeBaseArticle | null> {
    const articleIdNumber = parseInt(id, 10);
    if (isNaN(articleIdNumber)) {
      throw new Error('Invalid article ID format');
    }

    const article = await articleRepository.findOne({
      where: { id: articleIdNumber },
      relations: ['category', 'author'] // Include relations
    });

    if (article) {
      // Get tags for this article
      const tagsResult = await pool.query(
        `SELECT t.id, t.name, t.color 
         FROM tags t 
         JOIN kb_article_tags kat ON t.id = kat.tag_id 
         WHERE kat.article_id = $1`,
        [article.id]
      );

      // Attach tags to the article object
      article.tags = tagsResult.rows;
    }

    return article;
  }

  /**
   * Search articles based on query and filters with pagination
   * @param options Search options and filters
   * @returns Matching articles with pagination info
   */
  async getArticles(
    options: {
      page?: number,
      limit?: number,
      categoryId?: string,
      tagId?: string,
      status?: string,
      visibility?: string,
      organizationId?: number,
      query?: string,
      includeCount?: boolean,
    } = {}
  ): Promise<{ articles: KnowledgeBaseArticle[], total: number }> {
    const {
      page = 1,
      limit = 10,
      categoryId,
      tagId,
      status,
      visibility,
      organizationId,
      query: searchQuery,
      includeCount = true
    } = options;

    const skip = (page - 1) * limit;

    // Build SQL query with filters
    let sqlQuery = `
      SELECT 
        a.*,
        u.first_name as author_first_name,
        u.last_name as author_last_name,
        c.name as category_name
        ${includeCount ? ', COUNT(*) OVER() as full_count' : ''}
      FROM kb_articles a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN kb_categories c ON a.category_id = c.id
    `;

    const whereConditions: string[] = [];
    const queryParams: (string | number)[] = [];
    let paramCount = 1;

    if (organizationId) {
      whereConditions.push(`a.organization_id = $${paramCount++}`);
      queryParams.push(organizationId);
    }

    if (categoryId) {
      whereConditions.push(`a.category_id = $${paramCount++}`);
      queryParams.push(parseInt(categoryId, 10));
    }

    if (status) {
      whereConditions.push(`a.status = $${paramCount++}`);
      queryParams.push(status);
    }

    if (visibility) {
      whereConditions.push(`a.visibility = $${paramCount++}`);
      queryParams.push(visibility);
    }

    if (tagId) {
      // Join with kb_article_tags to filter by tag
      sqlQuery += `
        JOIN kb_article_tags kat ON a.id = kat.article_id 
        AND kat.tag_id = $${paramCount++}
      `;
      queryParams.push(parseInt(tagId, 10));
    }

    if (searchQuery) {
      const searchCondition = `(a.title ILIKE $${paramCount} OR a.content ILIKE $${paramCount} OR a.excerpt ILIKE $${paramCount})`;
      whereConditions.push(searchCondition);
      queryParams.push(`%${searchQuery}%`);
      paramCount++;
    }

    if (whereConditions.length > 0) {
      sqlQuery += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Add order and limits
    sqlQuery += `
      ORDER BY a.created_at DESC
    `;

    // Only add limit and offset if pagination is requested
    if (limit > 0) {
      sqlQuery += `LIMIT $${paramCount++} OFFSET $${paramCount++}`;
      queryParams.push(limit, skip);
    }

    // Execute query
    const result = await pool.query(sqlQuery, queryParams);
    const articles = result.rows;
    const total = articles.length > 0 && includeCount ? parseInt(articles[0].full_count, 10) : articles.length;

    // Format articles with proper structure
    const formattedArticles = articles.map((row: {
      id: number;
      title: string;
      content: string;
      excerpt: string;
      slug: string;
      author_id: number;
      category_id: number;
      view_count: number;
      is_published: boolean;
      created_at: Date;
      updated_at: Date;
      author_first_name?: string;
      author_last_name?: string;
      category_name?: string;
      full_count?: string;
    }) => {
      const article = new KnowledgeBaseArticle();
      // Map database columns to article properties
      Object.entries(row).forEach(([key, value]) => {
        if (key !== 'full_count' && key !== 'author_first_name' && key !== 'author_last_name' && key !== 'category_name') {
          (article as any)[key] = value;
        }
      });

      // Add author info
      if (row.author_id) {
        article.author = {
          id: row.author_id,
          firstName: row.author_first_name,
          lastName: row.author_last_name
        } as any;
      }

      // Add category info if available
      if (row.category_id) {
        article.category = {
          id: row.category_id,
          name: row.category_name
        } as any;
      }

      return article;
    });

    // For each article, get its tags
    if (formattedArticles.length > 0) {
      const articleIds = formattedArticles.map((a: KnowledgeBaseArticle) => a.id);
      const tagsQuery = `
        SELECT kat.article_id, t.id, t.name, t.color
        FROM kb_article_tags kat
        JOIN tags t ON kat.tag_id = t.id
        WHERE kat.article_id = ANY($1)
      `;

      const tagsResult = await pool.query(tagsQuery, [articleIds]);

      // Group tags by article_id
      const tagsByArticleId: Record<number, any[]> = {};
      tagsResult.rows.forEach((row: { article_id: number; id: number; name: string; color: string }) => {
        if (!tagsByArticleId[row.article_id]) {
          tagsByArticleId[row.article_id] = [];
        }
        tagsByArticleId[row.article_id].push({
          id: row.id,
          name: row.name,
          color: row.color
        });
      });

      // Assign tags to each article
      formattedArticles.forEach((article: KnowledgeBaseArticle) => {
        article.tags = tagsByArticleId[article.id] || [];
      });
    }

    return { articles: formattedArticles, total };
  }



  /**
   * Increment article view count
   * @param id Article ID
   * @returns Updated view count
   */
  async incrementViewCount(id: string): Promise<number> {
    const articleIdNumber = parseInt(id, 10);
    if (isNaN(articleIdNumber)) {
      throw new Error('Invalid article ID format');
    }

    const result = await pool.query(
      'UPDATE kb_articles SET view_count = view_count + 1 WHERE id = $1 RETURNING view_count',
      [articleIdNumber]
    );

    return result.rows[0]?.view_count || 0;
  }

  /**
   * Record article feedback
   * @param id Article ID
   * @param isHelpful Whether the article was helpful
   * @returns Success status
   */
  async recordFeedback(id: string, isHelpful: boolean): Promise<boolean> {
    const articleIdNumber = parseInt(id, 10);
    if (isNaN(articleIdNumber)) {
      throw new Error('Invalid article ID format');
    }

    const columnToUpdate = isHelpful ? 'helpful_count' : 'not_helpful_count';

    const result = await pool.query(
      `UPDATE kb_articles SET ${columnToUpdate} = ${columnToUpdate} + 1 WHERE id = $1 RETURNING id`,
      [articleIdNumber]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Generate URL-friendly slug from title
   * @param title Article title
   * @returns URL-friendly slug
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Get all categories
   * @returns List of all categories
   */
  async getCategories(organizationId: number): Promise<KnowledgeBaseCategory[]> {
    return categoryRepository.find({
      where: { organizationId },
      order: { name: 'ASC' }
    });
  }

  /**
   * Create a new category
   * @param categoryData Category data
   * @returns Created category
   */
  async createCategory(categoryData: Partial<KnowledgeBaseCategory>): Promise<KnowledgeBaseCategory> {
    // Generate slug if not provided
    if (!categoryData.slug && categoryData.name) {
      categoryData.slug = this.generateSlug(categoryData.name);
    }

    const newCategory = categoryRepository.create(categoryData);
    return categoryRepository.save(newCategory);
  }
}

export default new KnowledgeBaseService(); 