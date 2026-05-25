import React from 'react';
import { DocumentStatus } from '../../lib/workflow';
import { CheckCircle, Clock, XCircle, AlertCircle, FileText } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', showIcon = true }) => {
  const getStatusConfig = (status: string) => {
    const normalizedStatus = status.toLowerCase().replace(/ /g, '_');

    switch (normalizedStatus) {
      case DocumentStatus.DRAFT:
        return {
          label: 'Draft',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-200',
          icon: FileText
        };
      case DocumentStatus.INTERNAL_REVIEW:
        return {
          label: 'Internal Review',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-200',
          icon: Clock
        };
      case DocumentStatus.CUSTOMER_ACKNOWLEDGEMENT:
        return {
          label: 'Customer Acknowledgement',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-700',
          borderColor: 'border-yellow-200',
          icon: Clock
        };
      case DocumentStatus.APPROVED:
        return {
          label: 'Approved',
          bgColor: 'bg-green-100',
          textColor: 'text-green-700',
          borderColor: 'border-green-200',
          icon: CheckCircle
        };
      case DocumentStatus.COMPLETED:
        return {
          label: 'Completed',
          bgColor: 'bg-green-100',
          textColor: 'text-green-700',
          borderColor: 'border-green-200',
          icon: CheckCircle
        };
      case DocumentStatus.REJECTED:
        return {
          label: 'Rejected',
          bgColor: 'bg-red-100',
          textColor: 'text-red-700',
          borderColor: 'border-red-200',
          icon: XCircle
        };
      case DocumentStatus.CANCELLED:
        return {
          label: 'Cancelled',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-500',
          borderColor: 'border-gray-200',
          icon: FileText
        };
      default:
        return {
          label: status,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-200',
          icon: AlertCircle
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <span className={`
      inline-flex items-center gap-1.5
      ${config.bgColor} ${config.textColor}
      border ${config.borderColor}
      rounded-full font-medium
      ${sizeClasses[size]}
    `}>
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </span>
  );
};

export default StatusBadge;
