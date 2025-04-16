import { TicketStatus } from '../models/TicketStatus';
import { TicketPriority } from '../models/TicketPriority';
import { TicketType } from '../models/TicketType';
import { Department } from '../models/Department';
import { pool, query } from '../config/database';

class TicketService {
  /**
   * Get all ticket statuses for an organization
   * @param organizationId Organization ID
   * @returns Array of ticket statuses
   */
  async getStatuses(organizationId: string | null): Promise<TicketStatus[]> {
    try {
      // If organizationId is null, only fetch global statuses
      const queryText = organizationId === null
        ? `SELECT id, name, color, is_default, is_resolved 
           FROM ticket_statuses 
           WHERE organization_id IS NULL
           ORDER BY name`
        : `SELECT id, name, color, is_default, is_resolved 
           FROM ticket_statuses 
           WHERE organization_id = $1 OR organization_id IS NULL
           ORDER BY name`;
      
      const result = await query(
        queryText,
        organizationId === null ? [] : [organizationId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching ticket statuses:', error);
      throw error;
    }
  }

  /**
   * Get all ticket priorities for an organization
   * @param organizationId Organization ID
   * @returns Array of ticket priorities
   */
  async getPriorities(organizationId: string | null): Promise<TicketPriority[]> {
    try {
      // If organizationId is null, only fetch global priorities
      const queryText = organizationId === null
        ? `SELECT id, name, color, sla_hours
           FROM ticket_priorities 
           WHERE organization_id IS NULL
           ORDER BY sla_hours DESC`
        : `SELECT id, name, color, sla_hours
           FROM ticket_priorities 
           WHERE organization_id = $1 OR organization_id IS NULL
           ORDER BY sla_hours DESC`;
      
      const result = await query(
        queryText,
        organizationId === null ? [] : [organizationId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching ticket priorities:', error);
      throw error;
    }
  }

  /**
   * Get all ticket types for an organization
   * @param organizationId Organization ID
   * @returns Array of ticket types
   */
  async getTypes(organizationId: string | null): Promise<TicketType[]> {
    try {
      // If organizationId is null, only fetch global types
      const queryText = organizationId === null
        ? `SELECT id, name, description
           FROM ticket_types
           WHERE organization_id IS NULL
           ORDER BY name`
        : `SELECT id, name, description
           FROM ticket_types
           WHERE organization_id = $1 OR organization_id IS NULL
           ORDER BY name`;
      
      const result = await query(
        queryText,
        organizationId === null ? [] : [organizationId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching ticket types:', error);
      throw error;
    }
  }

  /**
   * Get all departments for an organization
   * @param organizationId Organization ID
   * @returns Array of departments
   */
  async getDepartments(organizationId: string | null): Promise<Department[]> {
    try {
      // If organizationId is null, only fetch global departments
      const queryText = organizationId === null
        ? `SELECT id, name, description
           FROM departments
           WHERE organization_id IS NULL
           ORDER BY name`
        : `SELECT id, name, description
           FROM departments
           WHERE organization_id = $1 OR organization_id IS NULL
           ORDER BY name`;
      
      const result = await query(
        queryText,
        organizationId === null ? [] : [organizationId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw error;
    }
  }

  /**
   * Get default ticket status ID
   * @param organizationId Organization ID
   * @returns Status ID
   */
  async getDefaultStatusId(organizationId: string | null): Promise<string> {
    try {
      // If organizationId is null, only fetch global default status
      const queryText = organizationId === null
        ? `SELECT id FROM ticket_statuses 
           WHERE organization_id IS NULL 
           AND is_default = true 
           LIMIT 1`
        : `SELECT id FROM ticket_statuses 
           WHERE (organization_id = $1 OR organization_id IS NULL) 
           AND is_default = true 
           LIMIT 1`;
      
      const result = await query(
        queryText,
        organizationId === null ? [] : [organizationId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Default ticket status not found');
      }
      
      return result.rows[0].id;
    } catch (error) {
      console.error('Error fetching default ticket status:', error);
      throw error;
    }
  }
}

export default new TicketService();
