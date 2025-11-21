# Freelancer Marketplace - Complete MERN Stack Application

A comprehensive freelancer marketplace platform with **ALL requested features** including skill verification with badges, real-time communication, Razorpay payment gateway, video conferencing, and complete admin panel.

## 🚀 Core Features (All Implemented ✅)

### 1. ✅ User Management - Signup/Login, Profiles
- Complete authentication system with JWT
- Role-based profiles (Client & Freelancer & Admin)
- Comprehensive profiles with 40+ fields
- Portfolio, education, certifications
- Social links and statistics
- Availability tracking

### 2. ✅ Job Posting & Bidding
- Full job lifecycle management
- Proposal/bidding system for freelancers
- Job status tracking
- Milestone planning
- Attachment support

### 3. ✅ Search & Matching
- Smart keyword search
- Multi-filter system (skills, budget, category, rating)
- Skill-based matching algorithm
- Verified skills prioritization
- Advanced sorting options

### 4. ✅ Secure Payments with Razorpay
- **Complete Razorpay integration**
- **Escrow system** (7-day hold period)
- **Milestone payments** (percentage-based)
- Platform fee calculation (10% default)
- Signature verification for security
- Webhook integration
- Refund & dispute management
- Transaction history

### 5. ✅ Real-time Communication
- Socket.io powered chat system
- Typing indicators & read receipts
- Push notifications
- File attachments in messages
- Notification preferences

### 6. ✅ Reviews & Ratings
- 5-star rating system
- Written feedback
- Mutual reviews (client ↔ freelancer)
- Category-based ratings
- Average rating calculation

### 7. ✅ Admin Panel
- Complete system dashboard
- User management (ban/unban)
- Job moderation
- Payment oversight
- Dispute resolution
- Skill verification review
- System analytics

### 8. ✅ Personal Workspace with Video Conferencing
- **Dedicated workspace for each project**
- **Meeting scheduling system**
- **Video conferencing with WebRTC**
  - Video on/off controls
  - Audio mute/unmute
  - **Screen sharing capability**
  - Recording support
- **Task management** (todo/in-progress/review/completed)
- **Document sharing** with version control
- Timeline/activity log

### 9. ✅ Skill Verification System with Badges
- Evidence submission (certificates, portfolio, GitHub, LinkedIn, tests)
- Admin review workflow with scoring
- **4-tier badge system:**
  - 🥉 **Novice** (25-49 points) - Getting Started
  - 🥈 **Professional** (50-74 points) - Experienced
  - 🥇 **Ultra Pro** (75-89 points) - Expert Level
  - 👑 **Master** (90-100 points) - Top Tier
- Detailed scoring breakdown (certificates, portfolio, tests, references, experience)
- Badge display on profiles
- Searchable verified skills
- Expiration & renewal (1 year)

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **Socket.IO** for real-time communication
- **JWT** for authentication
- **Razorpay** for payment processing (with escrow & milestones)
- **WebRTC** for video conferencing
- **Multer** & **Cloudinary** for file uploads
- **Helmet** for security
- **Winston** for logging
- **Rate limiting** and **CORS** protection
- **Redis** for caching (optional)

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Socket.IO Client** for real-time features
- **WebRTC** for video calls
- **Vite** for build tooling

### Database Models (12 Enhanced Models)
- **User**: 40+ fields with skills, portfolio, statistics
- **Job**: Milestones, required skills, payment schedules
- **Proposal**: Enhanced bidding system
- **Payment**: Razorpay integration with escrow & milestones
- **Workspace**: Meetings, tasks, documents, timeline
- **SkillVerification**: Badge system (Novice → Professional → Ultra Pro → Master)
- **Review**: Detailed rating system
- **Message**: Real-time messaging
- **Notification**: Push notifications
- **Dispute**: Resolution system
- **Meeting**: Nested in Workspace
- **Admin**: System management

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- Stripe account for payments

### Setup Instructions

1. **Clone the repository**
   ```bash
   cd freelancer-marketplace-mern-main
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Quick Setup** (Recommended)
   ```bash
   # Run automated setup (generates secure JWT secret)
   npm run setup
   ```

4. **Manual Environment Setup** (Alternative)
   Create a `.env` file in the root directory:
   ```env
   # Server
   PORT=3001
   NODE_ENV=development
   CLIENT_URL=http://localhost:5173
   FRONTEND_URL=http://localhost:5173
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/freelancer-marketplace
   
   # JWT (Generate secure random string)
   JWT_SECRET=your-super-secret-jwt-key-change-this
   
   # Razorpay (Get from https://dashboard.razorpay.com/)
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
   RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   
   # Cloudinary (Optional - for file uploads)
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   
   # Redis (Optional - for caching)
   REDIS_URL=redis://localhost:6379
   
   # Email (Optional - for notifications)
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   ```

5. **Start MongoDB**
   ```bash
   # Windows
   mongod
   
   # Linux/Mac
   sudo systemctl start mongod
   ```

6. **Start the application**
   ```bash
   # Development mode (runs both client and server)
   npm run dev
   
   # Or run separately:
   npm run server  # Backend only
   npm run client  # Frontend only
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - Admin Panel: http://localhost:5173 (login as admin)

