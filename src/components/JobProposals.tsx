import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Star, Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Proposal } from '../types';

interface JobProposalsProps {
  jobId: string;
  jobTitle: string;
  onBack: () => void;
}

const JobProposals: React.FC<JobProposalsProps> = ({ jobId, jobTitle, onBack }) => {
  const { token } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [clientResponse, setClientResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchProposals();
  }, [jobId]);

  useEffect(() => {
    if (selectedProposal) {
      console.log('📋 Selected proposal details:', {
        id: selectedProposal.id,
        status: selectedProposal.status,
        fullObject: selectedProposal
      });
    }
  }, [selectedProposal]);

  const fetchProposals = async () => {
    try {
      const response = await fetch(`/api/proposals/job/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Map MongoDB _id to id for consistency
        const proposalsWithId = data.map((proposal: any) => ({
          ...proposal,
          id: proposal._id || proposal.id
        }));
        setProposals(proposalsWithId);
      } else {
        setMessage('Failed to fetch proposals');
      }
    } catch (error) {
      console.error('Error fetching proposals:', error);
      setMessage('Error loading proposals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (proposalId: string, status: 'accepted' | 'rejected') => {
    console.log('🔵 handleStatusUpdate called with proposalId:', proposalId, 'status:', status);
    console.log('🔵 Selected proposal:', selectedProposal);
    
    if (!proposalId || proposalId === 'undefined') {
      console.error('❌ Invalid proposal ID!');
      setMessage('Error: Invalid proposal ID');
      return;
    }
    
    setIsSubmitting(true);
    setMessage('');

    try {
      const url = `/api/proposals/${proposalId}/status`;
      console.log('🔵 Sending PUT request to:', url);
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          clientResponse,
        }),
      });

      console.log('🔵 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Proposal updated successfully:', data);
        setMessage(`Proposal ${status} successfully!`);
        setSelectedProposal(null);
        setClientResponse('');
        fetchProposals(); // Refresh proposals
      } else {
        const error = await response.json();
        console.error('❌ Error response:', error);
        setMessage(error.error || `Failed to ${status} proposal`);
      }
    } catch (error) {
      console.error('❌ Error updating proposal:', error);
      setMessage('Error updating proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-500">Loading proposals...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <button
        onClick={onBack}
        className="flex items-center text-blue-600 hover:text-blue-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Proposals for: {jobTitle}</h1>
        <p className="text-gray-600">{proposals.length} proposal{proposals.length !== 1 ? 's' : ''} received</p>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${message.includes('successfully') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Proposals List */}
        <div className="lg:col-span-2 space-y-4">
          {proposals.length > 0 ? (
            proposals.map((proposal) => (
              <div
                key={proposal.id}
                className={`bg-white rounded-lg border-2 transition-all cursor-pointer ${
                  selectedProposal?.id === proposal.id
                    ? 'border-blue-500 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedProposal(proposal)}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {typeof proposal.freelancerId === 'object' ? proposal.freelancerId.name : 'Freelancer'}
                        </h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-yellow-500 mr-1" />
                            <span>{typeof proposal.freelancerId === 'object' ? proposal.freelancerId.rating?.toFixed(1) : '0.0'}</span>
                          </div>
                          <span>•</span>
                          <span>{typeof proposal.freelancerId === 'object' ? proposal.freelancerId.completedJobs || 0 : 0} jobs completed</span>
                        </div>
                        {typeof proposal.freelancerId === 'object' && proposal.freelancerId.location && (
                          <p className="text-sm text-gray-500 mt-1">{proposal.freelancerId.location}</p>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                      proposal.status === 'pending' 
                        ? 'bg-yellow-100 text-yellow-700'
                        : proposal.status === 'accepted'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {proposal.status}
                    </span>
                  </div>

                  <div className="mb-4">
                    <p className="text-gray-700 line-clamp-3">{proposal.coverLetter}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6 text-sm">
                      <div>
                        <span className="text-gray-500">Bid:</span>
                        <span className="font-semibold text-gray-900 ml-2">₹{proposal.proposedBudget?.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{proposal.timeline}</span>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(proposal.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Skills */}
                  {typeof proposal.freelancerId === 'object' && proposal.freelancerId.skills && proposal.freelancerId.skills.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {proposal.freelancerId.skills.slice(0, 5).map((skill: any, index: number) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                        >
                          {typeof skill === 'string' ? skill : skill.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Proposals Yet</h3>
              <p className="text-gray-600">
                Your job hasn't received any proposals yet. Keep your job posting active and check back soon!
              </p>
            </div>
          )}
        </div>

        {/* Proposal Details & Actions */}
        <div className="lg:col-span-1">
          {selectedProposal ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Proposal Details</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Freelancer</label>
                  <p className="text-gray-900">{typeof selectedProposal.freelancerId === 'object' ? selectedProposal.freelancerId.name : 'Freelancer'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proposed Budget</label>
                  <p className="text-2xl font-bold text-green-600">₹{selectedProposal.proposedBudget?.toLocaleString('en-IN')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timeline</label>
                  <p className="text-gray-900">{selectedProposal.timeline}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cover Letter</label>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">{selectedProposal.coverLetter}</p>
                </div>

                {selectedProposal.clientResponse && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Response</label>
                    <p className="text-gray-700 text-sm">{selectedProposal.clientResponse}</p>
                  </div>
                )}
              </div>

              {selectedProposal.status === 'pending' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Response Message (Optional)
                    </label>
                    <textarea
                      value={clientResponse}
                      onChange={(e) => setClientResponse(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Add a message for the freelancer..."
                    />
                  </div>

                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={() => handleStatusUpdate(selectedProposal.id, 'accepted')}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {isSubmitting ? 'Processing...' : 'Accept Proposal'}
                    </button>

                    <button
                      onClick={() => handleStatusUpdate(selectedProposal.id, 'rejected')}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {isSubmitting ? 'Processing...' : 'Reject Proposal'}
                    </button>
                  </div>
                </div>
              )}

              {selectedProposal.status === 'accepted' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-green-800 font-medium">Proposal Accepted</p>
                  <p className="text-green-700 text-sm mt-1">
                    A secure encrypted conversation has been created with this freelancer.
                  </p>
                </div>
              )}

              {selectedProposal.status === 'rejected' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-red-800 font-medium">Proposal Rejected</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center">
              <p className="text-gray-600">Select a proposal to view details and take action</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobProposals;
