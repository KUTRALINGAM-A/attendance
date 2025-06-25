import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { 
  Calendar as CalendarIcon,
  Plus as PlusIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Clock as ClockIcon,
  User as UserIcon,
  Users as UsersIcon,
  AlertCircle as AlertCircleIcon,
  CheckCircle2 as CheckCircle2Icon,
  Circle as CircleIcon,
  Pause as PauseIcon,
  X as XIcon,
  Edit as EditIcon,
  Trash2 as Trash2Icon,
  MessageSquare as MessageSquareIcon,
  Send as SendIcon,
  ArrowLeft as ArrowLeftIcon,
  Filter as FilterIcon,
  Search as SearchIcon,
  Target as TargetIcon,
  Bell as BellIcon,
  Calendar as CalendarViewIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Calendar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [isMobile, setIsMobile] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  // Task form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    due_date: '',
    due_time: '',
    priority: 'Medium',
    status: 'Todo',
    category: '',
    is_personal: false
  });

  // Check mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Auth error:', authError);
          return;
        }
        
        if (!authUser) {
          navigate('/login');
          return;
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        
        if (profileError) {
          console.error('Profile error:', profileError);
          return;
        }

        const isAdmin = profile.role === 'Administrator' || profile.role === 'admin';
        setUser({
          ...profile,
          isAdmin
        });

        console.log('User role:', profile.role, 'isAdmin:', isAdmin);

        // Initialize task form
        setTaskForm(prev => ({
          ...prev,
          assigned_to: isAdmin ? '' : profile.id
        }));
        
      } catch (error) {
        console.error('Error getting user:', error);
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, [navigate]);

  // Fetch all users (for admin task assignment)
