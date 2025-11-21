import React, { useState, useEffect } from 'react';
import { 
  Users, MessageSquare, CheckSquare, Calendar, FileText, 
  Plus, Settings, Search, Filter, Clock, Paperclip,
  Video, Phone, Upload, Download, Trash2, Edit3,
  CheckCircle, Circle, AlertCircle, User, Send
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface TeamWorkspaceProps {
  workspaceId: string;
  onBack: () => void;
}

interface TeamMember {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    profileImage?: string;
  };
  role: 'lead' | 'member' | 'viewer';
  permissions: {
    canEditTasks: boolean;
    canUploadFiles: boolean;
    canScheduleMeetings: boolean;
    canInviteMembers: boolean;
    canDeleteContent: boolean;
  };
  joinedAt: string;
  status: string;
}

interface Task {
  _id: string;
  title: string;
  description?: string;
  assignedTo: any[];
  status: 'todo' | 'in-progress' | 'review' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  tags?: string[];
  comments?: any[];
}

interface Document {
  _id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
  category: string;
  uploadedAt: string;
  uploadedBy: any;
  comments?: any[];
}

interface Meeting {
  _id: string;
  title: string;
  description?: string;
  scheduledAt: string;
  duration: number;
  status: string;
  participants: any[];
}

const TeamWorkspace: React.FC<TeamWorkspaceProps> = ({ workspaceId, onBack }) => {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'files' | 'meetings' | 'chat'>('overview');
  const [workspace, setWorkspace] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Task creation
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedTo: [] as string[],
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    dueDate: ''
  });

  // File upload
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Team invite
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    if (workspaceId && token) {
      fetchWorkspaceData();
    }
  }, [workspaceId, token]);

  const fetchWorkspaceData = async () => {
    try {
      const response = await fetch(`/api/workspace/${workspaceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWorkspace(data);
        setTeamMembers(data.teamMembers || []);
        setTasks(data.tasks || []);
        setDocuments(data.documents || []);
        setMeetings(data.meetings || []);
      }
    } catch (error) {
      console.error('Error fetching workspace:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createTask = async () => {
    try {
      const response = await fetch(`/api/workspace/${workspaceId}/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTask),
      });

      if (response.ok) {
        await fetchWorkspaceData();
        setShowNewTask(false);
        setNewTask({
          title: '',
          description: '',
          assignedTo: [],
          priority: 'medium',
          dueDate: ''
        });
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const response = await fetch(`/api/workspace/${workspaceId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        await fetchWorkspaceData();
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const uploadFile = async () => {
    if (selectedFiles.length === 0) return;

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await fetch(`/api/workspace/${workspaceId}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        await fetchWorkspaceData();
        setShowFileUpload(false);
        setSelectedFiles([]);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
    }
  };

  const inviteTeamMember = async () => {
    try {
      const response = await fetch(`/api/workspace/${workspaceId}/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: inviteEmail }),
      });

      if (response.ok) {
        await fetchWorkspaceData();
        setShowInviteModal(false);
        setInviteEmail('');
      }
    } catch (error) {
      console.error('Error inviting member:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500">Loading workspace...</div>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="p-4 md:p-6 space-y-6">
      {/* Project Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-2">{workspace?.name}</h2>
        <p className="text-gray-600 mb-4">{workspace?.description}</p>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span className="flex items-center">
            <Users className="w-4 h-4 mr-1" />
            {teamMembers.length} Team Members
          </span>
          <span className="flex items-center">
            <CheckSquare className="w-4 h-4 mr-1" />
            {tasks.filter(t => t.status === 'completed').length}/{tasks.length} Tasks
          </span>
          <span className="flex items-center">
            <FileText className="w-4 h-4 mr-1" />
            {documents.length} Files
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">To Do</p>
              <p className="text-2xl font-bold text-blue-700">{tasks.filter(t => t.status === 'todo').length}</p>
            </div>
            <Circle className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">In Progress</p>
              <p className="text-2xl font-bold text-yellow-700">{tasks.filter(t => t.status === 'in-progress').length}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Review</p>
              <p className="text-2xl font-bold text-purple-700">{tasks.filter(t => t.status === 'review').length}</p>
            </div>
            <Edit3 className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Completed</p>
              <p className="text-2xl font-bold text-green-700">{tasks.filter(t => t.status === 'completed').length}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">Team Members</h3>
        <div className="space-y-3">
          {teamMembers.map((member) => (
            <div key={member._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  {member.user.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{member.user.name}</p>
                  <p className="text-sm text-gray-500">{member.role}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {member.status}
              </span>
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="mt-4 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Invite Team Member
        </button>
      </div>
    </div>
  );

  const renderTasks = () => (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Tasks</h2>
        <button
          onClick={() => setShowNewTask(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['todo', 'in-progress', 'review', 'completed'].map((status) => (
          <div key={status} className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-bold mb-3 capitalize">{status.replace('-', ' ')}</h3>
            <div className="space-y-3">
              {tasks.filter(t => t.status === status).map((task) => (
                <div key={task._id} className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <h4 className="font-medium mb-2">{task.title}</h4>
                  {task.description && (
                    <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                      task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {task.priority}
                    </span>
                    {task.assignedTo && task.assignedTo.length > 0 && (
                      <div className="flex -space-x-2">
                        {task.assignedTo.slice(0, 3).map((assignee: any, idx: number) => (
                          <div key={idx} className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs">
                            {assignee.name?.[0]?.toUpperCase() || '?'}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* New Task Modal */}
      {showNewTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Create New Task</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Task title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  placeholder="Task description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={createTask}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Task
                </button>
                <button
                  onClick={() => setShowNewTask(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Invite Team Member</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="colleague@example.com"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={inviteTeamMember}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Send Invite
                </button>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderFiles = () => (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Shared Files</h2>
        <button
          onClick={() => setShowFileUpload(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Files
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {documents.map((doc) => (
          <div key={doc._id} className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <FileText className="w-8 h-8 text-blue-500" />
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">{doc.category}</span>
            </div>
            <h4 className="font-medium mb-2 truncate">{doc.name}</h4>
            <p className="text-sm text-gray-500 mb-3">
              {doc.uploadedBy?.name} • {new Date(doc.uploadedAt).toLocaleDateString()}
            </p>
            <div className="flex items-center space-x-2">
              <button className="flex-1 px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-sm">
                <Download className="w-4 h-4 inline mr-1" />
                Download
              </button>
            </div>
          </div>
        ))}
      </div>

      {documents.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>No files uploaded yet</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 md:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold">{workspace?.name || 'Team Workspace'}</h1>
            <p className="text-sm text-gray-500">{teamMembers.length} team members</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <Video className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <Phone className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b px-4 md:px-6">
        <div className="flex space-x-6 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: Users },
            { id: 'tasks', label: 'Tasks', icon: CheckSquare },
            { id: 'files', label: 'Files', icon: FileText },
            { id: 'meetings', label: 'Meetings', icon: Calendar },
            { id: 'chat', label: 'Team Chat', icon: MessageSquare }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="font-medium whitespace-nowrap">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'tasks' && renderTasks()}
        {activeTab === 'files' && renderFiles()}
        {activeTab === 'meetings' && (
          <div className="p-6 text-center text-gray-500">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>Meetings feature coming soon</p>
          </div>
        )}
        {activeTab === 'chat' && (
          <div className="p-6 text-center text-gray-500">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>Team chat coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamWorkspace;
