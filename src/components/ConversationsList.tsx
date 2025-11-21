import React, { useState, useEffect } from 'react';
import { MessageSquare, Lock, Clock, User, Briefcase } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ConversationsListProps {
  onSelectConversation: (conversationId: string) => void;
}

const ConversationsList: React.FC<ConversationsListProps> = ({ onSelectConversation }) => {
  const { token, user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/secure-conversations/my-conversations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched conversations:', data);
        setConversations(data);
      } else {
        console.error('Failed to fetch conversations');
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center text-gray-500">Loading conversations...</div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Conversations Yet</h2>
          <p className="text-gray-500">
            {user?.type === 'freelancer' 
              ? 'Your secure conversations will appear here once a client accepts your proposal.'
              : 'Your secure conversations will appear here once you accept a proposal.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Lock className="h-6 w-6 mr-2 text-green-600" />
          Secure Conversations
        </h1>
        <p className="text-gray-600 mt-1">End-to-end encrypted messaging with your partners</p>
      </div>

      <div className="grid gap-4">
        {conversations.map((conversation) => {
          const otherUser = conversation.clientId._id === user?.id 
            ? conversation.freelancerId 
            : conversation.clientId;
          
          const isClient = conversation.clientId._id === user?.id;

          return (
            <div
              key={conversation._id}
              onClick={() => onSelectConversation(conversation.conversationId)}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 hover:border-blue-400"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  {/* User Avatar */}
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                    {otherUser.name?.[0]?.toUpperCase() || <User className="h-6 w-6" />}
                  </div>

                  {/* Conversation Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">{otherUser.name}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        isClient ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {isClient ? 'Freelancer' : 'Client'}
                      </span>
                    </div>

                    {/* Job Title */}
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <Briefcase className="h-4 w-4 mr-1" />
                      {conversation.jobId?.title || 'Job'}
                    </div>

                    {/* Status */}
                    <div className="flex items-center space-x-4 text-sm">
                      <span className={`flex items-center ${
                        conversation.status === 'active' ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        <Lock className="h-4 w-4 mr-1" />
                        {conversation.status === 'active' ? 'Active' : conversation.status}
                      </span>
                      <span className="flex items-center text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        {new Date(conversation.lastActivity).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectConversation(conversation.conversationId);
                  }}
                >
                  Open Chat
                </button>
              </div>

              {/* Budget Info */}
              {conversation.jobId?.budget && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <span className="text-sm text-gray-600">
                    Budget: <span className="font-semibold text-gray-900">₹{conversation.jobId.budget.toLocaleString()}</span>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConversationsList;
