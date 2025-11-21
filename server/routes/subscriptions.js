const express = require('express');
const router = express.Router();
const path = require('path');

// Ensure environment variables are loaded
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const Subscription = require('../models/Subscription');
const User = require('../models/User');
const auth = require('../middleware/auth');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Initialize Razorpay
const hasRazorpayCredentials = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
let razorpay = null;
if (hasRazorpayCredentials) {
  try {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  } catch (initErr) {
    logger.warn('Failed to initialize Razorpay client, running in mock mode', { error: initErr.message });
    razorpay = null;
  }
} else {
  logger.warn('Razorpay credentials not set. Subscriptions will run in mock/development mode.');
}

// @route   GET /api/subscriptions/plans
// @desc    Get all available subscription plans
// @access  Public
router.get('/plans', async (req, res) => {
  try {
    const plans = ['free', 'pro', 'enterprise'].map(planType => ({
      type: planType,
      ...Subscription.getPlanDetails(planType)
    }));
    
    res.json(plans);
  } catch (error) {
    logger.error('Error fetching plans:', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// @route   GET /api/subscriptions/current
// @desc    Get current user's subscription
// @access  Private
router.get('/current', auth, async (req, res) => {
  try {
    let subscription = await Subscription.findOne({ user: req.user._id });
    
    // If no subscription exists, create a free one
    if (!subscription) {
      const planDetails = Subscription.getPlanDetails('free');
      subscription = new Subscription({
        user: req.user._id,
        planType: 'free',
        status: 'active',
        features: planDetails.features,
        amount: 0
      });
      await subscription.save();
    }
    
    // Reset monthly usage if needed
    await subscription.resetMonthlyUsage();
    
    res.json(subscription);
  } catch (error) {
    logger.error('Error fetching subscription:', { error: error.message, userId: req.user._id });
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// @route   POST /api/subscriptions/subscribe
// @desc    Create a new subscription
// @access  Private
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { planType, billingCycle = 'monthly' } = req.body;
    
    if (!['pro', 'enterprise'].includes(planType)) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }
    
    // Check if user already has an active subscription
    let subscription = await Subscription.findOne({ user: req.user._id });
    
    if (subscription && subscription.isActive() && subscription.planType !== 'free') {
      return res.status(400).json({ error: 'You already have an active subscription. Please upgrade or downgrade instead.' });
    }
    
    const planDetails = Subscription.getPlanDetails(planType);
    const amount = billingCycle === 'yearly' ? planDetails.priceYearly : planDetails.price;
    const trialDays = planDetails.trialDays || 0;
    
    let razorpayPlan, razorpaySubscription;
    
    // In development mode, skip Razorpay if credentials are test/invalid
  const isDevelopment = process.env.NODE_ENV === 'development';
  // Skip Razorpay if client not configured or explicitly using test keys in development
  const skipRazorpay = !razorpay || (isDevelopment && (process.env.RAZORPAY_KEY_ID || '').includes('test'));
    
    if (!skipRazorpay) {
      try {
        // Create Razorpay subscription
        razorpayPlan = await razorpay.plans.create({
          period: billingCycle === 'yearly' ? 'yearly' : 'monthly',
          interval: 1,
          item: {
            name: `${planDetails.name} Plan`,
            amount: amount * 100, // Razorpay expects amount in paise
            currency: 'INR',
            description: planDetails.description
          }
        });
        
        // Create Razorpay subscription
        razorpaySubscription = await razorpay.subscriptions.create({
          plan_id: razorpayPlan.id,
          customer_notify: 1,
          total_count: billingCycle === 'yearly' ? 12 : 120, // 12 years worth
          quantity: 1,
          start_at: trialDays > 0 ? Math.floor(Date.now() / 1000) + (trialDays * 24 * 60 * 60) : undefined,
          notes: {
            userId: req.user._id.toString(),
            planType: planType
          }
        });
      } catch (razorpayError) {
        console.error('Razorpay API Error:', razorpayError);
        throw new Error(`Razorpay API failed: ${razorpayError.message || razorpayError.error?.description || 'Unknown error'}`);
      }
    } else {
      // Development mode - create mock Razorpay IDs
      console.log('⚠️  Development mode: Skipping Razorpay API, using mock subscription');
      razorpayPlan = { id: `plan_dev_${Date.now()}` };
      razorpaySubscription = { 
        id: `sub_dev_${Date.now()}`,
        short_url: `https://razorpay.com/mock/subscription/${Date.now()}`
      };
    }
    
    // Calculate trial end date
    const trialEndsAt = trialDays > 0 ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000) : null;
    
    // Update or create subscription
    if (subscription) {
      subscription.planType = planType;
      subscription.status = trialDays > 0 ? 'trialing' : 'active';
      subscription.razorpaySubscriptionId = razorpaySubscription.id;
      subscription.razorpayPlanId = razorpayPlan.id;
      subscription.amount = amount;
      subscription.billingCycle = billingCycle;
      subscription.features = planDetails.features;
      subscription.trialEndsAt = trialEndsAt;
      subscription.currentPeriodStart = new Date();
      subscription.currentPeriodEnd = new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000);
    } else {
      subscription = new Subscription({
        user: req.user._id,
        planType: planType,
        status: trialDays > 0 ? 'trialing' : 'active',
        razorpaySubscriptionId: razorpaySubscription.id,
        razorpayPlanId: razorpayPlan.id,
        amount: amount,
        currency: 'INR',
        billingCycle: billingCycle,
        features: planDetails.features,
        trialEndsAt: trialEndsAt,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000)
      });
    }
    
    await subscription.save();
    
    res.json({
      subscription,
      razorpaySubscription: {
        id: razorpaySubscription.id,
        short_url: razorpaySubscription.short_url
      }
    });
  } catch (error) {
    logger.error('Error creating subscription:', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user._id 
    });
    console.error('Subscription creation error:', error);
    res.status(500).json({ error: 'Failed to create subscription', details: error.message });
  }
});

