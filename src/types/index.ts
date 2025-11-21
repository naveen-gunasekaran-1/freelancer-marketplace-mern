export interface Skill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  verified: boolean;
  verificationProof: string[];
  badge: 'bronze' | 'silver' | 'gold' | 'platinum' | null;
}

export interface PortfolioItem {
  title: string;
  description: string;
  imageUrl: string;
  projectUrl: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  type: 'freelancer' | 'client' | 'admin';
  skills: Skill[];
  rating: number;
  completedJobs: number;
  profileImage: string;
  bio: string;
  hourlyRate: number;
  location: string;
  phone: string;
  website: string;
  portfolio: PortfolioItem[];
  verificationStatus: 'unverified' | 'pending' | 'verified';
  verificationDocuments: Array<{
    type: string;
    url: string;
    status: 'pending' | 'approved' | 'rejected';
  }>;
  isActive: boolean;
  lastLogin: string;
  preferences: {
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    privacy: {
      showProfile: boolean;
      showPortfolio: boolean;
      showSkills: boolean;
    };
  };
}

export interface Milestone {
  name: string;
  description: string;
  amount: number;
  percentage: number;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'approved';
  deliverables: string[];
  completedAt?: string;
  approvedAt?: string;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  budget: number;
  budgetType: 'fixed' | 'hourly';
  category: string;
  skills: string[];
  requiredSkills: Array<{
    name: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    required: boolean;
  }>;
  duration: string;
  clientId: string;
  status: 'open' | 'closed' | 'in_progress' | 'completed' | 'cancelled';
  proposalCount: number;
  selectedFreelancer?: string;
  deadline?: string;
  milestones: Milestone[];
  paymentSchedule: 'upfront' | 'milestone' | 'completion';
  attachments: Array<{
    filename: string;
    url: string;
    type: string;
    size: number;
  }>;
  tags: string[];
  visibility: 'public' | 'private';
  featured: boolean;
  urgent: boolean;
  experienceLevel: 'entry' | 'intermediate' | 'expert';
  timezone?: string;
  startDate?: string;
  completedAt?: string;
  cancellationReason?: string;
  createdAt: string;
}

export interface Proposal {
  id: string;
  jobId: string;
  freelancerId: string | {
    _id: string;
    name: string;
    rating: number;
    completedJobs: number;
    location?: string;
    skills: Array<string | { name: string; level: string }>;
  };
  coverLetter: string;
  proposedBudget: number;
  timeline: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  clientResponse: string;
  attachments: Array<{
    filename: string;
    url: string;
  }>;
  createdAt: string;
  job?: Job;
}

export interface Payment {
  id: string;
  jobId: string;
  clientId: string;
  freelancerId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'escrowed' | 'released' | 'refunded' | 'disputed';
  type: 'milestone' | 'full' | 'partial';
  milestone?: {
    name: string;
    description: string;
    percentage: number;
    dueDate: string;
    completed: boolean;
  };
  paymentMethod: 'stripe' | 'paypal' | 'bank_transfer';
  transactionId: string;
  escrowReleaseDate?: string;
  disputeReason?: string;
  refundReason?: string;
  metadata: {
    stripePaymentIntentId?: string;
    paypalOrderId?: string;
    bankTransactionId?: string;
  };
  createdAt: string;
}

export interface Review {
  id: string;
  jobId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string;
  categories: {
    communication: number;
    quality: number;
    timeliness: number;
    professionalism: number;
  };
  isVerified: boolean;
  helpful: {
    count: number;
    users: string[];
  };
  response?: {
    comment: string;
    createdAt: string;
  };
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  jobId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  attachments: Array<{
    filename: string;
    url: string;
    size: number;
    type: string;
  }>;
  isRead: boolean;
  readAt?: string;
  isEdited: boolean;
  editedAt?: string;
  replyTo?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: {
    jobId?: string;
    proposalId?: string;
    paymentId?: string;
    reviewId?: string;
    messageId?: string;
    skillName?: string;
    badgeType?: string;
    amount?: number;
  };
  isRead: boolean;
  readAt?: string;
  priority: 'low' | 'medium' | 'high';
  expiresAt?: string;
  createdAt: string;
}

export interface Dispute {
  id: string;
  jobId: string;
  paymentId: string;
  initiatorId: string;
  respondentId: string;
  reason: string;
  description: string;
  status: 'open' | 'under_review' | 'resolved' | 'closed';
  resolution?: 'refund_client' | 'pay_freelancer' | 'partial_refund' | 'no_action';
  resolutionAmount?: number;
  adminNotes?: string;
  evidence: Array<{
    type: string;
    url: string;
    description: string;
    uploadedBy: string;
  }>;
  timeline: Array<{
    action: string;
    description: string;
    timestamp: string;
    userId: string;
  }>;
  assignedAdmin?: string;
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
}

export interface SkillVerification {
  id: string;
  freelancerId: string;
  skillName: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  evidence: Array<{
    type: 'certificate' | 'portfolio' | 'test_score' | 'work_sample' | 'reference';
    title: string;
    description: string;
    url: string;
    fileUrl: string;
    issuer: string;
    dateIssued: string;
    score: number;
    maxScore: number;
  }>;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  reviewerId?: string;
  reviewNotes?: string;
  badgeAwarded?: 'bronze' | 'silver' | 'gold' | 'platinum';
  verificationScore?: number;
  expiresAt?: string;
  submittedAt: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  type: 'freelancer' | 'client';
  skills?: Skill[];
  bio?: string;
  location?: string;
  phone?: string;
  website?: string;
}