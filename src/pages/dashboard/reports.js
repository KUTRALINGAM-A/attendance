import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Users,
  CheckCircle2,
  AlertCircle,
  Filter,
  Search,
  Calendar,
  Loader2,
  TrendingUp,
  BarChart3,
  PieChart,
  Target,
  Activity,
  Award,
  AlertTriangle,
  Download,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Cell, BarChart, Bar, Pie } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabase';

const EnhancedReportsDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isMobile, setIsMobile] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' or 'list'
  const [expandedCard, setExpandedCard] = useState(null);
  const [error, setError] = useState(null);

  // Analytics data
  const [analytics, setAnalytics] = useState({
    totalHours: 0,
    avgHoursPerDay: 0,
    completedTasks: 0,
    blockedTasks: 0,
    clientInteractions: 0,
    mostWorkedService: '',
    productivityTrend: [],
    statusDistribution: [],
    serviceDistribution: [],
    weeklyHours: []
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

  // Get current user from Supabase auth
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Auth error:', authError);
          navigate('/login');
          return;
        }

        if (!authUser) {
          navigate('/login');
          return;
        }

        // Get user details from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (userError) {
          console.error('Error fetching user data:', userError);
          setError('Failed to load user data');
          return;
        }

        const currentUser = {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          isAdmin: userData.role === 'Administrator' || userData.role === 'admin'
        };

        setUser(currentUser);
        setSelectedUser({
          id: currentUser.id,
          name: currentUser.name
        });
        
      } catch (error) {
        console.error('Error getting user:', error);
        setError('Failed to authenticate user');
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, [navigate]);

  // Fetch all users for admin view
  useEffect(() => {
    const fetchUsers = async () => {
      if (!user || !user.isAdmin) return;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, email, role')
          .eq('is_active', true)
          .order('name');

        if (error) {
          console.error('Error fetching users:', error);
          return;
        }
        
        // Filter out current user from the list (they're already selected by default)
        setUsers(data.filter(u => u.id !== user.id));
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    if (user) {
      fetchUsers();
    }
  }, [user]);

  // Fetch reports from Supabase
  useEffect(() => {
    const fetchReports = async () => {
      if (!user || !selectedUser) return;
      
      setLoadingReports(true);
      setError(null);
      
      try {
        // Get the current month's start and end dates
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];

        const { data, error } = await supabase
          .from('daily_checkins')
          .select('*')
          .eq('user_id', selectedUser.id)
          .gte('date', startOfMonth)
          .lte('date', endOfMonth)
          .order('date', { ascending: false });

        if (error) {
          console.error('Error fetching reports:', error);
          setError('Failed to load reports');
          return;
        }

        setReports(data || []);
        calculateAnalytics(data || []);
      } catch (error) {
        console.error('Error fetching reports:', error);
        setError('Failed to load reports');
      } finally {
        setLoadingReports(false);
      }
    };

    fetchReports();
  }, [user, selectedUser, currentDate]);

  // Calculate analytics from reports data
  const calculateAnalytics = (reportsData) => {
    if (!reportsData.length) {
      setAnalytics({
        totalHours: 0,
        avgHoursPerDay: 0,
        completedTasks: 0,
        blockedTasks: 0,
        clientInteractions: 0,
        mostWorkedService: 'N/A',
        productivityTrend: [],
        statusDistribution: [],
        serviceDistribution: [],
        weeklyHours: []
      });
      return;
    }

    const totalHours = reportsData.reduce((sum, report) => sum + parseFloat(report.hours_spent || 0), 0);
    const avgHoursPerDay = totalHours / reportsData.length;
    const completedTasks = reportsData.filter(r => r.progress_status === 'Completed').length;
    const blockedTasks = reportsData.filter(r => r.progress_status === 'Blocked').length;
    const clientInteractions = reportsData.filter(r => r.client_interaction).length;

    // Service distribution
    const serviceCount = {};
    reportsData.forEach(report => {
      if (report.service_worked) {
        serviceCount[report.service_worked] = (serviceCount[report.service_worked] || 0) + 1;
      }
    });
    
    const mostWorkedService = Object.keys(serviceCount).length > 0 
      ? Object.keys(serviceCount).reduce((a, b) => serviceCount[a] > serviceCount[b] ? a : b)
      : 'N/A';

    // Status distribution for pie chart
    const statusCount = {};
    reportsData.forEach(report => {
      const status = report.progress_status || 'Unknown';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });
    const statusDistribution = Object.entries(statusCount).map(([status, count]) => ({
      name: status,
      value: count,
      percentage: ((count / reportsData.length) * 100).toFixed(1)
    }));

    // Service distribution for pie chart
    const serviceDistribution = Object.entries(serviceCount).map(([service, count]) => ({
      name: service,
      value: count,
      hours: reportsData.filter(r => r.service_worked === service)
        .reduce((sum, r) => sum + parseFloat(r.hours_spent || 0), 0)
    }));

    // Productivity trend (chronological order)
    const sortedReports = [...reportsData].sort((a, b) => new Date(a.date) - new Date(b.date));
    const productivityTrend = sortedReports.map(report => ({
      date: new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      hours: parseFloat(report.hours_spent || 0),
      status: report.progress_status || 'Unknown',
      efficiency: report.progress_status === 'Completed' ? 100 : 
                 report.progress_status === 'In Progress' ? 70 : 30
    }));

    // Weekly hours (group by week)
    const weeklyHours = [];
    const weekMap = {};
    sortedReports.forEach(report => {
      const date = new Date(report.date);
      const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weekMap[weekKey]) {
        weekMap[weekKey] = {
          week: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          hours: 0,
          tasks: 0
        };
      }
      weekMap[weekKey].hours += parseFloat(report.hours_spent || 0);
      weekMap[weekKey].tasks += 1;
    });
    
    Object.values(weekMap).forEach(week => weeklyHours.push(week));

    setAnalytics({
      totalHours: totalHours.toFixed(1),
      avgHoursPerDay: avgHoursPerDay.toFixed(1),
      completedTasks,
      blockedTasks,
      clientInteractions,
      mostWorkedService,
      productivityTrend,
      statusDistribution,
      serviceDistribution,
      weeklyHours
    });
  };

  // Filter reports
  useEffect(() => {
    let filtered = reports;

    if (searchTerm) {
      filtered = filtered.filter(report => 
        (report.main_task && report.main_task.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (report.tomorrow_priority && report.tomorrow_priority.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (report.service_worked && report.service_worked.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => report.progress_status === statusFilter);
    }

    setFilteredReports(filtered);
  }, [reports, searchTerm, statusFilter]);

  // Date navigation functions
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };

  const changeMonth = (delta) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return '#22c55e';
      case 'In Progress': return '#eab308';
      case 'Blocked': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed': return <CheckCircle2 size={16} />;
      case 'Blocked': return <AlertCircle size={16} />;
      default: return <Activity size={16} />;
    }
  };

  const getPieChartColors = () => ['#22c55e', '#eab308', '#ef4444', '#3b82f6', '#8b5cf6', '#f59e0b'];

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}>
          <Loader2 className="animate-spin" />
        </div>
        <p>Loading reports...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <AlertCircle size={48} color="#ef4444" />
        <h2>Error Loading Dashboard</h2>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          style={styles.retryButton}
        >
          Retry
        </button>
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
              <ArrowLeft size={18} />
              {!isMobile && 'Back to Dashboard'}
            </button>
            <h1 style={styles.title}>Analytics & Reports</h1>
            {user?.isAdmin && <span style={styles.adminBadge}>Admin</span>}
          </div>
          <div style={styles.viewToggle}>
            <button
              onClick={() => setViewMode('dashboard')}
              style={{
                ...styles.toggleButton,
                ...(viewMode === 'dashboard' ? styles.toggleButtonActive : {})
              }}
            >
              <BarChart3 size={16} />
              Dashboard
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                ...styles.toggleButton,
                ...(viewMode === 'list' ? styles.toggleButtonActive : {})
              }}
            >
              <Eye size={16} />
              Details
            </button>
          </div>
        </div>
      </header>

      {/* Controls */}
      <div style={styles.controls}>
        {/* User selector for admins */}
        {user?.isAdmin && (
          <div style={styles.formGroup}>
            <label style={styles.label}>View Reports For</label>
            <select
              value={selectedUser?.id || ''}
              onChange={(e) => {
                const userId = e.target.value;
                const selectedUserData = userId === user.id ? 
                  { id: user.id, name: user.name } :
                  users.find(u => u.id === userId);
                setSelectedUser(selectedUserData);
              }}
              style={styles.input}
            >
              <option value={user.id} style={styles.formOption}>
                {user.name} (myself)
              </option>
              {users.map(worker => (
                <option key={worker.id} value={worker.id} style={styles.formOption}>
                  {worker.name} ({worker.email})
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={styles.dateControls}>
          <button
            onClick={() => changeMonth(-1)}
            style={styles.navButton}
          >
            <ChevronLeft size={18} />
          </button>
          
          <h2 style={styles.currentMonth}>{formatDate(currentDate)}</h2>
          
          <button
            onClick={() => changeMonth(1)}
            style={styles.navButton}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div style={styles.filters}>
          <div style={styles.searchContainer}>
            <Search size={16} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search reports..."
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
            <option value="Completed" style={styles.formOption}>Completed</option>
            <option value="In Progress" style={styles.formOption}>In Progress</option>
            <option value="Blocked" style={styles.formOption}>Blocked</option>
          </select>
        </div>
      </div>

      {loadingReports ? (
        <div style={styles.loadingReports}>
          <Loader2 className="animate-spin" />
          <p>Loading reports...</p>
        </div>
      ) : (
        <>
          {viewMode === 'dashboard' ? (
            <div style={styles.dashboardContainer}>
              {/* Key Metrics */}
              <div style={styles.metricsGrid}>
                <div style={styles.metricCard}>
                  <div style={styles.metricIcon}>
                    <Clock size={24} style={{ color: '#3b82f6' }} />
                  </div>
                  <div style={styles.metricContent}>
                    <h3 style={styles.metricValue}>{analytics.totalHours}</h3>
                    <p style={styles.metricLabel}>Total Hours</p>
                    <span style={styles.metricSubtext}>
                      Avg: {analytics.avgHoursPerDay}h/day
                    </span>
                  </div>
                </div>

                <div style={styles.metricCard}>
                  <div style={styles.metricIcon}>
                    <Target size={24} style={{ color: '#22c55e' }} />
                  </div>
                  <div style={styles.metricContent}>
                    <h3 style={styles.metricValue}>{analytics.completedTasks}</h3>
                    <p style={styles.metricLabel}>Completed Tasks</p>
                    <span style={styles.metricSubtext}>
                      {reports.length > 0 ? ((analytics.completedTasks / reports.length) * 100).toFixed(1) : 0}% completion
                    </span>
                  </div>
                </div>

                <div style={styles.metricCard}>
                  <div style={styles.metricIcon}>
                    <AlertTriangle size={24} style={{ color: '#ef4444' }} />
                  </div>
                  <div style={styles.metricContent}>
                    <h3 style={styles.metricValue}>{analytics.blockedTasks}</h3>
                    <p style={styles.metricLabel}>Blocked Tasks</p>
                    <span style={styles.metricSubtext}>
                      {reports.length > 0 ? ((analytics.blockedTasks / reports.length) * 100).toFixed(1) : 0}% blocked
                    </span>
                  </div>
                </div>

                <div style={styles.metricCard}>
                  <div style={styles.metricIcon}>
                    <Users size={24} style={{ color: '#8b5cf6' }} />
                  </div>
                  <div style={styles.metricContent}>
                    <h3 style={styles.metricValue}>{analytics.clientInteractions}</h3>
                    <p style={styles.metricLabel}>Client Interactions</p>
                    <span style={styles.metricSubtext}>
                      {analytics.mostWorkedService}
                    </span>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              {reports.length > 0 ? (
                <div style={styles.chartsGrid}>
                  {/* Productivity Trend */}
                  <div style={styles.chartCard}>
                    <div style={styles.chartHeader}>
                      <h3 style={styles.chartTitle}>
                        <TrendingUp size={20} />
                        Daily Productivity Trend
                      </h3>
                    </div>
                    <div style={styles.chartContainer}>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={analytics.productivityTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fill: '#ffffff', fontSize: 12 }}
                            axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                          />
                          <YAxis 
                            tick={{ fill: '#ffffff', fontSize: 12 }}
                            axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'rgba(0,0,0,0.8)', 
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '8px',
                              color: '#ffffff'
                            }}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="hours" 
                            stroke="#3b82f6" 
                            strokeWidth={3}
                            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                            activeDot={{ r: 8, stroke: '#3b82f6', strokeWidth: 2 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="efficiency" 
                            stroke="#22c55e" 
                            strokeWidth={2}
                            dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Status Distribution */}
                 {analytics.statusDistribution.length > 0 && (
  <div style={styles.chartCard}>
    <div style={styles.chartHeader}>
      <h3 style={styles.chartTitle}>
        <PieChart size={20} />
        Task Status Distribution
      </h3>
    </div>
    <div style={styles.chartContainer}>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsPieChart>
          <Pie
            data={analytics.statusDistribution}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={120}
            paddingAngle={5}
            dataKey="value"
            label={({ name, percentage }) => `${name}: ${percentage}%`}
          >
            {analytics.statusDistribution.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getStatusColor(entry.name)} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(0,0,0,0.9)', 
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '500',
              padding: '8px 12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}
            labelStyle={{
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '600'
            }}
            itemStyle={{
              color: '#ffffff',
              fontSize: '13px'
            }}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  </div>
)}

                  {/* Service Distribution */}
                  {analytics.serviceDistribution.length > 0 && (
                    <div style={styles.chartCard}>
                      <div style={styles.chartHeader}>
                        <h3 style={styles.chartTitle}>
                          <BarChart3 size={20} />
                          Hours by Service
                        </h3>
                      </div>
                      <div style={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={analytics.serviceDistribution}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis 
                              dataKey="name" 
                              tick={{ fill: '#ffffff', fontSize: 10 }}
                              axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                              angle={-45}
                              textAnchor="end"
                              height={100}
                            />
                            <YAxis 
                              tick={{ fill: '#ffffff', fontSize: 12 }}
                              axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(0,0,0,0.8)', 
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '8px',
                                color: '#ffffff'
                              }}
                            />
                            <Bar dataKey="hours" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Weekly Overview */}
                  {analytics.weeklyHours.length > 0 && (
                    <div style={styles.chartCard}>
                      <div style={styles.chartHeader}>
                        <h3 style={styles.chartTitle}>
                          <Activity size={20} />
                          Weekly Overview
                        </h3>
                      </div>
                      <div style={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={analytics.weeklyHours}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis 
                              dataKey="week" 
                              tick={{ fill: '#ffffff', fontSize: 12 }}
                              axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                            />
                            <YAxis 
                              tick={{ fill: '#ffffff', fontSize: 12 }}
                              axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(0,0,0,0.8)', 
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '8px',
                                color: '#ffffff'
                              }}
                            />
                            <Bar dataKey="hours" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="tasks" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={styles.emptyState}>
                  <p>No data available for the selected period</p>
                </div>
              )}
            </div>
          ) : (
            /* Detailed Reports List */
            <div style={styles.reportsContainer}>
              {filteredReports.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No reports found for {selectedUser?.name || 'this user'} in {formatDate(currentDate)}</p>
                </div>
              ) : (
                <div style={styles.reportsList}>
                  {filteredReports.map(report => (
                    <div key={report.id} style={styles.reportCard}>
                      <div style={styles.reportHeader}>
                        <div style={styles.reportDate}>
                          <Calendar size={16} style={styles.reportIcon} />
                          {new Date(report.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        <div style={styles.reportHeaderRight}>
                          <div style={{
                            ...styles.reportStatus,
                            backgroundColor: getStatusColor(report.progress_status)
                          }}>
                            {getStatusIcon(report.progress_status)}
                            {report.progress_status}
                          </div>
                          <button
                            onClick={() => setExpandedCard(expandedCard === report.id ? null : report.id)}
                            style={styles.expandButton}
                          >
                            {expandedCard === report.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>
                      
                      <div style={styles.reportContent}>
                        <div style={styles.reportRow}>
                         <div style={styles.reportField}>
                            <span style={styles.fieldLabel}>Service:</span>
                            <span style={styles.fieldValue}>{report.service_worked || 'N/A'}</span>
                          </div>
                          <div style={styles.reportField}>
                            <span style={styles.fieldLabel}>Hours:</span>
                            <span style={styles.fieldValue}>{report.hours_spent}h</span>
                          </div>
                        </div>

                        <div style={styles.reportField}>
                          <span style={styles.fieldLabel}>Main Task:</span>
                          <p style={styles.taskDescription}>{report.main_task || 'No task description'}</p>
                        </div>

                        {expandedCard === report.id && (
                          <div style={styles.expandedContent}>
                            {report.tomorrow_priority && (
                              <div style={styles.reportField}>
                                <span style={styles.fieldLabel}>Tomorrow's Priority:</span>
                                <p style={styles.taskDescription}>{report.tomorrow_priority}</p>
                              </div>
                            )}

                            <div style={styles.reportRow}>
                              <div style={styles.reportField}>
                                <span style={styles.fieldLabel}>Client Interaction:</span>
                                <span style={{
                                  ...styles.badge,
                                  backgroundColor: report.client_interaction ? '#22c55e' : '#6b7280'
                                }}>
                                  {report.client_interaction ? 'Yes' : 'No'}
                                </span>
                              </div>
                              <div style={styles.reportField}>
                                <span style={styles.fieldLabel}>Has Blocker:</span>
                                <span style={{
                                  ...styles.badge,
                                  backgroundColor: report.has_blocker ? '#ef4444' : '#22c55e'
                                }}>
                                  {report.has_blocker ? 'Yes' : 'No'}
                                </span>
                              </div>
                            </div>

                            {report.blocker_description && (
                              <div style={styles.reportField}>
                                <span style={styles.fieldLabel}>Blocker Description:</span>
                                <p style={styles.taskDescription}>{report.blocker_description}</p>
                              </div>
                            )}

                            {report.additional_notes && (
                              <div style={styles.reportField}>
                                <span style={styles.fieldLabel}>Additional Notes:</span>
                                <p style={styles.taskDescription}>{report.additional_notes}</p>
                              </div>
                            )}

                            <div style={styles.reportRow}>
                              <div style={styles.reportField}>
                                <span style={styles.fieldLabel}>Created:</span>
                                <span style={styles.fieldValue}>
                                  {new Date(report.created_at).toLocaleString()}
                                </span>
                              </div>
                              {report.updated_at !== report.created_at && (
                                <div style={styles.reportField}>
                                  <span style={styles.fieldLabel}>Updated:</span>
                                  <span style={styles.fieldValue}>
                                    {new Date(report.updated_at).toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Enhanced Styles with gradient background and modern design
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #db2777 100%)',
    color: '#ffffff',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    position: 'relative',
    overflow: 'hidden'
  },
  
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #db2777 100%)',
    color: '#ffffff'
  },

  spinner: {
    marginBottom: '1rem',
    fontSize: '2rem'
  },

  header: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '1rem 2rem',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
  },

  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1400px',
    margin: '0 auto'
  },

  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },

  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  },

  title: {
    fontSize: '1.8rem',
    fontWeight: '700',
    margin: 0,
    background: 'linear-gradient(45deg, #ffffff, #f1f5f9)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },

  adminBadge: {
    background: 'linear-gradient(45deg, #fbbf24, #f59e0b)',
    color: '#ffffff',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },

  viewToggle: {
    display: 'flex',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '0.25rem',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  },

  toggleButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'transparent',
    color: '#ffffff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    opacity: 0.7
  },

  toggleButtonActive: {
    background: 'rgba(255, 255, 255, 0.2)',
    opacity: 1,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
  },

  controls: {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },

  label: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#ffffff',
    opacity: 0.9
  },

  input: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    padding: '0.75rem 1rem',
    color: '#ffffff',
    fontSize: '0.9rem',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease'
  },

  dateControls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem'
  },

  navButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    padding: '0.75rem',
    color: '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)'
  },

  currentMonth: {
    fontSize: '1.5rem',
    fontWeight: '700',
    margin: 0,
    color: '#ffffff',
    textAlign: 'center',
    minWidth: '200px'
  },

  filters: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    flexWrap: 'wrap'
  },

  searchContainer: {
    position: 'relative',
    flex: 1,
    minWidth: '200px'
  },

  searchIcon: {
    position: 'absolute',
    left: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#ffffff',
    opacity: 0.7
  },

  searchInput: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    padding: '0.75rem 1rem 0.75rem 2.5rem',
    color: '#ffffff',
    fontSize: '0.9rem',
    width: '100%',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease'
  },

  filterSelect: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    padding: '0.75rem 1rem',
    color: '#ffffff',
    fontSize: '0.9rem',
    backdropFilter: 'blur(10px)',
    cursor: 'pointer'
  },

  loadingReports: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem',
    gap: '1rem'
  },

  dashboardContainer: {
    padding: '0 2rem 2rem',
    maxWidth: '1400px',
    margin: '0 auto'
  },

  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },

  metricCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '2rem',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
  },

  metricIcon: {
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    padding: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  metricContent: {
    flex: 1
  },

  metricValue: {
    fontSize: '2.5rem',
    fontWeight: '800',
    margin: '0 0 0.5rem 0',
    color: '#ffffff'
  },

  metricLabel: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#ffffff',
    opacity: 0.9,
    margin: '0 0 0.25rem 0'
  },

  metricSubtext: {
    fontSize: '0.85rem',
    color: '#ffffff',
    opacity: 0.7
  },

  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '1.5rem'
  },

  chartCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '1.5rem',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
  },

  chartHeader: {
    marginBottom: '1rem'
  },

  chartTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '1.2rem',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0
  },

  chartContainer: {
    height: '300px'
  },

  reportsContainer: {
    padding: '0 2rem 2rem',
    maxWidth: '1400px',
    margin: '0 auto'
  },

  emptyState: {
    textAlign: 'center',
    padding: '4rem',
    color: '#ffffff',
    opacity: 0.7
  },

  reportsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },

  reportCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '1.5rem',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
  },

  reportHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },

  reportDate: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#ffffff'
  },

  reportIcon: {
    color: '#ffffff',
    opacity: 0.8
  },

  reportHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },

  reportStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#ffffff'
  },

  expandButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    padding: '0.5rem',
    color: '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },

  reportContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },

  reportRow: {
    display: 'flex',
    gap: '2rem',
    flexWrap: 'wrap'
  },

  reportField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    flex: 1,
    minWidth: '200px'
  },

  fieldLabel: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#ffffff',
    opacity: 0.8,
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },

  fieldValue: {
    fontSize: '1rem',
    fontWeight: '500',
    color: '#ffffff'
  },

  taskDescription: {
    fontSize: '0.95rem',
    lineHeight: '1.6',
    color: '#ffffff',
    opacity: 0.9,
    margin: 0,
    padding: '0.5rem 0'
  },

  expandedContent: {
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },

  badge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#ffffff'
  },

  blockerSection: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '12px',
    padding: '1rem'
  },
 formOption: {
  background: '#333333', // Dark background for options
  color: '#ffffff',      // White text
  padding: '0.5rem',
},
  blockerReason: {
    fontSize: '0.9rem',
    color: '#ffffff',
    opacity: 0.9,
    margin: '0.5rem 0 0 0',
    lineHeight: '1.5'
  },

  reportTimestamps: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    flexWrap: 'wrap'
  },

  timestamp: {
    fontSize: '0.8rem',
    color: '#ffffff',
    opacity: 0.6
  }
};

export default EnhancedReportsDashboard;