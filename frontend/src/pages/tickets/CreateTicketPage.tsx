import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  FormHelperText,
  CircularProgress,
  Autocomplete,
  Tooltip,
  IconButton,
  Card,
  CardContent,
  Stack,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
  Divider,
  List,
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
  AutoAwesome as AutoAwesomeIcon,
  Lightbulb as LightbulbIcon,
  Send as SendIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useTickets } from '../../context/TicketContext';
import { alpha } from '@mui/material/styles';
import { SystemAlert } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/apiClient';

// Available tags for ticket categorization - KEEP THIS
const availableTags = [
  'hardware',
  'software',
  'network',
  'email',
  'printer',
  'security',
  'access',
  'mobile',
  'desktop',
  'authentication',
  'vpn',
  'database',
  'application',
  'server',
  'microsoft365',
  'windows',
  'mac',
  'linux',
  'password',
  'wifi',
];

// File size limit (10MB)
const FILE_SIZE_LIMIT = 10 * 1024 * 1024;
// Accepted file types
const ACCEPTED_FILE_TYPES = [
  'image/jpeg', 
  'image/png', 
  'image/gif', 
  'application/pdf', 
  'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/zip'
];

const users = [
  { id: '1', name: 'John Smith', email: 'john.smith@example.com' },
  { id: '2', name: 'Sarah Johnson', email: 'sarah.j@example.com' },
  { id: '3', name: 'Michael Davis', email: 'michael.d@example.com' },
  { id: '4', name: 'Emily Wilson', email: 'emily.w@example.com' },
  { id: '5', name: 'David Garcia', email: 'david.g@example.com' },
];

