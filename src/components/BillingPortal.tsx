import React, { useState, useEffect } from 'react';
import { CreditCard, Download, Clock, CheckCircle, XCircle, AlertCircle, Loader2, TrendingUp } from 'lucide-react';

interface Subscription {
  planType: string;
  status: string;
  amount: number;
  currency: string;
  billingCycle: string;
  currentPeriodEnd: string;
  cancelledAt?: string;
  trialEndsAt?: string;
  invoices: Invoice[];
}

interface Invoice {
  _id: string;
  invoiceId: string;
  amount: number;
  currency: string;
  status: string;
  paidAt?: string;
  createdAt: string;
}

const BillingPortal: React.FC = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/subscriptions/current', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!subscription) return;

    const newPlan = subscription.planType === 'free' ? 'pro' : 'enterprise';
    
    if (window.confirm(`Upgrade to ${newPlan.toUpperCase()} plan?`)) {
      setActionLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/subscriptions/upgrade', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ planType: newPlan })
        });

        if (response.ok) {
          alert('Plan upgraded successfully!');
          fetchSubscription();
        } else {
          const data = await response.json();
          alert(data.error || 'Failed to upgrade plan');
        }
      } catch (error) {
        console.error('Error upgrading:', error);
        alert('Failed to upgrade plan');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleDowngrade = async () => {
    if (!subscription) return;

    const newPlan = subscription.planType === 'enterprise' ? 'pro' : 'free';
    
    if (window.confirm(`Downgrade to ${newPlan.toUpperCase()} plan? This will take effect at the end of your billing period.`)) {
      setActionLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/subscriptions/downgrade', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ planType: newPlan })
        });

        if (response.ok) {
          alert('Plan will be downgraded at the end of your billing period');
          fetchSubscription();
        } else {
          const data = await response.json();
          alert(data.error || 'Failed to downgrade plan');
        }
      } catch (error) {
        console.error('Error downgrading:', error);
        alert('Failed to downgrade plan');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel your subscription? You will continue to have access until the end of your billing period.')) {
      setActionLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/subscriptions/cancel', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          alert('Subscription cancelled. You will have access until the end of your billing period.');
          fetchSubscription();
        } else {
          const data = await response.json();
          alert(data.error || 'Failed to cancel subscription');
        }
      } catch (error) {
        console.error('Error cancelling:', error);
        alert('Failed to cancel subscription');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPrice = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'trialing':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'past_due':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'trialing':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600">No subscription found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Billing & Subscription</h1>

      {/* Current Plan */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {subscription.planType.toUpperCase()} Plan
            </h2>
            <div className="flex items-center gap-2">
              {getStatusIcon(subscription.status)}
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(subscription.status)}`}>
                {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900">
              {formatPrice(subscription.amount, subscription.currency)}
            </div>
            <div className="text-sm text-gray-600">
              per {subscription.billingCycle === 'yearly' ? 'year' : 'month'}
            </div>
          </div>
        </div>

        {subscription.trialEndsAt && new Date(subscription.trialEndsAt) > new Date() && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              <Clock className="inline w-4 h-4 mr-1" />
              Trial ends on {formatDate(subscription.trialEndsAt)}
            </p>
          </div>
        )}

        {subscription.cancelledAt && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-800">
              Subscription cancelled on {formatDate(subscription.cancelledAt)}. 
              You will have access until {formatDate(subscription.currentPeriodEnd)}.
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Billing Cycle</p>
            <p className="font-medium text-gray-900 capitalize">{subscription.billingCycle}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Next Billing Date</p>
            <p className="font-medium text-gray-900">{formatDate(subscription.currentPeriodEnd)}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {subscription.planType !== 'enterprise' && subscription.status !== 'cancelled' && (
            <button
              onClick={handleUpgrade}
              disabled={actionLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <TrendingUp className="w-4 h-4 mr-2" />
              )}
              Upgrade Plan
            </button>
          )}
          {subscription.planType !== 'free' && subscription.status !== 'cancelled' && (
            <button
              onClick={handleDowngrade}
              disabled={actionLoading}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Downgrade Plan
            </button>
          )}
          {subscription.planType !== 'free' && subscription.status !== 'cancelled' && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="px-6 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
            >
              Cancel Subscription
            </button>
          )}
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <CreditCard className="w-5 h-5 mr-2" />
          Payment History
        </h2>
        
        {subscription.invoices && subscription.invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {subscription.invoices.map((invoice) => (
                  <tr key={invoice._id} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {formatDate(invoice.paidAt || invoice.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {formatPrice(invoice.amount, invoice.currency)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button className="text-blue-600 hover:text-blue-800 text-sm flex items-center ml-auto">
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-600 text-center py-8">No payment history yet.</p>
        )}
      </div>
    </div>
  );
};

export default BillingPortal;
