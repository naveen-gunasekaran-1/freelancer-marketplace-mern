import React from 'react';
import { Clock, Users, Tag } from 'lucide-react';
import { Job } from '../types';

interface JobCardProps {
  job: Job;
  onViewDetails: (job: Job) => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, onViewDetails }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
         onClick={() => onViewDetails(job)}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{job.title}</h3>
        <span className="text-sm text-gray-500">
          {new Date(job.createdAt).toLocaleDateString()}
        </span>
      </div>
      
      <p className="text-gray-600 text-sm mb-4 line-clamp-3">{job.description}</p>
      
      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
        <div className="flex items-center">
          <span>₹{job.budget}</span>
        </div>
        <div className="flex items-center">
          <Clock className="h-4 w-4 mr-1" />
          <span>{job.duration}</span>
        </div>
        <div className="flex items-center">
          <Users className="h-4 w-4 mr-1" />
          <span>{job.proposalCount} proposals</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Tag className="h-4 w-4 mr-1 text-gray-400" />
          <span className="text-sm text-gray-600">{job.category}</span>
        </div>
        
        <div className="flex flex-wrap gap-1">
          {job.skills.slice(0, 3).map((skill, index) => (
            <span
              key={index}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
            >
              {skill}
            </span>
          ))}
          {job.skills.length > 3 && (
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
              +{job.skills.length - 3}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobCard;