// @route   PUT /api/subscriptions/upgrade
// @desc    Upgrade to a higher plan
// @access  Private
router.put('/upgrade', auth, async (req, res) => {
  try {
    const { planType } = req.body;
    
    if (!['pro', 'enterprise'].includes(planType)) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }
    
    const subscription = await Subscription.findOne({ user: req.user._id });
    
    if (!subscription) {
      return res.status(404).json({ error: 'No subscription found' });
    }
    
    // Check if it's actually an upgrade
    const planHierarchy = { free: 0, pro: 1, enterprise: 2 };
    if (planHierarchy[planType] <= planHierarchy[subscription.planType]) {
      return res.status(400).json({ error: 'This is not an upgrade. Use downgrade endpoint instead.' });
    }
    
    await subscription.upgradePlan(planType);
    
    // If they have a Razorpay subscription, we should update it
    // For now, we'll create a new subscription
    // In production, you'd use Razorpay's update subscription API
    
    res.json(subscription);
  } catch (error) {
    logger.error('Error upgrading subscription:', { error: error.message, userId: req.user._id });
    res.status(500).json({ error: 'Failed to upgrade subscription' });
  }
});

// @route   PUT /api/subscriptions/downgrade
// @desc    Downgrade to a lower plan
// @access  Private
router.put('/downgrade', auth, async (req, res) => {
  try {
    const { planType } = req.body;
    
    if (!['free', 'pro'].includes(planType)) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }
    
    const subscription = await Subscription.findOne({ user: req.user._id });
    
    if (!subscription) {
      return res.status(404).json({ error: 'No subscription found' });
    }
    
    // Check if it's actually a downgrade
    const planHierarchy = { free: 0, pro: 1, enterprise: 2 };
    if (planHierarchy[planType] >= planHierarchy[subscription.planType]) {
      return res.status(400).json({ error: 'This is not a downgrade. Use upgrade endpoint instead.' });
    }
    
    const planDetails = Subscription.getPlanDetails(planType);
    
    subscription.planType = planType;
    subscription.features = planDetails.features;
    subscription.amount = planDetails.price;
    
    // If downgrading to free, cancel Razorpay subscription
    if (planType === 'free' && subscription.razorpaySubscriptionId) {
      if (razorpay) {
        try {
          await razorpay.subscriptions.cancel(subscription.razorpaySubscriptionId);
          subscription.status = 'cancelled';
          subscription.cancelledAt = new Date();
        } catch (error) {
          logger.error('Error cancelling Razorpay subscription:', { error: error.message });
        }
      } else {
        logger.warn('Razorpay client not configured; skipping subscription cancel');
      }
    }
    
    await subscription.save();
    
    res.json(subscription);
  } catch (error) {
    logger.error('Error downgrading subscription:', { error: error.message, userId: req.user._id });
    res.status(500).json({ error: 'Failed to downgrade subscription' });
  }
});

