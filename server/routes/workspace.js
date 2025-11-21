const express = require('express');
const router = express.Router();
const Workspace = require('../models/Workspace');
const authenticateToken = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Create a new workspace
router.post('/', authenticateToken, [
  body('name').notEmpty().trim(),
  body('jobId').isMongoId(),
  body('clientId').isMongoId(),
  body('freelancerId').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, jobId, clientId, freelancerId } = req.body;

    const workspace = new Workspace({
      name,
      description,
      job: jobId,
      client: clientId,
      freelancer: freelancerId,
      timeline: [{
        event: 'Workspace Created',
        description: 'Workspace has been created',
        performedBy: req.user._id
      }]
    });

    await workspace.save();
    await workspace.populate(['client', 'freelancer', 'job']);

    res.status(201).json(workspace);
  } catch (error) {
    console.error('Workspace creation error:', error);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

// Get all workspaces for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const query = {
      $or: [
        { client: req.user._id },
        { freelancer: req.user._id },
        { 'teamMembers.user': req.user._id }
      ]
    };

    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by job ID if provided
    if (req.query.jobId) {
      query.job = req.query.jobId;
    }

    const workspaces = await Workspace.find(query)
      .populate('client', 'name email profileImage')
      .populate('freelancer', 'name email profileImage skills')
      .populate('job', 'title budget')
      .populate('teamMembers.user', 'name email profileImage')
      .populate('teamMembers.invitedBy', 'name')
      .populate('tasks.assignedTo', 'name email')
      .populate('tasks.createdBy', 'name')
      .populate('documents.uploadedBy', 'name')
      .sort({ updatedAt: -1 });

    res.json(workspaces);
  } catch (error) {
    console.error('Fetch workspaces error:', error);
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

// Get workspace by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('client', 'name email profileImage')
      .populate('freelancer', 'name email profileImage skills')
      .populate('job')
      .populate('meetings.participants.user', 'name email profileImage')
      .populate('timeline.performedBy', 'name');

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check if user has access
    if (workspace.client._id.toString() !== req.user._id.toString() &&
        workspace.freelancer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(workspace);
  } catch (error) {
    console.error('Fetch workspace error:', error);
    res.status(500).json({ error: 'Failed to fetch workspace' });
  }
});

// Schedule a meeting
router.post('/:id/meetings', authenticateToken, [
  body('title').notEmpty().trim(),
  body('scheduledAt').isISO8601(),
  body('duration').isInt({ min: 15, max: 480 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check access
    if (workspace.client.toString() !== req.user._id.toString() &&
        workspace.freelancer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { title, description, scheduledAt, duration, agenda } = req.body;

    // Generate unique meeting ID
    const meetingId = `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const meeting = {
      title,
      description,
      scheduledAt: new Date(scheduledAt),
      duration: duration || 60,
      meetingId,
      meetingLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/meeting/${meetingId}`,
      participants: [
        { user: workspace.client, role: 'host', status: 'accepted' },
        { user: workspace.freelancer, role: 'participant', status: 'invited' }
      ],
      agenda: agenda || []
    };

    workspace.meetings.push(meeting);
    workspace.timeline.push({
      event: 'Meeting Scheduled',
      description: `Meeting "${title}" scheduled for ${new Date(scheduledAt).toLocaleString()}`,
      performedBy: req.user._id
    });

    await workspace.save();
    await workspace.populate('meetings.participants.user', 'name email profileImage');

    res.status(201).json(workspace.meetings[workspace.meetings.length - 1]);
  } catch (error) {
    console.error('Schedule meeting error:', error);
    res.status(500).json({ error: 'Failed to schedule meeting' });
  }
});

// Update meeting status
router.patch('/:workspaceId/meetings/:meetingId', authenticateToken, async (req, res) => {
  try {
    const { workspaceId, meetingId } = req.params;
    const { status, notes } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const meeting = workspace.meetings.id(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    if (status) meeting.status = status;
    if (notes) meeting.notes = notes;

    workspace.timeline.push({
      event: 'Meeting Updated',
      description: `Meeting "${meeting.title}" status changed to ${status}`,
      performedBy: req.user._id
    });

    await workspace.save();
    res.json(meeting);
  } catch (error) {
    console.error('Update meeting error:', error);
    res.status(500).json({ error: 'Failed to update meeting' });
  }
});

// Add task to workspace
router.post('/:id/tasks', authenticateToken, [
  body('title').notEmpty().trim()
], async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const { title, description, assignedTo, priority, dueDate } = req.body;

    workspace.tasks.push({
      title,
      description,
      assignedTo,
      priority: priority || 'medium',
      dueDate
    });

    workspace.timeline.push({
      event: 'Task Created',
      description: `Task "${title}" has been created`,
      performedBy: req.user._id
    });

    await workspace.save();
    res.status(201).json(workspace.tasks[workspace.tasks.length - 1]);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task status
router.patch('/:workspaceId/tasks/:taskId', authenticateToken, async (req, res) => {
  try {
    const { workspaceId, taskId } = req.params;
    const { status, title, description, priority, dueDate } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const task = workspace.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (status) {
      task.status = status;
      if (status === 'completed') {
        task.completedAt = new Date();
      }
    }
    if (title) task.title = title;
    if (description) task.description = description;
    if (priority) task.priority = priority;
    if (dueDate) task.dueDate = dueDate;

    workspace.timeline.push({
      event: 'Task Updated',
      description: `Task "${task.title}" status changed to ${status}`,
      performedBy: req.user._id
    });

    await workspace.save();
    res.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Upload document to workspace
router.post('/:id/documents', authenticateToken, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const { name, url, type, category } = req.body;

    workspace.documents.push({
      name,
      url,
      type,
      category: category || 'other',
      uploadedAt: new Date(),
      uploadedBy: req.user._id
    });

    workspace.timeline.push({
      event: 'Document Uploaded',
      description: `Document "${name}" has been uploaded`,
      performedBy: req.user._id
    });

    await workspace.save();
    res.status(201).json(workspace.documents[workspace.documents.length - 1]);
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Get workspace timeline
router.get('/:id/timeline', authenticateToken, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('timeline.performedBy', 'name profileImage')
      .select('timeline');

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    res.json(workspace.timeline);
  } catch (error) {
    console.error('Fetch timeline error:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

module.exports = router;
