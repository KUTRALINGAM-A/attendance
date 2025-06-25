import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabase';
import { 
  Clock as ClockIcon,
  Users as UsersIcon,
  Calendar as CalendarIcon,
  Activity as ActivityIcon,
  CheckCircle2 as CheckCircleIcon,
  XCircle as XCircleIcon,
  LogOut as LogOutIcon,
  User as UserIcon,
  PlayCircle as PlayCircleIcon,
  StopCircle as StopCircleIcon,
  RefreshCw as RefreshIcon,
  Bell as BellIcon,
  Menu as MenuIcon,
  TrendingUp as TrendingUpIcon,
  Target as TargetIcon,
  BarChart3 as BarChart3Icon,
  Settings as SettingsIcon,
  ChevronRight as ChevronRightIcon,
  Sparkles as SparklesIcon,
  Plus as PlusIcon
} from 'lucide-react'; // Assuming you've moved icons to a separate file
import logoImage from '../../asset/LOGO FLAMINGOES.jpg';
import { useNavigate } from 'react-router-dom';


const logoImageSrc = logoImage;
const Dashboard = () => {
  const navigate = useNavigate();
   const handleCalendarClick = () => {
    navigate('/cal'); // Navigate to the cal.js route
  };
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [todayStats, setTodayStats] = useState({
    totalCheckins: 0,
    totalHours: '0',
    weeklyHours: '0',
    avgDaily: '0',
    isAdmin: false
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [hasCheckinToday, setHasCheckinToday] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [showCheckinForm, setShowCheckinForm] = useState(false);
  const [checkinForm, setCheckinForm] = useState({
    service_worked: '',
    hours_spent: '',
    main_task: '',
    progress_status: 'In Progress',
    tomorrow_priority: '',
    client_interaction: false,
    has_blocker: false,
    blocker_reason: ''
  });
  const [submittingCheckin, setSubmittingCheckin] = useState(false);
  
  // Check mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Add this near the top of your component (before the styles object)
useEffect(() => {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
  
  return () => {
    document.head.removeChild(style);
  };
}, []);

  // Check authentication and get user data
  useEffect(() => {
const getUser = async () => {
  try {
    setLoading(true);
    
    // 1. Get auth user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Auth error:', authError);
      setLoading(false);
      return;
    }
    
    if (!authUser) {
      setLoading(false);
      return;
    }

    // 2. First try to get user profile by ID
    let profile = null;
    const { data: profileById, error: profileByIdError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();
    
    if (!profileByIdError && profileById) {
      profile = profileById;
    } else {
      // 3. If no profile found by ID, check by email
      console.log('No profile found by ID, checking by email...');
      const { data: profileByEmail, error: profileByEmailError } = await supabase
        .from('users')
        .select('*')
        .eq('email', authUser.email)
        .maybeSingle();
      
      if (!profileByEmailError && profileByEmail) {
        console.log('Found existing profile by email:', profileByEmail);
        profile = profileByEmail;
        
        // Update the existing profile with the new auth user ID
        const { error: updateError } = await supabase
          .from('users')
          .update({ id: authUser.id })
          .eq('email', authUser.email);
        
        if (updateError) {
          console.error('Error updating profile with new ID:', updateError);
        } else {
          console.log('Successfully updated profile with new auth ID');
          // Update the profile object with the new ID
          profile = { ...profile, id: authUser.id };
        }
      }
    }
    
    // 4. If still no profile found, create a new one
    if (!profile) {
      console.log('No existing profile found, creating new profile...');
      const defaultName = authUser.email?.split('@')[0] || 'User';
      
      const { data: newProfile, error: insertError } = await supabase
        .from('users')
        .insert([{
          id: authUser.id,
          email: authUser.email,
          name: defaultName,
          role: 'Employee',
          services: [],
          is_active: true,
          email_verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select('*')
        .single();
      
      if (insertError) {
        console.error('Error creating profile:', insertError);
        throw insertError;
      }
      
      profile = newProfile;
      console.log('Created new profile:', profile);
    }
    
    // 5. Set user state with all collected data
    setUser({
      id: profile.id,
      name: profile.name || authUser.email?.split('@')[0] || 'User',
      role: profile.role || 'Employee',
      email: profile.email || authUser.email,
      isAdmin: profile.role === 'Administrator'||profile.role === 'admin',
      services: profile.services || [],
      is_active: profile.is_active,
      email_verified: profile.email_verified,
      created_at: profile.created_at,
      updated_at: profile.updated_at
    });
    
    console.log('User data set successfully:', {
      id: profile.id,
      name: profile.name,
      role: profile.role,
      email: profile.email,
      services: profile.services
    });
    
  } catch (error) {
    console.error('Error getting user:', error);
    alert('Failed to load user data. Please refresh the page.');
  } finally {
    setLoading(false);
  }
};

// Call getUser initially
getUser();

// Set up auth state listener
const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    getUser();
  } else if (event === 'SIGNED_OUT') {
    setUser(null);
  }
});

return () => {
  authListener?.subscription?.unsubscribe();
};

    
  }, []);

  // Fetch dashboard data when user changes
  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user?.id) return;
    
    try {
      setRefreshing(true);
      
      const today = new Date();
      const todayISO = today.toISOString().split('T')[0];
      
      // Get the start of the week (Monday)
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
      const weekStartISO = weekStart.toISOString().split('T')[0];
      
      // Fetch today's checkin
      const { data: todayCheckin, error: todayError } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', todayISO)
        .maybeSingle();
      
      if (todayError) {
        console.error('Today checkin error:', todayError);
        throw todayError;
      }
      
      setHasCheckinToday(!!todayCheckin);
      
      // Fetch this week's checkins
      const { data: weekCheckins = [], error: weekError } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', weekStartISO)
        .order('date', { ascending: false });
      
      if (weekError) {
        console.error('Week checkins error:', weekError);
        throw weekError;
      }
      
      // Calculate stats
      const todayHours = todayCheckin ? parseFloat(todayCheckin.hours_spent) : 0;
      const weeklyHours = weekCheckins.reduce((sum, checkin) => sum + parseFloat(checkin.hours_spent || 0), 0);
      const workingDays = Math.max(1, weekCheckins.length);
      const avgDaily = weeklyHours / workingDays;
      
      setTodayStats({
        totalCheckins: weekCheckins.length,
        totalHours: todayHours.toFixed(1),
        weeklyHours: weeklyHours.toFixed(1),
        avgDaily: avgDaily.toFixed(1),
        isAdmin: user.isAdmin
      });
      
      // Set recent activity (last 7 checkins)
      const { data: recentCheckins = [], error: recentError } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(7);
      
      if (recentError) {
        console.error('Recent checkins error:', recentError);
        throw recentError;
      }
      
      setRecentActivity(recentCheckins);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      alert('Error loading data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCheckinSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    
    setSubmittingCheckin(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const checkinData = {
        user_id: user.id,
        date: today,
        service_worked: checkinForm.service_worked,
        hours_spent: parseFloat(checkinForm.hours_spent),
        main_task: checkinForm.main_task,
        progress_status: checkinForm.progress_status,
        tomorrow_priority: checkinForm.tomorrow_priority,
        client_interaction: checkinForm.client_interaction,
        has_blocker: checkinForm.has_blocker,
        blocker_reason: checkinForm.has_blocker ? checkinForm.blocker_reason : null
      };
      
      const { data, error } = await supabase
        .from('daily_checkins')
        .insert([checkinData])
        .select();
      
      if (error) throw error;
      
      if (!data) {
        throw new Error('No data returned from checkin insertion');
      }
      
      // Reset form and close modal
      setCheckinForm({
        service_worked: '',
        hours_spent: '',
        main_task: '',
        progress_status: 'In Progress',
        tomorrow_priority: '',
        client_interaction: false,
        has_blocker: false,
        blocker_reason: ''
      });
      setShowCheckinForm(false);
      
      // Refresh dashboard data
      await fetchDashboardData();
      
    } catch (error) {
      console.error('Error submitting checkin:', error);
      alert(`Error submitting checkin: ${error.message}`);
    } finally {
      setSubmittingCheckin(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = '/login';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={{...styles.spinner, animation: 'spin 1s linear infinite'}}>
          <RefreshIcon />
        </div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.loadingContainer}>
        <p>Please log in to access your dashboard.</p>
        <button 
          onClick={() => window.location.href = '/login'}
          style={styles.loginButton}
        >
          Go to Login
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
            {isMobile && (
              <button 
                style={styles.mobileMenuButton}
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <MenuIcon />
              </button>
            )}
            
            <div style={styles.logo}>
              <div style={styles.logoIcon}>
                <logoImageSrc />
              </div>
              {!isMobile && (
                <div>
                  <h1 style={styles.logoTitle}>Flamingoes AttendanceHub</h1>
                  <p style={styles.logoSubtitle}>Modern Workspace</p>
                </div>
              )}
            </div>
          </div>
          
          <div style={styles.headerRight}>
            <button 
              style={styles.headerButton}
              onClick={fetchDashboardData}
              disabled={refreshing}
            >
              <RefreshIcon style={refreshing ? styles.spinning : {}} />
            </button>
            
            <button style={styles.headerButton}>
              <BellIcon />
              <div style={styles.notificationDot}></div>
            </button>
            
            <div style={styles.userInfo}>
              <div style={styles.userAvatar}>
                <UserIcon />
              </div>
              {!isMobile && (
                <div>
                  <p style={styles.userName}>{user.name}</p>
                  <p style={styles.userRole}>{user.role}</p>
                </div>
              )}
            </div>
            
            <button 
              style={styles.logoutButton}
              onClick={handleLogout}
            >
              <LogOutIcon />
              {!isMobile && <span>Logout</span>}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Hero Section */}
        <section style={isMobile ? {...styles.heroSection, ...styles.heroSectionMobile} : styles.heroSection}>
          <div style={styles.heroContent}>
            <h2 style={isMobile ? {...styles.heroTitle, ...styles.heroTitleMobile} : styles.heroTitle}>
              {getGreeting()},
              <span style={styles.heroName}>{user.name}!</span>
            </h2>
            <p style={isMobile ? {...styles.heroSubtitle, ...styles.heroSubtitleMobile} : styles.heroSubtitle}>
              Ready to make today productive? Your digital workspace awaits.
            </p>
          </div>
          
          <div style={styles.timeSection}>
            <div style={styles.timeDisplay}>
              <div style={isMobile ? {...styles.currentTime, ...styles.currentTimeMobile} : styles.currentTime}>
                {formatTime(currentTime)}
              </div>
              <div style={styles.currentDate}>
                {isMobile ? currentTime.toLocaleDateString() : formatDate(currentTime)}
              </div>
            </div>
            
            <div style={styles.statusIndicator}>
              <div style={styles.statusDot}></div>
              <span style={styles.statusText}>System Online</span>
            </div>
          </div>
        </section>

        {/* Check-in Section */}
        <section style={styles.checkinSection}>
          <div style={styles.checkinCard}>
            <div style={styles.checkinStatus}>
              {hasCheckinToday ? (
                <>
                  <CheckCircleIcon style={styles.statusIconGreen} />
                  <span style={styles.statusTextGreen}>Checked In Today</span>
                </>
              ) : (
                <>
                  <XCircleIcon style={styles.statusIconRed} />
                  <span style={styles.statusTextRed}>Not Checked In</span>
                </>
              )}
            </div>
            
            {!hasCheckinToday && (
              <button
                onClick={() => setShowCheckinForm(true)}
                style={{...styles.checkinButton, ...styles.checkinButtonGreen}}
              >
                <PlusIcon />
                <span>Submit Daily Check-in</span>
              </button>
            )}
            
            {hasCheckinToday && (
              <div style={styles.checkedInMessage}>
                <p>You've already submitted your check-in for today. Great work!</p>
              </div>
            )}
          </div>
        </section>

        {/* Stats Grid */}
        <section style={styles.statsSection}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Your Performance</h3>
            <p style={styles.sectionSubtitle}>Track your productivity metrics</p>
          </div>
          
          <div style={isMobile ? {...styles.statsGrid, ...styles.statsGridMobile} : styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={{...styles.statIcon, ...styles.blueGradient}}>
                <CalendarIcon />
              </div>
              <div style={styles.statValue}>{todayStats.totalCheckins}</div>
              <div style={styles.statLabel}>This Week</div>
            </div>
            
            <div style={styles.statCard}>
              <div style={{...styles.statIcon, ...styles.purpleGradient}}>
                <ClockIcon />
              </div>
              <div style={styles.statValue}>{todayStats.totalHours}h</div>
              <div style={styles.statLabel}>Hours Today</div>
            </div>
            
            <div style={styles.statCard}>
              <div style={{...styles.statIcon, ...styles.greenGradient}}>
                <TrendingUpIcon />
              </div>
              <div style={styles.statValue}>{todayStats.weeklyHours}h</div>
              <div style={styles.statLabel}>Weekly Total</div>
            </div>
            
            <div style={styles.statCard}>
              <div style={{...styles.statIcon, ...styles.orangeGradient}}>
                <TargetIcon />
              </div>
              <div style={styles.statValue}>{todayStats.avgDaily}h</div>
              <div style={styles.statLabel}>Daily Average</div>
            </div>
          </div>
        </section>

        {/* Recent Activity */}
        <section style={styles.activitySection}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Recent Activity</h3>
            <p style={styles.sectionSubtitle}>Your latest check-ins and sessions</p>
          </div>
          
          <div style={styles.activityCard}>
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} style={styles.activityItem}>
                  <div style={{
                    ...styles.activityIcon,
                    ...(activity.progress_status === 'Completed' ? styles.greenGradient : 
                        activity.progress_status === 'Blocked' ? styles.redGradient : styles.purpleGradient)
                  }}>
                    <CheckCircleIcon />
                  </div>
                  
                  <div style={styles.activityContent}>
                    <div style={styles.activityTitle}>
                      {activity.service_worked} - {activity.hours_spent}h
                    </div>
                    <div style={styles.activityTime}>
                      {new Date(activity.date).toLocaleDateString()} • {activity.progress_status}
                    </div>
                    {!isMobile && activity.main_task && (
                      <div style={styles.activityTask}>
                        {activity.main_task.length > 50 ? `${activity.main_task.substring(0, 50)}...` : activity.main_task}
                      </div>
                    )}
                  </div>
                  
                  <ChevronRightIcon style={styles.activityArrow} />
                </div>
              ))
            ) : (
              <div style={styles.emptyState}>
                <ActivityIcon />
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section style={styles.quickActionsSection}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Quick Actions</h3>
            <p style={styles.sectionSubtitle}>Access your most used features</p>
          </div>
          
          <div style={isMobile ? {...styles.quickActionsGrid, ...styles.quickActionsGridMobile} : styles.quickActionsGrid}>
           
               <div 
      style={{...styles.quickActionCard, cursor: 'pointer'}} 
      onClick={handleCalendarClick}
    >
      <div style={{...styles.quickActionIcon, ...styles.blueGradient}}>
        <CalendarIcon />
      </div>
      <div style={styles.quickActionTitle}>View Calendar</div>
      <div style={styles.quickActionSubtitle}>Check your schedule</div>
    </div>
            
            <div style={styles.quickActionCard} onClick={() => navigate('/reports')}>
              <div style={{...styles.quickActionIcon, ...styles.greenGradient}}>
                
                <BarChart3Icon />
              </div>
              <div style={styles.quickActionTitle}>Reports</div>
              <div style={styles.quickActionSubtitle}>View analytics</div>
            </div>
            
            <div style={styles.quickActionCard}>
              <div style={{...styles.quickActionIcon, ...styles.purpleGradient}}>
                <UsersIcon />
              </div>
              <div style={styles.quickActionTitle}>Team View</div>
              <div style={styles.quickActionSubtitle}>See team status</div>
            </div>
            
            <div style={styles.quickActionCard}>
              <div style={{...styles.quickActionIcon, ...styles.orangeGradient}}>
                <SettingsIcon />
              </div>
              <div style={styles.quickActionTitle}>Settings</div>
              <div style={styles.quickActionSubtitle}>Manage preferences</div>
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
        </section>
      </main>

      {/* Check-in Form Modal */}
      {showCheckinForm && (
        <div style={styles.modalOverlay} onClick={() => setShowCheckinForm(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Daily Check-in</h3>
              <button
                style={styles.modalCloseButton}
                onClick={() => setShowCheckinForm(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleCheckinSubmit} style={styles.checkinFormContainer}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Service/Project Worked On *</label>
                <input
                  type="text"
                  value={checkinForm.service_worked}
                  onChange={(e) => setCheckinForm({...checkinForm, service_worked: e.target.value})}
                  style={styles.formInput}
                  required
                  placeholder="e.g., Website Development, Client Support"
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Hours Spent *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={checkinForm.hours_spent}
                  onChange={(e) => setCheckinForm({...checkinForm, hours_spent: e.target.value})}
                  style={styles.formInput}
                  required
                  placeholder="8.0"
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Main Task/Activity *</label>
                <textarea
                  value={checkinForm.main_task}
                  onChange={(e) => setCheckinForm({...checkinForm, main_task: e.target.value})}
                  style={styles.formTextarea}
                  required
                  placeholder="Describe your main focus for today..."
                  rows="3"
                />
              </div>
              
              <div style={styles.formGroup}>
  <label style={styles.formLabel}>Progress Status</label>
  <select
    value={checkinForm.progress_status}
    onChange={(e) => setCheckinForm({...checkinForm, progress_status: e.target.value})}
    style={styles.formSelect}
  >
    <option value="Not Started" style={styles.formOption}>Not Started</option>
    <option value="In Progress" style={styles.formOption}>In Progress</option>
    <option value="Completed" style={styles.formOption}>Completed</option>
    <option value="Blocked" style={styles.formOption}>Blocked</option>
  </select>
</div>
              
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Tomorrow's Priority</label>
                <textarea
                  value={checkinForm.tomorrow_priority}
                  onChange={(e) => setCheckinForm({...checkinForm, tomorrow_priority: e.target.value})}
                  style={styles.formTextarea}
                  placeholder="What will you focus on tomorrow?"
                  rows="2"
                />
              </div>
              
              <div style={styles.formRow}>
                <div style={styles.formCheckbox}>
                  <input
                    type="checkbox"
                    id="client_interaction"
                    checked={checkinForm.client_interaction}
                    onChange={(e) => setCheckinForm({...checkinForm, client_interaction: e.target.checked})}
                    style={styles.checkbox}
                  />
                  <label htmlFor="client_interaction" style={styles.checkboxLabel}>
                    Had client interaction today
                  </label>
                </div>
                
                <div style={styles.formCheckbox}>
                  <input
                    type="checkbox"
                    id="has_blocker"
                    checked={checkinForm.has_blocker}
                    onChange={(e) => setCheckinForm({...checkinForm, has_blocker: e.target.checked})}
                    style={styles.checkbox}
                  />
                  <label htmlFor="has_blocker" style={styles.checkboxLabel}>
                    Have blockers/issues
                  </label>
                </div>
              </div>
              
              {checkinForm.has_blocker && (
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Blocker Details</label>
                  <textarea
                    value={checkinForm.blocker_reason}
                    onChange={(e) => setCheckinForm({...checkinForm, blocker_reason: e.target.value})}
                    style={styles.formTextarea}
                    placeholder="Describe the blocker or issue..."
                    rows="2"
                  />
                </div>
              )}
              
              <div style={styles.formActions}>
                <button
                  type="button"
                  onClick={() => setShowCheckinForm(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCheckin}
                  style={styles.submitButton}
                >
                  {submittingCheckin ? 'Submitting...' : 'Submit Check-in'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
   
  );
  
};
const keyframes = `
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;
// Styles object (same as before)
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #db2777 100%)',
    color: '#ffffff',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  
  // Header styles
  header: {
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #db2777 100%)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backdropFilter: 'blur(10px)',
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 2rem',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  mobileMenuButton: {
    background: 'transparent',
    border: 'none',
    color: '#ffffff',
    cursor: 'pointer',
    padding: '0.5rem',
    borderRadius: '0.5rem',
  },
  
  // Logo styles
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  logoIcon: {
    background: 'rgba(255, 255, 255, 0.15)',
    padding: '0.75rem',
    borderRadius: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    margin: 0,
    color: '#ffffff',
  },
  logoSubtitle: {
    fontSize: '0.875rem',
    color: 'rgba(255, 255, 255, 0.7)',
    margin: 0,
  },
  
  // Header buttons
  headerButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    color: '#ffffff',
    padding: '0.75rem',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transition: 'all 0.2s ease',
  },
  notificationDot: {
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
    width: '0.5rem',
    height: '0.5rem',
    backgroundColor: '#fbbf24',
    borderRadius: '50%',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  userAvatar: {
    background: 'rgba(255, 255, 255, 0.15)',
    padding: '0.75rem',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: '0.875rem',
    fontWeight: '600',
    margin: 0,
  },
  userRole: {
    fontSize: '0.75rem',
    color: 'rgba(255, 255, 255, 0.7)',
    margin: 0,
  },
  logoutButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#ffffff',
    padding: '0.75rem 1rem',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontWeight: '500',
    transition: 'all 0.2s ease',
  },
  
  // Main content
  main: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  
  // Hero section
  heroSection: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '1.5rem',
    padding: '3rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
  },
  heroSectionMobile: {
    flexDirection: 'column',
    gap: '2rem',
    padding: '2rem',
    textAlign: 'center',
  },
  heroContent: {
    flex: 1,
  },
  heroTitle: {
    fontSize: '3rem',
    fontWeight: '700',
    margin: '0 0 1rem 0',
    lineHeight: '1.2',
  },
  heroTitleMobile: {
    fontSize: '2rem',
  },
  heroName: {
    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    display: 'block',
  },
  heroSubtitle: {
    fontSize: '1.25rem',
    color: 'rgba(255, 255, 255, 0.8)',
    margin: 0,
    lineHeight: '1.5',
  },
  heroSubtitleMobile: {
    fontSize: '1rem',
  },
  
  // Time section
  timeSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '1rem',
  },
  timeDisplay: {
    textAlign: 'right',
  },
  currentTime: {
    fontSize: '3rem',
    fontWeight: '700',
    fontFamily: '"JetBrains Mono", monospace',
    lineHeight: '1',
  },
  currentTimeMobile: {
    fontSize: '2rem',
    textAlign: 'center',
  },
  currentDate: {
    fontSize: '1rem',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: '0.5rem',
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '0.5rem 1rem',
    borderRadius: '2rem',
  },
  statusDot: {
    width: '0.5rem',
    height: '0.5rem',
    backgroundColor: '#10b981',
    borderRadius: '50%',
    animation: 'pulse 2s infinite',
  },
  statusText: {
    fontSize: '0.875rem',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  
  // Check-in section
  checkinSection: {
    display: 'flex',
    justifyContent: 'center',
  },
  checkinCard: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '1rem',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem',
    minWidth: '300px',
    backdropFilter: 'blur(10px)',
  },
  checkinStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  statusIconGreen: {
    color: '#10b981',
  },
  statusIconRed: {
    color: '#ef4444',
  },
  statusTextGreen: {
    color: '#10b981',
    fontSize: '1.125rem',
    fontWeight: '600',
  },
  statusTextRed: {
    color: '#ef4444',
    fontSize: '1.125rem',
    fontWeight: '600',
  },
  checkinButton: {
    background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
    border: 'none',
    color: '#ffffff',
    padding: '1rem 2rem',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.2s ease',
  },
  checkinButtonGreen: {
    background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
  },
  checkedInMessage: {
    textAlign: 'center',
    color: '#10b981',
  },
  
  // Stats section
  statsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  sectionHeader: {
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    margin: '0 0 0.5rem 0',
    color: '#ffffff',
  },
  sectionSubtitle: {
    fontSize: '1rem',
    color: 'rgba(255, 255, 255, 0.7)',
    margin: 0,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '1.5rem',
  },
  statsGridMobile: {
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
  },
  statCard: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '1rem',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(10px)',
  },
  statIcon: {
    padding: '1rem',
    borderRadius: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: '1',
  },
  statLabel: {
    fontSize: '0.875rem',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  
  // Gradient backgrounds for icons
  blueGradient: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
  },
  purpleGradient: {
    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
  },
  greenGradient: {
    background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
  },
  orangeGradient: {
    background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
  },
  redGradient: {
    background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
  },
  
  // Activity section
  activitySection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  activityCard: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '1rem',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    backdropFilter: 'blur(10px)',
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    borderRadius: '0.75rem',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },
  activityIcon: {
    padding: '0.75rem',
    borderRadius: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  activityContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  activityTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#ffffff',
  },
  activityTime: {
    fontSize: '0.875rem',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  activityTask: {
    fontSize: '0.875rem',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: '0.25rem',
  },
  activityArrow: {
    color: 'rgba(255, 255, 255, 0.5)',
    flexShrink: 0,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    padding: '3rem',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  
  // Quick actions section
  quickActionsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  quickActionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '1.5rem',
  },
  quickActionsGridMobile: {
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
  },
  quickActionCard: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '1rem',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(10px)',
  },
  quickActionIcon: {
    padding: '1rem',
    borderRadius: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: '0.875rem',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
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
    padding: '1rem',
  },
  modalContent: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '1rem',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1.5rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    margin: 0,
    color: '#ffffff',
  },
  modalCloseButton: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '1.5rem',
    cursor: 'pointer',
    padding: '0.5rem',
    borderRadius: '0.5rem',
  },
  
  // Form styles
  checkinFormContainer: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  formLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#ffffff',
  },
  formInput: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '0.5rem',
    padding: '0.75rem',
    fontSize: '1rem',
    color: '#ffffff',
  },
  formTextarea: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '0.5rem',
    padding: '0.75rem',
    fontSize: '1rem',
    color: '#ffffff',
    resize: 'vertical',
    minHeight: '80px',
  },
 formSelect: {
  background: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '0.5rem',
  padding: '0.75rem',
  fontSize: '1rem',
  color: '#ffffff',
},
formOption: {
  background: '#333333', // Dark background for options
  color: '#ffffff',      // White text
  padding: '0.5rem',
},
  formRow: {
    display: 'flex',
    gap: '2rem',
  },
  formCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  checkbox: {
    width: '1rem',
    height: '1rem',
    accentColor: '#8b5cf6',
  },
  checkboxLabel: {
    fontSize: '0.875rem',
    color: '#ffffff',
    cursor: 'pointer',
  },
  formActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '1rem',
  },
  cancelButton: {
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#ffffff',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  submitButton: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    border: 'none',
    color: '#ffffff',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
  },
  
  // Loading and utility styles
 loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #db2777 100%)',
    color: '#ffffff',
    gap: '1rem',
  },
  spinner: {
    animation: 'spin 1s linear infinite',
    width: '24px',
    height: '24px',
  },
  
  spinning: {
    animation: 'spin 1s linear infinite',
  },
  loginButton: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    border: 'none',
    color: '#ffffff',
    padding: '1rem 2rem',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
  },
     footer: {
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
    },
  
};

export default Dashboard;