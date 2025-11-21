import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { getSocketUrl } from './config/api';
import AuthForm from './components/AuthForm';
import Header from './components/Header';
import PostJob from './components/PostJob';
import Dashboard from './components/Dashboard';
import UserProfile from './components/UserProfile';
import SkillVerification from './components/SkillVerification';
import JobSearch from './components/JobSearch';
import JobDetails from './components/JobDetails';
import Chat from './components/Chat';
import SecureChat from './components/SecureChat';
import ConversationsList from './components/ConversationsList';
import AdminPanel from './components/AdminPanel';
import TeamWorkspace from './components/TeamWorkspace';
import Wallet from './components/Wallet';
import SubscriptionPlans from './components/SubscriptionPlans';
import BillingPortal from './components/BillingPortal';
import UsageTracker from './components/UsageTracker';
import ErrorBoundary from './components/ErrorBoundary';
import { Job } from './types';

const AppContent: React.FC = () => {
  const { user, token, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState('jobs');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [secureConversationId, setSecureConversationId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [realtimeUpdate, setRealtimeUpdate] = useState<number>(0); // Trigger for re-renders

  // Setup global Socket.IO connection for real-time updates
  useEffect(() => {
    if (!user || !token) return;

    console.log('🌐 Initializing global Socket.IO connection...');
    // Use relative path for Socket.IO to work with proxy
    const socketUrl = window.location.origin.replace(/:\d+$/, ':3001');
    console.log('🔌 Connecting to:', socketUrl);
    
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      path: '/socket.io/'
    });

    newSocket.on('connect', () => {
      console.log('✅ Global Socket connected:', newSocket.id);
      newSocket.emit('join', { userId: user.id });
    });

    // Listen for real-time job updates
    newSocket.on('job_created', (data: any) => {
      console.log('🆕 New job created:', data);
      setRealtimeUpdate(prev => prev + 1); // Trigger re-render
    });

    newSocket.on('job_updated', (data: any) => {
      console.log('📝 Job updated:', data);
      setRealtimeUpdate(prev => prev + 1);
    });

    newSocket.on('proposal_submitted', (data: any) => {
      console.log('📬 New proposal submitted:', data);
      setRealtimeUpdate(prev => prev + 1);
    });

    newSocket.on('proposal_accepted', (data: any) => {
      console.log('✅ Proposal accepted:', data);
      setRealtimeUpdate(prev => prev + 1);
    });

    newSocket.on('bid_placed', (data: any) => {
      console.log('💰 New bid placed:', data);
      setRealtimeUpdate(prev => prev + 1);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Global Socket disconnected');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user, token]);

  // Handle Messages button click - directly open first conversation or show list
  const handleChatClick = async () => {
    // Always go to chat view to show conversations list
    setCurrentView('chat');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  const renderView = () => {
    // If a job is selected, show job details
    if (selectedJob && currentView === 'jobs') {
      return <JobDetails job={selectedJob} onBack={() => setSelectedJob(null)} />;
    }

    switch (currentView) {
      case 'jobs':
        return <JobSearch onJobSelect={setSelectedJob} key={realtimeUpdate} />;
      case 'post-job':
        return <PostJob key={realtimeUpdate} />;
      case 'dashboard':
        return <Dashboard 
          onOpenSecureChat={(conversationId: string) => {
            console.log('📱 Opening conversation from dashboard:', conversationId);
            setCurrentView('chat'); // Switch to chat view first
            setSecureConversationId(conversationId);
          }}
          onOpenWorkspace={(workspaceId: string) => {
            console.log('🏢 Opening workspace:', workspaceId);
            setWorkspaceId(workspaceId);
          }}
          key={realtimeUpdate}
        />;
      case 'profile':
        return <UserProfile user={user} isOwnProfile={true} />;
      case 'skill-verification':
        return <SkillVerification userId={user.id} isOwnProfile={true} />;
      case 'wallet':
        return <Wallet />;
      case 'subscription-plans':
        return <SubscriptionPlans />;
      case 'billing':
        return <BillingPortal />;
      case 'usage':
        return <UsageTracker />;
      case 'admin':
        return user.type === 'admin' ? <AdminPanel /> : <div>Access Denied</div>;
      case 'chat':
        return <ConversationsList onSelectConversation={(conversationId: string) => {
          console.log('📱 Opening conversation:', conversationId);
          setSecureConversationId(conversationId);
        }} />;
      default:
        return <JobSearch onJobSelect={setSelectedJob} key={realtimeUpdate} />;
    }
  };

  console.log('🔍 App state:', { currentView, secureConversationId, hasToken: !!token });

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <Header 
        currentView={currentView} 
        onViewChange={setCurrentView}
        user={user}
        onProfileClick={() => setCurrentView('profile')}
        onSkillVerificationClick={() => setCurrentView('skill-verification')}
        onChatClick={handleChatClick}
        onAdminClick={() => setCurrentView('admin')}
      />
      <main className="flex-1 overflow-auto">{renderView()}</main>

      {/* Sliding Chat Overlay */}
      {secureConversationId && token && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
            onClick={() => {
              console.log('🚪 Closing overlay via backdrop');
              setSecureConversationId(null);
            }}
          />
          
          {/* Sliding Panel */}
          <div className="fixed inset-0 z-50 flex justify-end animate-slideUp md:animate-slideIn">
            <div className="w-full h-full bg-white shadow-2xl overflow-hidden">
              <SecureChat 
                conversationId={secureConversationId} 
                currentUserId={user?.id || ''} 
                token={token}
                onBack={() => {
                  console.log('🚪 Closing overlay via back button');
                  setSecureConversationId(null);
                }}
              />
            </div>
          </div>
        </>
      )}

      {/* Sliding Workspace Overlay */}
      {workspaceId && token && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
            onClick={() => {
              console.log('🚪 Closing workspace via backdrop');
              setWorkspaceId(null);
            }}
          />
          
          {/* Sliding Panel */}
          <div className="fixed inset-0 z-50 flex justify-end animate-slideUp md:animate-slideIn">
            <div className="w-full h-full bg-white shadow-2xl overflow-hidden">
              <TeamWorkspace 
                workspaceId={workspaceId} 
                onBack={() => {
                  console.log('🚪 Closing workspace via back button');
                  setWorkspaceId(null);
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