const CreateTicketPage: React.FC = () => {
  const navigate = useNavigate();
  const { createTicket, departments, ticketTypes, priorities, isLoading, error } = useTickets();
  const { user } = useAuth();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<{
    subject: string;
    tags: string[];
    priority: string;
    type: string;
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  
  const steps = ['Ticket Details', 'Additional Information & Submit'];

  const handleNext = () => {
    if (activeStep === 0) {
      setActiveStep(1);
    }
  };

  const handleBack = () => {
    if (activeStep === 1) {
      setActiveStep(0);
    }
  };

  const formik = useFormik({
    initialValues: {
      subject: '',
      description: '',
      departmentId: '',
      typeId: '',
      priorityId: '', // Initialize as empty, will be set by useEffect
      assigneeId: '',
      tags: [] as string[],
    },
    validationSchema: Yup.object({
      subject: Yup.string().required('Subject is required').max(100, 'Subject cannot exceed 100 characters'),
      description: Yup.string().required('Description is required').min(10, 'Description should be at least 10 characters'),
      departmentId: Yup.string().required('Department is required'),
      typeId: Yup.string().required('Type is required'),
      priorityId: Yup.string().required('Priority is required'),
    }),
    onSubmit: async (values) => {
      if (!user) {
        setSubmitError('Authentication error: User not found. Please log in again.');
        return;
      }
      
      try {
        setSubmitError(null);
        console.log('Formik values on submit:', values);

        // Create FormData object
        const formData = new FormData();

        // Append ticket data fields
        formData.append('subject', values.subject);
        formData.append('description', values.description);
        formData.append('requesterId', user.id.toString()); // Ensure ID is string
        if (values.departmentId) formData.append('departmentId', values.departmentId);
        if (values.typeId) formData.append('typeId', values.typeId);
        if (values.priorityId) formData.append('priorityId', values.priorityId);
        if (values.assigneeId) formData.append('assigneeId', values.assigneeId);
        // Append tags as a JSON string (backend will parse)
        if (selectedTags.length > 0) {
          formData.append('tags', JSON.stringify(selectedTags)); 
        }
        // Append other fields like dueDate if they exist
        // if (values.dueDate) formData.append('dueDate', values.dueDate.toISOString());

        // Append files
        files.forEach((file) => {
          formData.append('attachments', file, file.name); // Use 'attachments' as the field name
        });
        
        console.log('FormData prepared:', formData); // Cannot directly log FormData contents easily

        // Use the TicketContext createTicket function, assuming it's adapted for FormData
        // OR call apiClient directly if createTicket isn't designed for FormData
        // const newTicket = await createTicket(formData); 
        
        // --- Direct API Call Example (if createTicket context function isn't ready for FormData) ---
        // You might need to adjust your apiClient setup if it doesn't automatically handle FormData
        const response = await apiClient.post('/tickets', formData, {
          headers: {
            // Content-Type is typically set automatically by the browser/axios when using FormData
            // 'Content-Type': 'multipart/form-data', 
          }
        });
        const newTicket = response; // Assuming API returns ticket data
        // --- End Direct API Call Example ---
        
        if (newTicket) {
          navigate('/tickets', {
            state: { createSuccess: true, message: 'Ticket created successfully!' }
          });
        } else {
          console.warn('Ticket created, but no new ticket data received. Navigating to list.');
          navigate('/tickets', { 
            state: { createSuccess: true, message: 'Ticket created (check list).' } 
          });
        }
      } catch (error) {
        console.error('Error creating ticket:', error);
        setSubmitError('Failed to create ticket. Please try again.');
      }
    },
  });

  // Set default priority when priorities data is loaded
  useEffect(() => {
    console.log('Priorities loaded:', priorities); // Log priorities data
    if (priorities && priorities.length > 0 && !formik.values.priorityId) {
      const mediumPriority = priorities.find(p => p.name.toLowerCase() === 'medium');
      const defaultPriorityId = mediumPriority ? mediumPriority.id : priorities[0].id;
      console.log('Default priority ID set to:', defaultPriorityId); // Log determined default ID
      if (defaultPriorityId) {
        formik.setFieldValue('priorityId', defaultPriorityId);
      }
    }
    // We only want this to run when priorities load, or if priorityId hasn't been set yet.
    // Adding formik.values.priorityId dependency prevents resetting if user changes priority before effect runs.
  }, [priorities, formik.setFieldValue, formik.values.priorityId]);

  // Analyze the description with AI to suggest fields
  const analyzeWithAI = () => {
    if (!formik.values.description || formik.values.description.length < 10) {
      return;
    }

    setIsAnalyzing(true);
    
    // Simulating AI analysis - in a real app, this would be an API call
    setTimeout(() => {
      const description = formik.values.description.toLowerCase();
      
      let suggestedType = '';
      let suggestedPriority = '2'; // Medium by default
      let suggestedTags: string[] = [];
      
      // Simple keyword matching for demonstration
      if (description.includes('printer') || description.includes('scanner')) {
        suggestedType = '1'; // Hardware
        suggestedTags.push('printer', 'hardware');
      } else if (description.includes('software') || description.includes('application') || description.includes('app')) {
        suggestedType = '2'; // Software
        suggestedTags.push('software', 'application');
      } else if (description.includes('wifi') || description.includes('internet') || description.includes('connection')) {
        suggestedType = '3'; // Network
        suggestedTags.push('network', 'wifi');
      } else if (description.includes('security') || description.includes('access') || description.includes('password')) {
        suggestedType = '4'; // Security
        suggestedTags.push('security', 'access');
      }
      
      // Priority suggestion based on keywords
      if (
        description.includes('urgent') || 
        description.includes('critical') || 
        description.includes('emergency') ||
        description.includes('asap')
      ) {
        suggestedPriority = '4'; // Urgent
      } else if (
        description.includes('important') || 
        description.includes('high priority') ||
        description.includes('serious')
      ) {
        suggestedPriority = '3'; // High
      } else if (
        description.includes('when possible') || 
        description.includes('low priority') ||
        description.includes('minor')
      ) {
        suggestedPriority = '1'; // Low
      }
      
      // Generate a better subject line if the current one is generic
      let suggestedSubject = formik.values.subject;
      if (!formik.values.subject || formik.values.subject.length < 10) {
        // Extract the first sentence or first 50 chars
        const firstSentence = description.split('.')[0];
        suggestedSubject = firstSentence.length > 50 
          ? firstSentence.substring(0, 50) + '...'
          : firstSentence;
        
        // Capitalize first letter
        suggestedSubject = suggestedSubject.charAt(0).toUpperCase() + suggestedSubject.slice(1);
      }
      
      setAiSuggestions({
        subject: suggestedSubject,
        tags: suggestedTags,
        priority: suggestedPriority,
        type: suggestedType
      });
      
      setIsAnalyzing(false);
    }, 1500);
  };

  // Apply AI suggestions to form
  const applyAiSuggestions = () => {
    if (!aiSuggestions) return;
    
    if (aiSuggestions.subject && (!formik.values.subject || formik.values.subject.length < 10)) {
      formik.setFieldValue('subject', aiSuggestions.subject);
    }
    
    if (aiSuggestions.type) {
      formik.setFieldValue('typeId', aiSuggestions.type);
    }
    
    if (aiSuggestions.priority) {
      formik.setFieldValue('priorityId', aiSuggestions.priority);
    }
    
    if (aiSuggestions.tags.length > 0) {
      setSelectedTags([...new Set([...selectedTags, ...aiSuggestions.tags])]);
      formik.setFieldValue('tags', [...new Set([...selectedTags, ...aiSuggestions.tags])]);
    }
    
    setAiSuggestions(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      
      // Filter out files that exceed the size limit or have invalid types
      const validFiles = newFiles.filter(file => {
        const isValidSize = file.size <= FILE_SIZE_LIMIT;
        const isValidType = ACCEPTED_FILE_TYPES.includes(file.type);
        
        if (!isValidSize) {
          setSubmitError(`File ${file.name} exceeds the maximum size limit of 10MB`);
        } else if (!isValidType) {
          setSubmitError(`File ${file.name} has an unsupported file type`);
        }
        
        return isValidSize && isValidType;
      });
      
      setFiles((prevFiles) => [...prevFiles, ...validFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleTagsChange = (_event: React.SyntheticEvent, value: string[]) => {
    setSelectedTags(value);
    formik.setFieldValue('tags', value);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Analyze with AI when description is long enough
  useEffect(() => {
    if (
      formik.values.description.length > 50 &&
      !isAnalyzing && 
      !aiSuggestions
    ) {
      analyzeWithAI();
    }
  }, [formik.values.description, isAnalyzing, aiSuggestions, analyzeWithAI]);

  // Render the current step
  const renderStep = (step: number) => {
    switch (step) {
      case 0:
        return (
          <>
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="subject"
                name="subject"
                label="Subject"
                variant="outlined"
                value={formik.values.subject}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.subject && Boolean(formik.errors.subject)}
                helperText={formik.touched.subject && formik.errors.subject}
                placeholder="Briefly describe the issue"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                id="description"
                name="description"
                label="Description"
                multiline
                rows={6}
                variant="outlined"
                value={formik.values.description}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.description && Boolean(formik.errors.description)}
                helperText={
                  (formik.touched.description && formik.errors.description) || 
                  'Describe the issue in detail. Be as specific as possible.'
                }
                placeholder="Please provide as much detail as possible about the issue you're experiencing..."
              />
              {isAnalyzing && (
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    Analyzing your description with AI...
                  </Typography>
                </Box>
              )}
            </Grid>

            {aiSuggestions && (
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ bgcolor: 'primary.light', p: 1 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <AutoAwesomeIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="subtitle1" fontWeight="bold">
                        AI Suggestions
                      </Typography>
                      <Box flexGrow={1} />
                      <Button 
                        size="small" 
                        startIcon={<LightbulbIcon />}
                        onClick={applyAiSuggestions}
                        variant="contained"
                      >
                        Apply Suggestions
                      </Button>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                      {aiSuggestions.subject && (!formik.values.subject || formik.values.subject.length < 10) && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">
                            Suggested Subject:
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {aiSuggestions.subject}
                          </Typography>
                        </Grid>
                      )}
                      
                      {aiSuggestions.type && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Suggested Type:
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {ticketTypes.find(t => t.id === aiSuggestions.type)?.name || aiSuggestions.type}
                          </Typography>
                        </Grid>
                      )}
                      
                      {aiSuggestions.priority && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">
                            Suggested Priority:
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {priorities.find(p => p.id === aiSuggestions.priority)?.name || aiSuggestions.priority}
                          </Typography>
                        </Grid>
                      )}
                      
                      {aiSuggestions.tags.length > 0 && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">
                            Suggested Tags:
                          </Typography>
                          <Box sx={{ mt: 0.5 }}>
                            {aiSuggestions.tags.map(tag => (
                              <Chip 
                                key={tag} 
                                label={tag} 
                                size="small" 
                                variant="outlined" 
                                sx={{ mr: 0.5, mb: 0.5 }} 
                              />
                            ))}
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </>
        );
      case 1:
        return (
          <>
            <Grid item xs={12} sm={6}>
              <FormControl
                fullWidth
                error={formik.touched.departmentId && Boolean(formik.errors.departmentId)}
              >
                <InputLabel id="department-label">Department</InputLabel>
                <Select
                  labelId="department-label"
                  id="departmentId"
                  name="departmentId"
                  value={formik.values.departmentId}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  label="Department"
                >
                  {departments.map((department) => (
                    <MenuItem key={department.id} value={department.id}>
                      {department.name}
                    </MenuItem>
                  ))}
                </Select>
                {formik.touched.departmentId && formik.errors.departmentId && (
                  <FormHelperText>{formik.errors.departmentId}</FormHelperText>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl
                fullWidth
                error={formik.touched.typeId && Boolean(formik.errors.typeId)}
              >
                <InputLabel id="type-label">Type</InputLabel>
                <Select
                  labelId="type-label"
                  id="typeId"
                  name="typeId"
                  value={formik.values.typeId}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  label="Type"
                >
                  {ticketTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      {type.name}
                    </MenuItem>
                  ))}
                </Select>
                {formik.touched.typeId && formik.errors.typeId && (
                  <FormHelperText>{formik.errors.typeId}</FormHelperText>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl
                fullWidth
                error={formik.touched.priorityId && Boolean(formik.errors.priorityId)}
              >
                <InputLabel id="priority-label">Priority</InputLabel>
                <Select
                  labelId="priority-label"
                  id="priorityId"
                  name="priorityId"
                  value={formik.values.priorityId}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  label="Priority"
                >
                  {priorities.map((priority) => (
                    <MenuItem key={priority.id} value={priority.id}>
                      <Box display="flex" alignItems="center">
                        <Box
                          component="span"
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: priority.color,
                            mr: 1,
                          }}
                        />
                        {priority.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {formik.touched.priorityId && formik.errors.priorityId && (
                  <FormHelperText>{formik.errors.priorityId}</FormHelperText>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Autocomplete
                multiple
                id="tags"
                options={availableTags}
                value={selectedTags}
                onChange={handleTagsChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tags"
                    placeholder="Select or type to add tags"
                    helperText="Tags help categorize and search for tickets"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => {
                    // Extract key and other props separately
                    const { key, ...otherTagProps } = getTagProps({ index });
                    return (
                      <Chip
                        key={key} // Pass key directly
                        label={option}
                        {...otherTagProps} // Spread the rest of the props
                        color="primary"
                        variant="outlined"
                        size="small"
                      />
                    );
                  })
                }
                freeSolo
              />
            </Grid>

            <Grid item xs={12}>
              <Box>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<AttachFileIcon />}
                  sx={{ mb: 2 }}
                >
                  Attach Files
                  <input
                    type="file"
                    hidden
                    multiple
                    onChange={handleFileChange}
                    accept={ACCEPTED_FILE_TYPES.join(',')}
                  />
                </Button>
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 2 }}>
                  Max file size: 10MB. Supported formats: JPEG, PNG, GIF, PDF, DOC, DOCX, TXT, ZIP
                </Typography>
                {files.length > 0 && (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Attached Files ({files.length})
                    </Typography>
                    <List dense>
                      {files.map((file, index) => (
                        <Box
                          key={index}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            p: 1,
                            borderRadius: 1,
                            mb: 1,
                            bgcolor: 'background.default',
                          }}
                        >
                          <FileIcon sx={{ mr: 1, color: 'primary.main' }} />
                          <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                            <Typography variant="body2" noWrap>
                              {file.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatFileSize(file.size)}
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveFile(index)}
                            aria-label="remove file"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}
                    </List>
                  </Paper>
                )}
              </Box>
            </Grid>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg">
      <Box mt={4} mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Ticket
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Submit a new support request
        </Typography>
      </Box>

      {(submitError || error) && (
        <SystemAlert
          type="error"
          message={(submitError || error || "An error occurred")}
          sx={{ mb: 3 }}
        />
      )}

      <Paper elevation={0} sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        <form onSubmit={formik.handleSubmit}>
          <Grid container spacing={3}>
            {renderStep(activeStep)}
            
            <Grid item xs={12}>
              <Divider sx={{ mt: 2, mb: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button
                  disabled={activeStep === 0}
                  onClick={handleBack}
                  variant="outlined"
                >
                  Back
                </Button>
                <Box>
                  {activeStep === steps.length - 1 ? (
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={isLoading || !formik.isValid || Object.keys(formik.touched).length === 0}
                      startIcon={isLoading ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
                    >
                      {isLoading ? 'Submitting...' : 'Submit Ticket'}
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      disabled={!formik.values.subject || !formik.values.description}
                      sx={{ 
                        ml: 1,
                        px: 3,
                        transition: 'transform 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-3px)'
                        }
                      }}
                    >
                      Next
                      <ArrowForwardIcon sx={{ ml: 1 }} />
                    </Button>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};

export default CreateTicketPage; 