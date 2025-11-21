import React, { useState, useEffect } from 'react';
import { Check, Zap, Crown, Building2, Loader2 } from 'lucide-react';

interface PlanFeatures {
  proposalLimit: number;
  jobPostLimit: number;
  skillVerification: boolean;
  prioritySupport: boolean;
  analytics: boolean;
  customBranding: boolean;
  dedicatedAccountManager: boolean;
  advancedReporting: boolean;
  apiAccess: boolean;
}

interface Plan {
  type: string;
  name: string;
  price: number;
  priceYearly: number;
  currency: string;
  features: PlanFeatures;
  description: string;
  popular: boolean;
  trialDays?: number;
}

interface SubscriptionPlansProps {
  onSubscribe?: (planType: string, billingCycle: string) => void;
  currentPlan?: string;
}

const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({ onSubscribe, currentPlan = 'free' }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/subscriptions/plans', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Plans response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Plans data:', data);
        setPlans(data);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch plans:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planType: string) => {
    if (planType === 'free') {
      alert('You are already on the free plan');
      return;
    }

    setSubscribing(planType);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/subscriptions/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          planType,
          billingCycle
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Check if this is a mock/development subscription
        const isMockSubscription = data.razorpaySubscription?.short_url?.includes('/mock/');
        
        if (isMockSubscription) {
          // Development mode - don't redirect to mock URL
          alert('✅ Subscription created successfully!\n\n⚠️ Development Mode: Payment gateway is bypassed.\n\nYou are now on the ' + planType.toUpperCase() + ' plan.');
          if (onSubscribe) {
            onSubscribe(planType, billingCycle);
          }
          // Reload to update user data
          window.location.reload();
        } else if (data.razorpaySubscription?.short_url) {
          // Production mode - redirect to actual Razorpay payment page
          window.location.href = data.razorpaySubscription.short_url;
        } else {
          alert('Subscription created! You are now on the ' + planType + ' plan.');
          if (onSubscribe) {
            onSubscribe(planType, billingCycle);
          }
        }
      } else {
        alert(data.error || 'Failed to create subscription');
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      alert('Failed to create subscription. Please try again.');
    } finally {
      setSubscribing(null);
    }
  };

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'free':
        return <Zap className="w-8 h-8" />;
      case 'pro':
        return <Crown className="w-8 h-8" />;
      case 'enterprise':
        return <Building2 className="w-8 h-8" />;
      default:
        return <Zap className="w-8 h-8" />;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  const getFeaturesList = (plan: Plan) => {
    const features = [];
    
    if (plan.features.proposalLimit === -1) {
      features.push('Unlimited proposals');
    } else {
      features.push(`${plan.features.proposalLimit} proposals per month`);
    }
    
    if (plan.features.jobPostLimit === -1) {
      features.push('Unlimited job posts');
    } else {
      features.push(`${plan.features.jobPostLimit} job posts per month`);
    }
    
    if (plan.features.skillVerification) features.push('Skill verification');
    if (plan.features.prioritySupport) features.push('Priority support');
    if (plan.features.analytics) features.push('Advanced analytics');
    if (plan.features.advancedReporting) features.push('Advanced reporting');
    if (plan.features.apiAccess) features.push('API access');
    if (plan.features.customBranding) features.push('Custom branding');
    if (plan.features.dedicatedAccountManager) features.push('Dedicated account manager');
    
    return features;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Unable to load subscription plans</h2>
          <p className="text-gray-600 mb-6">Please check the console for errors and try refreshing the page.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Select the perfect plan for your freelancing journey
          </p>
          
          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-white rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'yearly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const price = billingCycle === 'yearly' ? plan.priceYearly : plan.price;
            const monthlyPrice = billingCycle === 'yearly' ? Math.round(plan.priceYearly / 12) : plan.price;
            const features = getFeaturesList(plan);
            const isCurrentPlan = currentPlan === plan.type;

            return (
              <div
                key={plan.type}
                className={`relative bg-white rounded-2xl shadow-xl overflow-hidden transition-transform hover:scale-105 ${
                  plan.popular ? 'ring-2 ring-blue-600' : ''
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 text-sm font-semibold rounded-bl-lg">
                    Most Popular
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrentPlan && (
                  <div className="absolute top-0 left-0 bg-green-600 text-white px-4 py-1 text-sm font-semibold rounded-br-lg">
                    Current Plan
                  </div>
                )}

                <div className="p-8">
                  {/* Icon */}
                  <div className={`inline-flex p-3 rounded-lg mb-4 ${
                    plan.type === 'free' ? 'bg-gray-100 text-gray-600' :
                    plan.type === 'pro' ? 'bg-blue-100 text-blue-600' :
                    'bg-purple-100 text-purple-600'
                  }`}>
                    {getPlanIcon(plan.type)}
                  </div>

                  {/* Plan Name */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 mb-6 h-12">
                    {plan.description}
                  </p>

                  {/* Pricing */}
                  <div className="mb-6">
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold text-gray-900">
                        {formatPrice(monthlyPrice)}
                      </span>
                      <span className="text-gray-600 ml-2">/month</span>
                    </div>
                    {billingCycle === 'yearly' && plan.price > 0 && (
                      <p className="text-sm text-gray-500 mt-1">
                        {formatPrice(price)} billed annually
                      </p>
                    )}
                    {plan.trialDays && (
                      <p className="text-sm text-green-600 mt-2 font-medium">
                        {plan.trialDays}-day free trial included
                      </p>
                    )}
                  </div>

                  {/* Subscribe Button */}
                  <button
                    onClick={() => handleSubscribe(plan.type)}
                    disabled={isCurrentPlan || subscribing === plan.type}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors mb-6 ${
                      isCurrentPlan
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : plan.popular
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {subscribing === plan.type ? (
                      <span className="flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Processing...
                      </span>
                    ) : isCurrentPlan ? (
                      'Current Plan'
                    ) : plan.type === 'free' ? (
                      'Get Started'
                    ) : (
                      'Subscribe Now'
                    )}
                  </button>

                  {/* Features List */}
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-gray-900 mb-3">
                      What's included:
                    </p>
                    {features.map((feature, index) => (
                      <div key={index} className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6 bg-white rounded-lg shadow-lg p-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I change my plan later?
              </h3>
              <p className="text-gray-600">
                Yes! You can upgrade or downgrade your plan at any time. Upgrades take effect immediately, while downgrades will be applied at the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept all major credit/debit cards, UPI, net banking, and wallets through Razorpay.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-600">
                Yes! Pro and Enterprise plans come with a 14-day free trial. No credit card required to start your trial.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-gray-600">
                Absolutely! You can cancel your subscription at any time from your billing portal. You'll continue to have access until the end of your billing period.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlans;
