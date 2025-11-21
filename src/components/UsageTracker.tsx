import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertCircle, CheckCircle, Zap, Briefcase, Loader2 } from 'lucide-react';

interface UsageData {
  proposalsCount: number;
  proposalLimit: number;
  proposalPercentage: number;
  jobsPosted: number;
  jobPostLimit: number;
  jobPercentage: number;
  planType: string;
  features: {
    proposalLimit: number;
    jobPostLimit: number;
    [key: string]: any;
  };
}

const UsageTracker: React.FC = () => {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/subscriptions/usage', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      }
    } catch (error) {
      console.error('Error fetching usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-100';
    if (percentage >= 70) return 'bg-yellow-100';
    return 'bg-green-100';
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 90) return <AlertCircle className="w-5 h-5 text-red-500" />;
    if (percentage >= 70) return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  const getStatusText = (percentage: number, isUnlimited: boolean) => {
    if (isUnlimited) return 'Unlimited';
    if (percentage >= 90) return 'Almost at limit';
    if (percentage >= 70) return 'Getting close';
    return 'Good';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">Unable to load usage data.</p>
      </div>
    );
  }

  const isProposalUnlimited = usage.proposalLimit === -1;
  const isJobUnlimited = usage.jobPostLimit === -1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Usage Overview</h2>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
            <Zap className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-900 uppercase">
              {usage.planType} Plan
            </span>
          </div>
        </div>
        <p className="text-gray-600">
          Track your monthly usage and plan limits
        </p>
      </div>

      {/* Proposals Usage */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Proposals Submitted</h3>
              <p className="text-sm text-gray-600">
                {isProposalUnlimited ? (
                  'Unlimited proposals available'
                ) : (
                  `${usage.proposalsCount} of ${usage.proposalLimit} used this month`
                )}
              </p>
            </div>
          </div>
          {getStatusIcon(usage.proposalPercentage)}
        </div>

        {!isProposalUnlimited && (
          <>
            <div className={`w-full h-3 rounded-full ${getProgressBarColor(usage.proposalPercentage)} overflow-hidden mb-2`}>
              <div
                className={`h-full ${getProgressColor(usage.proposalPercentage)} transition-all duration-500`}
                style={{ width: `${Math.min(usage.proposalPercentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                {getStatusText(usage.proposalPercentage, false)}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {Math.round(usage.proposalPercentage)}% used
              </span>
            </div>

            {usage.proposalPercentage >= 80 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900 mb-1">
                      You're running low on proposals
                    </p>
                    <p className="text-sm text-yellow-800">
                      {usage.proposalLimit - usage.proposalsCount} proposals remaining. 
                      Consider upgrading to get unlimited access.
                    </p>
                    <button
                      onClick={() => window.location.href = '/subscription-plans'}
                      className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-yellow-900 hover:text-yellow-700 cursor-pointer"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Upgrade Now
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Jobs Posted Usage */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Briefcase className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Jobs Posted</h3>
              <p className="text-sm text-gray-600">
                {isJobUnlimited ? (
                  'Unlimited job posts available'
                ) : (
                  `${usage.jobsPosted} of ${usage.jobPostLimit} used this month`
                )}
              </p>
            </div>
          </div>
          {getStatusIcon(usage.jobPercentage)}
        </div>

        {!isJobUnlimited && (
          <>
            <div className={`w-full h-3 rounded-full ${getProgressBarColor(usage.jobPercentage)} overflow-hidden mb-2`}>
              <div
                className={`h-full ${getProgressColor(usage.jobPercentage)} transition-all duration-500`}
                style={{ width: `${Math.min(usage.jobPercentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                {getStatusText(usage.jobPercentage, false)}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {Math.round(usage.jobPercentage)}% used
              </span>
            </div>

            {usage.jobPercentage >= 80 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900 mb-1">
                      You're running low on job posts
                    </p>
                    <p className="text-sm text-yellow-800">
                      {usage.jobPostLimit - usage.jobsPosted} job posts remaining. 
                      Consider upgrading to get unlimited access.
                    </p>
                    <button
                      onClick={() => window.location.href = '/subscription-plans'}
                      className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-yellow-900 hover:text-yellow-700 cursor-pointer"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Upgrade Now
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Upgrade CTA for Free Plan */}
      {usage.planType === 'free' && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-8 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-2">Ready to scale your freelancing?</h3>
              <p className="text-blue-100 mb-4">
                Upgrade to Pro or Enterprise for unlimited proposals, job posts, and premium features.
              </p>
              <button
                onClick={() => window.location.href = '/subscription-plans'}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <TrendingUp className="w-5 h-5" />
                View Plans
              </button>
            </div>
            <Zap className="w-20 h-20 text-blue-200 opacity-50" />
          </div>
        </div>
      )}

      {/* Plan Features */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Plan Features</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            {usage.features.skillVerification ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
            )}
            <span className={usage.features.skillVerification ? 'text-gray-900' : 'text-gray-400'}>
              Skill Verification
            </span>
          </div>
          <div className="flex items-center gap-2">
            {usage.features.prioritySupport ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
            )}
            <span className={usage.features.prioritySupport ? 'text-gray-900' : 'text-gray-400'}>
              Priority Support
            </span>
          </div>
          <div className="flex items-center gap-2">
            {usage.features.analytics ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
            )}
            <span className={usage.features.analytics ? 'text-gray-900' : 'text-gray-400'}>
              Advanced Analytics
            </span>
          </div>
          <div className="flex items-center gap-2">
            {usage.features.apiAccess ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
            )}
            <span className={usage.features.apiAccess ? 'text-gray-900' : 'text-gray-400'}>
              API Access
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageTracker;
