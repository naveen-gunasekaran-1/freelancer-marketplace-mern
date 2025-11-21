import React, { useState, useEffect } from 'react';
import { Briefcase, FileText, Clock, CheckCircle, Eye, X, ExternalLink, MessageSquare, DollarSign, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Job, Proposal } from '../types';
import JobProposals from './JobProposals';
import PaymentModal from './PaymentModal';
import ReviewForm from './ReviewForm';

interface DashboardProps {
  onOpenSecureChat?: (conversationId: string) => void;
  onOpenWorkspace?: (workspaceId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onOpenSecureChat, onOpenWorkspace }) => {
  const { user, token } = useAuth();
  const [userJobs, setUserJobs] = useState<Job[]>([]);
  const [userProposals, setUserProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<{ id: string; title: string } | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewJobData, setReviewJobData] = useState<{ jobId: string; jobTitle: string; revieweeName: string } | null>(null);

  useEffect(() => {
    console.log('Selected proposal changed:', selectedProposal);
    if (selectedProposal) {
      console.log('Proposal status:', selectedProposal.status);
      console.log('Proposal ID:', selectedProposal.id);
    }
  }, [selectedProposal]);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      if (user?.type === 'client') {
        const response = await fetch('/api/jobs/user/my-jobs', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await response.json();
        console.log('Client jobs:', data);
        // Map MongoDB _id to id for consistency
        const jobsWithId = data.map((job: any) => ({
          ...job,
          id: job._id || job.id
        }));
        setUserJobs(jobsWithId);
      } else {
        const response = await fetch('/api/proposals/user/my-proposals', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await response.json();
        console.log('Freelancer proposals:', data);
        // Map MongoDB _id to id for proposals too
        const proposalsWithId = data.map((proposal: any) => ({
          ...proposal,
          id: proposal._id || proposal.id
        }));
        setUserProposals(proposalsWithId);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-500">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  // If viewing proposals for a job
  if (selectedJob) {
    return (
      <JobProposals 
        jobId={selectedJob.id}
        jobTitle={selectedJob.title}
        onBack={() => setSelectedJob(null)}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.name}!</p>
        {user?.type === 'freelancer' && userProposals.length > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            Click on any proposal to view details
          </p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Briefcase className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-2xl font-semibold text-gray-900">
                {user?.type === 'client' ? userJobs.length : userProposals.length}
              </p>
              <p className="text-gray-600">
                {user?.type === 'client' ? 'Jobs Posted' : 'Proposals Sent'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-2xl font-semibold text-gray-900">
                {user?.type === 'client' 
                  ? userJobs.filter(j => j.status === 'open').length
                  : userProposals.filter(p => p.status === 'pending').length
                }
              </p>
              <p className="text-gray-600">
                {user?.type === 'client' ? 'Active Jobs' : 'Pending Proposals'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-2xl font-semibold text-gray-900">{user?.completedJobs}</p>
              <p className="text-gray-600">Completed</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-2xl font-semibold text-gray-900">{user?.rating.toFixed(1)}</p>
              <p className="text-gray-600">Rating</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {user?.type === 'client' ? 'Your Posted Jobs' : 'Your Proposals'}
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {user?.type === 'client' ? (
            userJobs.length > 0 ? (
              userJobs.slice(0, 5).map((job) => (
                <div key={job.id} className="px-6 py-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{job.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{job.description.substring(0, 100)}...</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span>₹{job.budget}</span>
                        <span>{job.proposalCount} proposals</span>
                        <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        job.status === 'open' 
                          ? 'bg-green-100 text-green-700'
                          : job.status === 'completed'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {job.status}
                      </span>
                      {job.status === 'completed' && (
                        <button
                          onClick={() => {
                            setReviewJobData({
                              jobId: job.id,
                              jobTitle: job.title,
                              revieweeName: 'Freelancer' // Will be dynamically set based on job data
                            });
                            setShowReviewForm(true);
                          }}
                          className="flex items-center space-x-1 px-3 py-1 text-xs bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition-colors"
                        >
                          <Star className="h-3 w-3" />
                          <span>Write Review</span>
                        </button>
                      )}
                      {job.proposalCount > 0 && job.status === 'open' && (
                        <button
                          onClick={() => setSelectedJob({ id: job.id, title: job.title })}
                          className="flex items-center space-x-1 px-3 py-1 text-xs bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View Proposals</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                No jobs posted yet. Start by posting your first job!
              </div>
            )
          ) : (
            userProposals.length > 0 ? (
              userProposals.slice(0, 5).map((proposal) => (
                <div 
                  key={proposal.id} 
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Proposal clicked:', proposal);
                    setSelectedProposal(proposal);
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 hover:text-blue-600">{proposal.job?.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{proposal.coverLetter.substring(0, 100)}...</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span>₹{proposal.proposedBudget?.toLocaleString('en-IN')}</span>
                        <span>{proposal.timeline}</span>
                        <span>{new Date(proposal.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      proposal.status === 'pending' 
                        ? 'bg-yellow-100 text-yellow-700'
                        : proposal.status === 'accepted'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {proposal.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                No proposals submitted yet. Browse jobs and start applying!
              </div>
            )
          )}
        </div>
      </div>

      {/* Proposal Details Modal */}
      {selectedProposal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // Close modal when clicking backdrop
            if (e.target === e.currentTarget) {
              setSelectedProposal(null);
            }
          }}
        >
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Proposal Details</h2>
              <button
                onClick={() => setSelectedProposal(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Job Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {selectedProposal.job?.title}
                </h3>
                <p className="text-gray-600 text-sm">{selectedProposal.job?.description}</p>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <span className={`inline-flex px-3 py-1 text-sm rounded-full font-medium ${
                  selectedProposal.status === 'pending' 
                    ? 'bg-yellow-100 text-yellow-700'
                    : selectedProposal.status === 'accepted'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {selectedProposal.status.charAt(0).toUpperCase() + selectedProposal.status.slice(1)}
                </span>
              </div>

              {/* Proposed Budget & Timeline */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proposed Budget</label>
                  <p className="text-2xl font-bold text-green-600">
                    ₹{selectedProposal.proposedBudget?.toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timeline</label>
                  <p className="text-lg font-medium text-gray-900">{selectedProposal.timeline}</p>
                </div>
              </div>

              {/* Cover Letter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Cover Letter</label>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedProposal.coverLetter}</p>
                </div>
              </div>

              {/* Client Response */}
              {selectedProposal.clientResponse && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client's Response</label>
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-start space-x-2">
                      <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
                      <p className="text-gray-700">{selectedProposal.clientResponse}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Job Details Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Job Details</label>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Category: <span className="font-medium text-gray-900">{selectedProposal.job?.category}</span></p>
                      <p className="text-sm text-gray-600 mt-1">Duration: <span className="font-medium text-gray-900">{selectedProposal.job?.duration}</span></p>
                      {selectedProposal.job?.skills && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {selectedProposal.job.skills.map((skill, index) => (
                            <span key={index} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        // You can add navigation to job details here
                        setSelectedProposal(null);
                      }}
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>View Job</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Submission Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Submitted On</label>
                <p className="text-gray-900">{new Date(selectedProposal.createdAt).toLocaleString('en-IN')}</p>
              </div>

              {/* Action Button for Accepted */}
              {selectedProposal.status === 'accepted' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex flex-col space-y-3">
                    <div>
                      <p className="font-medium text-green-800">Proposal Accepted! 🎉</p>
                      <p className="text-sm text-green-700 mt-1">
                        {user?.type === 'client' 
                          ? 'Make payment to start the project and collaborate with your freelancer.'
                          : 'Start collaborating with your team in the workspace.'
                        }
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      {user?.type === 'client' && (
                        <button
                          onClick={() => setShowPaymentModal(true)}
                          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap flex items-center justify-center"
                        >
                          <DollarSign className="w-4 h-4 mr-2" />
                          Make Payment
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          console.log('Opening chat for proposal:', selectedProposal.id);
                          try {
                            const response = await fetch(
                              `/api/secure-conversations/proposal/${selectedProposal.id}`,
                              {
                                headers: {
                                  'Authorization': `Bearer ${token}`,
                                },
                              }
                            );

                            if (response.ok) {
                              const conversation = await response.json();
                              console.log('Found conversation:', conversation.conversationId);
                              onOpenSecureChat?.(conversation.conversationId);
                            } else {
                              alert('Secure conversation not found. Please try again in a moment.');
                            }
                          } catch (error) {
                            console.error('Error fetching conversation:', error);
                            alert('Error opening secure chat. Please try again.');
                          }
                        }}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap flex items-center justify-center"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Open Chat
                      </button>
                      <button
                        onClick={async () => {
                          // Get jobId - handle both populated object and string ID
                          let jobId;
                          if (typeof selectedProposal.jobId === 'object' && selectedProposal.jobId) {
                            jobId = (selectedProposal.jobId as any)._id || (selectedProposal.jobId as any).id;
                          } else if (typeof selectedProposal.jobId === 'string') {
                            jobId = selectedProposal.jobId;
                          } else if (selectedProposal.job) {
                            jobId = (selectedProposal.job as any)._id || (selectedProposal.job as any).id;
                          }
                          
                          if (!jobId) {
                            console.error('Proposal data:', selectedProposal);
                            alert('Job information is missing. Cannot open workspace.');
                            return;
                          }
                          
                          console.log('Opening workspace for job:', jobId);
                          try {
                            // First, try to fetch existing workspace
                            const response = await fetch(
                              `/api/workspaces?jobId=${jobId}`,
                              {
                                headers: {
                                  'Authorization': `Bearer ${token}`,
                                },
                              }
                            );

                            if (response.ok) {
                              const workspaces = await response.json();
                              if (workspaces && workspaces.length > 0) {
                                console.log('Found workspace:', workspaces[0]._id);
                                onOpenWorkspace?.(workspaces[0]._id);
                              } else {
                                // No workspace exists, create one
                                alert('Workspace will be created automatically. Feature coming soon!');
                              }
                            } else {
                              alert('Error fetching workspace. Please try again.');
                            }
                          } catch (error) {
                            console.error('Error fetching workspace:', error);
                            alert('Error opening workspace. Please try again.');
                          }
                        }}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap flex items-center justify-center"
                      >
                        <Briefcase className="w-4 h-4 mr-2" />
                        Open Workspace
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button for Pending */}
              {selectedProposal.status === 'pending' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <Clock className="inline h-4 w-4 mr-1" />
                    Waiting for client's response...
                  </p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedProposal(null)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedProposal && selectedProposal.job && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          jobId={selectedProposal.job.id}
          proposalId={selectedProposal.id}
          amount={selectedProposal.amount || selectedProposal.job.budget}
          jobTitle={selectedProposal.job.title}
          freelancerName={(selectedProposal as any).freelancer?.name || 'Freelancer'}
          onPaymentSuccess={() => {
            // Refresh data after successful payment
            fetchUserData();
          }}
        />
      )}

      {/* Review Form Modal */}
      {showReviewForm && reviewJobData && (
        <ReviewForm
          jobId={reviewJobData.jobId}
          jobTitle={reviewJobData.jobTitle}
          revieweeName={reviewJobData.revieweeName}
          onSuccess={() => {
            setShowReviewForm(false);
            setReviewJobData(null);
            // Optionally refresh data
            fetchUserData();
          }}
          onCancel={() => {
            setShowReviewForm(false);
            setReviewJobData(null);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