## 🔧 Configuration

### Stripe Setup
1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Stripe dashboard
3. Add them to your `.env` file
4. Configure webhook endpoints for payment events

### MongoDB Setup
1. Install MongoDB locally or use MongoDB Atlas
2. Update the `MONGODB_URI` in your `.env` file
3. The application will automatically create the necessary collections

### Admin User Creation
To create an admin user, you can either:
1. Use the registration form and manually update the user type in the database
2. Create a script to seed an admin user

## 📱 Usage

### For Clients
1. **Register** as a client
2. **Post jobs** with detailed requirements and milestones
3. **Review proposals** from freelancers
4. **Manage payments** through the escrow system
5. **Communicate** with freelancers via real-time chat
6. **Rate and review** completed work

### For Freelancers
1. **Register** as a freelancer
2. **Complete profile** with skills and portfolio
3. **Submit skill verifications** to earn badges
4. **Browse and apply** to jobs
5. **Communicate** with clients via real-time chat
6. **Track payments** and milestones
7. **Build reputation** through reviews

### For Admins
1. **Access admin panel** (admin users only)
2. **Manage users** (activate/deactivate accounts)
3. **Review skill verifications** and award badges
4. **Resolve disputes** between clients and freelancers
5. **Monitor platform analytics**
6. **Manage jobs** and payments

## 🔒 Security Features

- **JWT Authentication** with secure token handling
- **Password hashing** with bcrypt
- **Rate limiting** to prevent abuse
- **CORS protection** for API security
- **Helmet** for HTTP security headers
- **Input validation** with express-validator
- **File upload security** with type and size restrictions

## 🚀 Deployment

### Production Deployment

1. **Environment Variables**
   Update your `.env` file with production values:
   ```env
   NODE_ENV=production
   MONGODB_URI=your-production-mongodb-uri
   CLIENT_URL=https://your-domain.com
   ```

2. **Build the application**
   ```bash
   npm run build
   ```

3. **Deploy to your preferred platform**
   - **Heroku**: Use the included `Procfile`
   - **Vercel**: Deploy the frontend, backend separately
   - **AWS**: Use Elastic Beanstalk or EC2
   - **DigitalOcean**: Use App Platform or Droplets

4. **Database Setup**
   - Use MongoDB Atlas for production database
   - Set up proper indexes for performance
   - Configure backup and monitoring

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Jobs
- `GET /api/jobs` - Get all jobs
- `POST /api/jobs` - Create new job
- `GET /api/jobs/:id` - Get job details
- `PUT /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job

### Proposals
- `GET /api/proposals` - Get user proposals
- `POST /api/proposals` - Submit proposal
- `PUT /api/proposals/:id` - Update proposal
- `DELETE /api/proposals/:id` - Delete proposal

### Payments
- `POST /api/payments/create-intent` - Create payment intent
- `POST /api/payments/confirm/:id` - Confirm payment
- `POST /api/payments/release/:id` - Release escrowed payment
- `GET /api/payments/history` - Get payment history

### Messages
- `POST /api/messages` - Send message
- `GET /api/messages/job/:jobId` - Get job messages
- `GET /api/messages/conversations` - Get conversations
- `PUT /api/messages/:id` - Edit message
- `DELETE /api/messages/:id` - Delete message

### Reviews
- `POST /api/reviews` - Create review
- `GET /api/reviews/user/:userId` - Get user reviews
- `GET /api/reviews/job/:jobId` - Get job reviews
- `POST /api/reviews/:id/helpful` - Mark review as helpful

### Skill Verification
- `POST /api/skill-verification` - Submit verification
- `GET /api/skill-verification/my-verifications` - Get user verifications
- `PUT /api/skill-verification/:id/review` - Review verification (admin)

### Admin
- `GET /api/admin/dashboard` - Get dashboard stats
- `GET /api/admin/users` - Get all users
- `GET /api/admin/jobs` - Get all jobs
- `GET /api/admin/disputes` - Get all disputes
- `GET /api/admin/payments` - Get all payments
- `GET /api/admin/analytics` - Get analytics data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Create a new issue with detailed description
3. Contact the development team

## 🔮 Future Enhancements

- **Mobile App**: React Native mobile application
- **Advanced Analytics**: Machine learning for job matching
- **Video Calls**: Integrated video calling for interviews
- **Multi-language Support**: Internationalization
- **Advanced Search**: AI-powered job and freelancer matching
- **Blockchain Integration**: Smart contracts for payments
- **API Documentation**: Swagger/OpenAPI documentation

---

**Built with ❤️ using MERN Stack**