// @route   POST /api/subscriptions/cancel
// @desc    Cancel subscription
// @access  Private
router.post('/cancel', auth, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id });
    
    if (!subscription) {
      return res.status(404).json({ error: 'No subscription found' });
    }
    
    if (subscription.planType === 'free') {
      return res.status(400).json({ error: 'Cannot cancel free plan' });
    }
    
    // Cancel Razorpay subscription
    if (subscription.razorpaySubscriptionId) {
      if (razorpay) {
        try {
          await razorpay.subscriptions.cancel(subscription.razorpaySubscriptionId);
        } catch (error) {
          logger.error('Error cancelling Razorpay subscription:', { error: error.message });
        }
      } else {
        logger.warn('Razorpay client not configured; skipping subscription cancel');
      }
    }
    
    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    
    // Optionally downgrade to free at the end of billing period
    // For now, we'll keep their features until period ends
    
    await subscription.save();
    
    res.json(subscription);
  } catch (error) {
    logger.error('Error cancelling subscription:', { error: error.message, userId: req.user._id });
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// @route   POST /api/subscriptions/webhook
// @desc    Handle Razorpay webhook events
// @access  Public (but verified)
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    
    // Verify webhook signature
    const body = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      logger.warn('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }
    
    const event = req.body.event;
    const payload = req.body.payload.subscription.entity || req.body.payload.payment.entity;
    
    logger.info('Webhook received:', { event, subscriptionId: payload.id });
    
    // Find subscription by Razorpay ID
    const subscription = await Subscription.findOne({ 
      razorpaySubscriptionId: payload.id 
    });
    
    if (!subscription) {
      logger.warn('Subscription not found for webhook:', { subscriptionId: payload.id });
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    // Handle different events
    switch (event) {
      case 'subscription.activated':
        subscription.status = 'active';
        subscription.currentPeriodStart = new Date(payload.current_start * 1000);
        subscription.currentPeriodEnd = new Date(payload.current_end * 1000);
        break;
        
      case 'subscription.charged':
        // Add invoice
        subscription.invoices.push({
          razorpayInvoiceId: payload.invoice_id,
          amount: payload.amount / 100,
          currency: payload.currency,
          status: 'paid',
          paidAt: new Date(payload.paid_at * 1000)
        });
        break;
        
      case 'subscription.cancelled':
        subscription.status = 'cancelled';
        subscription.cancelledAt = new Date();
        break;
        
      case 'subscription.paused':
        subscription.status = 'inactive';
        break;
        
      case 'subscription.resumed':
        subscription.status = 'active';
        break;
        
      case 'subscription.pending':
        subscription.status = 'past_due';
        break;
        
      default:
        logger.info('Unhandled webhook event:', { event });
    }
    
    await subscription.save();
    
    res.json({ status: 'ok' });
  } catch (error) {
    logger.error('Error handling webhook:', { error: error.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// @route   GET /api/subscriptions/usage
// @desc    Get current usage statistics
// @access  Private
router.get('/usage', auth, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id });
    
    if (!subscription) {
      return res.status(404).json({ error: 'No subscription found' });
    }
    
    const usage = {
      proposalsCount: subscription.usage.proposalsCount,
      proposalLimit: subscription.features.proposalLimit,
      proposalPercentage: subscription.features.proposalLimit === -1 
        ? 0 
        : (subscription.usage.proposalsCount / subscription.features.proposalLimit) * 100,
      jobsPosted: subscription.usage.jobsPosted,
      jobPostLimit: subscription.features.jobPostLimit,
      jobPercentage: subscription.features.jobPostLimit === -1 
        ? 0 
        : (subscription.usage.jobsPosted / subscription.features.jobPostLimit) * 100,
      planType: subscription.planType,
      features: subscription.features
    };
    
    res.json(usage);
  } catch (error) {
    logger.error('Error fetching usage:', { error: error.message, userId: req.user._id });
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

module.exports = router;
