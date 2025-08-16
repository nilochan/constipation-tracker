import React, { useState } from 'react';
import {
  Container,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Tabs,
  Tab,
  Paper,
  Stack,
  InputAdornment,
  IconButton,
  Fade,
  Slide
} from '@mui/material';
import {
  Person,
  Lock,
  Visibility,
  VisibilityOff,
  Login,
  PersonAdd,
  FavoriteRounded
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { createTheme, ThemeProvider, styled } from '@mui/material/styles';

// Create theme matching the main app
const theme = createTheme({
  palette: {
    primary: {
      main: '#6366f1',
      light: '#818cf8',
      dark: '#4f46e5',
    },
    secondary: {
      main: '#06b6d4',
      light: '#22d3ee',
      dark: '#0891b2',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
});

const GradientBackground = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(2),
}));

const StyledCard = styled(Card)(({ theme }) => ({
  maxWidth: 450,
  width: '100%',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  backdropFilter: 'blur(16px)',
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
}));

const AuthForms = ({ onLogin, onRegister, isLoading }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Login form state
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });

  // Register form state
  const [registerData, setRegisterData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!loginData.username || !loginData.password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      await onLogin(loginData);
      setSuccess('Login successful!');
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed. Please try again.');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!registerData.username || !registerData.password || !registerData.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (registerData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      await onRegister({
        username: registerData.username,
        password: registerData.password
      });
      setSuccess('Registration successful!');
    } catch (error) {
      setError(error.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  const handleLoginChange = (field) => (e) => {
    setLoginData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    setError('');
    setSuccess('');
  };

  const handleRegisterChange = (field) => (e) => {
    setRegisterData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    setError('');
    setSuccess('');
  };

  return (
    <ThemeProvider theme={theme}>
      <GradientBackground>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <StyledCard>
            <CardContent sx={{ p: 4 }}>
              {/* Header */}
              <Box textAlign="center" mb={4}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <Typography variant="h2" component="div" sx={{ mb: 2 }}>
                    🐰
                  </Typography>
                </motion.div>
                <Typography variant="h4" color="text.primary" fontWeight="bold" gutterBottom>
                  Constipation Relief Tracker
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Your personal health companion for digestive wellness
                </Typography>
              </Box>

              {/* Tabs */}
              <Paper sx={{ mb: 3 }}>
                <Tabs 
                  value={activeTab} 
                  onChange={(e, newValue) => setActiveTab(newValue)}
                  variant="fullWidth"
                  sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                  <Tab 
                    icon={<Login />} 
                    label="Sign In" 
                    iconPosition="start"
                  />
                  <Tab 
                    icon={<PersonAdd />} 
                    label="Sign Up" 
                    iconPosition="start"
                  />
                </Tabs>
              </Paper>

              {/* Error/Success Messages */}
              {error && (
                <Fade in={!!error}>
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                </Fade>
              )}
              
              {success && (
                <Fade in={!!success}>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {success}
                  </Alert>
                </Fade>
              )}

              {/* Login Form */}
              {activeTab === 0 && (
                <Slide direction="right" in={activeTab === 0} mountOnEnter unmountOnExit>
                  <Box>
                    <form onSubmit={handleLoginSubmit}>
                      <Stack spacing={3}>
                        <TextField
                          fullWidth
                          label="Username"
                          value={loginData.username}
                          onChange={handleLoginChange('username')}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Person color="action" />
                              </InputAdornment>
                            ),
                          }}
                          disabled={isLoading}
                        />
                        
                        <TextField
                          fullWidth
                          label="Password"
                          type={showPassword ? 'text' : 'password'}
                          value={loginData.password}
                          onChange={handleLoginChange('password')}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Lock color="action" />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() => setShowPassword(!showPassword)}
                                  edge="end"
                                >
                                  {showPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                          disabled={isLoading}
                        />
                        
                        <Button
                          type="submit"
                          variant="contained"
                          size="large"
                          fullWidth
                          disabled={isLoading}
                          startIcon={<Login />}
                          sx={{ 
                            py: 1.5,
                            fontSize: '1.1rem',
                            background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
                            '&:hover': {
                              background: 'linear-gradient(45deg, #4f46e5, #7c3aed)',
                            }
                          }}
                        >
                          {isLoading ? 'Signing In...' : 'Sign In'}
                        </Button>
                      </Stack>
                    </form>
                  </Box>
                </Slide>
              )}

              {/* Register Form */}
              {activeTab === 1 && (
                <Slide direction="left" in={activeTab === 1} mountOnEnter unmountOnExit>
                  <Box>
                    <form onSubmit={handleRegisterSubmit}>
                      <Stack spacing={3}>
                        <TextField
                          fullWidth
                          label="Username"
                          value={registerData.username}
                          onChange={handleRegisterChange('username')}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Person color="action" />
                              </InputAdornment>
                            ),
                          }}
                          disabled={isLoading}
                          helperText="Choose a unique username"
                        />
                        
                        <TextField
                          fullWidth
                          label="Password"
                          type={showPassword ? 'text' : 'password'}
                          value={registerData.password}
                          onChange={handleRegisterChange('password')}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Lock color="action" />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() => setShowPassword(!showPassword)}
                                  edge="end"
                                >
                                  {showPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                          disabled={isLoading}
                          helperText="Minimum 6 characters"
                        />
                        
                        <TextField
                          fullWidth
                          label="Confirm Password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={registerData.confirmPassword}
                          onChange={handleRegisterChange('confirmPassword')}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Lock color="action" />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  edge="end"
                                >
                                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          }}
                          disabled={isLoading}
                          error={registerData.confirmPassword && registerData.password !== registerData.confirmPassword}
                          helperText={
                            registerData.confirmPassword && registerData.password !== registerData.confirmPassword
                              ? "Passwords don't match"
                              : "Re-enter your password"
                          }
                        />
                        
                        <Button
                          type="submit"
                          variant="contained"
                          size="large"
                          fullWidth
                          disabled={isLoading}
                          startIcon={<PersonAdd />}
                          sx={{ 
                            py: 1.5,
                            fontSize: '1.1rem',
                            background: 'linear-gradient(45deg, #06b6d4, #3b82f6)',
                            '&:hover': {
                              background: 'linear-gradient(45deg, #0891b2, #2563eb)',
                            }
                          }}
                        >
                          {isLoading ? 'Creating Account...' : 'Create Account'}
                        </Button>
                      </Stack>
                    </form>
                  </Box>
                </Slide>
              )}

              {/* Footer */}
              <Box textAlign="center" mt={4} pt={3} borderTop={1} borderColor="divider">
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  Made with <FavoriteRounded color="error" fontSize="small" /> for your health
                </Typography>
              </Box>
            </CardContent>
          </StyledCard>
        </motion.div>
      </GradientBackground>
    </ThemeProvider>
  );
};

export default AuthForms;