import React, { useState, useEffect } from 'react';
import { SkillVerification } from '../types';
import { 
  Award, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText,
  ExternalLink,
  Star
} from 'lucide-react';

interface SkillVerificationComponentProps {
  userId: string;
  isOwnProfile?: boolean;
}

const SkillVerificationComponent: React.FC<SkillVerificationComponentProps> = ({ 
  userId, 
  isOwnProfile = false 
}) => {
  const [verifications, setVerifications] = useState<SkillVerification[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newVerification, setNewVerification] = useState<Partial<SkillVerification>>({
    skillName: '',
    skillLevel: 'beginner',
    evidence: []
  });

  useEffect(() => {
    fetchVerifications();
  }, [userId]);

  const fetchVerifications = async () => {
    try {
      const response = await fetch(`/api/skill-verification/my-verifications`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setVerifications(data.verifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch verifications:', error);
    }
  };

  const handleSubmitVerification = async () => {
    if (!newVerification.skillName || newVerification.evidence?.length === 0) {
      alert('Please provide skill name and at least one piece of evidence');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/skill-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newVerification)
      });

      if (response.ok) {
        await fetchVerifications();
        setShowForm(false);
        setNewVerification({
          skillName: '',
          skillLevel: 'beginner',
          evidence: []
        });
        alert('Verification request submitted successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit verification');
      }
    } catch (error) {
      console.error('Failed to submit verification:', error);
      alert('Failed to submit verification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addEvidence = () => {
    const type = prompt('Evidence type (certificate, portfolio, test_score, work_sample, reference):');
    const title = prompt('Evidence title:');
    const description = prompt('Evidence description:');
    const url = prompt('Evidence URL:');
    const issuer = prompt('Issuer (if applicable):');
    const score = prompt('Score (if applicable):');
    const maxScore = prompt('Max score (if applicable):');

    if (type && title && description && url) {
      setNewVerification({
        ...newVerification,
        evidence: [
          ...(newVerification.evidence || []),
          {
            type: type as any,
            title,
            description,
            url,
            fileUrl: url,
            issuer: issuer || '',
            dateIssued: new Date().toISOString(),
            score: score ? parseInt(score) : 0,
            maxScore: maxScore ? parseInt(maxScore) : 100
          }
        ]
      });
    }
  };

  const removeEvidence = (index: number) => {
    setNewVerification({
      ...newVerification,
      evidence: newVerification.evidence?.filter((_, i) => i !== index) || []
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'under_review': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'bronze': return 'text-yellow-600 bg-yellow-100';
      case 'silver': return 'text-gray-600 bg-gray-100';
      case 'gold': return 'text-yellow-500 bg-yellow-50';
      case 'platinum': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-blue-600 bg-blue-100';
      case 'advanced': return 'text-purple-600 bg-purple-100';
      case 'expert': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Skill Verifications</h2>
        {isOwnProfile && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Upload className="w-4 h-4" />
            <span>Submit Verification</span>
          </button>
        )}
      </div>

      {/* Verification Form */}
      {showForm && (
        <div className="border rounded-lg p-6 mb-6 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Submit Skill Verification</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skill Name
              </label>
              <input
                type="text"
                value={newVerification.skillName}
                onChange={(e) => setNewVerification({ ...newVerification, skillName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., React Development"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skill Level
              </label>
              <select
                value={newVerification.skillLevel}
                onChange={(e) => setNewVerification({ ...newVerification, skillLevel: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>
          </div>

          {/* Evidence Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Evidence
              </label>
              <button
                onClick={addEvidence}
                className="flex items-center space-x-1 px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                <Upload className="w-4 h-4" />
                <span>Add Evidence</span>
              </button>
            </div>
            
            <div className="space-y-2">
              {newVerification.evidence?.map((evidence, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium">{evidence.title}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getLevelColor(evidence.type)}`}>
                        {evidence.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{evidence.description}</p>
                    {evidence.score > 0 && (
                      <div className="flex items-center space-x-1 mt-1">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm">{evidence.score}/{evidence.maxScore}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeEvidence(index)}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitVerification}
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Verification'}
            </button>
          </div>
        </div>
      )}

      {/* Verification List */}
      <div className="space-y-4">
        {verifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Award className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No skill verifications submitted yet</p>
            {isOwnProfile && (
              <p className="text-sm">Submit your first skill verification to get started!</p>
            )}
          </div>
        ) : (
          verifications.map((verification) => (
            <div key={verification.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">{verification.skillName}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(verification.skillLevel)}`}>
                      {verification.skillLevel}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(verification.status)}`}>
                      {verification.status}
                    </span>
                    {verification.badgeAwarded && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(verification.badgeAwarded)}`}>
                        <Award className="w-3 h-3 inline mr-1" />
                        {verification.badgeAwarded}
                      </span>
                    )}
                  </div>
                  
                  {verification.reviewNotes && (
                    <p className="text-sm text-gray-600 mb-2">{verification.reviewNotes}</p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>Submitted: {new Date(verification.submittedAt).toLocaleDateString()}</span>
                    </div>
                    {verification.reviewedAt && (
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="w-4 h-4" />
                        <span>Reviewed: {new Date(verification.reviewedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Evidence */}
              <div className="mt-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Evidence ({verification.evidence.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {verification.evidence.map((evidence, index) => (
                    <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{evidence.title}</p>
                        <p className="text-xs text-gray-500">{evidence.issuer}</p>
                      </div>
                      {evidence.url && (
                        <a
                          href={evidence.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SkillVerificationComponent;
