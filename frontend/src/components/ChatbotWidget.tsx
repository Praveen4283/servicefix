import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  IconButton,
  Fab,
  Collapse,
  Card,
  CardContent,
  CircularProgress,
  useTheme,
  alpha,
  Tooltip,
  Zoom,
  Badge,
  InputAdornment
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Chat as ChatIcon,
  Send as SendIcon,
  SmartToy as SmartToyIcon,
  Close as CloseIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  ContentCopy as ContentCopyIcon,
  Done as DoneIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Visibility as VisibilityIcon,
  Article as ArticleIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
  Person as PersonIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

// Import ticket service and auth context
import ticketService, { Ticket, TicketComment, TicketStatus, TicketPriority } from '../services/ticketService';
import chatbotService from '../services/chatbotService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useTickets } from '../context/TicketContext'; // Import useTickets
import apiClient from '../services/apiClient';
import { logger } from '../utils/frontendLogger';

// Styled components
const ChatContainer = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  bottom: theme.spacing(2),
  right: theme.spacing(2),
  width: 360,
  maxWidth: 'calc(100vw - 32px)',
  maxHeight: 600,
  display: 'flex',
  flexDirection: 'column',
  zIndex: 1000,
  overflow: 'hidden',
  boxShadow: theme.shadows[10],
  borderRadius: theme.spacing(2),
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '4px',
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    zIndex: 1
  }
}));

const ChatHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.mode === 'dark'
    ? alpha(theme.palette.primary.main, 0.9)
    : theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
}));

const MessagesContainer = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  overflow: 'auto',
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  maxHeight: 400,
  backgroundColor: theme.palette.mode === 'dark'
    ? alpha(theme.palette.background.paper, 0.8)
    : theme.palette.background.paper,
  scrollbarWidth: 'thin',
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-track': {
    background: theme.palette.mode === 'dark' ? alpha(theme.palette.common.black, 0.1) : alpha(theme.palette.common.black, 0.05),
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.6) : alpha(theme.palette.primary.main, 0.4),
    borderRadius: '3px',
  }
}));

const MessageBubble = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isUser'
})<{ isUser: boolean }>(({ theme, isUser }) => ({
  maxWidth: '80%',
  padding: theme.spacing(1.5),
  borderRadius: isUser ? '18px 18px 0 18px' : '18px 18px 18px 0',
  backgroundColor: isUser
    ? theme.palette.primary.main
    : theme.palette.mode === 'dark'
      ? alpha(theme.palette.grey[700], 0.7)
      : alpha(theme.palette.grey[100], 0.9),
  color: isUser
    ? theme.palette.primary.contrastText
    : theme.palette.text.primary,
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  position: 'relative',
  wordBreak: 'break-word',
  boxShadow: isUser
    ? `0 1px 2px ${alpha(theme.palette.common.black, 0.2)}`
    : `0 1px 2px ${alpha(theme.palette.common.black, 0.1)}`,
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: isUser
      ? `0 4px 8px ${alpha(theme.palette.common.black, 0.2)}`
      : `0 4px 8px ${alpha(theme.palette.common.black, 0.1)}`
  }
}));

const ChatFooter = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  backgroundColor: theme.palette.mode === 'dark'
    ? alpha(theme.palette.background.paper, 0.5)
    : theme.palette.background.paper
}));

const ActionButtons = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  justifyContent: 'center',
  marginTop: theme.spacing(1)
}));

const FeedbackBar = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginTop: theme.spacing(0.5),
  justifyContent: 'flex-end'
}));

// Add these styled components for consistent list styling
const StyledOrderedList = styled('ol')(({ theme }) => ({
  paddingLeft: theme.spacing(3),
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(1),
  '& li': {
    marginBottom: theme.spacing(0.5),
  }
}));

const StyledUnorderedList = styled('ul')(({ theme }) => ({
  paddingLeft: theme.spacing(3),
  marginTop: theme.spacing(1),
  marginBottom: theme.spacing(1),
  '& li': {
    marginBottom: theme.spacing(0.5),
  }
}));

// Interface for message objects
interface Message {
  id: string;
  text: string | React.ReactNode; // Allow React nodes for richer messages
  sender: 'user' | 'bot';
  timestamp: Date;
  isTyping?: boolean;
  suggestions?: {
    knowledgeArticles?: Array<{ id: string; title: string }>;
    createTicket?: boolean;
  };
  feedback?: 'positive' | 'negative' | null;
  ticketInfo?: Partial<Ticket>; // Optional: Store ticket info within message
}

// Type for conversation state
type ConversationState =
  | 'idle'
  | 'awaiting_intent'
  | 'creating_ticket_subject'
  | 'creating_ticket_description'
  | 'getting_department'
  | 'getting_ticket_type'
  | 'getting_priority'
  | 'getting_tags'
  | 'getting_ticket_id_for_status'
  | 'getting_ticket_id_for_comment'
  | 'getting_comment_text';
// Add more states as needed (e.g., for editing)

// Add an interface for the pending data structure at the beginning of the file
interface PendingTicketData {
  subject?: string;
  description?: string;
  departmentId?: number;
  typeId?: number;
  tags?: string[];
  [key: string]: any; // Allow for any additional properties
}

// Add these helper functions near the top of the file, before the ChatbotWidget component
const MAX_API_RETRIES = 2;
const RETRY_DELAY = 1000; // ms

/**
 * Wrapper for API calls with automatic retries and proper error handling
 * @param apiCall - Function that returns a promise with the API call
 * @param errorMessage - User-friendly error message to show on failure
 */
