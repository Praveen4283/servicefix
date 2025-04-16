import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Divider,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';

// Mock types matching backend types
enum AutomationTrigger {
  TICKET_CREATED = 'ticket_created',
  TICKET_UPDATED = 'ticket_updated',
  COMMENT_ADDED = 'comment_added',
  SLA_BREACHED = 'sla_breached',
  IDLE_TICKET = 'idle_ticket',
}

enum AutomationAction {
  ASSIGN_TICKET = 'assign_ticket',
  CHANGE_PRIORITY = 'change_priority',
  CHANGE_STATUS = 'change_status',
  SEND_NOTIFICATION = 'send_notification',
  ADD_INTERNAL_NOTE = 'add_internal_note',
  APPLY_TAGS = 'apply_tags',
}

enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
}

interface AutomationRule {
  id: string;
  name: string;
  isActive: boolean;
  trigger: AutomationTrigger;
  conditions: Array<{
    field: string;
    operator: ConditionOperator;
    value: any;
  }>;
  actions: Array<{
    type: AutomationAction;
    params: Record<string, any>;
  }>;
}

// Mock data for automation rules
const mockRules: AutomationRule[] = [
  {
    id: 'auto-1',
    name: 'Auto-assign password reset tickets',
    isActive: true,
    trigger: AutomationTrigger.TICKET_CREATED,
    conditions: [
      {
        field: 'subject',
        operator: ConditionOperator.CONTAINS,
        value: 'password reset',
      },
      {
        field: 'subject',
        operator: ConditionOperator.CONTAINS,
        value: 'forgot password',
      },
    ],
    actions: [
      {
        type: AutomationAction.ASSIGN_TICKET,
        params: {
          agentId: 'system-account-team',
        },
      },
      {
        type: AutomationAction.CHANGE_PRIORITY,
        params: {
          priority: 'medium',
        },
      },
      {
        type: AutomationAction.APPLY_TAGS,
        params: {
          tags: ['password', 'account'],
        },
      },
    ],
  },
  {
    id: 'auto-2',
    name: 'Escalate urgent tickets with no response',
    isActive: true,
    trigger: AutomationTrigger.IDLE_TICKET,
    conditions: [
      {
        field: 'priority',
        operator: ConditionOperator.EQUALS,
        value: 'urgent',
      },
      {
        field: 'status',
        operator: ConditionOperator.EQUALS,
        value: 'new',
      },
      {
        field: 'idleTime',
        operator: ConditionOperator.GREATER_THAN,
        value: 60, // 60 minutes
      },
    ],
    actions: [
      {
        type: AutomationAction.SEND_NOTIFICATION,
        params: {
          recipients: ['manager', 'admin'],
          template: 'urgent-ticket-idle',
        },
      },
      {
        type: AutomationAction.ADD_INTERNAL_NOTE,
        params: {
          content: 'This urgent ticket has been idle for over 60 minutes. Management has been notified.',
        },
      },
    ],
  },
  {
    id: 'auto-3',
    name: 'Auto-close resolved tickets after 3 days',
    isActive: false,
    trigger: AutomationTrigger.TICKET_UPDATED,
    conditions: [
      {
        field: 'status',
        operator: ConditionOperator.EQUALS,
        value: 'resolved',
      },
      {
        field: 'daysInStatus',
        operator: ConditionOperator.GREATER_THAN,
        value: 3,
      },
    ],
    actions: [
      {
        type: AutomationAction.CHANGE_STATUS,
        params: {
          status: 'closed',
        },
      },
      {
        type: AutomationAction.SEND_NOTIFICATION,
        params: {
          recipients: ['requester'],
          template: 'ticket-auto-closed',
        },
      },
    ],
  },
];

