import React, { useState, useEffect } from 'react';
import { Mail, Lock, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../config/supabase';

// Add this import at the top of your file
import logoImage from '../../asset/LOGO FLAMINGOES.jpg';

const ForgotPassword = () => {
  // Check URL parameters for password reset
  const urlParams = new URLSearchParams(window.location.search);
  const isRecovery = urlParams.get('type') === 'recovery';
  const accessToken = urlParams.get('access_token');
  const refreshToken = urlParams.get('refresh_token');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState(isRecovery ? 'verifying' : 'request');
  const [isMobile, setIsMobile] = useState(false);

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

  // Handle password reset verification
  useEffect(() => {
    const verifyResetLink = async () => {
      if (step !== 'verifying') return;

      setIsLoading(true);
      setError('');
      
      try {
        // First try to set session with provided tokens
        if (accessToken && refreshToken) {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (sessionError) throw sessionError;
          if (data.session) {
            setStep('reset');
            setSuccess('Reset link verified! Set your new password.');
            return;
          }
        }

        // If no tokens, check if we already have a session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setStep('reset');
          setSuccess('Reset link verified! Set your new password.');
          return;
        }

        // If neither worked, show error
        throw new Error('Invalid or expired reset link');
      } catch (error) {
        console.error('Verification error:', error);
        setError('Invalid or expired reset link. Please request a new one.');
        setStep('request');
      } finally {
        setIsLoading(false);
      }
    };

    verifyResetLink();
  }, [step, accessToken, refreshToken]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY' && session && step !== 'reset') {
          setStep('reset');
          setSuccess('Reset link verified! Set your new password.');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [step]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const validatePassword = (password) => {
    if (password.length < 6) return 'Password must be at least 6 characters';
    if (!/[a-z]/.test(password)) return 'Password needs a lowercase letter';
    if (!/[A-Z]/.test(password)) return 'Password needs an uppercase letter';
    if (!/\d/.test(password)) return 'Password needs a number';
    return null;
  };

  const handleForgotPasswordRequest = async (e) => {
    e.preventDefault();
    
    if (!formData.email.trim()) {
      setError('Please enter your email');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        formData.email.trim(),
        {
          redirectTo: `${window.location.origin}/Password?type=recovery`
        }
      );

      if (error) throw error;
      
      setSuccess('Reset email sent! Check your inbox.');
      setStep('sent');
    } catch (error) {
      console.error('Reset request error:', error);
      setError(error.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.password
      });

      if (error) throw error;
      
      setSuccess('Password updated successfully! Redirecting...');
      setStep('complete');
      setTimeout(() => window.location.href = '/login', 3000);
    } catch (error) {
      console.error('Password update error:', error);
      setError(error.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    window.location.href = '/login';
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

  const getStepTitle = () => {
    switch (step) {
      case 'verifying': return 'Verifying Link';
      case 'request': return 'Reset Password';
      case 'sent': return 'Check Your Email';
      case 'reset': return 'Set New Password';
      case 'complete': return 'Password Updated';
      default: return 'Reset Password';
    }
  };

  const getStepSubtitle = () => {
    switch (step) {
      case 'verifying': return 'Please wait while we verify your reset link';
      case 'request': return 'Enter your email to receive a password reset link';
      case 'sent': return 'We\'ve sent you a password reset link';
      case 'reset': return 'Create a strong new password for your account';
      case 'complete': return 'Your password has been successfully updated';
      default: return 'Enter your email to receive a password reset link';
    }
  };

  // Render different steps
  const renderStep = () => {
    switch (step) {
      case 'verifying':
        return (
          <div style={styles.centerContent}>
            <div style={styles.loadingContainer}>
              <div className="loading-spinner" style={styles.loadingSpinner}></div>
              <p style={styles.loadingText}>Verifying reset link...</p>
            </div>
          </div>
        );

      case 'request':
        return (
          <form onSubmit={handleForgotPasswordRequest} style={styles.form}>
            <div style={styles.fieldGroup}>
              <label htmlFor="email" style={styles.label}>Email Address</label>
              <div style={styles.inputContainer}>
                <Mail style={styles.inputIcon} />
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email address"
                  required
                  disabled={isLoading}
                  style={styles.input}
                  className="input-focus"
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={isLoading}
              style={isLoading ? {...styles.button, ...styles.buttonDisabled} : styles.button}
              className={!isLoading ? "button-hover" : ""}
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner" style={styles.buttonSpinner}></div>
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>
        );

      case 'sent':
        return (
          <div style={styles.centerContent}>
            <div style={styles.successContainer}>
              <CheckCircle style={styles.successIcon} />
              <p style={styles.successText}>Check your email for the reset link</p>
              <p style={styles.subText}>
                Didn't receive the email? Check your spam folder or click below to resend.
              </p>
              <button 
                onClick={() => setStep('request')}
                style={styles.secondaryButton}
                className="secondary-button-hover"
              >
                Resend Email
              </button>
            </div>
          </div>
        );

      case 'reset':
        return (
          <form onSubmit={handlePasswordReset} style={styles.form}>
            <div style={styles.fieldGroup}>
              <label htmlFor="password" style={styles.label}>New Password</label>
              <div style={styles.inputContainer}>
                <Lock style={styles.inputIcon} />
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter new password"
                  required
                  disabled={isLoading}
                  style={styles.input}
                  className="input-focus"
                />
              </div>
            </div>
            <div style={styles.fieldGroup}>
              <label htmlFor="confirmPassword" style={styles.label}>Confirm Password</label>
              <div style={styles.inputContainer}>
                <Lock style={styles.inputIcon} />
                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm new password"
                  required
                  disabled={isLoading}
                  style={styles.input}
                  className="input-focus"
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={isLoading}
              style={isLoading ? {...styles.button, ...styles.buttonDisabled} : styles.button}
              className={!isLoading ? "button-hover" : ""}
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner" style={styles.buttonSpinner}></div>
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </button>
          </form>
        );

      case 'complete':
        return (
          <div style={styles.centerContent}>
            <div style={styles.successContainer}>
              <CheckCircle style={styles.successIcon} />
              <p style={styles.successText}>Password updated successfully!</p>
              <p style={styles.subText}>
                You will be redirected to the login page in a few seconds.
              </p>
              <button 
                onClick={handleBackToLogin}
                style={styles.button}
                className="button-hover"
              >
                Go to Login
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

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
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(12px)',
      borderRadius: '16px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      padding: '32px',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    },
    backButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: 'none',
      border: 'none',
      color: '#6b7280',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      marginBottom: '24px',
      padding: '8px 0',
      transition: 'color 0.2s'
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
      margin: '0 0 8px 0'
    },
    subtitle: {
      color: '#6b7280',
      fontSize: '14px',
      margin: 0,
      lineHeight: '1.5'
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
    button: {
      width: '100%',
      background: 'linear-gradient(90deg, #ec4899, #db2777)',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '8px',
      fontWeight: '500',
      border: 'none',
      cursor: 'pointer',
      fontSize: '16px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.2s',
      transform: 'translateY(0)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    buttonDisabled: {
      background: 'linear-gradient(90deg, #9ca3af, #6b7280)',
      cursor: 'not-allowed'
    },
    secondaryButton: {
      width: '100%',
      background: 'transparent',
      color: '#ec4899',
      padding: '12px 16px',
      borderRadius: '8px',
      fontWeight: '500',
      border: '2px solid #ec4899',
      cursor: 'pointer',
      fontSize: '16px',
      transition: 'all 0.2s',
      marginTop: '16px'
    },
    centerContent: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center'
    },
    loadingContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px'
    },
    loadingSpinner: {
      width: '32px',
      height: '32px',
      border: '3px solid #e5e7eb',
      borderTop: '3px solid #ec4899',
      borderRadius: '50%'
    },
    loadingText: {
      color: '#6b7280',
      fontSize: '16px',
      margin: 0
    },
    buttonSpinner: {
      width: '20px',
      height: '20px',
      border: '2px solid transparent',
      borderTop: '2px solid currentColor',
      borderRadius: '50%'
    },
    successContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px'
    },
    successIcon: {
      width: '64px',
      height: '64px',
      color: '#10b981'
    },
    successText: {
      fontSize: '18px',
      fontWeight: '500',
      color: '#1f2937',
      margin: 0
    },
    subText: {
      color: '#6b7280',
      fontSize: '14px',
      margin: 0,
      lineHeight: '1.5'
    },
    errorMessage: {
      color: '#dc2626',
      backgroundColor: 'rgba(220, 38, 38, 0.1)',
      border: '1px solid rgba(220, 38, 38, 0.2)',
      borderRadius: '8px',
      padding: '12px',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    successMessage: {
      color: '#059669',
      backgroundColor: 'rgba(5, 150, 105, 0.1)',
      border: '1px solid rgba(5, 150, 105, 0.2)',
      borderRadius: '8px',
      padding: '12px',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    loginLink: {
      textAlign: 'center',
      marginTop: '24px'
    },
    loginLinkText: {
      color: '#6b7280',
      fontSize: '14px',
      margin: 0
    },
    loginLinkButton: {
      background: 'none',
      border: 'none',
      color: '#ec4899',
      fontWeight: '500',
      cursor: 'pointer',
      fontSize: '14px',
      textDecoration: 'none'
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
          
          .secondary-button-hover:hover {
            background: #ec4899 !important;
            color: white !important;
          }
          
          .back-button:hover {
            color: #374151 !important;
          }
          
          .login-link-button:hover {
            color: #db2777 !important;
          }
          
          .loading-spinner {
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
            
            {/* Card */}
            <div style={styles.card}>
              
              {/* Back Button */}
              {step !== 'request' && step !== 'verifying' && (
                <button 
                  onClick={handleBackToLogin} 
                  style={styles.backButton}
                  className="back-button"
                >
                  <ArrowLeft size={16} /> Back to Login
                </button>
              )}

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
                <h1 style={styles.title}>{getStepTitle()}</h1>
                <p style={styles.subtitle}>{getStepSubtitle()}</p>
              </div>

              {/* Error Message */}
              {error && (
                <div style={styles.errorMessage}>
                  <AlertCircle size={20} /> {error}
                </div>
              )}

              {/* Success Message */}
              {success && step !== 'sent' && step !== 'complete' && (
                <div style={styles.successMessage}>
                  <CheckCircle size={20} /> {success}
                </div>
              )}

              {/* Render Step Content */}
              {renderStep()}

              {/* Login Link */}
              {step === 'request' && (
                <div style={styles.loginLink}>
                  <p style={styles.loginLinkText}>
                    Remember your password? {' '}
                    <button 
                      
                      onClick={handleBackToLogin}
                      style={styles.loginLinkButton}
                      className="login-link-button"
                    >
                      Sign In
                    </button>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer style={styles.footer}>
          <p style={styles.footerText}>
            <span style={styles.footerCompany}>Flamingo</span> - Secure Authentication
          </p>
          <p style={styles.footerCopyright}>
            © 2024 All rights reserved
          </p>
        </footer>
      </div>
    </>
  );
};

export default ForgotPassword;