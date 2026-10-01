import React, { useEffect, useState } from 'react';
import useAuth from '../hooks/useAuth';
import { commentService, activityService } from '../services/dataService';
import { formatStatus, formatDate, formatDateTime, formatRole } from '../utils/formatters';
import {
  X,
  MessageSquare,
  History,
  Send,
  Trash2,
  Edit2,
  Clock,
  User,
  Calendar,
  AlertCircle,
  CheckCircle,
  FileText,
} from 'lucide-react';

export default function TaskDetailsModal({ task, isOpen, onClose, onTaskUpdated }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('comments'); // 'comments' | 'activity'
  
  // Comments state
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [commentError, setCommentError] = useState('');

  // Activity state
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  useEffect(() => {
    if (isOpen && task?.id) {
      loadComments();
      loadActivities();
    }
  }, [isOpen, task?.id]);

  const loadComments = async () => {
    try {
      setCommentsLoading(true);
      const res = await commentService.getByTask(task.id);
      if (res.success) {
        setComments(res.comments || []);
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      setActivitiesLoading(true);
      const res = await activityService.getByTask(task.id);
      if (res.success) {
        setActivities(res.activities || []);
      }
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmittingComment(true);
      setCommentError('');
      const res = await commentService.create(task.id, newComment.trim());
      if (res.success) {
        setNewComment('');
        await loadComments();
        // Also refresh activities since a comment activity was generated
        loadActivities();
      }
    } catch (err) {
      setCommentError(err.response?.data?.message || 'Failed to post comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleStartEdit = (c) => {
    setEditingCommentId(c.id);
    setEditingText(c.comment);
  };

  const handleSaveEdit = async (commentId) => {
    if (!editingText.trim()) return;
    try {
      const res = await commentService.update(commentId, editingText.trim());
      if (res.success) {
        setEditingCommentId(null);
        setEditingText('');
        loadComments();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update comment.');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await commentService.delete(commentId);
      loadComments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete comment.');
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 bg-navy-950/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                {task.project_name || 'Project Deliverable'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded font-semibold bg-slate-100 text-navy-950 border border-slate-200">
                {task.priority} Priority
              </span>
              <span className="text-xs px-2 py-0.5 rounded font-semibold bg-navy-950 text-white">
                {formatStatus(task.status)}
              </span>
            </div>
            <h2 className="text-lg font-bold text-navy-950 leading-snug">{task.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-navy-950 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Details Overview Grid */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-600">
            <div>
              <span className="text-slate-400 block text-[11px]">Assignee</span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="font-semibold text-navy-950">
                  {task.assignee_name || <span className="italic text-slate-400">Unassigned</span>}
                </span>
                {task.assignee_is_active === false && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1"></span>
                    Inactive
                  </span>
                )}
              </div>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Deadline</span>
              <span className="font-semibold text-navy-950">
                {formatDate(task.deadline)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Created Date</span>
              <span className="font-medium text-slate-700">
                {formatDate(task.created_at)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Last Updated</span>
              <span className="font-medium text-slate-700">
                {formatDate(task.updated_at)}
              </span>
            </div>
          </div>

          {task.description && (
            <div className="pt-2 border-t border-slate-200/70">
              <span className="text-slate-400 block text-[11px] mb-1">Description</span>
              <p className="text-xs text-slate-700 leading-relaxed bg-white border border-slate-200 p-2.5 rounded-lg whitespace-pre-line">
                {task.description}
              </p>
            </div>
          )}
        </div>

        {/* Section Tabs: Comments & Activity History */}
        <div className="space-y-3">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('comments')}
              className={`pb-2 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 cursor-pointer transition-colors ${
                activeTab === 'comments'
                  ? 'border-navy-950 text-navy-950'
                  : 'border-transparent text-slate-500 hover:text-navy-950'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Comments ({comments.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`pb-2 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 cursor-pointer transition-colors ${
                activeTab === 'activity'
                  ? 'border-navy-950 text-navy-950'
                  : 'border-transparent text-slate-500 hover:text-navy-950'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Activity History ({activities.length})</span>
            </button>
          </div>

          {/* TAB 1: COMMENTS (Part 4) */}
          {activeTab === 'comments' && (
            <div className="space-y-4 pt-1">
              {/* Add Comment Input Form */}
              <form onSubmit={handlePostComment} className="space-y-2">
                <textarea
                  rows={2}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment or status update on this deliverable..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-navy-950"
                />
                {commentError && (
                  <p className="text-xs text-rose-600 font-medium">{commentError}</p>
                )}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingComment || !newComment.trim()}
                    className="inline-flex items-center px-3.5 py-1.5 bg-navy-950 hover:bg-navy-900 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    <Send className="w-3 h-3 mr-1.5" />
                    <span>{submittingComment ? 'Posting...' : 'Post Comment'}</span>
                  </button>
                </div>
              </form>

              {/* Comments List */}
              <div className="space-y-2.5">
                {commentsLoading ? (
                  <div className="py-6 text-center text-xs text-slate-400">Loading comments...</div>
                ) : comments.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 italic bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                    No comments on this deliverable yet. Start the conversation above.
                  </div>
                ) : (
                  comments.map((c) => {
                    const isAuthor = c.user_id === user?.id;
                    const canModify = isAuthor || user?.role === 'ADMIN';

                    return (
                      <div
                        key={c.id}
                        className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 text-xs hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-navy-950">{c.user_name}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                              {formatRole(c.user_role)}
                            </span>
                            <span className="text-[11px] text-slate-400">&bull;</span>
                            <span className="text-[11px] text-slate-400">
                              {formatDate(c.created_at)}
                            </span>
                          </div>

                          {canModify && (
                            <div className="flex items-center space-x-1">
                              {isAuthor && editingCommentId !== c.id && (
                                <button
                                  onClick={() => handleStartEdit(c)}
                                  className="p-1 text-slate-400 hover:text-navy-950 rounded hover:bg-slate-50 cursor-pointer"
                                  title="Edit comment"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteComment(c.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-50 cursor-pointer"
                                title="Delete comment"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {editingCommentId === c.id ? (
                          <div className="space-y-2 pt-1">
                            <textarea
                              rows={2}
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 focus:outline-none focus:ring-1 focus:ring-navy-950"
                            />
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => setEditingCommentId(null)}
                                className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveEdit(c.id)}
                                className="px-3 py-1 bg-navy-950 text-white text-xs font-semibold rounded hover:bg-navy-900"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-700 leading-relaxed whitespace-pre-line text-xs pt-0.5">
                            {c.comment}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ACTIVITY HISTORY (Part 5) */}
          {activeTab === 'activity' && (
            <div className="space-y-2.5 pt-1">
              {activitiesLoading ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading activity...</div>
              ) : activities.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 italic bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                  No activity history recorded for this deliverable.
                </div>
              ) : (
                <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {activities.map((a) => (
                    <div key={a.id} className="relative text-xs">
                      <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-navy-950 ring-4 ring-white" />
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-navy-950">
                          {a.description || a.action}
                        </span>
                        <span className="text-[11px] text-slate-400 whitespace-nowrap">
                          {formatDateTime(a.created_at)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        By {a.user_name || 'System Administrator'} ({formatRole(a.user_role)})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-navy-950 text-white text-xs font-semibold rounded-lg hover:bg-navy-900 cursor-pointer shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