useEffect(() => {
  const fetchUsers = async () => {
    if (!user) return;
    
    try {
      let query = supabase
        .from('users')
        .select('id, name, email, role')
        .eq('is_active', true)
        .order('name');
      
      // If user is admin, exclude other admins
      if (user?.isAdmin) {
        query = query.neq('role', 'Administrator').neq('role', 'admin');
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      console.log('Fetched users:', data);
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  if (user) {
    fetchUsers();
  }
}, [user]);

// In the task form modal, conditionally render the Assign To field only for admins
{user?.isAdmin && (
  <div style={styles.formGroup}>
    <label style={styles.label}>Assign To *</label>
    <select
      value={taskForm.assigned_to}
      onChange={(e) => setTaskForm({...taskForm, assigned_to: e.target.value})}
      style={styles.input}
      required
    >
      <option value="">Select a user...</option>
      {/* Current admin can always assign to themselves */}
      <option key={user.id} value={user.id}>
        {user.name} (myself)
      </option>
      {/* Filter to show only non-admin users */}
      {users.filter(u => !u.isAdmin).map(worker => (
        <option key={worker.id} value={worker.id}>
          {worker.name} ({worker.email})
        </option>
      ))}
    </select>
  </div>
)}

  // Fetch tasks
  useEffect(() => {
    const fetchTasks = async () => {
      if (!user) return;
      
      try {
        let query = supabase
          .from('tasks')
          .select(`
            *,
            assigned_to_user:users!tasks_assigned_to_fkey(id, name, email),
            assigned_by_user:users!tasks_assigned_by_fkey(id, name, email)
          `)
          .order('due_date', { ascending: true });

        // If not admin, only show tasks assigned to user or created by user
        if (!user?.isAdmin) {
          query = query.or(`assigned_to.eq.${user.id},assigned_by.eq.${user.id}`);
        }

        const { data, error } = await query;
        
        if (error) {
          console.error('Error fetching tasks:', error);
          throw error;
        }
        
        console.log('Fetched tasks:', data);
        setTasks(data || []);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        if (error.message.includes('row-level security')) {
          console.error('RLS Policy Error. Check if user role matches database policies.');
        }
      }
    };

    if (user) {
      fetchTasks();
    }
  }, [user]);

  // Filter tasks
  useEffect(() => {
    let filtered = tasks;

    if (searchTerm) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    setFilteredTasks(filtered);
  }, [tasks, searchTerm, statusFilter, priorityFilter]);

  // Calendar helper functions
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };

  const getWeekDays = () => {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  };

  const getTasksForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return filteredTasks.filter(task => task.due_date === dateStr);
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    return date.toDateString() === currentDate.toDateString();
  };

  // Task management functions
  const handleCreateTask = async (e) => {
    e.preventDefault();
    
    try {
      // Validate required fields
      if (!taskForm.title.trim()) {
        alert('Please enter a task title.');
        return;
      }

      // Validate assignment
      if (!taskForm.assigned_to) {
        alert('Please select a user to assign this task to.');
        return;
      }

      const taskData = {
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || null,
        assigned_to: taskForm.assigned_to,
        assigned_by: user.id,
        due_date: taskForm.due_date || null,
        due_time: taskForm.due_time || null,
        priority: taskForm.priority,
        status: taskForm.status,
        category: taskForm.category.trim() || null,
        is_personal: taskForm.is_personal
      };

      console.log('Creating task with data:', taskData);

      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select(`
          *,
          assigned_to_user:users!tasks_assigned_to_fkey(id, name, email),
          assigned_by_user:users!tasks_assigned_by_fkey(id, name, email)
        `);

      if (error) {
        console.error('Task creation error:', error);
        throw error;
      }

      console.log('Task created successfully:', data);
      setTasks([...tasks, ...data]);
      setShowTaskForm(false);
      resetTaskForm();
      alert('Task created successfully!');
    } catch (error) {
      console.error('Error creating task:', error);
      if (error.message.includes('row-level security')) {
        alert('Permission denied. Please check your role permissions.');
      } else {
        alert(`Failed to create task: ${error.message}`);
      }
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      console.log('Updating task:', taskId, 'with updates:', updates);
      
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select(`
          *,
          assigned_to_user:users!tasks_assigned_to_fkey(id, name, email),
          assigned_by_user:users!tasks_assigned_by_fkey(id, name, email)
        `);

      if (error) {
        console.error('Task update error:', error);
        throw error;
      }

      console.log('Task updated successfully:', data);
      setTasks(tasks.map(task => 
        task.id === taskId ? data[0] : task
      ));
      
      if (selectedTask?.id === taskId) {
        setSelectedTask(data[0]);
      }
    } catch (error) {
      console.error('Error updating task:', error);
      alert(`Failed to update task: ${error.message}`);
    }
  };

  const handleDeleteTask = async (taskId) => {
    setTaskToDelete(taskId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskToDelete);

      if (error) throw error;

      setTasks(tasks.filter(task => task.id !== taskToDelete));
      setSelectedTask(null);
      setShowTaskModal(false);
      setShowDeleteConfirm(false);
      setTaskToDelete(null);
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task. Please try again.');
    }
  };

  const fetchComments = async (taskId) => {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          user:users(id, name, email)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    
    if (!newComment.trim() || !selectedTask) return;

    setSubmittingComment(true);
    
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .insert([{
          task_id: selectedTask.id,
          user_id: user.id,
          comment: newComment.trim()
        }]);

      if (error) throw error;

      setNewComment('');
      await fetchComments(selectedTask.id);
      
    } catch (error) {
      console.error('Error adding comment:', error);
      alert(`Failed to add comment: ${error.message}`);
    } finally {
      setSubmittingComment(false);
    }
  };

  const resetTaskForm = () => {
  setTaskForm({
    title: '',
    description: '',
    assigned_to: user?.id || '', // Always set to current user for non-admins
    due_date: '',
    due_time: '',
    priority: 'Medium',
    status: 'Todo',
    category: '',
    is_personal: false
  });
  setEditingTask(null);
};

  const handleEditTask = (task) => {
    setTaskForm({
      title: task.title,
      description: task.description || '',
      assigned_to: task.assigned_to,
      due_date: task.due_date || '',
      due_time: task.due_time || '',
      priority: task.priority,
      status: task.status,
      category: task.category || '',
      is_personal: task.is_personal
    });
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleUpdateTaskForm = async (e) => {
    e.preventDefault();
    
    try {
      const updates = {
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || null,
        due_date: taskForm.due_date || null,
        due_time: taskForm.due_time || null,
        priority: taskForm.priority,
        status: taskForm.status,
        category: taskForm.category.trim() || null,
        is_personal: taskForm.is_personal
      };

      // Only admins can change task assignment
      if (user?.isAdmin) {
        updates.assigned_to = taskForm.assigned_to;
      }

      console.log('Updating task with data:', updates);
      
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', editingTask.id)
        .select(`
          *,
          assigned_to_user:users!tasks_assigned_to_fkey(id, name, email),
          assigned_by_user:users!tasks_assigned_by_fkey(id, name, email)
        `);

      if (error) throw error;

      setTasks(tasks.map(task => 
        task.id === editingTask.id ? data[0] : task
      ));
      setShowTaskForm(false);
      resetTaskForm();
      alert('Task updated successfully!');
    } catch (error) {
      console.error('Error updating task:', error);
      alert(`Failed to update task: ${error.message}`);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Urgent': return '#ef4444';
      case 'High': return '#f97316';
      case 'Medium': return '#eab308';
      case 'Low': return '#22c55e';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed': return <CheckCircle2Icon />;
      case 'In Progress': return <PauseIcon />;
      case 'Cancelled': return <XIcon />;
      default: return <CircleIcon />;
    }
  };

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} style={styles.emptyDay}></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayTasks = getTasksForDate(date);
      const isCurrentDay = isToday(date);
      const isSelectedDay = isSelected(date);

      days.push(
        <div
          key={day}
          style={{
            ...styles.calendarDay,
            ...(isCurrentDay ? styles.today : {}),
            ...(isSelectedDay ? styles.selectedDay : {})
          }}
          onClick={() => setCurrentDate(date)}
        >
          <div style={styles.dayNumber}>{day}</div>
          <div style={styles.dayTasks}>
            {dayTasks.slice(0, isMobile ? 2 : 3).map(task => (
              <div
                key={task.id}
                style={{
                  ...styles.taskChip,
                  backgroundColor: getPriorityColor(task.priority)
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTask(task);
                  setShowTaskModal(true);
                  fetchComments(task.id);
                }}
              >
                {task.title.length > 12 ? `${task.title.substring(0, 12)}...` : task.title}
              </div>
            ))}
            {dayTasks.length > (isMobile ? 2 : 3) && (
              <div style={styles.moreTasksIndicator}>
                +{dayTasks.length - (isMobile ? 2 : 3)} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}>
          <CalendarIcon />
        </div>
        <p>Loading calendar...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <button 
              onClick={() => navigate('/dashboard')}
              style={styles.backButton}
            >
              <ArrowLeftIcon />
              Back to Dashboard
            </button>
            <h1 style={styles.title}>Task Calendar</h1>
            {user?.isAdmin && <span style={styles.adminBadge}>Admin</span>}
          </div>
          
          <div style={styles.headerRight}>
            <button
              onClick={() => {
                resetTaskForm();
                setShowTaskForm(true);
              }}
              style={styles.addButton}
            >
              <PlusIcon />
              {!isMobile && 'Add Task'}
            </button>
          </div>
        </div>
      </header>

      {/* Controls */}
      <div style={styles.controls}>
        <div style={styles.calendarControls}>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            style={styles.navButton}
          >
            <ChevronLeftIcon />
          </button>
          
          <h2 style={styles.currentMonth}>{formatDate(currentDate)}</h2>
          
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            style={styles.navButton}
          >
            <ChevronRightIcon />
          </button>
        </div>

        <div style={styles.filters}>
          <div style={styles.searchContainer}>
            <SearchIcon style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all" style={styles.formOption}>All Status</option>
            <option value="Todo" style={styles.formOption}>Todo</option>
            <option value="In Progress" style={styles.formOption}>In Progress</option>
            <option value="Completed" style={styles.formOption}>Completed</option>
            <option value="Cancelled" style={styles.formOption}>Cancelled</option>
          </select>
          
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all" style={styles.formOption}>All Priority</option>
            <option value="Urgent" style={styles.formOption}>Urgent</option>
            <option value="High" style={styles.formOption}>High</option>
            <option value="Medium" style={styles.formOption}>Medium</option>
            <option value="Low" style={styles.formOption}>Low</option>
          </select>
        </div>
      </div>

      {/* Calendar Grid */}
      <div style={styles.calendarContainer}>
        <div style={styles.weekHeader}>
          {getWeekDays().map(day => (
            <div key={day} style={styles.weekDay}>{day}</div>
          ))}
        </div>
        
        <div style={styles.calendarGrid}>
          {renderCalendarGrid()}
        </div>
      </div>
 <div style={styles.footer}>
          <p style={styles.footerText}>
            <span style={styles.footerCompany}>Flamingoes Private Limited</span>
          </p>
          <p style={styles.footerCopyright}>
            © 2024 All rights reserved.
          </p>
        </div>
      {/* Task Details Modal */}
      {showTaskModal && selectedTask && (
        <div style={styles.modalOverlay} onClick={() => setShowTaskModal(false)}>
          <div style={styles.taskModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.taskModalHeader}>
              <h3 style={styles.taskTitle}>{selectedTask.title}</h3>
              <div style={styles.taskModalActions}>
                {(user?.isAdmin || selectedTask.assigned_by === user.id) && (
                  <>
                    <button
                      onClick={() => {
                        setShowTaskModal(false);
                        handleEditTask(selectedTask);
                      }}
                      style={styles.actionButton}
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(selectedTask.id)}
                      style={{...styles.actionButton, ...styles.deleteButton}}
                    >
                      <Trash2Icon />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowTaskModal(false)}
                  style={styles.closeButton}
                >
                  <XIcon />
                </button>
              </div>
            </div>
            
            <div style={styles.taskModalContent}>
              <div style={styles.taskDetails}>
                <div style={styles.taskMeta}>
                  <div style={styles.metaItem}>
                    <CalendarIcon style={styles.metaIcon} />
                    <span>Due: {selectedTask.due_date || 'No due date'}</span>
                    {selectedTask.due_time && <span> at {selectedTask.due_time}</span>}
                  </div>
                  
                  <div style={styles.metaItem}>
                    <TargetIcon style={styles.metaIcon} />
                    <span style={{color: getPriorityColor(selectedTask.priority)}}>
                      {selectedTask.priority} Priority
                    </span>
                  </div>
                  
                  <div style={styles.metaItem}>
                    {getStatusIcon(selectedTask.status)}
                    <span>{selectedTask.status}</span>
                  </div>
                  
                  <div style={styles.metaItem}>
                    <UserIcon style={styles.metaIcon} />
                    <span>Assigned to: {selectedTask.assigned_to_user?.name || 'Unknown'}</span>
                  </div>
                  
                  {selectedTask.assigned_by_user && (
                    <div style={styles.metaItem}>
                      <UsersIcon style={styles.metaIcon} />
                      <span>Assigned by: {selectedTask.assigned_by_user.name}</span>
                    </div>
                  )}
                </div>
                
                {selectedTask.description && (
                  <div style={styles.description}>
                    <h4>Description</h4>
                    <p>{selectedTask.description}</p>
                  </div>
                )}
                
                {selectedTask.category && (
                  <div style={styles.category}>
                    <span style={styles.categoryTag}>{selectedTask.category}</span>
                  </div>
                )}
              </div>
              
              {/* Status Update */}
              <div style={styles.statusUpdate}>
                <h4>Update Status</h4>
                <div style={styles.statusButtons}>
                  {['Todo', 'In Progress', 'Completed', 'Cancelled'].map(status => (
                    <button
                      key={status}
                      onClick={() => handleUpdateTask(selectedTask.id, { status })}
                      style={{
                        ...styles.statusButton,
                        ...(selectedTask.status === status ? styles.activeStatusButton : {})
                      }}
                    >
                      {getStatusIcon(status)}
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Comments Section */}
              <div style={styles.commentsSection}>
                <h4>Comments</h4>
                <div style={styles.commentsList}>
                  {comments.map(comment => (
                    <div key={comment.id} style={styles.comment}>
                      <div style={styles.commentHeader}>
                        <span style={styles.commentAuthor}>{comment.user.name}</span>
                        <span style={styles.commentDate}>
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={styles.commentText}>{comment.comment}</p>
                    </div>
                  ))}
                </div>
                
                <form onSubmit={handleAddComment} style={styles.commentForm}>
                  <div style={styles.commentInputContainer}>
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      style={styles.commentInput}
                      disabled={submittingComment}
                    />
                    <button
                      type="submit"
                      disabled={submittingComment || !newComment.trim()}
                      style={styles.commentSubmitButton}
                    >
                      <SendIcon />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={styles.modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div style={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
            <div style={styles.confirmDialogContent}>
              <h3>Confirm Deletion</h3>
              <p>Are you sure you want to delete this task? This action cannot be undone.</p>
              <div style={styles.confirmDialogActions}>
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  style={styles.deleteButton}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Form Modal */}
      {showTaskForm && (
        <div style={styles.modalOverlay} onClick={() => setShowTaskForm(false)}>
          <div style={styles.taskFormModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.formHeader}>
              <h3>{editingTask ? 'Edit Task' : 'Create New Task'}</h3>
              <button
                onClick={() => {
                  setShowTaskForm(false);
                  resetTaskForm();
                }}
                style={styles.closeButton}
              >
                <XIcon />
              </button>
            </div>
            
            <form onSubmit={editingTask ? handleUpdateTaskForm : handleCreateTask} style={styles.taskForm}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Title *</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                  style={styles.input}
                  required
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                  style={styles.textarea}
                  rows="3"
                />
              </div>
              
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Due Date</label>
                  <input
                    type="date"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({...taskForm, due_date: e.target.value})}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Due Time</label>
                  <input
                    type="time"
                    value={taskForm.due_time}
                    onChange={(e) => setTaskForm({...taskForm, due_time: e.target.value})}
                    style={styles.input}
                  />
                </div>
              </div>
              
             {user?.isAdmin && (
  <div style={styles.formGroup}>
    <label style={styles.label}>Assign To *</label>
    <select
      value={taskForm.assigned_to}
      onChange={(e) => setTaskForm({...taskForm, assigned_to: e.target.value})}
      style={styles.input}
      required
    >
      <option value=""  style={styles.formOption}>Select a user...</option>
      {/* Current admin can always assign to themselves */}
      <option key={user.id} value={user.id}  style={styles.formOption}>
        {user.name} (myself)
      </option>
      {/* Filter to show only non-admin users */}
      {users.filter(u => !u.isAdmin).map(worker => (
        <option key={worker.id} value={worker.id} style={styles.formOption}>
          {worker.name} ({worker.email})
        </option>
      ))}
    </select>
  </div>
)}
 
              
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({...taskForm, priority: e.target.value})}
                    style={styles.input}
                  >
                    <option value="Low"  style={styles.formOption}>Low</option>
                    <option value="Medium"  style={styles.formOption}>Medium</option>
                    <option value="High"  style={styles.formOption}>High</option>
                    <option value="Urgent"  style={styles.formOption}>Urgent</option>
                  </select>
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Status</label>
                  <select
                    value={taskForm.status}
                    onChange={(e) => setTaskForm({...taskForm, status: e.target.value})}
                    style={styles.input}
                  >
                    <option value="Todo"  style={styles.formOption}>Todo</option>
                    <option value="In Progress"  style={styles.formOption}>In Progress</option>
                    <option value="Completed" style={styles.formOption}>Completed</option>
                    <option value="Cancelled" style={styles.formOption}>Cancelled</option>
                  </select>
                </div>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Category</label>
                <input
                  type="text"
                  value={taskForm.category}
                  onChange={(e) => setTaskForm({...taskForm, category: e.target.value})}
                  style={styles.input}
                  placeholder="e.g., Work, Personal, Project"
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={taskForm.is_personal}
                    onChange={(e) => setTaskForm({...taskForm, is_personal: e.target.checked})}
                    style={styles.checkbox}
                  />
                  Personal Task
                </label>
              </div>
              
              <div style={styles.formActions}>
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskForm(false);
                    resetTaskForm();
                  }}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.submitButton}
                >
                  {editingTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles (keep the same as in your original code)
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #db2777 100%)',
    color: '#ffffff',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '20px'
  },
  header: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    backdropFilter: 'blur(10px)',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#ffffff',
    transition: 'all 0.2s ease',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.2)'
    }
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#ffffff',
    margin: 0
  },
  headerRight: {
    display: 'flex',
    gap: '12px'
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    '&:hover': {
      transform: 'translateY(-2px)'
    }
  },
  controls: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  calendarControls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    marginBottom: '20px'
  },
  navButton: {
    padding: '8px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    color: '#ffffff',
    transition: 'all 0.2s ease',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.2)'
    }
  },
  currentMonth: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#ffffff',
    margin: 0
  },
  filters: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  searchContainer: {
    position: 'relative',
    flex: 1,
    minWidth: '200px'
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '16px',
    height: '16px',
    color: 'rgba(255, 255, 255, 0.7)'
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px 8px 36px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#ffffff',
    '&::placeholder': {
      color: 'rgba(255, 255, 255, 0.5)'
    }
  },
  filterSelect: {
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#ffffff',
    '& option': {
      background: '#333333',
      color: '#ffffff'
    }
  },
  calendarContainer: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '20px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  weekHeader: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
    marginBottom: '12px'
  },
  weekDay: {
    padding: '12px 8px',
    textAlign: 'center',
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '14px'
  },

  calendarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px'
  },

  calendarDay: {
    minHeight: '120px',
    padding: '8px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.1)'
    }
  },

  emptyDay: {
    minHeight: '120px',
    background: 'transparent'
  },

  today: {
    background: 'rgba(59, 130, 246, 0.2)',
    borderColor: 'rgba(59, 130, 246, 0.5)'
  },

  selectedDay: {
    background: 'rgba(139, 92, 246, 0.2)',
    borderColor: 'rgba(139, 92, 246, 0.5)'
  },

  dayNumber: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: '4px'
  },

  dayTasks: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },

  taskChip: {
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    color: 'white',
    cursor: 'pointer',
    fontWeight: '500',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    background: 'rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    transition: 'all 0.2s ease',
    '&:hover': {
      transform: 'translateY(-1px)'
    }
  },

  moreTasksIndicator: {
    fontSize: '10px',
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
    marginTop: '2px'
  },

  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },

  taskModal: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '80vh',
    overflow: 'auto',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },

  taskModalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  },

  taskTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#ffffff',
    margin: 0,
    flex: 1
  },

  taskModalActions: {
    display: 'flex',
    gap: '8px'
  },

  actionButton: {
    padding: '8px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    color: '#ffffff',
    transition: 'all 0.2s ease',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.2)'
    }
  },

  deleteButton: {
    color: '#ef4444',
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },

  closeButton: {
    padding: '8px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    color: 'rgba(255, 255, 255, 0.7)'
  },

  taskModalContent: {
    padding: '20px'
  },

  taskDetails: {
    marginBottom: '24px'
  },

  taskMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '16px'
  },

  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.8)'
  },

  metaIcon: {
    width: '16px',
    height: '16px',
    color: 'rgba(255, 255, 255, 0.7)'
  },

  description: {
    marginBottom: '16px',
    color: 'rgba(255, 255, 255, 0.8)'
  },

  category: {
    marginBottom: '16px'
  },

  categoryTag: {
    display: 'inline-block',
    padding: '4px 12px',
    background: 'rgba(59, 130, 246, 0.2)',
    color: '#3b82f6',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    border: '1px solid rgba(59, 130, 246, 0.3)'
  },

  statusUpdate: {
    marginBottom: '24px',
    padding: '16px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },

  statusButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginTop: '12px'
  },

  statusButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.8)',
    transition: 'all 0.2s ease'
  },

  activeStatusButton: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    color: 'white',
    borderColor: 'transparent'
  },

  commentsSection: {
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    paddingTop: '20px'
  },

  commentsList: {
    maxHeight: '200px',
    overflowY: 'auto',
    marginBottom: '16px'
  },

  comment: {
    padding: '12px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    marginBottom: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },

  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px'
  },

  commentAuthor: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff'
  },

  commentDate: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.5)'
  },

  commentText: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.8)',
    margin: 0
  },

  commentForm: {
    display: 'flex',
    gap: '8px'
  },

  commentInputContainer: {
    display: 'flex',
    gap: '8px',
    width: '100%'
  },

  commentInput: {
    flex: 1,
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#ffffff',
    '&::placeholder': {
      color: 'rgba(255, 255, 255, 0.5)'
    }
  },

  commentSubmitButton: {
    padding: '8px 12px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease',
    '&:hover': {
      transform: 'translateY(-1px)'
    }
  },

  // Task form modal
  taskFormModal: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '80vh',
    overflow: 'auto',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },

  formHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  },

  taskForm: {
    padding: '20px'
  },

  formGroup: {
    marginBottom: '16px'
  },

  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '16px'
  },

  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: '4px'
  },

  input: {
    width: '100%',
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#ffffff',
    boxSizing: 'border-box',
    '&::placeholder': {
      color: 'rgba(255, 255, 255, 0.5)'
    }
  },

  textarea: {
    width: '100%',
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '6px',
    fontSize: '14px',
    resize: 'vertical',
    boxSizing: 'border-box',
    color: '#ffffff',
    minHeight: '100px'
  },

  select: {
    width: '100%',
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#ffffff',
    boxSizing: 'border-box',
    '& option': {
      background: '#333333',
      color: '#ffffff'
    }
  },

  checkboxGroup: {
    marginBottom: '20px'
  },

  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#ffffff',
    cursor: 'pointer'
  },

  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: '#8b5cf6'
  },
formOption: {
  background: '#333333', // Dark background for options
  color: '#ffffff',      // White text
  padding: '0.5rem',
},
  formActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  },

  cancelButton: {
    padding: '10px 20px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#ffffff',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.2)'
    }
  },

  submitButton: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    '&:hover': {
      transform: 'translateY(-2px)'
    }
  },

  // Loading spinner
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #db2777 100%)',
    color: '#ffffff',
    gap: '16px'
  },

  spinner: {
    animation: 'spin 1s linear infinite',
    fontSize: '2rem',
    color: '#ffffff'
  },   footer: {
      padding: '16px',
      textAlign: 'center'
    },
    footerText: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: '14px',
      margin: 0
    },
    footerCompany: {
      fontWeight: '600'
    },
    footerCopyright: {
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: '12px',
      marginTop: '4px',
      margin: '4px 0 0 0'
    }
};

export default Calendar;