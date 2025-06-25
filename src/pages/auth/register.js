import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, User, Lock, Mail, UserCheck, Briefcase } from 'lucide-react';
import { supabase } from '../../config/supabase'; // Import your supabase client
import logoImage from '../../asset/LOGO FLAMINGOES.jpg';
 const logoImageSrc = logoImage;
 
const FlamingoRegister = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    services: []
  });
  const [errors, setErrors] = useState({});
  const [isMobile, setIsMobile] = useState(false);

  // Available roles and services
  const roles = [
    { value: 'admin', label: 'Administrator' },
    { value: 'manager', label: 'Team Lead' },
    { value: 'employee', label: 'Employee' },
    { value: 'volunteer', label: 'Volunteer' }
  ];

  const availableServices = [
    'Software Development',
    'Web Development',
    'PCB Designing',
    'Logo Designing',
    'Animations ',
    'Workshops',
    '3D Designing',
    'CFD Analysis',
    'Marketing',
    'Managing'
  ];

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
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleServiceChange = (service) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Role validation
    if (!formData.role) {
      newErrors.role = 'Please select a role';
    }

    // Services validation (at least one service required)
    if (formData.services.length === 0) {
      newErrors.services = 'Please select at least one service';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // FIXED: Updated handleSubmit function
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      // Step 1: Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        options: {
          data: {
            name: formData.name.trim(),
            role: formData.role,
            services: formData.services
          }
        }
      });

      if (authError) {
        throw new Error(authError.message);
      }

      console.log('Auth Data:', authData); // Debug log

      // Step 2: If auth signup successful and user exists, create user profile
      if (authData.user && authData.user.id) {
        console.log('Creating profile for user ID:', authData.user.id); // Debug log
        
        // FIXED: Remove password_hash from profile data - it's handled by auth system
        const profileData = {
          id: authData.user.id, // Use the auth user ID explicitly
          email: formData.email.toLowerCase().trim(),
          name: formData.name.trim(),
          role: formData.role,
          services: formData.services,
          is_active: true,
          created_at: new Date().toISOString() // Add timestamp if your table expects it
        };

        console.log('Profile data to insert:', profileData); // Debug log

        const { data: profileResult, error: profileError } = await supabase
          .from('users')
          .insert([profileData])
          .select(); // Add select to return the inserted data

        if (profileError) {
          console.error('Profile creation error:', profileError);
          
          // If it's a duplicate key error, the user might already exist
          if (profileError.code === '23505') {
            // Try to update the existing profile instead
            const { data: updateResult, error: updateError } = await supabase
              .from('users')
              .update({
                name: formData.name.trim(),
                role: formData.role,
                services: formData.services,
                is_active: true
              })
              .eq('id', authData.user.id)
              .select();

            if (updateError) {
              throw new Error(`Failed to update user profile: ${updateError.message}`);
            }
            
            console.log('Profile updated successfully:', updateResult);
          } else {
            throw new Error(`Failed to create user profile: ${profileError.message}`);
          }
        } else {
          console.log('Profile created successfully:', profileResult); // Debug log
        }
      } else {
        throw new Error('User creation failed - no user ID returned');
      }

      alert(`Registration successful! Please check your email (${formData.email}) to verify your account before signing in.`);
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: '',
        services: []
      });

      // Redirect to login page after successful registration
      // window.location.href = '/login';
        
    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle specific Supabase errors
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        errorMessage = 'This email is already registered. Please try signing in instead.';
      } else if (error.message.includes('Password')) {
        errorMessage = 'Password must be at least 6 characters long.';
      } else if (error.message.includes('email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message.includes('duplicate key value')) {
        errorMessage = 'This email is already registered. Please try signing in instead.';
      } else if (error.message.includes('password_hash')) {
        errorMessage = 'There was an issue with the database configuration. Please contact support.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(`Registration failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
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
      maxWidth: '500px'
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
      gap: '20px'
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
    select: {
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
      boxSizing: 'border-box',
      appearance: 'none',
      backgroundImage: 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDEuNUw2IDYuNUwxMSAxLjUiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K")',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 12px center'
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
    servicesContainer: {
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      padding: '12px',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      maxHeight: '200px',
      overflowY: 'auto'
    },
    servicesGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '8px'
    },
    serviceItem: {
      display: 'flex',
      alignItems: 'center',
      padding: '4px 0'
    },
    checkbox: {
      marginRight: '8px',
      accentColor: '#ec4899'
    },
    checkboxLabel: {
      color: '#374151',
      fontSize: '14px',
      cursor: 'pointer'
    },
    error: {
      color: '#ef4444',
      fontSize: '12px',
      marginTop: '4px'
    },
    registerButton: {
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
      opacity: isLoading ? 0.7 : 1
    },
    additionalOptions: {
      marginTop: '24px',
      textAlign: 'center'
    },
    loginText: {
      color: '#6b7280',
      fontSize: '14px',
      margin: 0
    },
    loginLink: {
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
          
          .input-focus:focus {
            outline: none !important;
            border-color: transparent !important;
            box-shadow: 0 0 0 2px #ec4899 !important;
          }
          
          .input-error {
            border-color: #ef4444 !important;
          }
          
          .button-hover:hover:not(:disabled) {
            background: linear-gradient(90deg, #db2777, #be185d) !important;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1) !important;
            transform: translateY(-2px) !important;
          }
          
          .password-toggle:hover {
            color: #6b7280 !important;
          }
          
          .login-link:hover {
            color: #db2777 !important;
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
            
            {/* Registration Card */}
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
              

              {/* Registration Form */}
              <div style={styles.form}>
                
                {/* Name Field */}
                <div style={styles.fieldGroup}>
                  <label htmlFor="name" style={styles.label}>
                    Full Name
                  </label>
                  <div style={styles.inputContainer}>
                    <User style={styles.inputIcon} />
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      style={styles.input}
                      className={`input-focus ${errors.name ? 'input-error' : ''}`}
                      placeholder="Enter your full name"
                    />
                  </div>
                  {errors.name && <div style={styles.error}>{errors.name}</div>}
                </div>

                {/* Email Field */}
                <div style={styles.fieldGroup}>
                  <label htmlFor="email" style={styles.label}>
                    Email Address
                  </label>
                  <div style={styles.inputContainer}>
                    <Mail style={styles.inputIcon} />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      style={styles.input}
                      className={`input-focus ${errors.email ? 'input-error' : ''}`}
                      placeholder="Enter your email address"
                    />
                  </div>
                  {errors.email && <div style={styles.error}>{errors.email}</div>}
                </div>

                {/* Role Field */}
                <div style={styles.fieldGroup}>
                  <label htmlFor="role" style={styles.label}>
                    Role
                  </label>
                  <div style={styles.inputContainer}>
                    <UserCheck style={styles.inputIcon} />
                    <select
                      id="role"
                      name="role"
                      required
                      value={formData.role}
                      onChange={handleInputChange}
                      style={styles.select}
                      className={`input-focus ${errors.role ? 'input-error' : ''}`}
                    >
                      <option value="">Select your role</option>
                      {roles.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.role && <div style={styles.error}>{errors.role}</div>}
                </div>

                {/* Services Field */}
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>
                    <Briefcase style={{ width: '16px', height: '16px', display: 'inline', marginRight: '8px' }} />
                    Services (Select all that apply)
                  </label>
                  <div style={styles.servicesContainer} className={errors.services ? 'input-error' : ''}>
                    <div style={styles.servicesGrid}>
                      {availableServices.map(service => (
                        <div key={service} style={styles.serviceItem}>
                          <input
                            type="checkbox"
                            id={`service-${service}`}
                            checked={formData.services.includes(service)}
                            onChange={() => handleServiceChange(service)}
                            style={styles.checkbox}
                          />
                          <label 
                            htmlFor={`service-${service}`} 
                            style={styles.checkboxLabel}
                          >
                            {service}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  {errors.services && <div style={styles.error}>{errors.services}</div>}
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
                      className={`input-focus ${errors.password ? 'input-error' : ''}`}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={styles.passwordToggle}
                      className="password-toggle"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {errors.password && <div style={styles.error}>{errors.password}</div>}
                </div>

                {/* Confirm Password Field */}
                <div style={styles.fieldGroup}>
                  <label htmlFor="confirmPassword" style={styles.label}>
                    Confirm Password
                  </label>
                  <div style={styles.inputContainer}>
                    <Lock style={styles.inputIcon} />
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      style={{...styles.input, ...styles.passwordInput}}
                      className={`input-focus ${errors.confirmPassword ? 'input-error' : ''}`}
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.passwordToggle}
                      className="password-toggle"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {errors.confirmPassword && <div style={styles.error}>{errors.confirmPassword}</div>}
                </div>

                {/* Register Button */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  style={styles.registerButton}
                  className="button-hover"
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>

              </div>

              {/* Additional Options */}
              <div style={styles.additionalOptions}>
                <p style={styles.loginText}>
                  Already have an account?{' '}
                  <a href="/login" style={styles.loginLink} className="login-link">
                    Sign in here
                  </a>
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            <span style={styles.footerCompany}>Flamingoes Private Limited</span>
          </p>
          <p style={styles.footerCopyright}>
            © 2024 All rights reserved.
          </p>
        </div>

      </div>
    </>
  );
};

export default FlamingoRegister;