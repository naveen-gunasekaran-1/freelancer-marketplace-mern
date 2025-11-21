import React, { useState } from 'react';
import { ArrowLeft, Clock, Users, Tag, Send } from 'lucide-react';
import { Job } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface JobDetailsProps {
  job: Job;
  onBack: () => void;
}

const JobDetails: React.FC<JobDetailsProps> = ({ job, onBack }) => {
  const { user, token } = useAuth();
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalData, setProposalData] = useState({
    coverLetter: '',
    proposedBudget: job.budget,
    timeline: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    const payload = {
      jobId: job.id,
      ...proposalData
    };
    
    console.log('Submitting proposal with data:', payload);

    try {
      const response = await fetch('/api/proposals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        setMessage('Proposal submitted successfully!');
        setShowProposalForm(false);
        // Refresh job data to update proposal count
      } else {
        const error = await response.json();
        console.error('Proposal submission error:', error);
        setMessage(error.error || 'Failed to submit proposal');
      }
    } catch (error) {
      console.error('Network error:', error);
      setMessage('Error submitting proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmitProposal = user?.type === 'freelancer' && job.status === 'open';

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <button
        onClick={onBack}
        className="flex items-center text-blue-600 hover:text-blue-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Jobs
      </button>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{job.title}</h1>
              <p className="text-gray-600">Posted {new Date(job.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">₹{job.budget}</div>
              <div className="text-sm text-gray-500">Budget</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <div className="font-medium">Duration</div>
                <div className="text-sm text-gray-600">{job.duration}</div>
              </div>
            </div>
            <div className="flex items-center">
              <Users className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <div className="font-medium">Proposals</div>
                <div className="text-sm text-gray-600">{job.proposalCount}</div>
              </div>
            </div>
            <div className="flex items-center">
              <Tag className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <div className="font-medium">Category</div>
                <div className="text-sm text-gray-600">{job.category}</div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Job Description</h2>
            <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
              {job.description}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Required Skills</h3>
            <div className="flex flex-wrap gap-2">
              {job.skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {canSubmitProposal && (
            <div className="border-t pt-6">
              {!showProposalForm ? (
                <button
                  onClick={() => setShowProposalForm(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit Proposal
                </button>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Submit Your Proposal</h3>
                  <form onSubmit={handleSubmitProposal} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cover Letter
                      </label>
                      <textarea
                        value={proposalData.coverLetter}
                        onChange={(e) => setProposalData({ ...proposalData, coverLetter: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Explain why you're the right person for this job..."
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Proposed Budget (₹)
                        </label>
                        <input
                          type="number"
                          value={proposalData.proposedBudget}
                          onChange={(e) => setProposalData({ ...proposalData, proposedBudget: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Timeline
                        </label>
                        <input
                          type="text"
                          value={proposalData.timeline}
                          onChange={(e) => setProposalData({ ...proposalData, timeline: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., 2 weeks"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex space-x-4">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit Proposal'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowProposalForm(false)}
                        className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
              {message && (
                <div className={`mt-4 p-3 rounded-lg ${message.includes('successfully') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {message}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetails;
