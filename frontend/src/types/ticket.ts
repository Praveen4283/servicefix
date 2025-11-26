export interface User {
  id: string; // Consistently use string for IDs
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

export interface TicketStatus {
  id: string;
  name: string;
  color: string;
  isDefault?: boolean;
  isResolved?: boolean;
}

export interface TicketPriority {
  id: string;
  name: string;
  color: string;
  slaHours?: number;
}

export interface TicketDepartment {
  id: string;
  name: string;
  description?: string;
}

export interface TicketType {
  id: string;
  name: string;
  description?: string;
}

export interface TicketTag {
  id: string;
  name: string;
  color: string;
}

export interface TicketComment {
  id: string;
  content: string;
  createdAt: string;
  isInternal: boolean;
  isSystem?: boolean;
  user: User;
}

export interface TicketAttachment {
  id: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  uploadedBy?: User;
  createdAt: string;
}

export interface SLAPolicy {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  ticketPriorityId: string;
  firstResponseHours: number;
  nextResponseHours?: number;
  resolutionHours: number;
  businessHoursOnly: boolean;
}

export interface SLAPolicyTicket {
  id: string;
  ticketId: string;
  slaPolicyId: string;
  firstResponseDueAt: string;
  nextResponseDueAt?: string;
  resolutionDueAt: string;
  firstResponseMet?: boolean;
  nextResponseMet?: boolean;
  resolutionMet?: boolean;
  slaPolicy?: SLAPolicy;
  metadata?: any; // For pause/resume data
}

export interface Ticket {
  id: string;
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
  attachments?: TicketAttachment[];
  slaStatus?: string;
  slaInfo?: SLAPolicyTicket;
  organization?: {
    id: string;
    name: string;
  };
  resolvedAt?: string;
  closedAt?: string;
  sentimentScore?: number;
  aiSummary?: string;
  source?: string;
  isSpam?: boolean;
}

export enum TicketAction {
  ASSIGN = 'assign',
  CHANGE_STATUS = 'change_status',
  CHANGE_PRIORITY = 'change_priority',
  ADD_COMMENT = 'add_comment',
  ADD_TAG = 'add_tag',
  REMOVE_TAG = 'remove_tag'
} 