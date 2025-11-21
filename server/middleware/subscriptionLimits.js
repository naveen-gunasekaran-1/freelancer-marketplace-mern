const Subscription = require('../models/Subscription');
const logger = require('../utils/logger');

// Middleware to check if user has reached their subscription limit
const checkSubscriptionLimit = (limitType) => {
  return async (req, res, next) => {
    try {
      // Get user's subscription
      let subscription = await Subscription.findOne({ user: req.user._id });
      
      // If no subscription exists, create a free one
      if (!subscription) {
        const planDetails = Subscription.getPlanDetails('free');
        subscription = new Subscription({
          user: req.user._id,
          planType: 'free',
          status: 'active',
          features: planDetails.features
        });
        await subscription.save();
      }
      
      // Reset monthly usage if needed
      await subscription.resetMonthlyUsage();
      
      // Check if subscription is active
      if (!subscription.isActive()) {
        return res.status(403).json({ 
          error: 'Your subscription is not active',
          requiresUpgrade: true,
          currentPlan: subscription.planType
        });
      }
      
      // Check if limit has been reached
      if (subscription.hasReachedLimit(limitType)) {
        const limit = subscription.features[limitType];
        const usageType = limitType.replace('Limit', 'Count');
        const currentUsage = subscription.usage[usageType];
        
        return res.status(403).json({ 
          error: `You have reached your ${limitType.replace('Limit', '')} limit`,
          limit: limit,
          currentUsage: currentUsage,
          requiresUpgrade: true,
          currentPlan: subscription.planType,
          message: subscription.planType === 'free' 
            ? 'Upgrade to Pro or Enterprise for unlimited access'
            : 'Upgrade to a higher plan for more features'
        });
      }
      
      // Attach subscription to request for later use
      req.subscription = subscription;
      
      next();
    } catch (error) {
      logger.error('Error checking subscription limit:', { 
        error: error.message, 
        userId: req.user._id,
        limitType 
      });
      res.status(500).json({ error: 'Failed to verify subscription' });
    }
  };
};

// Middleware to increment usage after successful action
const incrementUsage = (usageType) => {
  return async (req, res, next) => {
    // Store the original send function
    const originalSend = res.send;
    
    // Override res.send to increment usage on success
    res.send = function(data) {
      // Only increment if response was successful (status 200-299)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Increment usage asynchronously (don't wait)
        if (req.subscription) {
          req.subscription.incrementUsage(usageType).catch(error => {
            logger.error('Error incrementing usage:', { 
              error: error.message, 
              userId: req.user?._id,
              usageType 
            });
          });
        }
      }
      
      // Call the original send function
      originalSend.call(this, data);
    };
    
    next();
  };
};

// Middleware to check if user has access to a feature
const checkFeatureAccess = (featureName) => {
  return async (req, res, next) => {
    try {
      // Get user's subscription
      const subscription = await Subscription.findOne({ user: req.user._id });
      
      if (!subscription) {
        return res.status(403).json({ 
          error: 'No subscription found',
          requiresUpgrade: true
        });
      }
      
      // Check if feature is enabled
      if (!subscription.features[featureName]) {
        return res.status(403).json({ 
          error: `This feature is not available on your current plan`,
          feature: featureName,
          requiresUpgrade: true,
          currentPlan: subscription.planType,
          message: 'Upgrade your plan to access this feature'
        });
      }
      
      req.subscription = subscription;
      next();
    } catch (error) {
      logger.error('Error checking feature access:', { 
        error: error.message, 
        userId: req.user._id,
        feature: featureName 
      });
      res.status(500).json({ error: 'Failed to verify feature access' });
    }
  };
};

// Middleware to attach subscription info to request
const attachSubscription = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }
    
    const subscription = await Subscription.findOne({ user: req.user._id });
    
    if (subscription) {
      await subscription.resetMonthlyUsage();
      req.subscription = subscription;
    }
    
    next();
  } catch (error) {
    logger.error('Error attaching subscription:', { 
      error: error.message, 
      userId: req.user?._id 
    });
    next(); // Continue even if there's an error
  }
};

module.exports = {
  checkSubscriptionLimit,
  incrementUsage,
  checkFeatureAccess,
  attachSubscription
};
