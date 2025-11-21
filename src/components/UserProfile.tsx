import React, { useState, useEffect } from 'react';
import { User, Skill, PortfolioItem } from '../types';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Star, 
  Award, 
  CheckCircle,
  Edit,
  Plus,
  Trash2,
  Upload,
  X,
  Linkedin,
  Github,
  Twitter,
  Facebook,
  Instagram,
  Youtube,
  Link as LinkIcon,
  Briefcase,
  DollarSign,
  Calendar,
  Save
} from 'lucide-react';
import ReviewsSection from './ReviewsSection';

interface UserProfileProps {
  user: User;
  isOwnProfile?: boolean;
  onUpdate?: (updatedUser: User) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, isOwnProfile = false, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<User>(user);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [newSkill, setNewSkill] = useState<Skill>({
    name: '',
    level: 'beginner',
    verified: false,
    verificationProof: [],
    badge: null
  });
  const [newPortfolioItem, setNewPortfolioItem] = useState<PortfolioItem>({
    title: '',
    description: '',
    imageUrl: '',
    projectUrl: ''
  });

  useEffect(() => {
    setEditedUser(user);
  }, [user]);

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(editedUser)
      });

      if (response.ok) {
        const updatedUser = await response.json();
        onUpdate?.(updatedUser);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleAddSkill = () => {
    if (newSkill.name.trim()) {
      setEditedUser({
        ...editedUser,
        skills: [...(editedUser.skills || []), { ...newSkill }]
      });
      setNewSkill({
        name: '',
        level: 'beginner',
        verified: false,
        verificationProof: [],
        badge: null
      });
      setShowSkillModal(false);
    }
  };

  const handleRemoveSkill = (index: number) => {
    setEditedUser({
      ...editedUser,
      skills: (editedUser.skills || []).filter((_, i) => i !== index)
    });
  };

  const handleAddPortfolioItem = () => {
    if (newPortfolioItem.title.trim()) {
      setEditedUser({
        ...editedUser,
        portfolio: [...(editedUser.portfolio || []), { ...newPortfolioItem }]
      });
      setNewPortfolioItem({
        title: '',
        description: '',
        imageUrl: '',
        projectUrl: ''
      });
      setShowPortfolioModal(false);
    }
  };

  const handleRemovePortfolioItem = (index: number) => {
    setEditedUser({
      ...editedUser,
      portfolio: (editedUser.portfolio || []).filter((_, i) => i !== index)
    });
  };

  const getBadgeColor = (badge: string | null) => {
    switch (badge) {
      case 'bronze': return 'text-yellow-600 bg-yellow-100';
      case 'silver': return 'text-gray-600 bg-gray-100';
      case 'gold': return 'text-yellow-500 bg-yellow-50';
      case 'platinum': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'unverified': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="relative">
              {editedUser.profileImage ? (
                <img
                  src={editedUser.profileImage}
                  alt={editedUser.name}
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                  <UserIcon className="w-12 h-12 text-gray-400" />
                </div>
              )}
              {isOwnProfile && isEditing && (
                <button className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-1 hover:bg-blue-600">
                  <Upload className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{editedUser.name}</h1>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVerificationStatusColor(editedUser.verificationStatus)}`}>
                  {editedUser.verificationStatus}
                </span>
                {editedUser.type === 'freelancer' && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    Freelancer
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4 text-gray-600 mb-2">
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="font-medium">{editedUser.rating.toFixed(1)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>{editedUser.completedJobs} jobs completed</span>
                </div>
                {editedUser.hourlyRate > 0 && (
                  <div className="flex items-center space-x-1">
                    <span className="font-medium">₹{editedUser.hourlyRate}/hr</span>
                  </div>
                )}
              </div>
              {editedUser.bio && (
                <p className="text-gray-700 mb-4">{editedUser.bio}</p>
              )}
            </div>
          </div>
          {isOwnProfile && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Edit className="w-4 h-4" />
              <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Edit Profile Form */}
      {isEditing && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Edit Profile Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Basic Information</h3>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={editedUser.name}
                onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={editedUser.email}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input
                type="tel"
                value={editedUser.phone || ''}
                onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input
                type="text"
                value={editedUser.location || ''}
                onChange={(e) => setEditedUser({ ...editedUser, location: e.target.value })}
                placeholder="City, Country"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {editedUser.type === 'freelancer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Rate (₹)</label>
                <input
                  type="number"
                  value={editedUser.hourlyRate || 0}
                  onChange={(e) => setEditedUser({ ...editedUser, hourlyRate: parseFloat(e.target.value) || 0 })}
                  placeholder="500"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
              <textarea
                value={editedUser.bio || ''}
                onChange={(e) => setEditedUser({ ...editedUser, bio: e.target.value })}
                placeholder="Tell us about yourself..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Social Links */}
            <div className="space-y-4 md:col-span-2 mt-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Social Links & Portfolio</h3>
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Globe className="w-4 h-4 mr-2" />
                Website
              </label>
              <input
                type="url"
                value={editedUser.website || ''}
                onChange={(e) => setEditedUser({ ...editedUser, website: e.target.value })}
                placeholder="https://yourwebsite.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Linkedin className="w-4 h-4 mr-2" />
                LinkedIn
              </label>
              <input
                type="url"
                value={(editedUser as any).socialLinks?.linkedin || ''}
                onChange={(e) => setEditedUser({ 
                  ...editedUser, 
                  ...{ socialLinks: { ...(editedUser as any).socialLinks, linkedin: e.target.value } }
                })}
                placeholder="https://linkedin.com/in/username"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Github className="w-4 h-4 mr-2" />
                GitHub
              </label>
              <input
                type="url"
                value={(editedUser as any).socialLinks?.github || ''}
                onChange={(e) => setEditedUser({ 
                  ...editedUser, 
                  ...{ socialLinks: { ...(editedUser as any).socialLinks, github: e.target.value } }
                })}
                placeholder="https://github.com/username"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Twitter className="w-4 h-4 mr-2" />
                Twitter/X
              </label>
              <input
                type="url"
                value={(editedUser as any).socialLinks?.twitter || ''}
                onChange={(e) => setEditedUser({ 
                  ...editedUser, 
                  ...{ socialLinks: { ...(editedUser as any).socialLinks, twitter: e.target.value } }
                })}
                placeholder="https://twitter.com/username"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Facebook className="w-4 h-4 mr-2" />
                Facebook
              </label>
              <input
                type="url"
                value={(editedUser as any).socialLinks?.facebook || ''}
                onChange={(e) => setEditedUser({ 
                  ...editedUser, 
                  ...{ socialLinks: { ...(editedUser as any).socialLinks, facebook: e.target.value } }
                })}
                placeholder="https://facebook.com/username"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Instagram className="w-4 h-4 mr-2" />
                Instagram
              </label>
              <input
                type="url"
                value={(editedUser as any).socialLinks?.instagram || ''}
                onChange={(e) => setEditedUser({ 
                  ...editedUser, 
                  ...{ socialLinks: { ...(editedUser as any).socialLinks, instagram: e.target.value } }
                })}
                placeholder="https://instagram.com/username"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Youtube className="w-4 h-4 mr-2" />
                YouTube
              </label>
              <input
                type="url"
                value={(editedUser as any).socialLinks?.youtube || ''}
                onChange={(e) => setEditedUser({ 
                  ...editedUser, 
                  ...{ socialLinks: { ...(editedUser as any).socialLinks, youtube: e.target.value } }
                })}
                placeholder="https://youtube.com/@username"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4 mt-6">
            <button
              onClick={() => {
                setEditedUser(user);
                setIsEditing(false);
              }}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      )}

      {/* Contact Information */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <Mail className="w-5 h-5 text-gray-400" />
            <span className="text-gray-700">{editedUser.email}</span>
          </div>
          {editedUser.phone && (
            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700">{editedUser.phone}</span>
            </div>
          )}
          {editedUser.location && (
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700">{editedUser.location}</span>
            </div>
          )}
          {editedUser.website && (
            <div className="flex items-center space-x-3">
              <Globe className="w-5 h-5 text-gray-400" />
              <a href={editedUser.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {editedUser.website}
              </a>
            </div>
          )}
        </div>

        {/* Social Links Display */}
        {((editedUser as any).socialLinks) && (
          <div className="mt-4 pt-4 border-t">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Social Profiles</h3>
            <div className="flex flex-wrap gap-3">
              {(editedUser as any).socialLinks?.linkedin && (
                <a href={(editedUser as any).socialLinks.linkedin} target="_blank" rel="noopener noreferrer" 
                   className="flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">
                  <Linkedin className="w-4 h-4" />
                  <span className="text-sm">LinkedIn</span>
                </a>
              )}
              {(editedUser as any).socialLinks?.github && (
                <a href={(editedUser as any).socialLinks.github} target="_blank" rel="noopener noreferrer"
                   className="flex items-center space-x-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100">
                  <Github className="w-4 h-4" />
                  <span className="text-sm">GitHub</span>
                </a>
              )}
              {(editedUser as any).socialLinks?.twitter && (
                <a href={(editedUser as any).socialLinks.twitter} target="_blank" rel="noopener noreferrer"
                   className="flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-400 rounded-lg hover:bg-blue-100">
                  <Twitter className="w-4 h-4" />
                  <span className="text-sm">Twitter</span>
                </a>
              )}
              {(editedUser as any).socialLinks?.facebook && (
                <a href={(editedUser as any).socialLinks.facebook} target="_blank" rel="noopener noreferrer"
                   className="flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                  <Facebook className="w-4 h-4" />
                  <span className="text-sm">Facebook</span>
                </a>
              )}
              {(editedUser as any).socialLinks?.instagram && (
                <a href={(editedUser as any).socialLinks.instagram} target="_blank" rel="noopener noreferrer"
                   className="flex items-center space-x-2 px-3 py-2 bg-pink-50 text-pink-600 rounded-lg hover:bg-pink-100">
                  <Instagram className="w-4 h-4" />
                  <span className="text-sm">Instagram</span>
                </a>
              )}
              {(editedUser as any).socialLinks?.youtube && (
                <a href={(editedUser as any).socialLinks.youtube} target="_blank" rel="noopener noreferrer"
                   className="flex items-center space-x-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                  <Youtube className="w-4 h-4" />
                  <span className="text-sm">YouTube</span>
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Skills */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Skills</h2>
          {isOwnProfile && (
            <button
              onClick={() => setShowSkillModal(true)}
              className="flex items-center space-x-2 px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              <Plus className="w-4 h-4" />
              <span>Add Skill</span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(editedUser.skills || []).map((skill, index) => (
            <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">{skill.name}</h3>
                {isOwnProfile && (
                  <button
                    onClick={() => handleRemoveSkill(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center space-x-2 mb-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(skill.badge)}`}>
                  {skill.level}
                </span>
                {skill.verified && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
                {skill.badge && (
                  <Award className={`w-4 h-4 ${getBadgeColor(skill.badge).split(' ')[0]}`} />
                )}
              </div>
              {skill.verificationProof && skill.verificationProof.length > 0 && (
                <div className="text-xs text-gray-500">
                  {skill.verificationProof.length} verification(s)
                </div>
              )}
            </div>
          ))}
          {(!editedUser.skills || editedUser.skills.length === 0) && (
            <div className="col-span-full text-center py-8 text-gray-500">
              No skills added yet
            </div>
          )}
        </div>
      </div>

      {/* Portfolio */}
      {editedUser.type === 'freelancer' && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Portfolio</h2>
            {isOwnProfile && (
              <button
                onClick={() => setShowPortfolioModal(true)}
                className="flex items-center space-x-2 px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                <Plus className="w-4 h-4" />
                <span>Add Project</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(editedUser.portfolio || []).map((item, index) => (
              <div key={index} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{item.title}</h3>
                    {isOwnProfile && (
                      <button
                        onClick={() => handleRemovePortfolioItem(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                  {item.projectUrl && (
                    <a
                      href={item.projectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View Project →
                    </a>
                  )}
                </div>
              </div>
            ))}
            {(!editedUser.portfolio || editedUser.portfolio.length === 0) && (
              <div className="col-span-full text-center py-8 text-gray-500">
                No portfolio items added yet
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Skill Modal */}
      {showSkillModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Add New Skill</h3>
              <button
                onClick={() => setShowSkillModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skill Name</label>
                <input
                  type="text"
                  value={newSkill.name}
                  onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                  placeholder="e.g., React, Python, UI Design"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skill Level</label>
                <select
                  value={newSkill.level}
                  onChange={(e) => setNewSkill({ ...newSkill, level: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowSkillModal(false);
                  setNewSkill({
                    name: '',
                    level: 'beginner',
                    verified: false,
                    verificationProof: [],
                    badge: null
                  });
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSkill}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Add Skill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Portfolio Modal */}
      {showPortfolioModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Add Portfolio Project</h3>
              <button
                onClick={() => setShowPortfolioModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project Title</label>
                <input
                  type="text"
                  value={newPortfolioItem.title}
                  onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, title: e.target.value })}
                  placeholder="e.g., E-commerce Website"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={newPortfolioItem.description}
                  onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, description: e.target.value })}
                  placeholder="Brief description of the project..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project URL</label>
                <input
                  type="url"
                  value={newPortfolioItem.projectUrl}
                  onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, projectUrl: e.target.value })}
                  placeholder="https://project-demo.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                <input
                  type="url"
                  value={newPortfolioItem.imageUrl}
                  onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, imageUrl: e.target.value })}
                  placeholder="https://example.com/project-image.jpg"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowPortfolioModal(false);
                  setNewPortfolioItem({
                    title: '',
                    description: '',
                    imageUrl: '',
                    projectUrl: ''
                  });
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPortfolioItem}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Add Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reviews Section */}
      <ReviewsSection userId={user.id} isOwnProfile={isOwnProfile} />
    </div>
  );
};

export default UserProfile;
