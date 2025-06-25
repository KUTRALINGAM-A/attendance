import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Lock } from 'lucide-react';
import { supabase } from '../../config/supabase';

// Add this import at the top of your file
import logoImage from '../../asset/LOGO FLAMINGOES.jpg';

const FlamingoLogin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  
  // For React projects, uncomment this line and import the image at the top:
  const logoImageSrc = logoImage;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

 // Updated authenticateUser function with proper error handling and debugging

const authenticateUser = async (username, password) => {
  console.log('🔍 Starting authentication process...');
  console.log('Username/Email entered:', username);
  
  try {
    // Method 1: Direct Supabase Auth (if users are registered through Supabase Auth)
    console.log('🔑 Attempting Supabase Auth sign-in...');
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: username, // Assuming username is actually an email
      password: password
    });

    if (!authError && authData.user) {
      console.log('✅ Supabase Auth successful');
      console.log('Auth user:', authData.user);
      
      // Try to get additional user info from your custom users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', authData.user.email)
        .single();

      if (userError) {
        console.warn('⚠️ Could not fetch user data from users table:', userError.message);
        // Use auth data as fallback
        return { 
          success: true, 
          user: {
            id: authData.user.id,
            email: authData.user.email,
            username: authData.user.email,
            role: 'user'
          }, 
          authUser: authData.user 
        };
      }

      return { success: true, user: userData, authUser: authData.user };
    }

    // Method 2: If direct auth fails, try custom table lookup
    console.log('🔍 Direct auth failed, trying custom table lookup...');
    console.log('Auth error was:', authError?.message);

    // Look up user in custom table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .or(`username.eq.${username},email.eq.${username}`)
      .single();

    if (userError) {
      console.log('❌ User lookup error:', userError);
      if (userError.code === 'PGRST116') {
        return { success: false, message: 'User not found. Please check your username/email.' };
      }
      return { success: false, message: 'Database error occurred. Please try again.' };
    }

    console.log('👤 User found in custom table:', userData);

    // Method 3: If you have a password verification function
    if (userData.password_hash) {
      console.log('🔐 Attempting password verification...');
      
      // Check if you have a password verification RPC function
      const { data: passwordCheck, error: passwordError } = await supabase
        .rpc('verify_password', { 
          user_id: userData.id, 
          password_input: password 
        });

      if (passwordError) {
        console.log('❌ Password verification RPC error:', passwordError.message);
        // If RPC doesn't exist, this is expected
        if (passwordError.message.includes('function verify_password')) {
          return { 
            success: false, 
            message: 'Password verification not configured. Please contact administrator.' 
          };
        }
        return { success: false, message: 'Authentication service error.' };
      }

      if (!passwordCheck) {
        return { success: false, message: 'Invalid password.' };
      }

      console.log('✅ Password verified successfully');
      return { success: true, user: userData };
    }

    // Method 4: Plain text password comparison (NOT RECOMMENDED for production)
    if (userData.password && userData.password === password) {
      console.log('⚠️ Plain text password match (insecure)');
      return { success: true, user: userData };
    }

    return { success: false, message: 'Invalid credentials.' };

  } catch (error) {
    console.error('💥 Authentication error:', error);
    return { 
      success: false, 
      message: `Authentication failed: ${error.message}` 
    };
  }
};

