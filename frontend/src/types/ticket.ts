export interface User {
  id: number | string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

export interface TicketStatus {
  id: number | string;
  name: string;
  color: string;
}

export interface TicketPriority {
  id: number | string;
  name: string;
  color: string;
}

export interface TicketDepartment {
  id: number | string;
  name: string;
}

export interface TicketType {
  id: number | string;
  name: string;
}

export interface TicketTag {
  id: number | string;
  name: string;
  color: string;
}

export interface TicketComment {
  id: number | string;
  content: string;
  createdAt: string;
  isInternal: boolean;
  user: User;
}

export interface SLAPolicy {
  id: number | string;
  name: string;
  description?: string;
  organizationId: number;
  ticketPriorityId: number;
  firstResponseHours: number;
  nextResponseHours?: number;
  resolutionHours: number;
  businessHoursOnly: boolean;
}

export interface SLAPolicyTicket {
  id: number | string;
  ticketId: number;
  slaPolicyId: number;
  firstResponseDueAt: string;
  nextResponseDueAt?: string;
  resolutionDueAt: string;
  firstResponseMet?: boolean;
  nextResponseMet?: boolean;
  resolutionMet?: boolean;
  slaPolicy?: SLAPolicy;
}

export interface Ticket {
  id: number | string;
  subject: string;
  description?: string;
  status: TicketStatus;
  priority: TicketPriority;
  department?: TicketDepartment;
  type?: TicketType;
  requester: User;
  assignee?: User;
  createdAt: string;
  updatedAt: string;
  lastActivity?: string;
  dueDate?: string;
  tags?: TicketTag[];
  comments?: TicketComment[];
  slaStatus?: string;
  slaInfo?: SLAPolicyTicket;
}

export enum TicketAction {
  ASSIGN = 'assign',
  CHANGE_STATUS = 'change_status',
  CHANGE_PRIORITY = 'change_priority',
  ADD_COMMENT = 'add_comment',
  ADD_TAG = 'add_tag',
  REMOVE_TAG = 'remove_tag'
} 