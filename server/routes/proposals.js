const express = require('express');
const Proposal = require('../models/Proposal');
const Job = require('../models/Job');
const User = require('../models/User');
const SecureConversation = require('../models/SecureConversation');
const authenticateToken = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

// Submit proposal (freelancers only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'freelancer') {
      return res.status(403).json({ error: 'Only freelancers can submit proposals' });
    }

    const { jobId, coverLetter, proposedBudget, timeline } = req.body;

    console.log('Proposal submission request:', { jobId, coverLetter: coverLetter ? 'present' : 'missing', proposedBudget, timeline });

    // Validation
    if (!jobId || !coverLetter || !proposedBudget || !timeline) {
      console.log('Validation failed:', { jobId: !!jobId, coverLetter: !!coverLetter, proposedBudget: !!proposedBudget, timeline: !!timeline });
      return res.status(400).json({ 
        error: 'All fields are required',
        missing: {
          jobId: !jobId,
          coverLetter: !coverLetter,
          proposedBudget: !proposedBudget,
          timeline: !timeline
        }
      });
    }

    // Check if job exists and is open
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'open') {
      return res.status(400).json({ error: 'Job is no longer accepting proposals' });
    }

    // Check if freelancer already submitted a proposal
    const existingProposal = await Proposal.findOne({
      jobId,
      freelancerId: req.user._id
    });

    if (existingProposal) {
      return res.status(400).json({ error: 'You have already submitted a proposal for this job' });
    }

    // Create proposal
    const newProposal = new Proposal({
      jobId,
      freelancerId: req.user._id,
      coverLetter,
      proposedBudget,
      timeline
    });

    await newProposal.save();

    // Update job proposal count
    await Job.findByIdAndUpdate(jobId, {
      $inc: { proposalCount: 1 }
    });

    // Populate proposal with job and freelancer info
    await newProposal.populate([
      { path: 'jobId', select: 'title budget category' },
      { path: 'freelancerId', select: 'name rating skills' }
    ]);

    // Emit real-time event for new proposal
    if (global.io) {
      global.io.emit('proposal_submitted', {
        proposal: newProposal,
        jobId: jobId,
        freelancerId: req.user._id,
        clientId: job.clientId,
        timestamp: new Date()
      });
      console.log('🌐 Broadcasted proposal_submitted event:', newProposal._id);
    }

    res.status(201).json(newProposal);
  } catch (error) {
    console.error('Proposal submission error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get proposals for a job (job owner only)
router.get('/job/:jobId', authenticateToken, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.clientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to view proposals for this job' });
    }

    const proposals = await Proposal.find({ jobId: req.params.jobId })
      .populate('freelancerId', 'name rating skills completedJobs location')
      .sort({ createdAt: -1 });

    res.json(proposals);
  } catch (error) {
    console.error('Job proposals fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get freelancer's proposals
router.get('/user/my-proposals', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'freelancer') {
      return res.status(403).json({ error: 'Only freelancers can view their proposals' });
    }

    const proposals = await Proposal.find({ freelancerId: req.user._id })
      .populate('jobId', 'title budget category status clientId')
      .populate({
        path: 'jobId',
        populate: {
          path: 'clientId',
          select: 'name rating'
        }
      })
      .sort({ createdAt: -1 });

    res.json(proposals);
  } catch (error) {
    console.error('User proposals fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update proposal status (job owner only)
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    console.log('📝 Proposal status update request for ID:', req.params.id);
    console.log('📝 Requested status:', req.body.status);
    
    const { status, clientResponse } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const proposal = await Proposal.findById(req.params.id)
      .populate('jobId');

    if (!proposal) {
      console.log('❌ Proposal not found:', req.params.id);
      return res.status(404).json({ error: 'Proposal not found' });
    }

    console.log('📝 Proposal found - Job:', proposal.jobId.title);
    console.log('📝 Proposal current status:', proposal.status);

    // Check if user is the job owner
    if (proposal.jobId.clientId.toString() !== req.user._id.toString()) {
      console.log('❌ User not authorized. Job owner:', proposal.jobId.clientId, 'User:', req.user._id);
      return res.status(403).json({ error: 'Not authorized to update this proposal' });
    }

    // Update proposal
    proposal.status = status;
    if (clientResponse) {
      proposal.clientResponse = clientResponse;
    }

    console.log('💾 Saving proposal with status:', status);
    await proposal.save();
    console.log('✅ Proposal saved successfully');

    // If accepted, update job status and selected freelancer
    if (status === 'accepted') {
      console.log('🎉 Proposal accepted! Starting conversation creation...');
      console.log('📋 Job ID:', proposal.jobId._id);
      console.log('📋 Proposal ID:', proposal._id);
      console.log('👤 Client ID:', proposal.jobId.clientId);
      console.log('👤 Freelancer ID:', proposal.freelancerId);
      
      await Job.findByIdAndUpdate(proposal.jobId._id, {
        status: 'in_progress',
        selectedFreelancer: proposal.freelancerId
      });
      console.log('✅ Job updated to in_progress');

      // Reject all other proposals for this job
      await Proposal.updateMany(
        { 
          jobId: proposal.jobId._id, 
          _id: { $ne: proposal._id },
          status: 'pending'
        },
        { status: 'rejected' }
      );
      console.log('✅ Other proposals rejected');

      // Create secure end-to-end encrypted conversation
      const conversationId = `secure_${proposal.jobId._id}_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
      
      console.log('🔐 Creating secure conversation with ID:', conversationId);
      
      const secureConversation = new SecureConversation({
        jobId: proposal.jobId._id,
        proposalId: proposal._id,
        clientId: proposal.jobId.clientId,
        freelancerId: proposal.freelancerId,
        conversationId,
        security: {
          requireVerification: true,
          watermarkEnabled: true,
          allowScreenRecording: false
        },
        videoConference: {
          enabled: true,
          recordingAllowed: false // For maximum privacy
        },
        sharedWorkspace: {
          enabled: true
        }
      });

      console.log('💾 Saving secure conversation...');
      await secureConversation.save();
      
      console.log('✅ Secure conversation created successfully!');
      console.log('📋 Conversation ID:', conversationId);
      console.log('📋 Conversation _id:', secureConversation._id);

      // Add audit log entry
      await secureConversation.addAuditLog(
        'conversation_created',
        req.user._id,
        'Secure conversation initiated after proposal acceptance',
        req.ip,
        req.get('user-agent')
      );

      // Emit real-time event for proposal acceptance
      if (global.io) {
        global.io.emit('proposal_accepted', {
          proposal: proposal,
          jobId: proposal.jobId._id,
          freelancerId: proposal.freelancerId,
          clientId: proposal.jobId.clientId,
          conversationId: conversationId,
          timestamp: new Date()
        });
        console.log('🌐 Broadcasted proposal_accepted event:', proposal._id);
      }

      // Emit socket event to both users about new secure conversation
      if (req.io) {
        req.io.to(`user_${proposal.jobId.clientId}`).emit('secure_conversation_created', {
          conversationId: secureConversation.conversationId,
          jobId: proposal.jobId._id,
          partnerId: proposal.freelancerId,
          message: 'A secure encrypted conversation has been established'
        });

        req.io.to(`user_${proposal.freelancerId}`).emit('secure_conversation_created', {
          conversationId: secureConversation.conversationId,
          jobId: proposal.jobId._id,
          partnerId: proposal.jobId.clientId,
          message: 'Your proposal was accepted! A secure encrypted conversation has been established'
        });
      }
    }

    await proposal.populate('freelancerId', 'name rating skills');

    res.json(proposal);
  } catch (error) {
    console.error('Proposal status update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Withdraw proposal (freelancer only)
router.put('/:id/withdraw', authenticateToken, async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id);

    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    if (proposal.freelancerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to withdraw this proposal' });
    }

    if (proposal.status !== 'pending') {
      return res.status(400).json({ error: 'Can only withdraw pending proposals' });
    }

    proposal.status = 'withdrawn';
    await proposal.save();

    // Decrease job proposal count
    await Job.findByIdAndUpdate(proposal.jobId, {
      $inc: { proposalCount: -1 }
    });

    res.json(proposal);
  } catch (error) {
    console.error('Proposal withdrawal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;