import React, { useState } from 'react';
import { X, CreditCard, Shield, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  proposalId: string;
  amount: number;
  jobTitle: string;
  freelancerName: string;
  onPaymentSuccess?: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  jobId,
  proposalId,
  amount,
  jobTitle,
  freelancerName,
  onPaymentSuccess
}) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [milestoneTitle, setMilestoneTitle] = useState('Initial Payment');
  
  const platformFeePercentage = 15;
  const platformFee = (amount * platformFeePercentage) / 100;
  const totalAmount = amount;

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError('');

      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError('Failed to load payment gateway. Please try again.');
        return;
      }

      // Create order
      const orderResponse = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          jobId,
          proposalId,
          amount: totalAmount,
          milestoneTitle
        })
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error || 'Failed to create payment order');
      }

      const orderData = await orderResponse.json();

      // Razorpay payment options
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Freelancer Marketplace',
        description: `Payment for ${jobTitle}`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            // Verify payment
            const verifyResponse = await fetch('/api/payments/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                transactionId: orderData.transactionId
              })
            });

            if (!verifyResponse.ok) {
              throw new Error('Payment verification failed');
            }

            const verifyData = await verifyResponse.json();
            
            // Success
            alert('✅ Payment successful! Funds are now held in escrow.');
            onPaymentSuccess?.();
            onClose();
            
          } catch (error: any) {
            console.error('Payment verification error:', error);
            setError(error.message || 'Payment verification failed');
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: freelancerName,
          email: '',
          contact: ''
        },
        notes: {
          jobId: jobId,
          proposalId: proposalId
        },
        theme: {
          color: '#3b82f6'
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
            setError('Payment cancelled');
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error: any) {
      console.error('Payment error:', error);
      setError(error.message || 'Payment failed. Please try again.');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Payment Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Job Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">{jobTitle}</h3>
            <p className="text-sm text-gray-600">Freelancer: {freelancerName}</p>
          </div>

          {/* Milestone Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Milestone Title
            </label>
            <input
              type="text"
              value={milestoneTitle}
              onChange={(e) => setMilestoneTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Initial Payment, Milestone 1"
              disabled={loading}
            />
          </div>

          {/* Amount Breakdown */}
          <div className="space-y-3 border-t border-b py-4">
            <div className="flex justify-between text-gray-700">
              <span>Project Amount:</span>
              <span className="font-semibold">₹{amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600 text-sm">
              <span>Platform Fee ({platformFeePercentage}%):</span>
              <span>₹{platformFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-800">
              <span>Total Amount:</span>
              <span>₹{totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600 text-sm">
              <span>Freelancer Receives:</span>
              <span className="text-green-600 font-semibold">₹{(amount - platformFee).toLocaleString()}</span>
            </div>
          </div>

          {/* Escrow Information */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-800 text-sm">Secure Escrow Payment</h4>
                <p className="text-xs text-green-700 mt-1">
                  Your payment is held securely until work is completed
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-800 text-sm">Auto-Release in 7 Days</h4>
                <p className="text-xs text-green-700 mt-1">
                  Funds automatically released if no disputes are raised
                </p>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="flex items-center space-x-3 p-3 border rounded-lg">
            <CreditCard className="w-6 h-6 text-blue-600" />
            <div>
              <p className="font-medium text-gray-800">Razorpay</p>
              <p className="text-xs text-gray-500">Cards, UPI, NetBanking, Wallets</p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Terms */}
          <p className="text-xs text-gray-500 text-center">
            By proceeding, you agree to our Terms of Service and Escrow Policy
          </p>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handlePayment}
              disabled={loading || !milestoneTitle.trim()}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : `Pay ₹${totalAmount.toLocaleString()}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
