// frontend/src/pages/chat/ChatPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../services/api';
import './ChatPage.css';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
  tokens_used?: number;
}

interface Conversation {
  id: string;
  title: string;
  total_messages: number;
  total_tokens: number;
  created_at: string;
  updated_at: string;
  last_message?: {
    content: string;
    role: string;
    created_at: string;
  };
  documents: Array<{
    id: string;
    title: string;
    file_type: string;
    file_size: number;
  }>;
}

interface Document {
  id: string;
  title: string;
  file_type: string;
  file_size: number;
  created_at: string;
  word_count?: number;
  page_count?: number;
  has_content?: boolean;
  content_length?: number;
  status?: string;
}

interface DocumentsApiResponse {
  documents: Document[];
}

interface MessageResponse {
  messages: Message[];
  conversation: Conversation;
}

const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle document parameter from URL with improved error handling
  useEffect(() => {
    const documentId = searchParams.get('document');
    if (documentId && documentId !== 'undefined' && !isCreatingConversation) {
      console.log('Document ID from URL:', documentId);
      handleDocumentFromUrl(documentId);
    }
  }, [searchParams, isCreatingConversation]);

  // Load conversations and documents on mount
  useEffect(() => {
    loadConversations();
    loadAvailableDocuments();
  }, []);

  const handleDocumentFromUrl = async (documentId: string) => {
    console.log('Processing document from URL:', documentId);
    setIsCreatingConversation(true);
    setError(null);
    
    try {
      // First, verify the document exists and has content
      const documentsResponse = await apiClient.get('/api/chat/documents/');
      const documentsData = documentsResponse.data as DocumentsApiResponse;
      const documents = documentsData.documents;
      const targetDocument = documents.find((doc: Document) => doc.id === documentId);
      
      if (!targetDocument) {
        console.error('Document not found:', documentId);
        setError('Document not found');
        setIsCreatingConversation(false);
        return;
      }

      // Check if document has content
      if (!targetDocument.has_content) {
        console.warn('Document has no content:', targetDocument.title);
        setError(`Document "${targetDocument.title}" appears to have no readable content. Please try re-uploading the file.`);
        setIsCreatingConversation(false);
        return;
      }

      // Create a conversation with this document
      const conversationTitle = `Chat about ${targetDocument.title}`;
      console.log('Creating conversation:', conversationTitle, 'with document:', documentId);
      console.log('Document info:', {
        title: targetDocument.title,
        status: targetDocument.status,
        has_content: targetDocument.has_content,
        content_length: targetDocument.content_length
      });
      
      const response = await apiClient.post('/api/chat/conversations/', {
        title: conversationTitle,
        document_ids: [documentId]
      });

      const newConversation = response.data as Conversation;
      console.log('Created conversation:', newConversation.id, 'with', newConversation.documents.length, 'documents');
      
      // Update conversations list and select the new one
      setConversations(prev => [newConversation, ...prev]);
      setCurrentConversation(newConversation);
      setMessages([]);
      
      // Clear the document parameter from URL
      setSearchParams({});
      
    } catch (error: any) {
      console.error('Failed to create conversation from document:', error);
      setError(error.response?.data?.error || 'Failed to create conversation with document');
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await apiClient.get('/api/chat/conversations/');
      const conversationsData = response.data as Conversation[];
      setConversations(conversationsData);
      
      // Auto-select first conversation if available and no document parameter
      if (conversationsData.length > 0 && !currentConversation && !searchParams.get('document')) {
        selectConversation(conversationsData[0]);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setError('Failed to load conversations');
    }
  };

  const loadAvailableDocuments = async () => {
    try {
      const response = await apiClient.get('/api/chat/documents/');
      const data = response.data as DocumentsApiResponse;
      console.log('Loaded documents for chat:', data.documents.length, 'documents');
      
      // Log document status for debugging
      data.documents.forEach((doc: Document) => {
        console.log(`Document: ${doc.title}, Status: ${doc.status}, Has Content: ${doc.has_content}, Length: ${doc.content_length}`);
      });
      
      setAvailableDocuments(data.documents);
    } catch (error) {
      console.error('Failed to load documents:', error);
      setError('Failed to load available documents');
    }
  };

  const selectConversation = async (conversation: Conversation) => {
    console.log('Selecting conversation:', conversation.title, 'with', conversation.documents.length, 'documents');
    setCurrentConversation(conversation);
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.get(`/api/chat/conversations/${conversation.id}/messages/`);
      const messagesData = response.data as Message[];
      setMessages(messagesData);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
      setError('Failed to load conversation messages');
    } finally {
      setIsLoading(false);
    }
  };

  const createNewConversation = async () => {
    if (!newChatTitle.trim()) {
      setError('Please enter a conversation title');
      return;
    }

    try {
      setError(null);
      console.log('Creating conversation with title:', newChatTitle);
      console.log('Selected documents:', selectedDocuments);
      console.log('Available documents:', availableDocuments);
      
      // Simply proceed with conversation creation - let backend handle validation
      const response = await apiClient.post('/api/chat/conversations/', {
        title: newChatTitle,
        document_ids: selectedDocuments
      });

      const newConversation = response.data as Conversation;
      console.log('Successfully created conversation:', newConversation.id);
      console.log('Conversation documents:', newConversation.documents);
      
      setConversations(prev => [newConversation, ...prev]);
      setCurrentConversation(newConversation);
      setMessages([]);
      setNewChatTitle('');
      setSelectedDocuments([]);
      setShowNewChatModal(false);
      
      console.log('Modal closed, conversation set as current');
      
    } catch (error: any) {
      console.error('Failed to create conversation:', error);
      console.error('Full error response:', error.response);
      
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else if (error.response?.data?.detail) {
        setError(error.response.data.detail);
      } else {
        setError('Failed to create new conversation. Please try again.');
      }
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentConversation || isSending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setIsSending(true);
    setError(null);

    console.log('Sending message to conversation:', currentConversation.id, 'with', currentConversation.documents.length, 'linked documents');

    try {
      const response = await apiClient.post(`/api/chat/conversations/${currentConversation.id}/messages/`, 
        { content: messageContent });

      const responseData = response.data as MessageResponse;

      // Update messages with both user and AI messages
      setMessages(prev => [...prev, ...responseData.messages]);
      
      // Update conversation info
      setCurrentConversation(responseData.conversation);
      
      // Update conversation in the list
      setConversations(prev => 
        prev.map(conv => 
          conv.id === currentConversation.id 
            ? responseData.conversation 
            : conv
        )
      );
      
    } catch (error: any) {
      console.error('Failed to send message:', error);
      setError(error.response?.data?.error || 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!window.confirm('Are you sure you want to delete this conversation?')) return;

    try {
      await apiClient.delete(`/api/chat/conversations/${conversationId}/`);
      
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      if (currentConversation?.id === conversationId) {
        const remaining = conversations.filter(conv => conv.id !== conversationId);
        if (remaining.length > 0) {
          selectConversation(remaining[0]);
        } else {
          setCurrentConversation(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      setError('Failed to delete conversation');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isCreatingConversation) {
    return (
      <div className="chat-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Setting up your document chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      
      <div className="chat-container">
        {/* Sidebar */}
        <div className="chat-sidebar">
          <div className="sidebar-header">
            <h2>Chat with AI</h2>
            <button 
              className="new-chat-btn"
              onClick={() => setShowNewChatModal(true)}
            >
              + New Chat
            </button>
          </div>

          <div className="conversations-list">
            {conversations.map(conversation => (
              <div 
                key={conversation.id}
                className={`conversation-item ${currentConversation?.id === conversation.id ? 'active' : ''}`}
                onClick={() => selectConversation(conversation)}
              >
                <div className="conversation-title">{conversation.title}</div>
                <div className="conversation-meta">
                  {conversation.documents.length > 0 && (
                    <span className="document-count">
                      📄 {conversation.documents.length} docs
                    </span>
                  )}
                  <span className="message-count">{conversation.total_messages} messages</span>
                </div>
                {conversation.last_message && (
                  <div className="last-message">
                    {conversation.last_message.content}
                  </div>
                )}
                <button 
                  className="delete-conversation-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conversation.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="chat-main">
          {currentConversation ? (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <h3>{currentConversation.title}</h3>
                {currentConversation.documents.length > 0 && (
                  <div className="active-documents">
                    <span>Documents: </span>
                    {currentConversation.documents.map(doc => (
                      <span key={doc.id} className="document-tag">
                        {doc.title}
                      </span>
                    ))}
                  </div>
                )}
                <div className="conversation-stats">
                  {currentConversation.total_messages} messages • {currentConversation.total_tokens} tokens
                </div>
              </div>

              {/* Messages */}
              <div className="messages-container">
                {isLoading ? (
                  <div className="loading">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="empty-chat">
                    {currentConversation.documents.length > 0 ? (
                      <p>I have access to your document "{currentConversation.documents[0].title}". Ask me anything about it!</p>
                    ) : (
                      <p>Start a conversation! Ask questions about your documents or anything else.</p>
                    )}
                  </div>
                ) : (
                  messages.map(message => (
                    <div key={message.id} className={`message ${message.role}`}>
                      <div className="message-content">
                        {message.content}
                      </div>
                      <div className="message-meta">
                        {formatDateTime(message.created_at)}
                        {message.tokens_used && message.tokens_used > 0 && (
                          <span className="tokens">• {message.tokens_used} tokens</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isSending && (
                  <div className="message assistant loading-message">
                    <div className="message-content">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      AI is thinking...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="message-input-container">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    currentConversation.documents.length > 0 
                      ? `Ask about "${currentConversation.documents[0].title}" or anything else...`
                      : "Ask a question about your documents or anything else..."
                  }
                  className="message-input"
                  rows={3}
                  disabled={isSending}
                />
                <button 
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="send-button"
                >
                  {isSending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </>
          ) : (
            <div className="no-conversation">
              <h3>Welcome to Learnify AI Chat!</h3>
              <p>Select a conversation from the sidebar or create a new one to start chatting with AI about your documents.</p>
              <button 
                className="create-first-chat-btn"
                onClick={() => setShowNewChatModal(true)}
              >
                Create Your First Chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="modal-overlay" onClick={() => setShowNewChatModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Chat</h3>
              <button 
                className="modal-close"
                onClick={() => setShowNewChatModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Conversation Title</label>
                <input
                  type="text"
                  value={newChatTitle}
                  onChange={(e) => setNewChatTitle(e.target.value)}
                  placeholder="e.g., Math Homework Help"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Select Documents (Optional)</label>
                <div className="documents-selection">
                  {availableDocuments.map(doc => (
                    <label key={doc.id} className="document-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedDocuments.includes(doc.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDocuments(prev => [...prev, doc.id]);
                          } else {
                            setSelectedDocuments(prev => prev.filter(id => id !== doc.id));
                          }
                        }}
                      />
                      <div className="document-info">
                        <span className="document-name">{doc.title}</span>
                        <span className="document-details">
                          {doc.file_type.toUpperCase()} • {formatFileSize(doc.file_size)}
                          {doc.word_count && ` • ${doc.word_count} words`}
                          {doc.page_count && ` • ${doc.page_count} pages`}
                          {doc.has_content && " • ✓ Ready"}
                          {!doc.has_content && " • ⚠ No content"}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
                {availableDocuments.length === 0 && (
                  <p className="no-documents">No documents available. Upload some documents first!</p>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn-secondary"
                onClick={() => setShowNewChatModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={createNewConversation}
                disabled={!newChatTitle.trim()}
              >
                Create Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;