async function executeWithRetry<T>(
  apiCall: () => Promise<T>,
  errorMessage: string
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= MAX_API_RETRIES; attempt++) {
    try {
      // Add increasing delay for each retry attempt
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
      }
      return await apiCall();
    } catch (error: any) {
      logger.error(`API call failed (attempt ${attempt + 1}/${MAX_API_RETRIES + 1}):`, error);
      lastError = error;

      // Don't retry if error is related to authentication or authorization
      if (error.status === 401 || error.status === 403) {
        break;
      }
    }
  }

  throw new Error(`${errorMessage}: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Sanitizes user input to prevent injection or problematic inputs
 * @param input - Raw user input
 */
function sanitizeInput(input: string): string {
  // Remove any script tags or potentially harmful content
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim();

  // Limit length to prevent abuse
  const MAX_LENGTH = 1000;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH);
  }

  return sanitized;
}

// Root component
const ChatbotWidget: React.FC = () => {
  const theme = useTheme();
  const { user, isAuthenticated } = useAuth(); // Get authenticated user info
  const { addNotification } = useNotification();
  const { departments, ticketTypes, priorities } = useTickets(); // Get ticket context data
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: (
        <>
          Hello! I'm your AI support assistant. How can I help you today?
          <br />You can ask me to:
          <StyledOrderedList>
            <li>Create a ticket</li>
            <li>Check ticket status [ID]</li>
            <li>Add comment to ticket [ID]</li>
          </StyledOrderedList>
          Please enter the number (1-3) or type your request.
        </>
      ),
      sender: 'bot',
      timestamp: new Date(),
      feedback: null
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // State for conversation flow
  const [conversationState, setConversationState] = useState<ConversationState>('idle');
  const [pendingData, setPendingData] = useState<any>({});
  const [conversationId, setConversationId] = useState<string | null>(null);

  const navigate = useNavigate();

  // Add a new state for tracking API calls in progress
  const [apiCallsInProgress, setApiCallsInProgress] = useState<{ [key: string]: boolean }>({});

  // Scroll to bottom of messages container
  const scrollToBottom = useCallback(() => {
    // Add a slight delay to ensure the DOM is updated before scrolling
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Replace the ensureConversation function with a more robust version
  const ensureConversation = async (): Promise<string> => {
    if (conversationId) {
      return conversationId;
    }

    if (!isAuthenticated) {
      addNotification('You need to be logged in to use the chat.', 'warning');
      throw new Error('Authentication required');
    }

    // Set API call in progress
    setApiCallsInProgress(prev => ({ ...prev, startConversation: true }));

    try {
      // Add metadata to link this conversation to relevant context
      const metadata = {
        source: 'web-widget',
        userAgent: navigator.userAgent,
        path: window.location.pathname,
        timestamp: new Date().toISOString()
      };

      const response = await executeWithRetry(
        () => chatbotService.startConversation(metadata),
        'Could not start chat session'
      );

      logger.debug('API Response for startConversation:', JSON.stringify(response));

      // Handle different possible response structures
      let newConversationId;

      if (response && typeof response === 'object') {
        // Standard API response structure { status: "success", data: { id: '...' } }
        if (response.data && typeof response.data === 'object' && 'id' in response.data) {
          newConversationId = String((response.data as any).id);
        }
        // Direct data structure without wrapper { id: '...' }
        else if ('id' in response) {
          newConversationId = String((response as any).id);
        }
        // If the response is another structure, try to extract ID
        else {
          logger.warn('Unexpected conversation response structure:', response);
          // Look for any property that might contain the ID
          const possibleId = Object.entries(response as any)
            .find(([key, value]) =>
              (key.toLowerCase().includes('id') || key === 'id') &&
              (typeof value === 'string' || typeof value === 'number')
            );

          if (possibleId) {
            newConversationId = String(possibleId[1]);
          }
        }
      }

      if (!newConversationId) {
        throw new Error('Failed to extract conversation ID from response');
      }

      logger.debug('Extracted conversation ID:', newConversationId);
      setConversationId(newConversationId);
      return newConversationId;
    } catch (error: any) {
      logger.error("Failed to start conversation:", error);
      const errorMessage = error.message || 'Could not start chat session. Please try again later.';
      addNotification(errorMessage, 'error');
      throw new Error(errorMessage); // Propagate error
    } finally {
      // Clear API call in progress
      setApiCallsInProgress(prev => ({ ...prev, startConversation: false }));
    }
  };

  // Enhance addMessage function with better error handling and retries
  const addMessage = async (text: string | React.ReactNode, sender: 'user' | 'bot', extraData?: Partial<Message>) => {
    const messageContent = typeof text === 'string' ? sanitizeInput(text) : '[Rich Content]'; // Get string representation for saving

    // 1. Add message to UI state immediately for better UX
    const newMessageId = `${sender}-${Date.now()}`;
    const newMessage: Message = {
      id: newMessageId,
      text,
      sender,
      timestamp: new Date(),
      feedback: sender === 'bot' ? null : undefined,
      ...extraData
    };

    setMessages(prev => [...prev, newMessage]);
    if (sender === 'bot' && !isOpen) {
      setUnreadMessages(prev => prev + 1);
    }

    // 2. Save message to backend if user is authenticated
    if (!isAuthenticated && sender === 'user') {
      // If not authenticated and it's a user message, prompt to login
      setTimeout(() => {
        addMessage("Please log in to continue this conversation and save your chat history.", 'bot');
      }, 500);
      return;
    }

    try {
      // 3. Ensure conversation exists
      let currentConversationId: string;
      try {
        currentConversationId = await ensureConversation();
      } catch (error) {
        // Don't proceed with saving if conversation creation failed
        return;
      }

      // Set API call in progress
      setApiCallsInProgress(prev => ({ ...prev, saveMessage: true }));

      // 4. Save message to backend with retry logic
      const response = await executeWithRetry(
        () => chatbotService.saveMessage(currentConversationId, {
          senderType: sender,
          content: messageContent,
          metadata: extraData?.ticketInfo ? {
            ticketId: (extraData.ticketInfo as Ticket).id,
            timestamp: new Date().toISOString()
          } : undefined
        }),
        'Failed to save message'
      );

      // 5. Update message with server-generated ID if needed
      if (response && response.data && typeof response.data === 'object' && 'id' in response.data) {
        const messageId = (response.data as any).id;
        // Update the message ID in the UI to match the server ID
        setMessages(prev =>
          prev.map(msg =>
            msg.id === newMessageId
              ? { ...msg, id: messageId.toString() }
              : msg
          )
        );
      }

    } catch (error: any) {
      logger.error(`Failed to save ${sender} message to backend:`, error);
      // Only notify user about errors for user messages
      if (sender === 'user') {
        addNotification('Failed to save your message. You may continue chatting, but history might not be preserved.', 'warning');
      }
    } finally {
      // Clear API call in progress
      setApiCallsInProgress(prev => ({ ...prev, saveMessage: false }));
    }
  };

  // Handle chat toggle
  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadMessages(0);
      // Try to load previous conversation if user is authenticated
      if (isAuthenticated) {
        loadConversationHistory();
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  };

  // Enhance loadConversationHistory with retry logic
  const loadConversationHistory = async () => {
    if (!conversationId || !isAuthenticated) return;

    // Set API call in progress
    setApiCallsInProgress(prev => ({ ...prev, loadHistory: true }));

    try {
      setIsTyping(true); // Show loading indicator

      const response = await executeWithRetry(
        () => chatbotService.getConversationHistory(conversationId),
        'Could not load conversation history'
      );

      const history = response.data || [];

      if (history && history.length > 0) {
        // Clear welcome message if we have history
        setMessages(prevMessages =>
          prevMessages.filter(msg => msg.id !== 'welcome')
        );

        // Convert API messages to UI messages
        const uiMessages: Message[] = history.map(msg => ({
          id: `${msg.id}`,
          text: msg.content,
          sender: msg.senderType as 'user' | 'bot', // Cast to expected type
          timestamp: new Date(msg.createdAt),
          feedback: msg.senderType === 'bot' ? null : undefined,
          // Parse metadata if available
          ...(msg.metadata?.ticketId ? { ticketInfo: { id: msg.metadata.ticketId } } : {})
        }));

        // Update messages state with history
        setMessages(prevMessages => {
          // Keep only messages not already in the history (by ID)
          const existingIds = new Set(uiMessages.map(m => m.id));
          const newMessages = prevMessages.filter(m => !existingIds.has(m.id));
          return [...uiMessages, ...newMessages];
        });

        // Optional success notification
        addNotification('Loaded your conversation history', 'info');
      }
    } catch (error: any) {
      logger.error("Failed to load conversation history:", error);
      addNotification('Could not load conversation history', 'warning');
    } finally {
      setIsTyping(false);
      // Clear API call in progress
      setApiCallsInProgress(prev => ({ ...prev, loadHistory: false }));
    }
  };

  // Effect to try loading conversation if user logs in while chat is open
  useEffect(() => {
    if (isAuthenticated && isOpen && !conversationId) {
      loadConversationHistory();
    }
  }, [isAuthenticated, isOpen, conversationId]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  // Enhance handleSubmit with input sanitization
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const currentInput = inputValue.trim();
    if (!currentInput) return;

    // Sanitize input before processing
    const sanitizedInput = sanitizeInput(currentInput);

    // If input was potentially harmful and completely sanitized away, don't proceed
    if (!sanitizedInput) {
      setInputValue('');
      addNotification('Invalid input detected', 'warning');
      return;
    }

    const userMessageText = sanitizedInput; // Store before clearing
    setInputValue(''); // Clear input immediately for better UX
    setIsTyping(true);

    try {
      // Add user message to UI and save to backend
      await addMessage(userMessageText, 'user');

      // Process user input based on conversation state
      await processUserInput(userMessageText);
    } catch (error: any) {
      logger.error("Chatbot Error:", error);
      // Use addMessage to also save the error response to backend
      await addMessage(`Sorry, I encountered an error: ${error.message || 'Please try again.'}`, 'bot');
      setConversationState('idle');
      setPendingData({});
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  // Process user input and manage conversation state
  const processUserInput = async (input: string) => {
    let botResponse: string | React.ReactNode | null = "I'm sorry, I didn't understand that. Can you rephrase?"; // Default response

    switch (conversationState) {
      case 'idle':
      case 'awaiting_intent':
        const lowerInput = input.toLowerCase().trim();

        // --- Intent: Create Ticket (Option 1) ---
        if (lowerInput === "1" || lowerInput.includes('create') && lowerInput.includes('ticket')) {
          setConversationState('creating_ticket_subject');
          botResponse = "Okay, I can help create a ticket. What should the subject be?";
        }
        // --- Intent: Check Status (Option 2) ---
        else if (lowerInput === "2" || lowerInput.includes('status') || lowerInput.includes('check ticket')) {
          // Try to extract ID with regex
          const match = lowerInput.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i); // Basic UUID regex
          if (match && match[1]) {
            await fetchAndShowTicketStatus(match[1]);
            botResponse = null; // Response handled in function
            setConversationState('idle');
          } else {
            setConversationState('getting_ticket_id_for_status');
            botResponse = "Sure, I can check a ticket's status. Please enter the ticket ID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).";
          }
        }
        // --- Intent: Add Comment (Option 3) ---
        else if (lowerInput === "3" || lowerInput.includes('comment') || lowerInput.includes('add note')) {
          // Try to extract ID with regex
          const match = lowerInput.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i); // Basic UUID regex
          if (match && match[1]) {
            setPendingData({ ticketId: match[1] });
            setConversationState('getting_comment_text');
            botResponse = `Okay, adding a comment to ticket ${match[1]}. What would you like to say?`;
          } else {
            setConversationState('getting_ticket_id_for_comment');
            botResponse = "Okay, I can add a comment. Please enter the ticket ID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).";
          }
        }
        // --- Default / Help ---
        else {
          botResponse = (
            <>
              Sorry, I didn't quite catch that. You can ask me to:
              <StyledOrderedList>
                <li>Create a ticket</li>
                <li>Check ticket status [ID]</li>
                <li>Add comment to ticket [ID]</li>
              </StyledOrderedList>
              Please enter the number (1-3) or type your request.
            </>
          );
          setConversationState('idle'); // Stay idle or reset
        }
        break;

      // --- Create Ticket Flow ---
      case 'creating_ticket_subject':
        // Allow canceling the operation
        if (input.toLowerCase() === 'cancel' || input.toLowerCase() === 'back' || input.toLowerCase() === 'menu') {
          botResponse = (
            <>
              Ticket creation cancelled. What would you like to do instead?
              <StyledOrderedList>
                <li>Create a ticket</li>
                <li>Check ticket status [ID]</li>
                <li>Add comment to ticket [ID]</li>
              </StyledOrderedList>
              Please enter the number (1-3) or type your request.
            </>
          );
          setConversationState('idle');
          break;
        }

        setPendingData({ subject: input });
        setConversationState('creating_ticket_description');
        botResponse = "Got it. Now, please provide a description for the ticket. (Type 'cancel' to abort)";
        break;

      case 'creating_ticket_description':
        // Allow canceling the operation
        if (input.toLowerCase() === 'cancel' || input.toLowerCase() === 'back' || input.toLowerCase() === 'menu') {
          botResponse = (
            <>
              Ticket creation cancelled. What would you like to do instead?
              <StyledOrderedList>
                <li>Create a ticket</li>
                <li>Check ticket status [ID]</li>
                <li>Add comment to ticket [ID]</li>
              </StyledOrderedList>
              Please enter the number (1-3) or type your request.
            </>
          );
          setConversationState('idle');
          setPendingData({});
          break;
        }

        // Store description
        setPendingData((prev: PendingTicketData) => ({ ...prev, description: input }));

        // Ask for department
        if (departments && departments.length > 0) {
          const departmentOptions = departments.map((d, index) => (
            <li key={d.id}>{index + 1}. {d.name}</li>
          ));
          botResponse = (
            <>
              Okay, which department should handle this ticket? Please enter either the number or the full name of the department:
              <StyledUnorderedList>{departmentOptions}</StyledUnorderedList>
              (Type 'cancel' to abort ticket creation)
            </>
          );
          setConversationState('getting_department');
        } else {
          // If no departments loaded, skip to type or directly to tags/creation
          botResponse = "Could not load departments. Let's proceed. Which type of issue is this? (e.g., Incident, Question) (Type 'cancel' to abort)";
          setConversationState('getting_ticket_type'); // Or handle error/skip
        }
        break;

      case 'getting_department':
        // Allow canceling the operation
        if (input.toLowerCase() === 'cancel' || input.toLowerCase() === 'back' || input.toLowerCase() === 'menu') {
          botResponse = (
            <>
              Ticket creation cancelled. What would you like to do instead?
              <StyledOrderedList>
                <li>Create a ticket</li>
                <li>Check ticket status [ID]</li>
                <li>Add comment to ticket [ID]</li>
              </StyledOrderedList>
              Please enter the number (1-3) or type your request.
            </>
          );
          setConversationState('idle');
          setPendingData({});
          break;
        }

        // Handle both number selection and name selection
        let chosenDept: typeof departments[0] | null = null;
        const deptInput = input.trim();

        // Check if input is a number
        const deptNumber = parseInt(deptInput);
        if (!isNaN(deptNumber) && deptNumber > 0 && deptNumber <= departments.length) {
          // User entered a valid number
          chosenDept = departments[deptNumber - 1];
        } else {
          // Try to match by name (case-insensitive)
          chosenDept = departments.find(d =>
            d.name.toLowerCase() === deptInput.toLowerCase()
          ) || null;
        }

        if (chosenDept) {
          setPendingData((prev: PendingTicketData) => ({ ...prev, departmentId: chosenDept!.id }));
          // Ask for type
          if (ticketTypes && ticketTypes.length > 0) {
            const typeOptions = ticketTypes.map((t, index) => (
              <li key={t.id}>{index + 1}. {t.name}</li>
            ));
            botResponse = (
              <>
                Understood. And what type of issue is this? Please enter either the number or the full name of the type:
                <StyledUnorderedList>{typeOptions}</StyledUnorderedList>
                (Type 'cancel' to abort ticket creation)
              </>
            );
            setConversationState('getting_ticket_type');
          } else {
            botResponse = "Could not load ticket types. Please add any relevant tags (optional, comma-separated), or type 'skip' or leave empty to skip. (Type 'cancel' to abort)";
            setConversationState('getting_tags');
          }
        } else {
          const departmentOptions = departments.map((d, index) => (
            <li key={d.id}>{index + 1}. {d.name}</li>
          ));
          botResponse = (
            <>
              Sorry, I didn't recognize that department. Please choose from:
              <StyledUnorderedList>{departmentOptions}</StyledUnorderedList>
              Enter either the number (1-{departments.length}) or the exact name.
              (Type 'cancel' to abort ticket creation)
            </>
          );
          // Stay in getting_department state
        }
        break;

      case 'getting_ticket_type':
        // Allow canceling the operation
        if (input.toLowerCase() === 'cancel' || input.toLowerCase() === 'back' || input.toLowerCase() === 'menu') {
          botResponse = (
            <>
              Ticket creation cancelled. What would you like to do instead?
              <StyledOrderedList>
                <li>Create a ticket</li>
                <li>Check ticket status [ID]</li>
                <li>Add comment to ticket [ID]</li>
              </StyledOrderedList>
              Please enter the number (1-3) or type your request.
            </>
          );
          setConversationState('idle');
          setPendingData({});
          break;
        }

        // Handle both number selection and name selection
        let chosenType: typeof ticketTypes[0] | null = null;
        const typeInput = input.trim();

        // Check if input is a number
        const typeNumber = parseInt(typeInput);
        if (!isNaN(typeNumber) && typeNumber > 0 && typeNumber <= ticketTypes.length) {
          // User entered a valid number
          chosenType = ticketTypes[typeNumber - 1];
        } else {
          // Try to match by name (case-insensitive)
          chosenType = ticketTypes.find(t =>
            t.name.toLowerCase() === typeInput.toLowerCase()
          ) || null;
        }

        if (chosenType) {
          setPendingData((prev: PendingTicketData) => ({ ...prev, typeId: chosenType!.id }));

          // Changed: Now we ask for priority instead of tags
          if (priorities && priorities.length > 0) {
            const priorityOptions = priorities.map((p, index) => (
              <li key={p.id}>{index + 1}. {p.name}</li>
            ));
            botResponse = (
              <>
                What priority should this ticket have? Please choose one:
                <StyledUnorderedList>{priorityOptions}</StyledUnorderedList>
                Enter either the number (1-{priorities.length}) or the exact name.
                (Type 'cancel' to abort ticket creation)
              </>
            );
            setConversationState('getting_priority');
          } else {
            // Fallback if priorities aren't loaded
            botResponse = "Great. You can add some tags to help categorize this ticket (optional, comma-separated), or type 'skip' or leave empty to skip. (Type 'cancel' to abort)";
            setConversationState('getting_tags');
          }
        } else {
          const typeOptions = ticketTypes.map((t, index) => (
            <li key={t.id}>{index + 1}. {t.name}</li>
          ));
          botResponse = (
            <>
              Sorry, I didn't recognize that type. Please choose from:
              <StyledUnorderedList>{typeOptions}</StyledUnorderedList>
              Enter either the number (1-{ticketTypes.length}) or the exact name.
              (Type 'cancel' to abort ticket creation)
            </>
          );
          // Stay in getting_ticket_type state
        }
        break;

      case 'getting_priority':
        // Allow canceling the operation
        if (input.toLowerCase() === 'cancel' || input.toLowerCase() === 'back' || input.toLowerCase() === 'menu') {
          botResponse = (
            <>
              Ticket creation cancelled. What would you like to do instead?
              <StyledOrderedList>
                <li>Create a ticket</li>
                <li>Check ticket status [ID]</li>
                <li>Add comment to ticket [ID]</li>
              </StyledOrderedList>
              Please enter the number (1-3) or type your request.
            </>
          );
          setConversationState('idle');
          setPendingData({});
          break;
        }

        // Handle both number selection and name selection
        let chosenPriority: typeof priorities[0] | null = null;
        const priorityInput = input.trim();

        // Check if input is a number
        const priorityNumber = parseInt(priorityInput);
        if (!isNaN(priorityNumber) && priorityNumber > 0 && priorityNumber <= priorities.length) {
          // User entered a valid number
          chosenPriority = priorities[priorityNumber - 1];
        } else {
          // Try to match by name (case-insensitive)
          chosenPriority = priorities.find(p =>
            p.name.toLowerCase() === priorityInput.toLowerCase()
          ) || null;
        }

        if (chosenPriority) {
          setPendingData((prev: PendingTicketData) => ({ ...prev, priorityId: chosenPriority!.id }));
          botResponse = "Great. You can add some tags to help categorize this ticket (optional, comma-separated), or type 'skip' or leave empty to skip. (Type 'cancel' to abort)";
          setConversationState('getting_tags');
        } else {
          const priorityOptions = priorities.map((p, index) => (
            <li key={p.id}>{index + 1}. {p.name}</li>
          ));
          botResponse = (
            <>
              Sorry, I didn't recognize that priority. Please choose from:
              <StyledUnorderedList>{priorityOptions}</StyledUnorderedList>
              Enter either the number (1-{priorities.length}) or the exact name.
              (Type 'cancel' to abort ticket creation)
            </>
          );
          // Stay in getting_priority state
        }
        break;

      case 'getting_tags':
        // Allow canceling the operation
        if (input.toLowerCase() === 'cancel' || input.toLowerCase() === 'back' || input.toLowerCase() === 'menu') {
          botResponse = (
            <>
              Ticket creation cancelled. What would you like to do instead?
              <StyledOrderedList>
                <li>Create a ticket</li>
                <li>Check ticket status [ID]</li>
                <li>Add comment to ticket [ID]</li>
              </StyledOrderedList>
              Please enter the number (1-3) or type your request.
            </>
          );
          setConversationState('idle');
          setPendingData({});
          break;
        }

        // Ensure user is logged in before final creation attempt
        if (!user || !user.id) {
          addNotification('You must be logged in to create a ticket.', 'error');
          botResponse = "Authentication error. Please log in to finalize ticket creation.";
          setConversationState('idle');
          setPendingData({});
          break;
        }

        // Parse tags if provided - handle skip case
        const tagInput = input.trim();
        let tags: string[] = [];

        // Allow empty input or "skip" keyword to skip tags
        if (tagInput === "" || tagInput.toLowerCase() === "skip") {
          // User chose to skip tags
          tags = [];
        } else {
          // User provided tags
          tags = tagInput.split(',').map(tag => tag.trim()).filter(tag => tag);
        }

        // Prepare final ticket data - ensure consistent structure with form
        const finalTicketData: any = {
          subject: pendingData.subject,
          description: pendingData.description,
          requesterId: user.id, // Use direct access now that we've verified it exists
          departmentId: pendingData.departmentId,
          typeId: pendingData.typeId,
          priorityId: pendingData.priorityId || (priorities && priorities.length > 0 ? priorities[1].id : 1002), // Use selected priority or default to Medium
          tags: tags, // Add parsed tags
          source: 'chat' // Set the source to 'chat' for proper tracking in the database
        };

        try {
          logger.debug("Attempting to create ticket with data:", finalTicketData);
          const newTicket = await ticketService.createTicket(finalTicketData);

          // Get priority name for display
          const priorityName = priorities.find(p => p.id === finalTicketData.priorityId)?.name || 'Medium';

          botResponse = (
            <React.Fragment>
              Ticket created successfully! <br />
              ID: {newTicket.id} <br />
              Subject: {newTicket.subject} <br />
              Status: {
                typeof newTicket.status === 'object' && newTicket.status?.name
                  ? newTicket.status.name.toUpperCase()
                  : String(newTicket.status || 'N/A').toUpperCase()
              } <br />
              Priority: {priorityName} <br />
              Department: {departments.find(d => d.id === finalTicketData.departmentId)?.name || 'N/A'} <br />
              Type: {ticketTypes.find(t => t.id === finalTicketData.typeId)?.name || 'N/A'}
              {finalTicketData.tags.length > 0 && (
                <React.Fragment> <br /> Tags: {finalTicketData.tags.join(', ')}</React.Fragment>
              )}
            </React.Fragment>
          );
          addNotification('Ticket created successfully!', 'success');
        } catch (err: any) {
          logger.error("Ticket creation failed:", err);
          // Provide more specific error feedback if possible
          const errorDetail = err.response?.data?.message || err.message || 'Unknown error';
          botResponse = `Failed to create ticket: ${errorDetail}`;
          addNotification('Failed to create ticket', 'error');
        }
        setConversationState('idle');
        setPendingData({});
        break;

      // --- Get Status Flow ---
      case 'getting_ticket_id_for_status':
        try {
          // Handle special case if user wants to go back to main menu
          if (input.toLowerCase() === 'cancel' || input.toLowerCase() === 'back' || input.toLowerCase() === 'menu') {
            botResponse = (
              <>
                Returning to main menu. What would you like to do?
                <StyledOrderedList>
                  <li>Create a ticket</li>
                  <li>Check ticket status [ID]</li>
                  <li>Add comment to ticket [ID]</li>
                </StyledOrderedList>
                Please enter the number (1-3) or type your request.
              </>
            );
            setConversationState('idle');
            break;
          }

          // Attempt to fetch the ticket
          logger.debug(`[ChatbotWidget] Calling ticketService.getTicketById with ID: ${input}`);
          const ticketData = await ticketService.getTicketById(input);
          logger.debug(`[ChatbotWidget] Received ticket data for ID ${input}:`, JSON.stringify(ticketData)); // Log received ticket data

          // Check if ticket data is valid and contains the nested ticket object
          if (!ticketData || typeof ticketData !== 'object' || !ticketData.ticket) {
            logger.error(`[ChatbotWidget] Invalid or missing nested ticket data received:`, ticketData);
            throw new Error('Received invalid ticket data structure from server.');
          }

          const actualTicket = ticketData.ticket; // Access the nested ticket object

          // Safely construct the priority display string
          let priorityDisplay = 'N/A';
          if (actualTicket.priority) {
            if (typeof actualTicket.priority === 'string') {
              priorityDisplay = actualTicket.priority.toUpperCase();
            } else if (typeof actualTicket.priority === 'object' && actualTicket.priority.name) {
              priorityDisplay = actualTicket.priority.name;
            }
          }

          // Prepare the response content with safe access to the nested object
          const responseContent = (
            <React.Fragment>
              Ticket Found: <br />
              ID: {actualTicket.id} <br />
              Subject: {actualTicket.subject || 'N/A'} <br />
              Status: <strong>{
                typeof actualTicket.status === 'object' && actualTicket.status?.name
                  ? actualTicket.status.name.toUpperCase()
                  : String(actualTicket.status || 'N/A').toUpperCase()
              }</strong> <br />
              Priority: {priorityDisplay} <br />
              Created: {(actualTicket.createdAt || (actualTicket as any).created_at)
                ? new Date(actualTicket.createdAt || (actualTicket as any).created_at).toLocaleString()
                : 'N/A'} <br />
              Updated: {(actualTicket.updatedAt || (actualTicket as any).updated_at)
                ? new Date(actualTicket.updatedAt || (actualTicket as any).updated_at).toLocaleString()
                : 'N/A'}
            </React.Fragment>
          );

          // Use addMessage to display and save (pass the nested ticket for ticketInfo)
          await addMessage(responseContent, 'bot', { ticketInfo: actualTicket });
          botResponse = null; // Prevent default response
        } catch (err: any) {
          // Log the full error for debugging
          logger.error('Error fetching ticket status:', err);

          // Construct a user-friendly message
          let userMessage = 'Please check the ID and try again.';
          if (err.status === 404) {
            userMessage = 'Ticket not found. Please verify the ID.';
          } else if (err.message) {
            // Use the error message if available, but keep it generic
            userMessage = `An error occurred (${err.message}). Please try again.`;
          }

          botResponse = `Could not find or load ticket ${input}. ${userMessage}`;
        }
        setConversationState('idle');
        break;

      // --- Add Comment Flow ---
      case 'getting_ticket_id_for_comment':
        // Handle special case if user wants to go back to main menu
        if (input.toLowerCase() === 'cancel' || input.toLowerCase() === 'back' || input.toLowerCase() === 'menu') {
          botResponse = (
            <>
              Returning to main menu. What would you like to do?
              <StyledOrderedList>
                <li>Create a ticket</li>
                <li>Check ticket status [ID]</li>
                <li>Add comment to ticket [ID]</li>
              </StyledOrderedList>
              Please enter the number (1-3) or type your request.
            </>
          );
          setConversationState('idle');
          break;
        }

        setPendingData({ ticketId: input });
        setConversationState('getting_comment_text');
        botResponse = `Okay, adding a comment to ticket ${input}. What would you like to say?`;
        break;
      case 'getting_comment_text':
        const { ticketId } = pendingData;
        const commentText = input;
        try {
          const newComment = await ticketService.addComment(ticketId, commentText);
          botResponse = `Comment added successfully to ticket ${ticketId}.`;
          addNotification('Comment added successfully!', 'success');
        } catch (err: any) {
          botResponse = `Failed to add comment to ticket ${ticketId}: ${err.message || 'Unknown error'}`;
          addNotification('Failed to add comment', 'error');
        }
        setConversationState('idle');
        setPendingData({});
        break;

      default:
        botResponse = "I seem to be lost in the conversation. Let's start over. How can I help?";
        setConversationState('idle');
        setPendingData({});
    }

    // Add the final bot response to UI and save it
    if (botResponse) {
      await addMessage(botResponse, 'bot');
    }
  };

  // Enhance fetchAndShowTicketStatus with retry logic
  const fetchAndShowTicketStatus = async (ticketId: string) => {
    setIsTyping(true);

    try {
      const ticketData = await executeWithRetry(
        () => ticketService.getTicketById(ticketId),
        `Could not find ticket ${ticketId}`
      );

      // Check if ticket data is valid and contains the nested ticket object
      if (!ticketData || typeof ticketData !== 'object' || !ticketData.ticket) {
        logger.error(`[ChatbotWidget] Invalid or missing nested ticket data in fetchAndShowTicketStatus:`, ticketData);
        throw new Error('Received invalid ticket data structure from server.');
      }

      const actualTicket = ticketData.ticket; // Access the nested ticket object

      // Safely construct the priority display string
      let priorityDisplay = 'N/A';
      if (actualTicket.priority) {
        if (typeof actualTicket.priority === 'string') {
          priorityDisplay = actualTicket.priority.toUpperCase();
        } else if (typeof actualTicket.priority === 'object' && actualTicket.priority.name) {
          priorityDisplay = actualTicket.priority.name;
        }
      }

      await addMessage(
        (
          <React.Fragment>
            Ticket Found: <br />
            ID: {actualTicket.id} <br />
            Subject: {actualTicket.subject || 'N/A'} <br />
            Status: <strong>{
              typeof actualTicket.status === 'object' && actualTicket.status?.name
                ? actualTicket.status.name.toUpperCase()
                : String(actualTicket.status || 'N/A').toUpperCase()
            }</strong> <br />
            Priority: {priorityDisplay} <br />
            Created: {(actualTicket.createdAt || (actualTicket as any).created_at)
              ? new Date(actualTicket.createdAt || (actualTicket as any).created_at).toLocaleString()
              : 'N/A'} <br />
            Updated: {(actualTicket.updatedAt || (actualTicket as any).updated_at)
              ? new Date(actualTicket.updatedAt || (actualTicket as any).updated_at).toLocaleString()
              : 'N/A'}
          </React.Fragment>
        ),
        'bot',
        { ticketInfo: actualTicket } // Pass the nested ticket for ticketInfo
      );
    } catch (err: any) {
      // Log the full error for debugging
      logger.error(`Error in fetchAndShowTicketStatus for ID ${ticketId}:`, err);

      // Construct a user-friendly message
      let userMessage = 'Please check the ID and try again.';
      if (err.status === 404) {
        userMessage = 'Ticket not found. Please verify the ID.';
      } else if (err.message) {
        userMessage = `An error occurred (${err.message}). Please try again.`;
      }

      addMessage(`Could not find or load ticket ${ticketId}. ${userMessage}`, 'bot');
    } finally {
      setIsTyping(false);
    }
  };

  // Create a ticket from chat
  const handleCreateTicket = async () => {
    try {
      // First check if user is authenticated - required for ticket creation
      if (!user) {
        addMessage("To create a ticket, you need to be logged in. Please log in and try again.", 'bot');
        return;
      }

      // Start the ticket creation flow
      setConversationState('creating_ticket_subject');
      addMessage("Let's create a support ticket. What should the subject be?", 'bot');
    } catch (error) {
      logger.error('Error in ticket creation flow:', error);
      addMessage("I'm sorry, I encountered an error trying to create a ticket. Please try again later or use the 'Create Ticket' page directly.", 'bot');
    }
  };

  // Complete ticket creation and redirect to ticket detail
  const completeTicketCreation = async (ticketData: Partial<Ticket>) => {
    try {
      // Show processing message
      addMessage("Creating your ticket...", 'bot');

      // Check if user is authenticated
      if (!user || !user.id) {
        addMessage("You need to be logged in to create a ticket.", 'bot');
        return;
      }

      // Get default priority if none is selected
      let priorityId: number;
      if (typeof ticketData.priority === 'object' && ticketData.priority?.id) {
        priorityId = Number(ticketData.priority.id);
      } else if (priorities && priorities.length > 0) {
        // Default to Medium priority if available (usually index 1)
        priorityId = priorities.length > 1 ? Number(priorities[1].id) : Number(priorities[0].id);
      } else {
        // Fallback to 1002 (Medium) if no priorities are loaded
        priorityId = 1002;
      }

      // Prepare ticket data with required fields - use consistent format with main form
      const createTicketRequest: any = {
        subject: ticketData.subject || 'Support request from chat',
        description: ticketData.description || 'No description provided',
        requesterId: user.id, // Now guaranteed to exist
        priorityId: priorityId,
        departmentId: ticketData.department?.id,
        typeId: ticketData.type?.id,
        tags: ticketData.tags || [],
        source: 'chat' // Set the source to 'chat' for proper tracking in the database
      };

      // Use the same ticketService method as the form flow
      const response = await ticketService.createTicket(createTicketRequest);

      if (response && response.id) {
        // Success message with a link to the created ticket
        addMessage(
          <Box>
            <Typography variant="body1">
              Your ticket has been created successfully!
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<VisibilityIcon />}
              onClick={() => navigate(`/tickets/${response.id}`)}
              sx={{ mt: 1 }}
            >
              View Ticket #{response.id}
            </Button>
          </Box>,
          'bot'
        );

        // Reset conversation state
        setConversationState('idle');
      } else {
        throw new Error('Failed to create ticket - no ticket ID returned');
      }
    } catch (error) {
      logger.error('Error creating ticket:', error);
      addMessage("I'm sorry, there was an error creating your ticket. Please try again or use the 'Create Ticket' page.", 'bot');
      setConversationState('idle');
    }
  };

  // View knowledge base article (implementing the placeholder)
  const handleViewArticle = (articleId: string, articleTitle: string) => {
    // Add a message in the chat showing we're navigating to the article
    addMessage(`Opening article: "${articleTitle}" for you...`, 'bot');

    // Create a button that will navigate to the article
    addMessage(
      <Box>
        <Typography variant="body1">
          Here's the article you requested:
        </Typography>
        <Button
          variant="contained"
          color="primary"
          size="small"
          startIcon={<ArticleIcon />}
          onClick={() => navigate(`/knowledge/${articleId}`)}
          sx={{ mt: 1 }}
        >
          View Article: {articleTitle}
        </Button>
      </Box>,
      'bot'
    );
  };

  // Copy conversation to clipboard
  const handleCopyConversation = () => {
    const conversationText = messages
      .map(msg => {
        const prefix = msg.sender === 'user' ? 'User' : 'AI';
        // Handle ReactNode messages by trying to extract text content
        const textContent = typeof msg.text === 'string' ? msg.text : (msg.text as React.ReactElement)?.props?.children?.toString() || '[Complex Content]';
        return `${prefix}: ${textContent}`;
      })
      .join('\\n');

    navigator.clipboard.writeText(conversationText).then(() => {
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
      addNotification('Conversation copied to clipboard!', 'info');
    }).catch(err => {
      addNotification('Failed to copy conversation.', 'error');
      logger.error('Clipboard copy failed:', err);
    });
  };

  // Handle message feedback
  const handleFeedback = (messageId: string, feedbackType: 'positive' | 'negative') => {
    setMessages(prevMessages =>
      prevMessages.map(msg =>
        msg.id === messageId
          ? { ...msg, feedback: feedbackType }
          : msg
      )
    );

    // In a real app, you would send this feedback to your backend
    logger.debug(`Feedback for message ${messageId}: ${feedbackType}`);
    addNotification('Thank you for your feedback!', 'info');
  };

  // Effect to scroll down when new messages appear or typing starts/stops
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // Effect to focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <>
      {/* Chat toggle button */}
      <Zoom in={true}>
        <Fab
          color="primary"
          aria-label="chat"
          onClick={toggleChat}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-5px)',
              boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
            }
          }}
        >
          {isOpen ? (
            <KeyboardArrowUpIcon />
          ) : (
            <Badge
              badgeContent={unreadMessages}
              color="error"
              overlap="circular"
              invisible={unreadMessages === 0}
            >
              <ChatIcon />
            </Badge>
          )}
        </Fab>
      </Zoom>

      {/* Chat window */}
      <Collapse in={isOpen} timeout="auto" unmountOnExit>
        <ChatContainer>
          <ChatHeader>
            <Box display="flex" alignItems="center" gap={1}>
              <Avatar
                sx={{
                  bgcolor: theme.palette.mode === 'dark' ? 'primary.dark' : alpha(theme.palette.common.white, 0.9),
                  color: theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.primary.main
                }}
              >
                <SmartToyIcon />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold">
                  AI Support Assistant
                </Typography>
                <Typography variant="caption">
                  Online | Typically replies instantly
                </Typography>
              </Box>
            </Box>
            <Box display="flex" alignItems="center">
              <Tooltip title="Copy conversation">
                <IconButton
                  size="small"
                  onClick={handleCopyConversation}
                  sx={{ color: alpha(theme.palette.primary.contrastText, 0.8), mr: 1 }}
                >
                  {isCopied ? <DoneIcon /> : <ContentCopyIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <IconButton
                size="small"
                onClick={toggleChat}
                sx={{ color: alpha(theme.palette.primary.contrastText, 0.8) }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </ChatHeader>

          <MessagesContainer>
            {messages.map((message) => (
              <Box
                key={message.id}
                sx={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: message.sender === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                {/* Avatar logic could be simplified or removed if not needed */}
                {/* ... avatar logic ... */}

                <MessageBubble isUser={message.sender === 'user'}>
                  {message.text}
                </MessageBubble>

                {/* Timestamp (Optional) */}
                <Typography
                  variant="caption"
                  sx={{
                    mt: 0.5,
                    mx: 1,
                    color: 'text.secondary',
                    alignSelf: message.sender === 'user' ? 'flex-end' : 'flex-start'
                  }}
                >
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Typography>

                {/* Feedback Buttons for Bot Messages */}
                {message.sender === 'bot' && !message.isTyping && (
                  <FeedbackBar sx={{ alignSelf: 'flex-start' }}>
                    <Tooltip title="Helpful">
                      <IconButton
                        size="small"
                        color={message.feedback === 'positive' ? 'success' : 'default'}
                        sx={{
                          p: 0.5,
                          opacity: message.feedback === 'positive' ? 1 : 0.5,
                          '&:hover': { opacity: 1 }
                        }}
                        onClick={() => handleFeedback(message.id, 'positive')}
                      >
                        <ThumbUpIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Not helpful">
                      <IconButton
                        size="small"
                        color={message.feedback === 'negative' ? 'error' : 'default'}
                        sx={{
                          p: 0.5,
                          opacity: message.feedback === 'negative' ? 1 : 0.5,
                          '&:hover': { opacity: 1 }
                        }}
                        onClick={() => handleFeedback(message.id, 'negative')}
                      >
                        <ThumbDownIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </FeedbackBar>
                )}

                {/* Action Buttons / Suggestions for Bot Messages */}
                {message.sender === 'bot' && message.suggestions && (
                  <Box mt={1} display="flex" flexDirection="column" gap={1} sx={{ alignSelf: 'flex-start', maxWidth: '80%' }}>
                    {/* Knowledge Article Suggestions */}
                    {message.suggestions.knowledgeArticles && message.suggestions.knowledgeArticles.length > 0 && (
                      <Card
                        variant="outlined"
                        sx={{
                          maxWidth: '80%',
                          alignSelf: 'flex-start',
                          borderRadius: 2,
                          borderColor: theme.palette.mode === 'dark'
                            ? alpha(theme.palette.primary.main, 0.3)
                            : alpha(theme.palette.primary.main, 0.2),
                          background: theme.palette.mode === 'dark'
                            ? alpha(theme.palette.background.paper, 0.4)
                            : alpha(theme.palette.background.paper, 0.7)
                        }}
                      >
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="caption" color="text.secondary" gutterBottom>
                            Related articles that might help:
                          </Typography>

                          {message.suggestions.knowledgeArticles.map(article => (
                            <Box
                              key={article.id}
                              display="flex"
                              alignItems="center"
                              gap={1}
                              onClick={() => handleViewArticle(article.id, article.title)}
                              sx={{
                                cursor: 'pointer',
                                '&:hover': {
                                  bgcolor: theme.palette.mode === 'dark'
                                    ? alpha(theme.palette.primary.main, 0.15)
                                    : alpha(theme.palette.primary.main, 0.08)
                                },
                                borderRadius: 1,
                                p: 0.5
                              }}
                            >
                              <ArticleIcon fontSize="small" color="primary" />
                              <Typography variant="body2">
                                {article.title}
                              </Typography>
                            </Box>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Create Ticket Suggestion */}
                    {message.suggestions.createTicket && (
                      <Button
                        startIcon={<ConfirmationNumberIcon />}
                        variant="outlined"
                        size="small"
                        onClick={handleCreateTicket}
                        sx={{ alignSelf: 'flex-start' }}
                      >
                        Create Ticket from this issue?
                      </Button>
                    )}
                  </Box>
                )}
              </Box>
            ))}
            {isTyping && (
              <Box display="flex" alignItems="center" gap={1} sx={{ alignSelf: 'flex-start' }}>
                <Avatar sx={{ width: 24, height: 24, bgcolor: theme.palette.primary.main, fontSize: '0.875rem' }}>
                  <SmartToyIcon fontSize="small" />
                </Avatar>
                <MessageBubble isUser={false}>
                  <CircularProgress size={20} color="inherit" />
                </MessageBubble>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </MessagesContainer>

          <ChatFooter>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder="Type your message..."
              value={inputValue}
              onChange={handleInputChange}
              inputRef={inputRef}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey ? handleSubmit() : null} // Submit on Enter
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '20px',
                  backgroundColor: theme.palette.background.default,
                }
              }}
            />
            <IconButton color="primary" onClick={handleSubmit} disabled={!inputValue.trim() || isTyping}>
              <SendIcon />
            </IconButton>
          </ChatFooter>
        </ChatContainer>
      </Collapse>
    </>
  );
};

export default ChatbotWidget; 