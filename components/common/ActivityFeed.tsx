import React from 'react';
import { Clock, User, FileText, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface AuditLogEntry {
  id: string;
  action: string;
  performed_at: string;
  performedByUser?: {
    id: string;
    full_name: string;
    email: string;
    role?: {
      display_name: string;
    };
  };
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  metadata?: {
    description?: string;
    [key: string]: any;
  };
}

interface ActivityFeedProps {
  logs: AuditLogEntry[];
  maxItems?: number;
  showUserDetails?: boolean;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  logs,
  maxItems = 10,
  showUserDetails = true
}) => {
  const getActionIcon = (action: string) => {
    const normalizedAction = action.toLowerCase();

    if (normalizedAction.includes('create')) {
      return { icon: FileText, color: 'text-green-600', bgColor: 'bg-green-100' };
    }
    if (normalizedAction.includes('update') || normalizedAction.includes('edit')) {
      return { icon: RotateCcw, color: 'text-blue-600', bgColor: 'bg-blue-100' };
    }
    if (normalizedAction.includes('delete')) {
      return { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' };
    }
    if (normalizedAction.includes('approve') || normalizedAction.includes('complete')) {
      return { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' };
    }
    if (normalizedAction.includes('reject')) {
      return { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' };
    }
    if (normalizedAction.includes('transition') || normalizedAction.includes('workflow')) {
      return { icon: RotateCcw, color: 'text-purple-600', bgColor: 'bg-purple-100' };
    }

    return { icon: Clock, color: 'text-gray-600', bgColor: 'bg-gray-100' };
  };

  const getActionLabel = (action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const displayedLogs = logs.slice(0, maxItems);

  if (displayedLogs.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayedLogs.map((log, index) => {
        const { icon: Icon, color, bgColor } = getActionIcon(log.action);

        return (
          <div key={log.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`p-2 rounded-full ${bgColor} ${color} mt-1`}>
                <Icon className="w-4 h-4" />
              </div>
              {index < displayedLogs.length - 1 && (
                <div className="w-0.5 flex-1 bg-slate-200 my-2 min-h-[2rem]" />
              )}
            </div>

            <div className="flex-1 pb-6">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {getActionLabel(log.action)}
                  </p>
                  {log.metadata?.description && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {log.metadata.description}
                    </p>
                  )}
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {formatDistanceToNow(new Date(log.performed_at), { addSuffix: true })}
                </span>
              </div>

              {showUserDetails && log.performedByUser && (
                <div className="flex items-center gap-2 mt-1">
                  <User className="w-3 h-3 text-slate-400" />
                  <p className="text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{log.performedByUser.full_name}</span>
                    {log.performedByUser.role && (
                      <span className="text-slate-400">({log.performedByUser.role.display_name})</span>
                    )}
                  </p>
                </div>
              )}

              {(log.old_values || log.new_values) && (
                <details className="mt-2">
                  <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-700">
                    View changes
                  </summary>
                  <div className="mt-2 p-2 bg-slate-50 rounded text-xs font-mono space-y-1">
                    {log.old_values && (
                      <div>
                        <span className="text-red-600">Before: </span>
                        <span className="text-slate-600">{JSON.stringify(log.old_values, null, 2)}</span>
                      </div>
                    )}
                    {log.new_values && (
                      <div>
                        <span className="text-green-600">After: </span>
                        <span className="text-slate-600">{JSON.stringify(log.new_values, null, 2)}</span>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        );
      })}

      {logs.length > maxItems && (
        <div className="text-center">
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View all {logs.length} activities
          </button>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