// Available field options for conditions
const availableFields = [
  { value: 'subject', label: 'Subject', type: 'string' },
  { value: 'description', label: 'Description', type: 'string' },
  { value: 'priority', label: 'Priority', type: 'enum', options: ['low', 'medium', 'high', 'urgent'] },
  { value: 'status', label: 'Status', type: 'enum', options: ['new', 'open', 'pending', 'resolved', 'closed'] },
  { value: 'category', label: 'Category', type: 'string' },
  { value: 'tags', label: 'Tags', type: 'array' },
  { value: 'assigneeId', label: 'Assignee', type: 'string' },
  { value: 'requesterId', label: 'Requester', type: 'string' },
  { value: 'idleTime', label: 'Idle Time (minutes)', type: 'number' },
  { value: 'daysInStatus', label: 'Days in Status', type: 'number' },
];

const WorkflowAutomationPage: React.FC = () => {
  const [rules, setRules] = useState<AutomationRule[]>(mockRules);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentRule, setCurrentRule] = useState<Partial<AutomationRule>>({
    name: '',
    isActive: true,
    trigger: AutomationTrigger.TICKET_CREATED,
    conditions: [],
    actions: [],
  });
  const [isEditing, setIsEditing] = useState(false);

  // Helper function to get a new unique ID
  const getNewId = () => `auto-${Date.now()}`;

  // Open dialog to create a new rule
  const handleCreateRule = () => {
    setCurrentRule({
      name: '',
      isActive: true,
      trigger: AutomationTrigger.TICKET_CREATED,
      conditions: [],
      actions: [],
    });
    setIsEditing(false);
    setOpenDialog(true);
  };

  // Open dialog to edit an existing rule
  const handleEditRule = (rule: AutomationRule) => {
    setCurrentRule(JSON.parse(JSON.stringify(rule))); // Deep clone
    setIsEditing(true);
    setOpenDialog(true);
  };

  // Duplicate an existing rule
  const handleDuplicateRule = (rule: AutomationRule) => {
    const newRule: AutomationRule = {
      ...JSON.parse(JSON.stringify(rule)),
      id: getNewId(),
      name: `${rule.name} (Copy)`,
    };
    setRules([...rules, newRule]);
  };

  // Delete a rule
  const handleDeleteRule = (id: string) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      setRules(rules.filter(r => r.id !== id));
    }
  };

  // Toggle a rule's active status
  const handleToggleActive = (id: string) => {
    setRules(
      rules.map(rule =>
        rule.id === id ? { ...rule, isActive: !rule.isActive } : rule
      )
    );
  };

  // Add a condition to the current rule
  const handleAddCondition = () => {
    setCurrentRule({
      ...currentRule,
      conditions: [
        ...(currentRule.conditions || []),
        {
          field: availableFields[0].value,
          operator: ConditionOperator.EQUALS,
          value: '',
        },
      ],
    });
  };

  // Update a condition in the current rule
  const handleUpdateCondition = (index: number, field: string, value: any) => {
    if (!currentRule.conditions) return;
    
    const updatedConditions = [...currentRule.conditions];
    updatedConditions[index] = { 
      ...updatedConditions[index], 
      [field]: value,
    };
    
    setCurrentRule({
      ...currentRule,
      conditions: updatedConditions,
    });
  };

  // Remove a condition from the current rule
  const handleRemoveCondition = (index: number) => {
    if (!currentRule.conditions) return;
    
    setCurrentRule({
      ...currentRule,
      conditions: currentRule.conditions.filter((_, i) => i !== index),
    });
  };

  // Add an action to the current rule
  const handleAddAction = () => {
    setCurrentRule({
      ...currentRule,
      actions: [
        ...(currentRule.actions || []),
        {
          type: AutomationAction.ASSIGN_TICKET,
          params: { agentId: '' },
        },
      ],
    });
  };

  // Update an action in the current rule
  const handleUpdateAction = (index: number, updates: Partial<{ type: AutomationAction; params: any }>) => {
    if (!currentRule.actions) return;
    
    const updatedActions = [...currentRule.actions];
    updatedActions[index] = { 
      ...updatedActions[index], 
      ...updates,
    };
    
    setCurrentRule({
      ...currentRule,
      actions: updatedActions,
    });
  };

  // Initialize default parameters based on action type
  const getDefaultParams = (actionType: AutomationAction) => {
    switch (actionType) {
      case AutomationAction.ASSIGN_TICKET:
        return { agentId: '' };
      case AutomationAction.CHANGE_PRIORITY:
        return { priority: 'medium' };
      case AutomationAction.CHANGE_STATUS:
        return { status: 'open' };
      case AutomationAction.SEND_NOTIFICATION:
        return { recipients: [], template: '' };
      case AutomationAction.ADD_INTERNAL_NOTE:
        return { content: '' };
      case AutomationAction.APPLY_TAGS:
        return { tags: [] };
      default:
        return {};
    }
  };

  // Remove an action from the current rule
  const handleRemoveAction = (index: number) => {
    if (!currentRule.actions) return;
    
    setCurrentRule({
      ...currentRule,
      actions: currentRule.actions.filter((_, i) => i !== index),
    });
  };

  // Save the current rule
  const handleSaveRule = () => {
    if (!currentRule.name || !currentRule.trigger) {
      alert('Rule name and trigger are required');
      return;
    }
    
    if (isEditing) {
      // Update existing rule
      setRules(
        rules.map(rule =>
          rule.id === currentRule.id ? currentRule as AutomationRule : rule
        )
      );
    } else {
      // Create new rule
      const newRule: AutomationRule = {
        ...(currentRule as Omit<AutomationRule, 'id'>),
        id: getNewId(),
      };
      setRules([...rules, newRule]);
    }
    
    setOpenDialog(false);
  };

  // Render an operator select field
  const renderOperatorSelect = (condition: any, index: number) => {
    const field = availableFields.find(f => f.value === condition.field);
    const fieldType = field?.type || 'string';
    
    // Filter operators based on field type
    const validOperators = Object.values(ConditionOperator).filter(op => {
      if (fieldType === 'string') {
        return true; // All operators are valid for strings
      } else if (fieldType === 'number') {
        return ['equals', 'not_equals', 'greater_than', 'less_than'].includes(op);
      } else if (fieldType === 'enum') {
        return ['equals', 'not_equals'].includes(op);
      } else if (fieldType === 'array') {
        return ['contains', 'not_contains'].includes(op);
      }
      return true;
    });
    
    return (
      <FormControl fullWidth margin="dense">
        <InputLabel>Operator</InputLabel>
        <Select
          value={condition.operator}
          onChange={(e) => handleUpdateCondition(index, 'operator', e.target.value)}
          label="Operator"
        >
          {validOperators.map(op => (
            <MenuItem key={op} value={op}>
              {op.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };

  // Render a value input field based on field type
  const renderValueInput = (condition: any, index: number) => {
    const field = availableFields.find(f => f.value === condition.field);
    const fieldType = field?.type || 'string';
    
    if (fieldType === 'enum' && field?.options) {
      return (
        <FormControl fullWidth margin="dense">
          <InputLabel>Value</InputLabel>
          <Select
            value={condition.value}
            onChange={(e) => handleUpdateCondition(index, 'value', e.target.value)}
            label="Value"
          >
            {field.options.map(option => (
              <MenuItem key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    } else if (fieldType === 'number') {
      return (
        <TextField
          fullWidth
          margin="dense"
          label="Value"
          type="number"
          value={condition.value}
          onChange={(e) => handleUpdateCondition(index, 'value', parseInt(e.target.value))}
        />
      );
    } else if (fieldType === 'array') {
      return (
        <TextField
          fullWidth
          margin="dense"
          label="Value"
          placeholder="Comma-separated values"
          value={Array.isArray(condition.value) ? condition.value.join(', ') : condition.value}
          onChange={(e) => {
            const value = e.target.value;
            const arrayValue = value.split(',').map(v => v.trim()).filter(Boolean);
            handleUpdateCondition(index, 'value', value.includes(',') ? arrayValue : value);
          }}
        />
      );
    } else {
      return (
        <TextField
          fullWidth
          margin="dense"
          label="Value"
          value={condition.value}
          onChange={(e) => handleUpdateCondition(index, 'value', e.target.value)}
        />
      );
    }
  };

  // Render params input fields based on action type
  const renderActionParams = (action: any, index: number) => {
    switch (action.type) {
      case AutomationAction.ASSIGN_TICKET:
        return (
          <TextField
            fullWidth
            margin="dense"
            label="Agent/Team ID"
            value={action.params.agentId || ''}
            onChange={(e) => handleUpdateAction(index, { params: { ...action.params, agentId: e.target.value } })}
            helperText="Enter agent ID or team ID"
          />
        );
        
      case AutomationAction.CHANGE_PRIORITY:
        return (
          <FormControl fullWidth margin="dense">
            <InputLabel>Priority</InputLabel>
            <Select
              value={action.params.priority || 'medium'}
              onChange={(e) => handleUpdateAction(index, { params: { ...action.params, priority: e.target.value } })}
              label="Priority"
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
            </Select>
          </FormControl>
        );
        
      case AutomationAction.CHANGE_STATUS:
        return (
          <FormControl fullWidth margin="dense">
            <InputLabel>Status</InputLabel>
            <Select
              value={action.params.status || 'open'}
              onChange={(e) => handleUpdateAction(index, { params: { ...action.params, status: e.target.value } })}
              label="Status"
            >
              <MenuItem value="new">New</MenuItem>
              <MenuItem value="open">Open</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
            </Select>
          </FormControl>
        );
        
      case AutomationAction.SEND_NOTIFICATION:
        return (
          <>
            <FormControl fullWidth margin="dense">
              <InputLabel>Recipients</InputLabel>
              <Select
                multiple
                value={action.params.recipients || []}
                onChange={(e) => handleUpdateAction(index, { params: { ...action.params, recipients: e.target.value } })}
                label="Recipients"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => (
                      <Chip key={value} label={value} />
                    ))}
                  </Box>
                )}
              >
                <MenuItem value="requester">Requester</MenuItem>
                <MenuItem value="assignee">Assignee</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              margin="dense"
              label="Template Name"
              value={action.params.template || ''}
              onChange={(e) => handleUpdateAction(index, { params: { ...action.params, template: e.target.value } })}
              helperText="Enter notification template name"
            />
          </>
        );
        
      case AutomationAction.ADD_INTERNAL_NOTE:
        return (
          <TextField
            fullWidth
            margin="dense"
            label="Note Content"
            multiline
            rows={3}
            value={action.params.content || ''}
            onChange={(e) => handleUpdateAction(index, { params: { ...action.params, content: e.target.value } })}
          />
        );
        
      case AutomationAction.APPLY_TAGS:
        return (
          <TextField
            fullWidth
            margin="dense"
            label="Tags"
            placeholder="Comma-separated tags"
            value={Array.isArray(action.params.tags) ? action.params.tags.join(', ') : action.params.tags || ''}
            onChange={(e) => {
              const value = e.target.value;
              const tagsArray = value.split(',').map((tag) => tag.trim()).filter(Boolean);
              handleUpdateAction(index, { params: { ...action.params, tags: tagsArray } });
            }}
          />
        );
        
      default:
        // Cast action.type as string to ensure it has replace method
        return (action.type as string).replace(/_/g, ' ').toLowerCase();
    }
  };
  
  // Format the rule description for display
  const formatRuleDescription = (rule: AutomationRule) => {
    const triggerText = rule.trigger.replace(/_/g, ' ').toLowerCase();
    
    let conditionsText = 'no conditions';
    if (rule.conditions.length > 0) {
      conditionsText = rule.conditions
        .map(condition => {
          const field = availableFields.find(f => f.value === condition.field)?.label || condition.field;
          const operator = condition.operator.replace(/_/g, ' ');
          return `${field} ${operator} "${condition.value}"`;
        })
        .join(' AND ');
    }
    
    let actionsText = 'do nothing';
    if (rule.actions.length > 0) {
      actionsText = rule.actions
        .map(action => {
          switch (action.type) {
            case AutomationAction.ASSIGN_TICKET:
              return `assign to ${action.params.agentId}`;
            case AutomationAction.CHANGE_PRIORITY:
              return `change priority to ${action.params.priority}`;
            case AutomationAction.CHANGE_STATUS:
              return `change status to ${action.params.status}`;
            case AutomationAction.SEND_NOTIFICATION:
              return `send notification to ${action.params.recipients.join(', ')}`;
            case AutomationAction.ADD_INTERNAL_NOTE:
              return 'add internal note';
            case AutomationAction.APPLY_TAGS:
              return `apply tags: ${action.params.tags.join(', ')}`;
            default:
              // Cast action.type as string to ensure it has replace method
              return (action.type as string).replace(/_/g, ' ').toLowerCase();
          }
        })
        .join(', then ');
    }
    
    return `When a ticket is ${triggerText}, if ${conditionsText}, then ${actionsText}`;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Workflow Automation
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateRule}
        >
          Create New Rule
        </Button>
      </Box>
      
      <Alert severity="info" sx={{ mb: 4 }}>
        Workflow automation rules help you automate routine tasks and processes. 
        Rules are executed based on triggers and conditions, and can perform 
        various actions on tickets.
      </Alert>
      
      {rules.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="textSecondary" mb={2}>
            No automation rules have been created yet.
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateRule}
          >
            Create Your First Rule
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {rules.map((rule) => (
            <Grid item xs={12} key={rule.id}>
              <Card variant={rule.isActive ? 'outlined' : 'outlined'} 
                sx={{ opacity: rule.isActive ? 1 : 0.7 }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Box display="flex" alignItems="center">
                      <Typography variant="h6" sx={{ mr: 2 }}>
                        {rule.name}
                      </Typography>
                      <Chip
                        size="small"
                        label={rule.isActive ? 'Active' : 'Inactive'}
                        color={rule.isActive ? 'success' : 'default'}
                      />
                    </Box>
                    <Box>
                      <Tooltip title={rule.isActive ? 'Deactivate' : 'Activate'}>
                        <IconButton
                          size="small"
                          onClick={() => handleToggleActive(rule.id)}
                          color={rule.isActive ? 'success' : 'default'}
                        >
                          {rule.isActive ? <PauseIcon /> : <PlayArrowIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleEditRule(rule)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Duplicate">
                        <IconButton
                          size="small"
                          onClick={() => handleDuplicateRule(rule)}
                          color="primary"
                        >
                          <ContentCopyIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteRule(rule.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" color="textSecondary" mb={2}>
                    {formatRuleDescription(rule)}
                  </Typography>
                  
                  <Accordion>
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      aria-controls={`rule-${rule.id}-content`}
                      id={`rule-${rule.id}-header`}
                    >
                      <Typography>View Details</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="subtitle2" gutterBottom>
                        Trigger:
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        {rule.trigger.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Typography>
                      
                      <Typography variant="subtitle2" gutterBottom mt={2}>
                        Conditions:
                      </Typography>
                      {rule.conditions.length === 0 ? (
                        <Typography variant="body2" gutterBottom>No conditions (will apply to all tickets)</Typography>
                      ) : (
                        <List dense>
                          {rule.conditions.map((condition, index) => (
                            <ListItem key={index}>
                              <ListItemText
                                primary={`${availableFields.find(f => f.value === condition.field)?.label || condition.field} 
                                ${condition.operator.replace(/_/g, ' ')} "${condition.value}"`}
                              />
                            </ListItem>
                          ))}
                        </List>
                      )}
                      
                      <Typography variant="subtitle2" gutterBottom mt={2}>
                        Actions:
                      </Typography>
                      <List dense>
                        {rule.actions.map((action, index) => (
                          <ListItem key={index}>
                            <ListItemText
                              primary={action.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              secondary={
                                action.type === AutomationAction.ASSIGN_TICKET
                                  ? `Assign to: ${action.params.agentId}`
                                  : action.type === AutomationAction.CHANGE_PRIORITY
                                  ? `New priority: ${action.params.priority}`
                                  : action.type === AutomationAction.CHANGE_STATUS
                                  ? `New status: ${action.params.status}`
                                  : action.type === AutomationAction.SEND_NOTIFICATION
                                  ? `Recipients: ${action.params.recipients.join(', ')}`
                                  : action.type === AutomationAction.ADD_INTERNAL_NOTE
                                  ? `Note: ${action.params.content?.substring(0, 50)}${action.params.content?.length > 50 ? '...' : ''}`
                                  : action.type === AutomationAction.APPLY_TAGS
                                  ? `Tags: ${action.params.tags.join(', ')}`
                                  : ''
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Rule Editor Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEditing ? 'Edit Rule' : 'Create New Rule'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Rule Name"
            fullWidth
            value={currentRule.name || ''}
            onChange={(e) => setCurrentRule({ ...currentRule, name: e.target.value })}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={currentRule.isActive}
                onChange={(e) => setCurrentRule({ ...currentRule, isActive: e.target.checked })}
                color="primary"
              />
            }
            label={currentRule.isActive ? 'Active' : 'Inactive'}
          />
          
          <FormControl fullWidth margin="dense">
            <InputLabel>Trigger</InputLabel>
            <Select
              value={currentRule.trigger || ''}
              onChange={(e) => setCurrentRule({ ...currentRule, trigger: e.target.value as AutomationTrigger })}
              label="Trigger"
            >
              {Object.values(AutomationTrigger).map((trigger) => (
                <MenuItem key={trigger} value={trigger}>
                  {trigger.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Box mt={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle1">Conditions</Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddCondition}
                variant="outlined"
                size="small"
              >
                Add Condition
              </Button>
            </Box>
            <Divider />
            
            {currentRule.conditions?.length === 0 && (
              <Typography variant="body2" color="textSecondary" mt={1}>
                No conditions means this rule will apply to all tickets when the trigger occurs.
              </Typography>
            )}
            
            {currentRule.conditions?.map((condition, index) => (
              <Box key={index} sx={{ mt: 2, p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle2">Condition {index + 1}</Typography>
                  <IconButton size="small" color="error" onClick={() => handleRemoveCondition(index)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth margin="dense">
                      <InputLabel>Field</InputLabel>
                      <Select
                        value={condition.field}
                        onChange={(e) => handleUpdateCondition(index, 'field', e.target.value)}
                        label="Field"
                      >
                        {availableFields.map((field) => (
                          <MenuItem key={field.value} value={field.value}>
                            {field.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    {renderOperatorSelect(condition, index)}
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    {renderValueInput(condition, index)}
                  </Grid>
                </Grid>
              </Box>
            ))}
          </Box>
          
          <Box mt={4}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle1">Actions</Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddAction}
                variant="outlined"
                size="small"
              >
                Add Action
              </Button>
            </Box>
            <Divider />
            
            {currentRule.actions?.length === 0 && (
              <Typography variant="body2" color="textSecondary" mt={1}>
                Add at least one action to execute when conditions are met.
              </Typography>
            )}
            
            {currentRule.actions?.map((action, index) => (
              <Box key={index} sx={{ mt: 2, p: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle2">Action {index + 1}</Typography>
                  <IconButton size="small" color="error" onClick={() => handleRemoveAction(index)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
                
                <FormControl fullWidth margin="dense">
                  <InputLabel>Action Type</InputLabel>
                  <Select
                    value={action.type}
                    onChange={(e) => {
                      const newType = e.target.value as AutomationAction;
                      handleUpdateAction(index, { 
                        type: newType,
                        params: getDefaultParams(newType) 
                      });
                    }}
                    label="Action Type"
                  >
                    {Object.values(AutomationAction).map((type) => (
                      <MenuItem key={type} value={type}>
                        {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                {renderActionParams(action, index)}
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveRule} color="primary" variant="contained">
            Save Rule
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default WorkflowAutomationPage; 