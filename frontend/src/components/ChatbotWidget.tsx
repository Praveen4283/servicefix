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
  Badge
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SendIcon from '@mui/icons-material/Send';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import ArticleIcon from '@mui/icons-material/Article';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DoneIcon from '@mui/icons-material/Done';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';

// Import ticket service and auth context
import ticketService, { Ticket, TicketComment, TicketStatus, TicketPriority } from '../services/ticketService';
import chatbotService from '../services/chatbotService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

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
  | 'getting_ticket_id_for_status'
  | 'getting_ticket_id_for_comment'
  | 'getting_comment_text';
  // Add more states as needed (e.g., for editing)

// Root component
const ChatbotWidget: React.FC = () => {
  const theme = useTheme();
  const { user, isAuthenticated } = useAuth(); // Get authenticated user info
  const { addNotification } = useNotification();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: (
        <>
          Hello! I'm your AI support assistant. How can I help you today? 
          <br />You can ask me to:
          <ul>
            <li>Create a ticket</li>
            <li>Check ticket status [ID]</li>
            <li>Add comment to ticket [ID]</li>
          </ul>
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

  // Scroll to bottom of messages container
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Ensure conversation exists before saving message
  const ensureConversation = async (): Promise<string> => {
    if (conversationId) {
      return conversationId;
    }
    try {
      const newConversation = await chatbotService.startConversation();
      setConversationId(newConversation.id);
      console.log('Started new conversation:', newConversation.id);
      return newConversation.id;
    } catch (error) {
      console.error("Failed to start conversation:", error);
      addNotification('Could not start chat session. Please try again later.', 'error');
      throw new Error('Failed to start conversation'); // Propagate error
    }
  };

  // Add a message to the chat UI and save it to the backend
  const addMessage = async (text: string | React.ReactNode, sender: 'user' | 'bot', extraData?: Partial<Message>) => {
    const messageContent = typeof text === 'string' ? text : '[Rich Content]'; // Get string representation for saving
    
    // 1. Ensure conversation exists
    let currentConversationId: string;
    try {
      currentConversationId = await ensureConversation();
    } catch (error) {
      return; // Don't add message if conversation failed to start
    }

    // 2. Add message to UI state
    const newMessage: Message = {
      id: `${sender}-${Date.now()}`,
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

    // 3. Save message to backend (fire and forget, but log errors)
    chatbotService.saveMessage(currentConversationId, { 
      senderType: sender,
      content: messageContent,
      metadata: extraData?.ticketInfo ? { ticketId: (extraData.ticketInfo as Ticket).id } : undefined // Example metadata
    }).catch(error => {
      console.error(`Failed to save ${sender} message to backend:`, error);
      // Optionally notify user, but might be too noisy
      // addNotification('Failed to save message history.', 'warning');
    });
  };

  // Handle chat toggle
  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadMessages(0);
      // Reset conversation ID when chat is closed and reopened?
      // setConversationId(null); // Consider implications 
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  // Handle form submission - Main logic loop
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const currentInput = inputValue.trim();
    if (!currentInput) return;

    const userMessageText = currentInput; // Store before clearing
    setInputValue(''); // Clear input immediately for better UX
    setIsTyping(true);
    
    try {
      // Add user message to UI and save to backend
      await addMessage(userMessageText, 'user'); 
      
      // Process user input based on conversation state
      await processUserInput(userMessageText);
    } catch (error: any) {
      console.error("Chatbot Error:", error);
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
        const lowerInput = input.toLowerCase();
        // --- Intent: Create Ticket ---
        if (lowerInput.includes('create') && lowerInput.includes('ticket')) {
          setConversationState('creating_ticket_subject');
          botResponse = "Okay, I can help create a ticket. What should the subject be?";
        } 
        // --- Intent: Check Status ---
        else if (lowerInput.includes('status') || lowerInput.includes('check ticket')) {
          // Try to extract ID with regex
          const match = lowerInput.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i); // Basic UUID regex
          if (match && match[1]) {
            await fetchAndShowTicketStatus(match[1]);
            botResponse = null; // Response handled in function
            setConversationState('idle'); 
          } else {
            setConversationState('getting_ticket_id_for_status');
            botResponse = "Sure, I can check a ticket's status. What is the ticket ID?";
          }
        }
        // --- Intent: Add Comment ---
        else if (lowerInput.includes('comment') || lowerInput.includes('add note')) {
           // Try to extract ID with regex
           const match = lowerInput.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i); // Basic UUID regex
           if (match && match[1]) {
             setPendingData({ ticketId: match[1] });
             setConversationState('getting_comment_text');
             botResponse = `Okay, adding a comment to ticket ${match[1]}. What would you like to say?`;
           } else {
            setConversationState('getting_ticket_id_for_comment');
            botResponse = "Okay, I can add a comment. What is the ticket ID you want to comment on?";
           }
        } 
        // --- Default / Help ---
        else {
           botResponse = (
            <>
              Sorry, I didn't quite catch that. You can ask me to:
              <ul>
                <li>Create a ticket</li>
                <li>Check ticket status [ID]</li>
                <li>Add comment to ticket [ID]</li>
              </ul>
              How can I help?
            </>
           );
           setConversationState('idle'); // Stay idle or reset
        }
        break;

      // --- Create Ticket Flow ---
      case 'creating_ticket_subject':
        setPendingData({ subject: input });
        setConversationState('creating_ticket_description');
        botResponse = "Got it. Now, please provide a description for the ticket.";
        break;
      case 'creating_ticket_description':
        const ticketData = { 
            title: pendingData.subject, 
            description: input, 
            priority: TicketPriority.MEDIUM 
        };
        try {
            const newTicket = await ticketService.createTicket(ticketData);
            botResponse = (
              <>
                Ticket created successfully! <br />
                ID: {newTicket.id} <br />
                Subject: {newTicket.title} <br />
                Status: {newTicket.status}
              </>
            );
            addNotification('Ticket created successfully!', 'success');
        } catch (err: any) {
            botResponse = `Failed to create ticket: ${err.message || 'Unknown error'}`;
            addNotification('Failed to create ticket', 'error');
        }
        setConversationState('idle');
        setPendingData({});
        break;

      // --- Get Status Flow ---
      case 'getting_ticket_id_for_status':
         try {
            const ticket = await ticketService.getTicketById(input);
            // Prepare the response content
            const responseContent = (
              <>
                Ticket Found: <br />
                ID: {ticket.id} <br />
                Subject: {ticket.title} <br />
                Status: <strong>{ticket.status.toUpperCase()}</strong> <br />
                Priority: {ticket.priority.toUpperCase()} <br />
                Created: {new Date(ticket.createdAt).toLocaleString()} <br />
                Updated: {new Date(ticket.updatedAt).toLocaleString()}
              </>
            );
            // Use addMessage to display and save
            await addMessage(responseContent, 'bot', { ticketInfo: ticket });
            botResponse = null; // Prevent default response
          } catch (err: any) {
            botResponse = `Could not find ticket ${input}: ${err.message || 'Please check the ID and try again.'}`;
            // Error response will be added via addMessage below
          }
        setConversationState('idle');
        break;

      // --- Add Comment Flow ---
      case 'getting_ticket_id_for_comment':
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

  // Helper function to fetch and display ticket status
  const fetchAndShowTicketStatus = async (ticketId: string) => {
    try {
      const ticket = await ticketService.getTicketById(ticketId);
      addMessage(
        (
          <>
            Ticket Found: <br />
            ID: {ticket.id} <br />
            Subject: {ticket.title} <br />
            Status: <strong>{ticket.status.toUpperCase()}</strong> <br />
            Priority: {ticket.priority.toUpperCase()} <br />
            Created: {new Date(ticket.createdAt).toLocaleString()} <br />
            Updated: {new Date(ticket.updatedAt).toLocaleString()}
          </>
        ), 
        'bot',
        { ticketInfo: ticket } // Store ticket info if needed later
      );
    } catch (err: any) {
      addMessage(`Could not find ticket ${ticketId}: ${err.message || 'Please check the ID and try again.'}`, 'bot');
    }
  };
  
  // Create a ticket from chat (Placeholder - might be replaced by main flow)
  const handleCreateTicket = async () => {
    // This could potentially pre-fill the subject/description fields if called from suggestion
    setConversationState('creating_ticket_subject');
    addMessage("Okay, let's create a ticket. What should the subject be?", 'bot');
  };
  
  // View knowledge base article (Placeholder)
  const handleViewArticle = (articleId: string, articleTitle: string) => {
    // In a real app, this would navigate to the knowledge base article
    addMessage(`Okay, showing article: ${articleTitle} (ID: ${articleId})`, 'bot');
    // Maybe open link in new tab? window.open(`/knowledge/${articleId}`, '_blank');
    alert(`Navigating to article: ${articleTitle} (ID: ${articleId})`);
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
      console.error('Clipboard copy failed:', err);
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
    console.log(`Feedback for message ${messageId}: ${feedbackType}`);
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
          
          <MessagesContainer ref={messagesEndRef}>
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
            {/* <div ref={messagesEndRef} /> */}
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