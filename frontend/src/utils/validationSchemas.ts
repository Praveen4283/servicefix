import * as Yup from 'yup';

// Common validation patterns
const PATTERNS = {
  // Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  PHONE: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
  URL: /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/,
};

// Common error messages
export const ERROR_MESSAGES = {
  REQUIRED: 'This field is required',
  EMAIL: 'Please enter a valid email address',
  PASSWORD_MATCH: 'Passwords must match',
  PASSWORD_REQUIREMENTS: 'Password must contain at least 8 characters, including uppercase, lowercase, number and special character',
  PHONE: 'Please enter a valid phone number',
  URL: 'Please enter a valid URL',
  TERMS: 'You must accept the terms and conditions',
  MIN_LENGTH: (field: string, length: number) => `${field} must be at least ${length} characters`,
  MAX_LENGTH: (field: string, length: number) => `${field} cannot exceed ${length} characters`,
  required: (field: string) => `${field} is required`,
  passwordLength: 'Password must be at least 8 characters',
  passwordComplexity: 'Password must contain at least one digit, one lowercase letter, one uppercase letter, and one special character',
  passwordsDontMatch: 'Passwords do not match',
  phone: 'Please enter a valid phone number',
};

// Auth related schemas
export const loginSchema = Yup.object({
  email: Yup.string()
    .email(ERROR_MESSAGES.EMAIL)
    .required(ERROR_MESSAGES.REQUIRED),
  password: Yup.string()
    .required(ERROR_MESSAGES.REQUIRED)
});

export const registerSchema = Yup.object({
  firstName: Yup.string().required(ERROR_MESSAGES.REQUIRED),
  lastName: Yup.string().required(ERROR_MESSAGES.REQUIRED),
  email: Yup.string()
    .email(ERROR_MESSAGES.EMAIL)
    .required(ERROR_MESSAGES.REQUIRED),
  organizationName: Yup.string().required(ERROR_MESSAGES.REQUIRED),
  role: Yup.string().required('Please select an account type'),
  password: Yup.string()
    .min(8, ERROR_MESSAGES.MIN_LENGTH('Password', 8))
    .matches(PATTERNS.PASSWORD, ERROR_MESSAGES.PASSWORD_REQUIREMENTS)
    .required(ERROR_MESSAGES.REQUIRED),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], ERROR_MESSAGES.PASSWORD_MATCH)
    .required(ERROR_MESSAGES.REQUIRED),
  agreeToTerms: Yup.boolean().oneOf([true], ERROR_MESSAGES.TERMS),
});

export const forgotPasswordSchema = Yup.object({
  email: Yup.string()
    .email(ERROR_MESSAGES.EMAIL)
    .required(ERROR_MESSAGES.REQUIRED)
});

export const resetPasswordSchema = Yup.object({
  password: Yup.string()
    .min(8, ERROR_MESSAGES.MIN_LENGTH('Password', 8))
    .matches(PATTERNS.PASSWORD, ERROR_MESSAGES.PASSWORD_REQUIREMENTS)
    .required(ERROR_MESSAGES.REQUIRED),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], ERROR_MESSAGES.PASSWORD_MATCH)
    .required(ERROR_MESSAGES.REQUIRED)
});

// User profile schema
export const profileSchema = Yup.object().shape({
  firstName: Yup.string()
    .required(ERROR_MESSAGES.required('First name')),
  lastName: Yup.string()
    .required(ERROR_MESSAGES.required('Last name')),
  phoneNumber: Yup.string()
    .matches(/^\+?[\d\s()-]{10,15}$/, { // Basic phone validation
      message: ERROR_MESSAGES.phone,
      excludeEmptyString: true,
    })
    .nullable(),
  jobTitle: Yup.string().nullable(),
  timezone: Yup.string().nullable(),
  language: Yup.string().nullable(),
  // Email is usually not editable in profile
});

// Ticket related schemas
export const createTicketSchema = Yup.object({
  subject: Yup.string()
    .required(ERROR_MESSAGES.REQUIRED)
    .max(100, ERROR_MESSAGES.MAX_LENGTH('Subject', 100)),
  description: Yup.string()
    .required(ERROR_MESSAGES.REQUIRED)
    .min(10, ERROR_MESSAGES.MIN_LENGTH('Description', 10)),
  departmentId: Yup.string().required(ERROR_MESSAGES.REQUIRED),
  typeId: Yup.string().required(ERROR_MESSAGES.REQUIRED),
  priorityId: Yup.string().required(ERROR_MESSAGES.REQUIRED),
  assigneeId: Yup.string().nullable(),
  dueDate: Yup.date().nullable(),
  tags: Yup.array().of(Yup.string())
});

// Settings related schemas
export const generalSettingsSchema = Yup.object({
  companyName: Yup.string().required(ERROR_MESSAGES.REQUIRED),
  siteUrl: Yup.string()
    .matches(PATTERNS.URL, ERROR_MESSAGES.URL)
    .required(ERROR_MESSAGES.REQUIRED),
  adminEmail: Yup.string()
    .email(ERROR_MESSAGES.EMAIL)
    .required(ERROR_MESSAGES.REQUIRED),
  timezone: Yup.string().required(ERROR_MESSAGES.REQUIRED),
  dateFormat: Yup.string().required(ERROR_MESSAGES.REQUIRED),
  timeFormat: Yup.string().required(ERROR_MESSAGES.REQUIRED)
});

export const emailSettingsSchema = Yup.object({
  smtpServer: Yup.string().required(ERROR_MESSAGES.REQUIRED),
  smtpPort: Yup.number().required(ERROR_MESSAGES.REQUIRED),
  smtpUsername: Yup.string().required(ERROR_MESSAGES.REQUIRED),
  smtpPassword: Yup.string().required(ERROR_MESSAGES.REQUIRED),
  emailFromName: Yup.string().required(ERROR_MESSAGES.REQUIRED),
  emailFromAddress: Yup.string()
    .email(ERROR_MESSAGES.EMAIL)
    .required(ERROR_MESSAGES.REQUIRED)
});

export const ticketSettingsSchema = Yup.object({
  allowCustomerCreation: Yup.boolean(),
  autoAssignTickets: Yup.boolean(),
  defaultDueTime: Yup.number().min(1, 'Must be at least 1 hour').required(ERROR_MESSAGES.REQUIRED),
  defaultPriorityId: Yup.string().required(ERROR_MESSAGES.REQUIRED),
  defaultDepartmentId: Yup.string().required(ERROR_MESSAGES.REQUIRED),
  requireApproval: Yup.boolean()
});

// Change Password Schema
export const changePasswordSchema = Yup.object().shape({
  currentPassword: Yup.string()
    .required(ERROR_MESSAGES.required('Current password')),
  newPassword: Yup.string()
    .min(8, ERROR_MESSAGES.passwordLength)
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/, ERROR_MESSAGES.passwordComplexity)
    .required(ERROR_MESSAGES.required('New password'))
    .notOneOf([Yup.ref('currentPassword'), undefined], 'New password must be different from current password'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword'), undefined], ERROR_MESSAGES.passwordsDontMatch) // Use correct message key
    .required(ERROR_MESSAGES.required('Confirm new password')),
}); 