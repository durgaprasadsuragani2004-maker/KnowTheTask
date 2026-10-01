import React, { useEffect, useState } from 'react';
import useAuth from '../hooks/useAuth';
import { taskService, projectService } from '../services/dataService';
import TaskDetailsModal from '../components/TaskDetailsModal';
import { formatStatus, formatDate, formatRole } from '../utils/formatters';
import {
  Kanban,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  Layers,
  Calendar,
  User,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

const COLUMNS = [
  { id: 'TODO', title: 'To Do', color: 'border-slate-300 bg-slate-50/70', badge: 'bg-slate-200 text-slate-700' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'border-blue-300 bg-blue-50/40', badge: 'bg-blue-100 text-blue-800' },
  { id: 'REVIEW', title: 'In Review', color: 'border-amber-300 bg-amber-50/40', badge: 'bg-amber-100 text-amber-800' },
  { id: 'COMPLETED', title: 'Completed', color: 'border-emerald-300 bg-emerald-50/40', badge: 'bg-emerald-100 text-emerald-800' },
];

export default function KanbanPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialProject = searchParams.get('project') || '';

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState(initialProject);
  const [priorityFilter, setPriorityFilter] = useState('');

  // Selected Task for Details Modal
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Dragging state
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await taskService.getAll({
        search: search || undefined,
        project_id: projectFilter || undefined,
        priority: priorityFilter || undefined,
      });
      if (res.success) {
        setTasks(res.tasks || []);
      }
    } catch (err) {
      console.error('Error loading tasks for Kanban:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await projectService.getAll();
      if (res.success) setProjects(res.projects || []);
    } catch (err) {
      console.error('Error loading projects:', err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [search, projectFilter, priorityFilter]);

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleStatusChange = async (taskId, newStatus) => {
    const originalTasks = [...tasks];
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await taskService.updateStatus(taskId, newStatus);
    } catch (err) {
      // Revert on failure
      setTasks(originalTasks);
      alert('Failed to update task status: ' + (err.response?.data?.message || err.message));
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = (e, columnId) => {
    if (dragOverColumn === columnId) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== targetStatus) {
      handleStatusChange(taskId, targetStatus);
    }
    setDraggedTaskId(null);
  };

  const openTaskDetails = (task) => {
    setSelectedTask(task);
    setIsDetailsOpen(true);
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'HIGH':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'MEDIUM':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-navy-950 flex items-center gap-2">
            <Kanban className="w-6 h-6 text-navy-950" />
            <span>Interactive Kanban Board</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Drag and drop deliverable cards across workflow stages with instant database synchronization
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            to="/tasks"
            className="px-3.5 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
          >
            Table View
          </Link>
          {(user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER') && (
            <Link
              to="/tasks"
              className="inline-flex items-center px-4 py-2 bg-navy-950 hover:bg-navy-900 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Create Task</span>
            </Link>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deliverables in board..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-xs text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-navy-950"
          />
        </div>

        {/* Project Filter */}
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="bg-white border border-slate-300 text-navy-950 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-navy-950 font-medium cursor-pointer"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="bg-white border border-slate-300 text-navy-950 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-navy-950 font-medium cursor-pointer"
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>

      {/* Kanban Columns Grid (Responsive: horizontally scrollable on mobile, 4 columns on desktop) */}
      <div className="overflow-x-auto pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-w-[768px] lg:min-w-0">
          {COLUMNS.map((col) => {
            const columnTasks = tasks.filter((t) => t.status === col.id);
            const isDragOver = dragOverColumn === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={(e) => handleDragLeave(e, col.id)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex flex-col rounded-2xl border p-3.5 transition-colors min-h-[500px] ${
                  col.color
                } ${isDragOver ? 'ring-2 ring-navy-950 ring-dashed bg-slate-100/90' : ''}`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-sm font-bold text-navy-950">{col.title}</h2>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${col.badge}`}>
                      {columnTasks.length}
                    </span>
                  </div>
                </div>

                {/* Task Cards Container */}
                <div className="flex-1 space-y-3">
                  {loading ? (
                    <div className="py-8 text-center text-xs text-slate-400">Loading...</div>
                  ) : columnTasks.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white/50 italic">
                      Drop tasks here
                    </div>
                  ) : (
                    columnTasks.map((t) => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, t.id)}
                        onClick={() => openTaskDetails(t)}
                        className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-3.5 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing space-y-2 group"
                      >
                        {/* Project Name & Priority */}
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 truncate max-w-[150px]">
                            {t.project_name}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${getPriorityBadgeClass(
                              t.priority
                            )}`}
                          >
                            {t.priority}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-xs font-bold text-navy-950 group-hover:text-navy-900 leading-snug line-clamp-2">
                          {t.title}
                        </h3>

                        {/* Assignee & Deadline */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <div className="flex items-center space-x-1 truncate max-w-[140px]">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {t.assignee_name || <span className="italic text-slate-400">Unassigned</span>}
                            </span>
                            {t.assignee_is_active === false && (
                              <span className="inline-flex items-center px-1 py-0.2 rounded-full text-[9px] font-semibold bg-red-50 text-red-700 border border-red-200 shrink-0 ml-1">
                                <span className="w-1 h-1 rounded-full bg-red-500 mr-0.5"></span>
                                Inactive
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-1 whitespace-nowrap text-slate-500">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{formatDate(t.deadline)}</span>
                          </div>
                        </div>

                        {/* Quick Status Action Menu (Accessibility & Mobile) */}
                        <div
                          className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-slate-400 font-medium">Move to:</span>
                          <select
                            value={t.status}
                            onChange={(e) => handleStatusChange(t.id, e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-navy-950 text-[10px] font-semibold rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-navy-950 cursor-pointer"
                          >
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="REVIEW">In Review</option>
                            <option value="COMPLETED">Completed</option>
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Details Modal with Comments & Activity */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedTask(null);
          }}
          onTaskUpdated={fetchTasks}
        />
      )}
    </div>
  );
}