// Alternative simplified version if you're only using Supabase Auth
const authenticateUserSimple = async (username, password) => {
  console.log('🔍 Simple authentication attempt...');
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: username, // Make sure this is an email
      password: password
    });

    if (error) {
      console.log('❌ Auth error:', error.message);
      
      // Provide more specific error messages
      switch (error.message) {
        case 'Invalid login credentials':
          return { success: false, message: 'Invalid email or password.' };
        case 'Email not confirmed':
          return { success: false, message: 'Please verify your email before signing in.' };
        case 'Too many requests':
          return { success: false, message: 'Too many login attempts. Please try again later.' };
        default:
          return { success: false, message: error.message };
      }
    }

    if (data.user) {
      console.log('✅ Authentication successful');
      return { 
        success: true, 
        user: {
          id: data.user.id,
          email: data.user.email,
          username: data.user.email,
          // Add other fields as needed
        },
        authUser: data.user 
      };
    }

    return { success: false, message: 'Authentication failed.' };

  } catch (error) {
    console.error('💥 Authentication error:', error);
    return { success: false, message: 'Network error. Please try again.' };
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🚀 Login attempt started');
    console.log('Form data:', formData);
    
    // Basic validation
    if (!formData.username.trim() || !formData.password.trim()) {
      setError('Please fill in all fields');
      console.log('❌ Validation failed: Empty fields');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const result = await authenticateUser(formData.username, formData.password);
      
      if (result.success) {
        console.log('🎉 Login successful!');
        console.log('User details:', result.user);
        console.log('Auth user:', result.authUser);
        console.log('Redirecting to dashboard...');
        
        // Store user info in localStorage
        const userSession = {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          role: result.user.role || 'user',
          loginTime: new Date().toISOString(),
          ...(result.authUser && { authUserId: result.authUser.id })
        };
        
        localStorage.setItem('userSession', JSON.stringify(userSession));
        console.log('💾 User session stored in localStorage');
        
        // Update last login time in database
        const { error: updateError } = await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', result.user.id);
        
        if (updateError) {
          console.warn('⚠️ Failed to update last login time:', updateError);
        } else {
          console.log('✅ Last login time updated');
        }
        
        // Navigate to dashboard after successful login
        navigate('/Dashboard');
        
      } else {
        console.log('❌ Login failed:', result.message);
        setError(result.message);
      }
      
    } catch (error) {
      console.error('💥 Login error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
      console.log('🏁 Login attempt completed');
    }
  };

  const handleRegisterNavigation = () => {
    console.log('🔗 Navigating to register page');
    navigate('/register');
  };

  const FloatingElement = ({ delay, top, left, size = '8px' }) => (
    <div 
      style={{
        position: 'absolute',
        top: top,
        left: left,
        width: size,
        height: size,
        opacity: 0.2,
        pointerEvents: 'none',
        animation: `pulse 4s infinite ${delay}`
      }}
    >
      <div style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'white',
        borderRadius: '50%',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}></div>
    </div>
  );

  const FlamingoIcon = () => (
    <svg viewBox="0 0 100 100" style={{ width: '56px', height: '56px' }}>
      <defs>
        <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.8)" />
        </linearGradient>
        
        <linearGradient id="beakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff69b4" />
          <stop offset="100%" stopColor="#ff1493" />
        </linearGradient>
      </defs>
      
      <path
        d="M 55 45 Q 65 35 68 50 Q 70 65 60 75 Q 50 80 45 70 Q 42 55 55 45 Z"
        fill="url(#bodyGradient)"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="0.5"
      />
      
      <path
        d="M 45 55 Q 35 45 28 35 Q 22 25 18 18 Q 16 12 20 8"
        stroke="white"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />
      
      <path
        d="M 44 54 Q 34 44 27 34 Q 21 24 17 17"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      
      <ellipse cx="20" cy="8" rx="5" ry="4" fill="white" transform="rotate(-15 20 8)" />
      
      <path
        d="M 15 9 Q 8 12 4 15 Q 2 16 3 17 Q 8 15 15 11 Z"
        fill="url(#beakGradient)"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="0.3"
      />
      
      <path
        d="M 14 10 Q 9 12 6 14"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
      
      <ellipse cx="58" cy="55" rx="6" ry="12" fill="rgba(255,255,255,0.4)" transform="rotate(25 58 55)" />
      <ellipse cx="60" cy="58" rx="4" ry="8" fill="rgba(255,255,255,0.6)" transform="rotate(30 60 58)" />
      
      <line x1="48" y1="75" x2="45" y2="92" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="55" y1="77" x2="58" y2="94" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      
      <line x1="47.5" y1="75" x2="44.5" y2="92" stroke="rgba(255,255,255,0.6)" strokeWidth="1" strokeLinecap="round" />
      <line x1="54.5" y1="77" x2="57.5" y2="94" stroke="rgba(255,255,255,0.6)" strokeWidth="1" strokeLinecap="round" />
      
      <ellipse cx="44" cy="93" rx="2" ry="1.5" fill="white" />
      <ellipse cx="59" cy="95" rx="2" ry="1.5" fill="white" />
      
      <circle cx="22" cy="6" r="1.5" fill="rgba(255,105,180,0.8)" />
      <circle cx="22.5" cy="5.5" r="0.5" fill="white" opacity="0.9" />
      
      <path d="M 52 50 Q 58 52 62 58" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" fill="none" />
      <path d="M 50 60 Q 56 62 60 68" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" fill="none" />
    </svg>
  );

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #db2777 100%)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    },
    mainContent: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px'
    },
    cardWrapper: {
      width: '100%',
      maxWidth: '448px'
    },
    loginCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(12px)',
      borderRadius: '16px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      padding: '32px',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    },
    logoSection: {
      textAlign: 'center',
      marginBottom: '32px'
    },
    logoContainer: {
      width: '96px',
      height: '96px',
      margin: '0 auto 16px',
      background: 'linear-gradient(135deg, #f472b6, #ec4899)',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      position: 'relative',
      overflow: 'hidden'
    },
    logoBackground: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, rgba(244, 114, 182, 0.3), transparent)'
    },
    logoContent: {
      position: 'relative',
      zIndex: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%'
    },
    logoImage: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      objectPosition: 'center',
      borderRadius: '50%'
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#1f2937',
      marginBottom: '8px',
      margin: 0
    },
    subtitle: {
      color: '#6b7280',
      fontSize: '14px',
      margin: 0
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    },
    fieldGroup: {
      position: 'relative'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151',
      marginBottom: '8px'
    },
    inputContainer: {
      position: 'relative'
    },
    inputIcon: {
      position: 'absolute',
      left: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#9ca3af',
      width: '20px',
      height: '20px'
    },
    input: {
      width: '100%',
      paddingLeft: '48px',
      paddingRight: '16px',
      paddingTop: '12px',
      paddingBottom: '12px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '16px',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      transition: 'all 0.2s',
      boxSizing: 'border-box'
    },
    passwordInput: {
      paddingRight: '48px'
    },
    passwordToggle: {
      position: 'absolute',
      right: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      color: '#9ca3af',
      cursor: 'pointer',
      padding: '4px',
      transition: 'color 0.2s'
    },
    errorMessage: {
      color: '#dc2626',
      fontSize: '14px',
      marginTop: '8px',
      padding: '8px 12px',
      backgroundColor: 'rgba(220, 38, 38, 0.1)',
      borderRadius: '6px',
      border: '1px solid rgba(220, 38, 38, 0.2)'
    },
    rememberForgot: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: '14px'
    },
    checkboxContainer: {
      display: 'flex',
      alignItems: 'center'
    },
    checkbox: {
      marginRight: '8px',
      accentColor: '#ec4899'
    },
    checkboxLabel: {
      color: '#6b7280'
    },
    forgotLink: {
      color: '#ec4899',
      textDecoration: 'none',
      fontWeight: '500'
    },
    loginButton: {
      width: '100%',
      background: isLoading 
        ? 'linear-gradient(90deg, #9ca3af, #6b7280)' 
        : 'linear-gradient(90deg, #ec4899, #db2777)',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '8px',
      fontWeight: '500',
      border: 'none',
      cursor: isLoading ? 'not-allowed' : 'pointer',
      fontSize: '16px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.2s',
      transform: 'translateY(0)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    additionalOptions: {
      marginTop: '24px',
      textAlign: 'center'
    },
    signupText: {
      color: '#6b7280',
      fontSize: '14px',
      margin: 0
    },
    signupLink: {
      color: '#ec4899',
      textDecoration: 'none',
      fontWeight: '500'
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
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 0.2; }
            50% { opacity: 0.8; }
          }
          
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          
          .input-focus:focus {
            outline: none !important;
            border-color: transparent !important;
            box-shadow: 0 0 0 2px #ec4899 !important;
          }
          
          .button-hover:hover:not(:disabled) {
            background: linear-gradient(90deg, #db2777, #be185d) !important;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1) !important;
            transform: translateY(-2px) !important;
          }
          
          .password-toggle:hover {
            color: #6b7280 !important;
          }
          
          .forgot-link:hover {
            color: #db2777 !important;
          }
          
          .signup-link:hover {
            color: #db2777 !important;
          }
          
          .loading-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid transparent;
            border-top: 2px solid currentColor;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
        `}
      </style>
      
      <div style={styles.container}>
        
        {/* Floating Elements - Desktop Only */}
        {!isMobile && (
          <>
            <FloatingElement delay="0s" top="10%" left="10%" size="6px" />
            <FloatingElement delay="2s" top="20%" left="85%" size="8px" />
            <FloatingElement delay="4s" top="70%" left="15%" size="5px" />
            <FloatingElement delay="1s" top="80%" left="80%" size="7px" />
            <FloatingElement delay="3s" top="40%" left="90%" size="4px" />
            <FloatingElement delay="5s" top="60%" left="5%" size="9px" />
            <FloatingElement delay="1.5s" top="30%" left="20%" size="6px" />
            <FloatingElement delay="3.5s" top="50%" left="75%" size="5px" />
          </>
        )}

        {/* Main Content */}
        <div style={styles.mainContent}>
          <div style={styles.cardWrapper}>
            
            {/* Login Card */}
            <div style={styles.loginCard}>
              
              {/* Logo Section */}
              <div style={styles.logoSection}>
                <div style={styles.logoContainer}>
                  <div style={styles.logoBackground}></div>
                  <div style={styles.logoContent}>
                    {logoImageSrc ? (
                      <img 
                        src={logoImageSrc} 
                        alt="Flamingo Logo" 
                        style={styles.logoImage}
                      />
                    ) : (
                      <FlamingoIcon />
                    )}
                  </div>
                </div>
                <h1 style={styles.title}>Flamingoes</h1>
                <p style={styles.subtitle}>Attendance Management System</p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} style={styles.form}>
                
                {/* Username Field */}
                <div style={styles.fieldGroup}>
                  <label htmlFor="username" style={styles.label}>
                    Username or Email
                  </label>
                  <div style={styles.inputContainer}>
                    <User style={styles.inputIcon} />
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      value={formData.username}
                      onChange={handleInputChange}
                      style={styles.input}
                      className="input-focus"
                      placeholder="Enter your username or email"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div style={styles.fieldGroup}>
                  <label htmlFor="password" style={styles.label}>
                    Password
                  </label>
                  <div style={styles.inputContainer}>
                    <Lock style={styles.inputIcon} />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      style={{...styles.input, ...styles.passwordInput}}
                      className="input-focus"
                      placeholder="Enter your password"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={styles.passwordToggle}
                      className="password-toggle"
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div style={styles.errorMessage}>
                    {error}
                  </div>
                )}

                {/* Remember Me & Forgot Password */}
                <div style={styles.rememberForgot}>
                  <label style={styles.checkboxContainer}>
                    <input
                      type="checkbox"
                      style={styles.checkbox}
                      disabled={isLoading}
                    />
                    <span style={styles.checkboxLabel}>Remember me</span>
                  </label>
                  <Link to="/Password" style={styles.forgotLink} className="forgot-link">
                    Forgot password?
                  </Link>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  style={styles.loginButton}
                  className="button-hover"
                >
                  {isLoading ? (
                    <>
                      <div className="loading-spinner"></div>
                      Signing In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              {/* Additional Options */}
              <div style={styles.additionalOptions}>
                <p style={styles.signupText}>
                  Don't have account? {' '}
                  <button
                    type="button"
                    onClick={handleRegisterNavigation}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: '#ec4899',
                      textDecoration: 'none',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                    className="signup-link"
                  >
                    Create account
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer style={styles.footer}>
          <p style={styles.footerText}>
            A product of <span style={styles.footerCompany}>Flamingoes Private Limited</span>
          </p>
          <p style={styles.footerCopyright}>
            © 2025 All rights reserved
          </p>
        </footer>
      </div>
    </>
  );
};

export default FlamingoLogin;