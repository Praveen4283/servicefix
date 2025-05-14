import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { TicketPriority } from '../models/TicketPriority';
import { logger } from '../utils/logger';

class TicketPriorityController {
  /**
   * Get all ticket priorities for the current organization
   */
  async getAllPriorities(req: Request, res: Response): Promise<void> {
    try {
      const organizationId = req.user?.organizationId;
      
      // Use AppDataSource directly to get repository
      const priorityRepository = AppDataSource.getRepository(TicketPriority);
      
      const priorities = await priorityRepository.find({
        where: organizationId ? { organizationId: Number(organizationId) } : {},
        order: { name: 'ASC' }
      });
      
      res.json({ status: 'success', data: { priorities: priorities } });
    } catch (error) {
      logger.error('Error fetching ticket priorities:', error);
      res.status(500).json({ error: 'Failed to fetch ticket priorities' });
    }
  }
  
  /**
   * Get a ticket priority by ID
   */
  async getPriorityById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      
      if (!id) {
        res.status(400).json({ error: 'Priority ID is required' });
        return;
      }
      
      // Use AppDataSource directly to get repository
      const priorityRepository = AppDataSource.getRepository(TicketPriority);
      const priority = await priorityRepository.findOne({ where: { id } });
      
      if (!priority) {
        res.status(404).json({ error: 'Ticket priority not found' });
        return;
      }
      
      res.json(priority);
    } catch (error) {
      logger.error('Error fetching ticket priority:', error);
      res.status(500).json({ error: 'Failed to fetch ticket priority' });
    }
  }
  
  /**
   * Create a new ticket priority
   */
  async createPriority(req: Request, res: Response): Promise<void> {
    try {
      const { name, color, slaHours } = req.body;
      const organizationId = req.user?.organizationId;
      
      if (!name || !color || !organizationId) {
        res.status(400).json({ error: 'Name, color, and organization ID are required' });
        return;
      }
      
      // Use AppDataSource directly to get repository
      const priorityRepository = AppDataSource.getRepository(TicketPriority);
      
      // Check if a priority with this name already exists for the organization
      const existingPriority = await priorityRepository.findOne({ 
        where: { name, organizationId: Number(organizationId) } 
      });
      
      if (existingPriority) {
        res.status(400).json({ error: 'A priority with this name already exists' });
        return;
      }
      
      // Create and save new priority
      const newPriority = priorityRepository.create({
        name,
        color,
        slaHours: slaHours || 24, // Default to 24 hours
        organizationId: Number(organizationId)
      });
      
      const savedPriority = await priorityRepository.save(newPriority);
      res.status(201).json(savedPriority);
    } catch (error) {
      logger.error('Error creating ticket priority:', error);
      res.status(500).json({ error: 'Failed to create ticket priority' });
    }
  }
  
  /**
   * Update a ticket priority
   */
  async updatePriority(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { name, color, slaHours } = req.body;
      const organizationId = req.user?.organizationId;
      
      if (!id) {
        res.status(400).json({ error: 'Priority ID is required' });
        return;
      }
      
      // Use AppDataSource directly to get repository
      const priorityRepository = AppDataSource.getRepository(TicketPriority);
      
      // Find the priority to update
      const priority = await priorityRepository.findOne({ where: { id } });
      
      if (!priority) {
        res.status(404).json({ error: 'Ticket priority not found' });
        return;
      }
      
      // Check if the priority belongs to the user's organization
      if (priority.organizationId !== Number(organizationId)) {
        res.status(403).json({ error: 'You do not have permission to update this priority' });
        return;
      }
      
      // Update priority fields
      if (name) priority.name = name;
      if (color) priority.color = color;
      if (slaHours !== undefined) priority.slaHours = slaHours;
      
      const updatedPriority = await priorityRepository.save(priority);
      res.json(updatedPriority);
    } catch (error) {
      logger.error('Error updating ticket priority:', error);
      res.status(500).json({ error: 'Failed to update ticket priority' });
    }
  }
  
  /**
   * Delete a ticket priority
   */
  async deletePriority(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const organizationId = req.user?.organizationId;
      
      if (!id) {
        res.status(400).json({ error: 'Priority ID is required' });
        return;
      }
      
      // Use AppDataSource directly to get repository
      const priorityRepository = AppDataSource.getRepository(TicketPriority);
      
      // Find the priority to delete
      const priority = await priorityRepository.findOne({ where: { id } });
      
      if (!priority) {
        res.status(404).json({ error: 'Ticket priority not found' });
        return;
      }
      
      // Check if the priority belongs to the user's organization
      if (priority.organizationId !== Number(organizationId)) {
        res.status(403).json({ error: 'You do not have permission to delete this priority' });
        return;
      }
      
      // Delete the priority
      await priorityRepository.remove(priority);
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting ticket priority:', error);
      res.status(500).json({ error: 'Failed to delete ticket priority' });
    }
  }
}

export default new TicketPriorityController(); 