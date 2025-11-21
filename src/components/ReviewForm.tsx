import React, { useState } from 'react';
import { Star, Send, X } from 'lucide-react';

interface ReviewFormProps {
  jobId: string;
  jobTitle: string;
  revieweeName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({
  jobId,
  jobTitle,
  revieweeName,
  onSuccess,
  onCancel
}) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [categories, setCategories] = useState({
    communication: 0,
    quality: 0,
    timeliness: 0,
    professionalism: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (rating === 0) {
      setError('Please select an overall rating');
      return;
    }
    
    if (comment.trim().length < 10) {
      setError('Please write at least 10 characters in your review');
      return;
    }

    if (Object.values(categories).some(v => v === 0)) {
      setError('Please rate all categories');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          jobId,
          rating,
          comment,
          categories
        })
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to submit review');
      }
    } catch (err) {
      setError('Failed to submit review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (
    currentValue: number,
    onChange: (value: number) => void,
    label: string
  ) => {
    const [hovered, setHovered] = useState(0);

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="focus:outline-none transition-transform hover:scale-110"
            >
              <Star
                className={`w-8 h-8 ${
                  star <= (hovered || currentValue)
                    ? 'text-yellow-500 fill-yellow-500'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-sm font-medium text-gray-700">
            {currentValue > 0 ? `${currentValue}.0` : 'Not rated'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 my-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Write a Review</h2>
            <p className="text-gray-600 mt-1">
              For <span className="font-medium text-gray-900">{revieweeName}</span> on "{jobTitle}"
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Overall Rating */}
          <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
            <label className="block text-lg font-semibold text-gray-900 mb-3">
              Overall Rating
            </label>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-12 h-12 ${
                      star <= (hoveredRating || rating)
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-4 text-2xl font-bold text-gray-900">
                  {rating}.0
                </span>
              )}
            </div>
          </div>

          {/* Category Ratings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Detailed Ratings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderStars(
                categories.communication,
                (value) => setCategories({ ...categories, communication: value }),
                'Communication'
              )}
              {renderStars(
                categories.quality,
                (value) => setCategories({ ...categories, quality: value }),
                'Work Quality'
              )}
              {renderStars(
                categories.timeliness,
                (value) => setCategories({ ...categories, timeliness: value }),
                'Timeliness'
              )}
              {renderStars(
                categories.professionalism,
                (value) => setCategories({ ...categories, professionalism: value }),
                'Professionalism'
              )}
            </div>
          </div>

          {/* Review Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Review
              <span className="text-gray-500 font-normal ml-2">
                ({comment.length}/1000 characters)
              </span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 1000))}
              placeholder="Share your experience working with this person. What did you like? What could be improved?"
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            {comment.length < 10 && comment.length > 0 && (
              <p className="text-sm text-orange-600 mt-1">
                Please write at least 10 characters
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
              <span>{loading ? 'Submitting...' : 'Submit Review'}</span>
            </button>
          </div>

          {/* Tips */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Tips for writing a great review:</h4>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Be specific about what you liked or didn't like</li>
              <li>Focus on the work quality and professionalism</li>
              <li>Be honest but respectful</li>
              <li>Mention communication and timeliness</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewForm;
