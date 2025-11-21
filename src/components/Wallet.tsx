import React, { useState, useEffect } from 'react';
import { Wallet as WalletIcon, TrendingUp, TrendingDown, Clock, DollarSign, Download, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  from?: { name: string; email: string };
  to?: { name: string; email: string };
  job?: { title: string };
  platformFee?: { amount: number; percentage: number };
  netAmount?: number;
  createdAt: string;
  completedAt?: string;
}

interface WalletData {
  balance: number;
  totalEarnings: number;
  totalWithdrawals: number;
  recentTransactions: Transaction[];
  pendingWithdrawals: Transaction[];
}

const Wallet: React.FC = () => {
  const { token, user } = useAuth();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('bank_transfer');
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    upiId: ''
  });
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const response = await fetch('/api/payments/wallet', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setWalletData(data);
      }
    } catch (error) {
      console.error('Failed to fetch wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async () => {
    try {
      setWithdrawing(true);
      setWithdrawError('');

      const amount = parseFloat(withdrawAmount);
      if (isNaN(amount) || amount < 100) {
        setWithdrawError('Minimum withdrawal amount is ₹100');
        return;
      }

      if (walletData && amount > walletData.balance) {
        setWithdrawError('Insufficient balance');
        return;
      }

      const response = await fetch('/api/payments/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount,
          withdrawalMethod: withdrawMethod,
          bankDetails: withdrawMethod === 'bank_transfer' ? {
            accountNumber: bankDetails.accountNumber,
            ifscCode: bankDetails.ifscCode,
            accountHolderName: bankDetails.accountHolderName
          } : withdrawMethod === 'upi' ? {
            upiId: bankDetails.upiId
          } : {}
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Withdrawal failed');
      }

      alert('✅ Withdrawal request submitted successfully! Processing within 2-3 business days.');
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setBankDetails({
        accountNumber: '',
        ifscCode: '',
        accountHolderName: '',
        upiId: ''
      });
      fetchWalletData();

    } catch (error: any) {
      setWithdrawError(error.message || 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'pending':
      case 'processing':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'processing':
        return 'text-blue-600 bg-blue-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getTransactionLabel = (transaction: Transaction) => {
    if (transaction.type === 'release') return 'Payment Received';
    if (transaction.type === 'withdrawal') return 'Withdrawal';
    if (transaction.type === 'escrow') return 'Payment Held';
    if (transaction.type === 'refund') return 'Refund';
    if (transaction.type === 'platform_fee') return 'Platform Fee';
    return transaction.type;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!walletData) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Failed to load wallet data</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">My Wallet</h1>
        {user?.type === 'freelancer' && (
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Download className="w-5 h-5" />
            <span>Withdraw</span>
          </button>
        )}
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Available Balance */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center space-x-3 mb-2">
            <WalletIcon className="w-8 h-8" />
            <span className="text-sm opacity-90">Available Balance</span>
          </div>
          <p className="text-3xl font-bold">₹{walletData.balance.toLocaleString()}</p>
        </div>

        {/* Total Earnings */}
        <div className="bg-white border border-gray-200 p-6 rounded-lg shadow">
          <div className="flex items-center space-x-3 mb-2">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <span className="text-sm text-gray-600">Total Earnings</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">₹{walletData.totalEarnings.toLocaleString()}</p>
        </div>

        {/* Total Withdrawals */}
        <div className="bg-white border border-gray-200 p-6 rounded-lg shadow">
          <div className="flex items-center space-x-3 mb-2">
            <TrendingDown className="w-6 h-6 text-orange-600" />
            <span className="text-sm text-gray-600">Total Withdrawals</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">₹{walletData.totalWithdrawals.toLocaleString()}</p>
        </div>
      </div>

      {/* Pending Withdrawals */}
      {walletData.pendingWithdrawals && walletData.pendingWithdrawals.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-3">Pending Withdrawals</h3>
          <div className="space-y-2">
            {walletData.pendingWithdrawals.map((withdrawal) => (
              <div key={withdrawal._id} className="flex justify-between items-center bg-white p-3 rounded">
                <div>
                  <p className="font-medium">₹{withdrawal.amount.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">{new Date(withdrawal.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(withdrawal.status)}`}>
                  {withdrawal.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Recent Transactions</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {walletData.recentTransactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No transactions yet</p>
            </div>
          ) : (
            walletData.recentTransactions.map((transaction) => (
              <div key={transaction._id} className="p-4 hover:bg-gray-50 transition">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getStatusIcon(transaction.status)}
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{getTransactionLabel(transaction)}</p>
                      <p className="text-sm text-gray-600 mt-1">{transaction.description}</p>
                      {transaction.job && (
                        <p className="text-xs text-gray-500 mt-1">Project: {transaction.job.title}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(transaction.createdAt).toLocaleString()}
                      </p>
                      {transaction.platformFee && transaction.platformFee.amount > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Platform Fee ({transaction.platformFee.percentage}%): -₹{transaction.platformFee.amount.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right ml-4">
                    <p className={`text-lg font-bold ${
                      transaction.type === 'release' ? 'text-green-600' :
                      transaction.type === 'withdrawal' || transaction.type === 'platform_fee' ? 'text-red-600' :
                      'text-gray-800'
                    }`}>
                      {transaction.type === 'release' ? '+' : transaction.type === 'withdrawal' || transaction.type === 'platform_fee' ? '-' : ''}
                      ₹{transaction.netAmount ? transaction.netAmount.toLocaleString() : transaction.amount.toLocaleString()}
                    </p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Withdraw Funds</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="100"
                  max={walletData.balance}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available: ₹{walletData.balance.toLocaleString()} | Minimum: ₹100
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Withdrawal Method
                </label>
                <select
                  value={withdrawMethod}
                  onChange={(e) => setWithdrawMethod(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                </select>
              </div>

              {withdrawMethod === 'bank_transfer' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={bankDetails.accountHolderName}
                      onChange={(e) => setBankDetails({...bankDetails, accountHolderName: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={bankDetails.accountNumber}
                      onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      value={bankDetails.ifscCode}
                      onChange={(e) => setBankDetails({...bankDetails, ifscCode: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {withdrawMethod === 'upi' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    UPI ID
                  </label>
                  <input
                    type="text"
                    value={bankDetails.upiId}
                    onChange={(e) => setBankDetails({...bankDetails, upiId: e.target.value})}
                    placeholder="yourname@upi"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {withdrawError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{withdrawError}</p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  💡 Processing time: 2-3 business days
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={withdrawing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdrawal}
                  disabled={withdrawing || !withdrawAmount || parseFloat(withdrawAmount) < 100}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  {withdrawing ? 'Processing...' : 'Withdraw'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallet;
