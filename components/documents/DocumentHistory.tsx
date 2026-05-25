import React from 'react';
import { Clock, User, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import StatusBadge from '../common/StatusBadge';
import { WorkflowTransition } from '../../lib/workflow';

interface DocumentHistoryProps {
  workflowHistory: WorkflowTransition[];
  maxItems?: number;
}

const DocumentHistory: React.FC<DocumentHistoryProps> = ({
  workflowHistory,
  maxItems = 20
}) => {
  const getTransitionIcon = (toStatus: string) => {
    const status = toStatus.toLowerCase();

    if (status.includes('approved') || status.includes('completed')) {
      return { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' };
    }
    if (status.includes('rejected')) {
      return { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' };
    }
    if (status.includes('cancelled')) {
      return { icon: XCircle, color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }

    return { icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-100' };
  };

  const displayedHistory = workflowHistory.slice(0, maxItems);

  if (displayedHistory.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No history available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Document History</h3>
        <span className="text-sm text-slate-500">
          {workflowHistory.length} event{workflowHistory.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-4">
        {displayedHistory.map((transition, index) => {
          const { icon: Icon, color, bgColor } = getTransitionIcon(transition.to_status);

          return (
            <div key={transition.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`p-2 rounded-full ${bgColor} ${color} mt-1`}>
                  <Icon className="w-4 h-4" />
                </div>
                {index < displayedHistory.length - 1 && (
                  <div className="w-0.5 flex-1 bg-slate-200 my-2 min-h-[2rem]" />
                )}
              </div>

              <div className="flex-1 pb-6">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={transition.to_status} size="sm" />
                      <span className="text-sm text-slate-500">→</span>
                      <StatusBadge status={transition.from_status} size="sm" />
                    </div>
                    {transition.comments && (
                      <p className="text-sm text-slate-600 mt-1">{transition.comments}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {formatDistanceToNow(new Date(transition.transitioned_at), { addSuffix: true })}
                  </span>
                </div>

                {transition.transitionedBy && (
                  <div className="flex items-center gap-2 mt-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <p className="text-xs text-slate-500">
                      <span className="font-medium text-slate-700">{transition.transitionedBy.full_name}</span>
                      {transition.transitionedBy.role && (
                        <span className="text-slate-400">({transition.transitionedBy.role.display_name})</span>
                      )}
                    </p>
                  </div>
                )}

                {transition.metadata?.description && (
                  <p className="text-xs text-slate-400 mt-1 italic">
                    {transition.metadata.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {workflowHistory.length > maxItems && (
        <div className="text-center pt-4">
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View all {workflowHistory.length} events
          </button>
        </div>
      )}
    </div>
  );
};

export default DocumentHistory;
