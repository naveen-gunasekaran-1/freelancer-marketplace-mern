import React, { useState, useEffect } from 'react';
import { 
  Star, 
  ThumbsUp, 
  MessageCircle, 
  CheckCircle, 
  Award,
  Filter,
  ChevronDown,
  Send
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Review {
  _id: string;
  jobId: {
    _id: string;
    title: string;
  };
  reviewerId: {
    _id: string;
    name: string;
    profileImage?: string;
  };
  revieweeId: {
    _id: string;
    name: string;
  };
  rating: number;
  comment: string;
  categories: {
    communication: number;
    quality: number;
    timeliness: number;
    professionalism: number;
  };
  helpful: {
    count: number;
    users: string[];
  };
  response?: {
    comment: string;
    createdAt: string;
  };
  createdAt: string;
  isVerified: boolean;
}

interface ReviewsSectionProps {
  userId: string;
  isOwnProfile?: boolean;
}

const ReviewsSection: React.FC<ReviewsSectionProps> = ({ userId, isOwnProfile }) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({
    average: 0,
    total: 0,
    breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, [userId, filterRating, page]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });
      
      if (filterRating) {
        params.append('rating', filterRating.toString());
      }

      const response = await fetch(`/api/reviews/user/${userId}?${params}`);
      const data = await response.json();

      if (page === 1) {
        setReviews(data.reviews);
      } else {
        setReviews(prev => [...prev, ...data.reviews]);
      }

      setHasMore(data.currentPage < data.totalPages);
      
      // Calculate stats
      calculateStats(data.reviews);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (reviewsList: Review[]) => {
    if (reviewsList.length === 0) {
      setStats({ average: 0, total: 0, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
      return;
    }

    const total = reviewsList.length;
    const sum = reviewsList.reduce((acc, r) => acc + r.rating, 0);
    const average = sum / total;

    const breakdown = reviewsList.reduce((acc, r) => {
      acc[r.rating as keyof typeof acc]++;
      return acc;
    }, { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });

    setStats({ average, total, breakdown });
  };

  const handleMarkHelpful = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/helpful`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setReviews(prev => prev.map(r => 
          r._id === reviewId 
            ? { 
                ...r, 
                helpful: { 
                  count: r.helpful.count + 1, 
                  users: [...r.helpful.users, user!.id] 
                } 
              }
            : r
        ));
      }
    } catch (error) {
      console.error('Failed to mark as helpful:', error);
    }
  };

  const handleSubmitResponse = async (reviewId: string) => {
    if (!responseText.trim()) return;

    try {
      const response = await fetch(`/api/reviews/${reviewId}/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ comment: responseText })
      });

      if (response.ok) {
        setReviews(prev => prev.map(r => 
          r._id === reviewId 
            ? { 
                ...r, 
                response: { 
                  comment: responseText, 
                  createdAt: new Date().toISOString() 
                } 
              }
            : r
        ));
        setRespondingTo(null);
        setResponseText('');
      }
    } catch (error) {
      console.error('Failed to submit response:', error);
    }
  };

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClass = size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5';
    
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const renderCategoryRating = (label: string, rating: number) => (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center space-x-2">
        {renderStars(rating, 'sm')}
        <span className="text-sm font-medium text-gray-700">{rating.toFixed(1)}</span>
      </div>
    </div>
  );

  const getRatingPercentage = (rating: number) => {
    if (stats.total === 0) return 0;
    return (stats.breakdown[rating as keyof typeof stats.breakdown] / stats.total) * 100;
  };

  if (loading && page === 1) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Reviews Summary */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Reviews & Ratings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Overall Rating */}
          <div className="flex flex-col items-center justify-center border-r border-gray-200">
            <div className="text-5xl font-bold text-gray-900 mb-2">
              {stats.average.toFixed(1)}
            </div>
            {renderStars(Math.round(stats.average), 'lg')}
            <p className="text-gray-600 mt-2">Based on {stats.total} reviews</p>
          </div>

          {/* Rating Breakdown */}
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-700 w-8">{rating} ★</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getRatingPercentage(rating)}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">
                  {stats.breakdown[rating as keyof typeof stats.breakdown]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900">Filters</span>
            {filterRating && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                {filterRating} stars
              </span>
            )}
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        {showFilters && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <button
              onClick={() => {
                setFilterRating(null);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                !filterRating 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Reviews
            </button>
            {[5, 4, 3, 2, 1].map((rating) => (
              <button
                key={rating}
                onClick={() => {
                  setFilterRating(rating);
                  setPage(1);
                }}
                className={`ml-2 px-4 py-2 rounded-lg text-sm font-medium ${
                  filterRating === rating 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {rating} ★
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No reviews yet</h3>
            <p className="text-gray-600">
              {isOwnProfile 
                ? 'Complete projects to receive reviews from clients' 
                : 'This user hasn\'t received any reviews yet'}
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review._id} className="bg-white rounded-lg shadow-md p-6">
              {/* Review Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  {review.reviewerId.profileImage ? (
                    <img
                      src={review.reviewerId.profileImage}
                      alt={review.reviewerId.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-600 font-medium">
                        {review.reviewerId.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-gray-900">{review.reviewerId.name}</h4>
                      {review.isVerified && (
                        <CheckCircle className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {new Date(review.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                {renderStars(review.rating)}
              </div>

              {/* Job Reference */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Project: <span className="font-medium text-gray-900">{review.jobId.title}</span>
                </p>
              </div>

              {/* Review Comment */}
              <p className="text-gray-700 mb-4 leading-relaxed">{review.comment}</p>

              {/* Category Ratings */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                {renderCategoryRating('Communication', review.categories.communication)}
                {renderCategoryRating('Quality', review.categories.quality)}
                {renderCategoryRating('Timeliness', review.categories.timeliness)}
                {renderCategoryRating('Professionalism', review.categories.professionalism)}
              </div>

              {/* Response */}
              {review.response && (
                <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                  <div className="flex items-center space-x-2 mb-2">
                    <MessageCircle className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-900">Response from {review.revieweeId.name}</span>
                  </div>
                  <p className="text-gray-700 text-sm">{review.response.comment}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(review.response.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <button
                  onClick={() => handleMarkHelpful(review._id)}
                  disabled={review.helpful.users.includes(user?.id || '')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium ${
                    review.helpful.users.includes(user?.id || '')
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>Helpful ({review.helpful.count})</span>
                </button>

                {isOwnProfile && !review.response && user?.id === review.revieweeId._id && (
                  <button
                    onClick={() => setRespondingTo(review._id)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Respond</span>
                  </button>
                )}
              </div>

              {/* Response Form */}
              {respondingTo === review._id && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Write your response..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="flex justify-end space-x-2 mt-2">
                    <button
                      onClick={() => {
                        setRespondingTo(null);
                        setResponseText('');
                      }}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSubmitResponse(review._id)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                    >
                      <Send className="w-4 h-4" />
                      <span>Submit Response</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      {hasMore && reviews.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={loading}
            className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            {loading ? 'Loading...' : 'Load More Reviews'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewsSection;
