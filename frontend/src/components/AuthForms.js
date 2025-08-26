import React, { useState, useEffect } from 'react';
import { User, Lock, Mail, Eye, EyeOff, Phone, MessageSquare } from 'lucide-react';

const AuthForms = ({ onLogin, onRegister, isLoading }) => {
  const [authMode, setAuthMode] = useState('password'); // 'password', 'phone', 'google'
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    otp_code: ''
  });
  const [errors, setErrors] = useState({});
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!isLoginMode && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!isLoginMode && formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      if (isLoginMode) {
        await onLogin({
          username: formData.username,
          password: formData.password
        });
      } else {
        await onRegister({
          username: formData.username,
          password: formData.password,
          email: formData.email || undefined
        });
      }
    } catch (error) {
      setErrors({ general: error.message });
    }
  };

  // Handle Google OAuth
  const handleGoogleAuth = () => {
    window.location.href = '/api/auth/google';
  };

  // Handle Email OTP
  const handleSendOtp = async () => {
    if (!formData.email) {
      setErrors({ email: 'Email address is required' });
      return;
    }

    // Username required for signup mode
    if (!isLoginMode && !formData.username) {
      setErrors({ username: 'Username is required to create a new account' });
      return;
    }

    setOtpLoading(true);
    try {
      const response = await fetch('/api/auth/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email,
          mode: isLoginMode ? 'signin' : 'signup',
          username: !isLoginMode ? formData.username : undefined
        })
      });

      const data = await response.json();
      if (response.ok) {
        setOtpSent(true);
        setErrors({});
        // Show OTP code in development for easy testing
        if (data.otp) {
          setErrors({ 
            general: `🔧 DEVELOPMENT MODE: Your OTP code is: ${data.otp}` 
          });
        }
      } else {
        if (data.existingAccount) {
          // Switch to sign in mode if account exists
          setIsLoginMode(true);
          setErrors({ general: data.error });
        } else if (data.needsSignup) {
          // Switch to sign up mode if no account found
          setIsLoginMode(false);
          setErrors({ general: data.error });
        } else if (data.duplicateUsername) {
          // Username already exists during signup
          setErrors({ username: data.error });
        } else {
          setErrors({ email: data.error || 'Failed to send verification code' });
        }
      }
    } catch (error) {
      setErrors({ email: 'Network error. Please try again.' });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!formData.otp_code) {
      setErrors({ otp_code: 'OTP code is required' });
      return;
    }

    if (!isLoginMode && !formData.username) {
      setErrors({ username: 'Username is required to create a new account' });
      return;
    }

    try {
      const response = await fetch('/api/auth/verify-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          otp_code: formData.otp_code,
          username: formData.username || undefined
        })
      });

      const data = await response.json();
      if (response.ok) {
        // Store token and redirect - use 'authToken' to match ApiService
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.reload();
      } else {
        if (data.requireSignUp) {
          // Switch to sign up mode if no account found
          setErrors({ 
            general: 'No account found with this email. Please use "Sign up" to create a new account.' 
          });
          setIsLoginMode(false); // Switch to sign up mode
        } else {
          setErrors({ otp_code: data.error || 'Invalid OTP' });
        }
      }
    } catch (error) {
      setErrors({ otp_code: 'Network error. Please try again.' });
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setErrors({});
    setOtpSent(false);
    setFormData({
      username: '',
      password: '',
      email: '',
      otp_code: ''
    });
  };

  const switchAuthMode = (mode) => {
    setAuthMode(mode);
    setErrors({});
    setOtpSent(false);
    setFormData({
      username: '',
      password: '',
      email: '',
      otp_code: ''
    });
  };

  // Check for Google OAuth token on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      // Store with 'authToken' key to match ApiService
      localStorage.setItem('authToken', token);
      // Remove token from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      window.location.reload();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-center mb-4">
            <span className="text-4xl">🐰</span>
            <h1 className="text-2xl font-bold text-gray-800 mt-2">
              Pinko's Constipation Relief Tracker
            </h1>
          </div>
          <p className="text-gray-600">
            {isLoginMode ? 'Welcome back!' : 'Create your account'}
          </p>
        </div>

        {/* Authentication Method Selection */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-4">
            <button
              onClick={() => switchAuthMode('password')}
              className={`pb-2 px-1 text-sm font-medium transition-colors ${
                authMode === 'password'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Lock className="inline w-4 h-4 mr-1" />
              Password
            </button>
            <button
              onClick={() => switchAuthMode('email')}
              className={`pb-2 px-1 text-sm font-medium transition-colors ${
                authMode === 'email'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Mail className="inline w-4 h-4 mr-1" />
              Email
            </button>
            <button
              onClick={() => switchAuthMode('google')}
              className={`pb-2 px-1 text-sm font-medium transition-colors ${
                authMode === 'google'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg className="inline w-4 h-4 mr-1" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
          </nav>
        </div>

        {/* Google OAuth */}
        {authMode === 'google' && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Sign in with your Google account for quick and secure access
              </p>
              <button
                onClick={handleGoogleAuth}
                disabled={isLoading}
                className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>
          </div>
        )}

        {/* Email OTP Authentication */}
        {authMode === 'email' && (
          <div className="space-y-6">
            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{errors.general}</p>
              </div>
            )}

            {!otpSent ? (
              <>
                {!otpSent && !isLoginMode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.username ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter your username"
                        disabled={isLoading}
                      />
                    </div>
                    {errors.username && (
                      <p className="text-red-500 text-sm mt-1">{errors.username}</p>
                    )}
                  </div>
                )}

                {otpSent && !isLoginMode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username (for new account)
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.username ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Choose a username"
                        disabled={isLoading}
                      />
                    </div>
                    {errors.username && (
                      <p className="text-red-500 text-sm mt-1">{errors.username}</p>
                    )}
                    <p className="text-sm text-gray-600 mt-1">
                      Only needed if creating a new account. Leave blank if you have an existing account.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.email ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="your.email@example.com"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                  )}
                </div>


                <button
                  onClick={handleSendOtp}
                  disabled={otpLoading || isLoading}
                  className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  {otpLoading ? 'Sending...' : 'Send Email Code'}
                </button>
              </>
            ) : (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-600 text-sm">
                    Verification code sent to {formData.email}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Code
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      name="otp_code"
                      value={formData.otp_code}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.otp_code ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter 6-digit code"
                      maxLength="6"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.otp_code && (
                    <p className="text-red-500 text-sm mt-1">{errors.otp_code}</p>
                  )}
                </div>


                <div className="flex space-x-3">
                  <button
                    onClick={handleVerifyOtp}
                    disabled={isLoading}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                  </button>
                  <button
                    onClick={handleSendOtp}
                    disabled={otpLoading || isLoading}
                    className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Resend
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Password Authentication */}
        {authMode === 'password' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{errors.general}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.username ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your username"
                  disabled={isLoading}
                />
              </div>
              {errors.username && (
                <p className="text-red-500 text-sm mt-1">{errors.username}</p>
              )}
            </div>

            {!isLoginMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email (optional)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter your email"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {isLoading ? 'Please wait...' : (isLoginMode ? 'Sign In' : 'Create Account')}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={toggleMode}
            disabled={isLoading}
            className="text-blue-500 hover:text-blue-600 font-medium transition-colors"
          >
            {isLoginMode ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">🐰 For Dearo 🐰:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Your data is saved securely</li>
            <li>• Access from any device with login</li>
            <li>• All your progress is preserved</li>
            <li>• Private and personal tracking</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AuthForms;