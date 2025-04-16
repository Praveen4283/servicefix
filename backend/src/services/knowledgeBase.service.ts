import { KnowledgeBaseArticle, ArticleStatus, ArticleVisibility } from '../models/KnowledgeBase';
import { AppDataSource } from '../config/database';
import { FindManyOptions, FindOneOptions, FindOperator, ILike } from 'typeorm';

const articleRepository = AppDataSource.getRepository(KnowledgeBaseArticle);

class KnowledgeBaseService {
  /**
   * Create a new knowledge base article
   * @param articleData Article data to create
   * @returns Created article
   */
  async createArticle(articleData: Partial<KnowledgeBaseArticle>): Promise<KnowledgeBaseArticle> {
    // Tags are expected as string[] by the model
    const tagsArray = (articleData.tags && Array.isArray(articleData.tags)) ? 
                        articleData.tags.map(tag => String(tag).trim()).filter(tag => tag) : 
                        undefined;

    const newArticleData = {
      ...articleData,
      authorId: typeof articleData.authorId === 'string' ? parseInt(articleData.authorId, 10) : articleData.authorId,
      categoryId: typeof articleData.categoryId === 'string' ? parseInt(articleData.categoryId, 10) : articleData.categoryId,
      tags: tagsArray // Use the processed string array
    };

    const newArticle = articleRepository.create(newArticleData);
    return articleRepository.save(newArticle);
  }
  
  /**
   * Update an existing knowledge base article
   * @param id Article ID
   * @param articleData Article data to update
   * @returns Updated article
   */
  async updateArticle(id: string, articleData: Partial<KnowledgeBaseArticle>): Promise<KnowledgeBaseArticle | null> {
    const articleIdNumber = parseInt(id, 10);
    if (isNaN(articleIdNumber)) {
      throw new Error('Invalid article ID format');
    }

    const article = await articleRepository.findOneBy({ id: articleIdNumber });

    if (!article) {
      return null; // Article not found
    }

    // Process tags if provided in update data
    let tagsToUpdate: string[] | undefined = undefined;
    if (articleData.tags && Array.isArray(articleData.tags)) {
       tagsToUpdate = articleData.tags.map(tag => String(tag).trim()).filter(tag => tag);
    }

    Object.assign(article, {
        ...articleData,
        authorId: articleData.authorId !== undefined ? (typeof articleData.authorId === 'string' ? parseInt(articleData.authorId, 10) : articleData.authorId) : article.authorId,
        categoryId: articleData.categoryId !== undefined ? (typeof articleData.categoryId === 'string' ? parseInt(articleData.categoryId, 10) : articleData.categoryId) : article.categoryId,
        // Only update tags if tagsToUpdate is defined (i.e., tags were in the input)
        tags: tagsToUpdate !== undefined ? tagsToUpdate : article.tags 
    });
    
    article.updatedAt = new Date();

    return articleRepository.save(article);
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
    // Implement actual TypeORM find logic
    return articleRepository.findOne({ 
        where: { id: articleIdNumber },
        relations: ['category', 'tags', 'author'] // Include relations if needed
    });
  }
  
  /**
   * Search articles based on query and filters
   * @param query Search query
   * @param filters Additional filters
   * @returns Matching articles
   */
  async searchArticles(query: string, filters: any): Promise<KnowledgeBaseArticle[]> {
    // Implement actual TypeORM search logic
    const findOptions: FindManyOptions<KnowledgeBaseArticle> = {
      where: [
        { title: ILike(`%${query}%`) },
        { content: ILike(`%${query}%`) },
        // Add more fields to search if needed, e.g., tags
        // { tags: ArrayContains([query]) } // Example if tags is string[] and DB supports array contains
      ],
      relations: ['category', 'author'], // Load necessary relations
      // Add filtering based on 'filters' object if needed
    };

    if (filters?.categoryId) {
        findOptions.where = (findOptions.where as any[]).map(w => ({ ...w, categoryId: parseInt(filters.categoryId, 10) }));
    }
    if (filters?.status) {
        findOptions.where = (findOptions.where as any[]).map(w => ({ ...w, status: filters.status }));
    }
    if (filters?.visibility) {
        findOptions.where = (findOptions.where as any[]).map(w => ({ ...w, visibility: filters.visibility }));
    }
    // Add more filters as needed

    return articleRepository.find(findOptions);
  }
  
  /**
   * Increment article view count
   * @param id Article ID
   * @returns Updated view count
   */
  async incrementViewCount(id: string): Promise<number> {
    // This would use an ORM repository to update the view count
    // For now, we'll mock the implementation
    console.log(`Incrementing view count for article ${id}`);
    return 101; // Mock updated view count
  }
  
  /**
   * Record article feedback
   * @param id Article ID
   * @param isHelpful Whether the article was helpful
   * @returns Success status
   */
  async recordFeedback(id: string, isHelpful: boolean): Promise<boolean> {
    // This would use an ORM repository to update the feedback counts
    // For now, we'll mock the implementation
    console.log(`Recording feedback for article ${id}: ${isHelpful ? 'Helpful' : 'Not Helpful'}`);
    return true;
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
   * Get all articles with filtering and pagination
   */
  async getArticles(
    options: {
      page?: number,
      limit?: number,
      categoryId?: string,
      tag?: string,
      status?: ArticleStatus,
      visibility?: ArticleVisibility,
      query?: string,
    } = {}
  ): Promise<{ articles: KnowledgeBaseArticle[], total: number }> {
    const { page = 1, limit = 10, categoryId, tag, status, visibility, query: searchQuery } = options;
    const skip = (page - 1) * limit;

    const findOptions: FindManyOptions<KnowledgeBaseArticle> = {
        skip: skip,
        take: limit,
        where: {},
        relations: ['category', 'tags', 'author'], // Load relations
        order: { createdAt: 'DESC' } // Default order
    };

    if (categoryId) {
        findOptions.where = { ...findOptions.where, categoryId: parseInt(categoryId, 10) };
    }
    if (status) {
        findOptions.where = { ...findOptions.where, status: status };
    }
    if (visibility) {
        findOptions.where = { ...findOptions.where, visibility: visibility };
    }
    if (tag) {
        // Find articles associated with the tag name/slug
        // This requires a join or subquery depending on your setup
        // Example: findOptions.where = { ...findOptions.where, tags: { name: tag } };
    }
    if (searchQuery) {
        findOptions.where = [
            { ...findOptions.where, title: ILike(`%${searchQuery}%`) },
            { ...findOptions.where, content: ILike(`%${searchQuery}%`) }
        ];
    }

    const [articles, total] = await articleRepository.findAndCount(findOptions);
    return { articles, total };
  }

  /**
   * Get all articles
   * @deprecated Use getArticles with options instead
   */
  async getAllArticles(): Promise<KnowledgeBaseArticle[]> {
    // Replace mock with actual implementation using getArticles
    const { articles } = await this.getArticles(); 
    return articles;
  }
}

export default new KnowledgeBaseService(); 