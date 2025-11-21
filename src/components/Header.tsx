import React, { useState, useEffect } from 'react';
import { 
  User, 
  LogOut, 
  MessageCircle, 
  Award, 
  Bell,
  ChevronDown,
  Wallet
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { User as UserType } from '../types';
import NotificationCenter from './NotificationCenter';

interface HeaderProps {
  currentView: string;
  onViewChange: (view: string) => void;
  user: UserType;
  onProfileClick: () => void;
  onSkillVerificationClick: () => void;
  onChatClick: () => void;
  onAdminClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  currentView, 
  onViewChange, 
  user,
  onProfileClick,
  onSkillVerificationClick,
  onChatClick,
  onAdminClick
}) => {
  const { logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  // Fetch unread notification count
  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const response = await fetch('/api/notifications?unread=true', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setNotificationCount(data.length);
        }
      } catch (error) {
        console.error('Failed to fetch notification count:', error);
      }
    };

    fetchNotificationCount();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotificationCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4 md:space-x-8">
          <h1 className="text-lg md:text-2xl font-bold text-gray-900">FreelanceHub</h1>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-4 lg:space-x-6">
            {user?.type === 'freelancer' && (
              <button
                onClick={() => onViewChange('jobs')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'jobs'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Browse Jobs
              </button>
            )}
            {user?.type === 'client' && (
              <button
                onClick={() => onViewChange('post-job')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'post-job'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Post Job
              </button>
            )}
            <button
              onClick={() => onViewChange('dashboard')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentView === 'dashboard'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={onChatClick}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentView === 'chat'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Messages
            </button>
            {user?.type === 'freelancer' && (
              <button
                onClick={() => onViewChange('wallet')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'wallet'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="flex items-center space-x-1">
                  <Wallet className="w-4 h-4" />
                  <span>Wallet</span>
                </span>
              </button>
            )}
            <button
              onClick={() => onViewChange('subscription-plans')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentView === 'subscription-plans'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Plans
            </button>
            {user?.type === 'admin' && (
              <button
                onClick={onAdminClick}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'admin'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Admin Panel
              </button>
            )}
          </nav>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
          >
            <svg className="h-6 w-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button className="p-2 text-gray-600 hover:text-gray-900 relative">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </button>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 px-2 md:px-3 py-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
            >
              <div className="flex items-center space-x-2">
                {user?.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                )}
                <span className="hidden sm:inline">{user?.name}</span>
                <span className="hidden sm:inline text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {user?.type}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 hidden sm:inline" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                <button
                  onClick={() => {
                    onProfileClick();
                    setShowUserMenu(false);
                  }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </button>
                
                {user?.type === 'freelancer' && (
                  <button
                    onClick={() => {
                      onSkillVerificationClick();
                      setShowUserMenu(false);
                    }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Award className="h-4 w-4" />
                    <span>Skill Verification</span>
                  </button>
                )}
                
                <button
                  onClick={() => {
                    onChatClick();
                    setShowUserMenu(false);
                  }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Messages</span>
                </button>
                
                <div className="border-t border-gray-100"></div>
                
                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {showMobileMenu && (
        <div className="md:hidden border-t border-gray-200 mt-3 pt-3">
          <nav className="flex flex-col space-y-2">
            {user?.type === 'freelancer' && (
              <button
                onClick={() => {
                  onViewChange('jobs');
                  setShowMobileMenu(false);
                }}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors text-left ${
                  currentView === 'jobs'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Browse Jobs
              </button>
            )}
            {user?.type === 'client' && (
              <button
                onClick={() => {
                  onViewChange('post-job');
                  setShowMobileMenu(false);
                }}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors text-left ${
                  currentView === 'post-job'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Post Job
              </button>
            )}
            <button
              onClick={() => {
                onViewChange('dashboard');
                setShowMobileMenu(false);
              }}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors text-left ${
                currentView === 'dashboard'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                onChatClick();
                setShowMobileMenu(false);
              }}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors text-left ${
                currentView === 'chat'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Messages
            </button>
            {user?.type === 'admin' && (
              <button
                onClick={() => {
                  onAdminClick();
                  setShowMobileMenu(false);
                }}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors text-left ${
                  currentView === 'admin'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Admin Panel
              </button>
            )}
          </nav>
        </div>
      )}

      {/* Notification Center Modal */}
      <NotificationCenter 
        isOpen={showNotificationCenter} 
        onClose={() => {
          setShowNotificationCenter(false);
          // Refresh notification count after closing
          fetch('/api/notifications?unread=true', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }).then(res => res.json()).then(data => {
            setNotificationCount(data.length);
          }).catch(console.error);
        }} 
      />
    </header>
  );
};

export default Header;
