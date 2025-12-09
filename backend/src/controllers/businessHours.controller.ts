import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { BusinessHours } from '../models/BusinessHours';
import { Holiday } from '../models/Holiday';
import { logger } from '../utils/logger';

/**
 * Get all business hours configurations for an organization
 */
export const getAllBusinessHours = async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;

    const businessHoursRepository = AppDataSource.getRepository(BusinessHours);
    const businessHours = await businessHoursRepository.find({
      where: { organizationId: Number(organizationId) },
      relations: ['holidays'],
      order: { name: 'ASC' }
    });

    return res.json(businessHours);
  } catch (error) {
    logger.error('Error fetching business hours:', error);
    return res.status(500).json({ message: 'Error fetching business hours' });
  }
};

/**
 * Get a specific business hours configuration
 */
export const getBusinessHoursById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const businessHoursRepository = AppDataSource.getRepository(BusinessHours);
    const businessHours = await businessHoursRepository.findOne({
      where: { id: Number(id) },
      relations: ['holidays']
    });

    if (!businessHours) {
      return res.status(404).json({ message: 'Business hours configuration not found' });
    }

    return res.json(businessHours);
  } catch (error) {
    logger.error('Error fetching business hours by ID:', error);
    return res.status(500).json({ message: 'Error fetching business hours' });
  }
};

/**
 * Create a new business hours configuration
 */
export const createBusinessHours = async (req: Request, res: Response) => {
  try {
    const businessHoursRepository = AppDataSource.getRepository(BusinessHours);
    const newBusinessHours = businessHoursRepository.create(req.body);

    // Validate required fields
    if (!req.body.name || !req.body.organizationId || !req.body.timezone) {
      return res.status(400).json({ message: 'Name, organization ID, and timezone are required' });
    }

    const savedBusinessHours = await businessHoursRepository.save(newBusinessHours);
    return res.status(201).json(savedBusinessHours);
  } catch (error) {
    logger.error('Error creating business hours:', error);
    return res.status(500).json({ message: 'Error creating business hours' });
  }
};

/**
 * Update a business hours configuration
 */
export const updateBusinessHours = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const businessHoursRepository = AppDataSource.getRepository(BusinessHours);

    const businessHours = await businessHoursRepository.findOne({
      where: { id: Number(id) }
    });

    if (!businessHours) {
      return res.status(404).json({ message: 'Business hours configuration not found' });
    }

    // Update properties
    Object.assign(businessHours, req.body);

    const updatedBusinessHours = await businessHoursRepository.save(businessHours);
    return res.json(updatedBusinessHours);
  } catch (error) {
    logger.error('Error updating business hours:', error);
    return res.status(500).json({ message: 'Error updating business hours' });
  }
};

/**
 * Delete a business hours configuration
 */
export const deleteBusinessHours = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const businessHoursRepository = AppDataSource.getRepository(BusinessHours);

    const businessHours = await businessHoursRepository.findOne({
      where: { id: Number(id) }
    });

    if (!businessHours) {
      return res.status(404).json({ message: 'Business hours configuration not found' });
    }

    await businessHoursRepository.remove(businessHours);
    return res.status(204).send();
  } catch (error) {
    logger.error('Error deleting business hours:', error);
    return res.status(500).json({ message: 'Error deleting business hours' });
  }
};

/**
 * Get all holidays for a business hours configuration
 */
export const getHolidays = async (req: Request, res: Response) => {
  try {
    const { businessHoursId } = req.params;

    const holidayRepository = AppDataSource.getRepository(Holiday);
    const holidays = await holidayRepository.find({
      where: { businessHoursId: Number(businessHoursId) },
      order: { date: 'ASC' }
    });

    return res.json(holidays);
  } catch (error) {
    logger.error('Error fetching holidays:', error);
    return res.status(500).json({ message: 'Error fetching holidays' });
  }
};

/**
 * Create a new holiday
 */
export const createHoliday = async (req: Request, res: Response) => {
  try {
    const holidayRepository = AppDataSource.getRepository(Holiday);
    const newHoliday = holidayRepository.create(req.body);

    // Validate required fields
    if (!req.body.name || !req.body.date || !req.body.businessHoursId) {
      return res.status(400).json({ message: 'Name, date, and business hours ID are required' });
    }

    const savedHoliday = await holidayRepository.save(newHoliday);
    return res.status(201).json(savedHoliday);
  } catch (error) {
    logger.error('Error creating holiday:', error);
    return res.status(500).json({ message: 'Error creating holiday' });
  }
};

/**
 * Update a holiday
 */
export const updateHoliday = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const holidayRepository = AppDataSource.getRepository(Holiday);

    const holiday = await holidayRepository.findOne({
      where: { id: Number(id) }
    });

    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    // Update properties
    Object.assign(holiday, req.body);

    const updatedHoliday = await holidayRepository.save(holiday);
    return res.json(updatedHoliday);
  } catch (error) {
    logger.error('Error updating holiday:', error);
    return res.status(500).json({ message: 'Error updating holiday' });
  }
};

/**
 * Delete a holiday
 */
export const deleteHoliday = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const holidayRepository = AppDataSource.getRepository(Holiday);

    const holiday = await holidayRepository.findOne({
      where: { id: Number(id) }
    });

    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    await holidayRepository.remove(holiday);
    return res.status(204).send();
  } catch (error) {
    logger.error('Error deleting holiday:', error);
    return res.status(500).json({ message: 'Error deleting holiday' });
  }
}; 