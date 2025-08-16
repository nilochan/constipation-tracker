import React, { useState, useEffect, useCallback } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Avatar,
  Box,
  Tabs,
  Tab,
  TextField,
  Slider,
  Rating,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  LinearProgress,
  Alert,
  Paper,
  Divider,
  Fab,
  Drawer,
  Stack,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Badge,
  Backdrop,
  CircularProgress
} from '@mui/material';
import {
  LocalDrink,
  Add,
  Remove,
  Mood,
  AccessTime,
  Analytics,
  Restaurant,
  Notes,
  Today,
  Person,
  Logout,
  Favorite,
  CheckCircle,
  RadioButtonUnchecked,
  TrendingUp,
  BarChart,
  CalendarToday,
  WaterDrop,
  SentimentSatisfied,
  SentimentDissatisfied,
  SentimentNeutral,
  LocalPharmacy,
  Spa,
  FitnessCenter,
  RestaurantMenu,
  Delete
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { createTheme, ThemeProvider, styled } from '@mui/material/styles';
import ApiService from './services/api';
import AuthForms from './components/AuthForms-Enhanced';

// Create custom theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#6366f1', // Indigo
      light: '#818cf8',
      dark: '#4f46e5',
    },
    secondary: {
      main: '#06b6d4', // Cyan
      light: '#22d3ee',
      dark: '#0891b2',
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
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
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          },
          transition: 'box-shadow 0.2s ease-in-out',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
  },
});

// Styled components
const GradientCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  '& .MuiCardContent-root': {
    '&:last-child': {
      paddingBottom: 16,
    },
  },
}));

const StatsCard = styled(Card)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(2),
  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  color: 'white',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
  },
}));

const WaterButton = styled(IconButton)(({ theme }) => ({
  width: 64,
  height: 64,
  backgroundColor: theme.palette.primary.main,
  color: 'white',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
    transform: 'scale(1.05)',
  },
  transition: 'all 0.2s ease-in-out',
}));

const ConstipationReliefTracker = () => {
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState(0);
  const [dailyData, setDailyData] = useState({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [showBowelModal, setShowBowelModal] = useState(false);
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Bristol Stool Scale definitions
  const bristolScale = [
    { type: 1, name: "Separate hard lumps", description: "Like nuts (hard to pass)", color: "#fee2e2", borderColor: "#fca5a5", severity: "Severe Constipation" },
    { type: 2, name: "Sausage-shaped but lumpy", description: "Hard and lumpy", color: "#fed7aa", borderColor: "#fdba74", severity: "Mild Constipation" },
    { type: 3, name: "Sausage-shaped with cracks", description: "Like a sausage but with cracks on surface", color: "#fef3c7", borderColor: "#fcd34d", severity: "Normal" },
    { type: 4, name: "Smooth and soft", description: "Like a sausage or snake, smooth and soft", color: "#dcfce7", borderColor: "#86efac", severity: "Normal" },
    { type: 5, name: "Soft blobs with clear edges", description: "Soft blobs with clear-cut edges", color: "#dbeafe", borderColor: "#93c5fd", severity: "Lacking Fiber" },
    { type: 6, name: "Fluffy pieces with ragged edges", description: "Fluffy pieces with ragged edges, mushy", color: "#e9d5ff", borderColor: "#c4b5fd", severity: "Mild Diarrhea" },
    { type: 7, name: "Watery, no solid pieces", description: "Entirely liquid", color: "#fee2e2", borderColor: "#fca5a5", severity: "Severe Diarrhea" }
  ];

  // Colors for charts
  const CHART_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316'];

  // Initialize daily data structure
  const initializeDayData = (date) => ({
    date,
    waterGlasses: 0,
    checkedItems: {},
    bowelMovement: false,
    notes: '',
    bowelMovements: [],
    mood: null,
    stressLevel: null,
    sleepQuality: null,
    meals: [],
    symptoms: {
      bloating: 0,
      abdominalPain: 0,
      nausea: 0,
      fatigue: 0
    }
  });

  // Load daily data function
  const loadDailyData = useCallback(async (date) => {
    try {
      const data = await ApiService.getDailyData(date);
      setDailyData(prev => ({
        ...prev,
        [date]: data || initializeDayData(date)
      }));
    } catch (error) {
      console.error('Failed to load daily data:', error);
      setDailyData(prev => ({
        ...prev,
        [date]: initializeDayData(date)
      }));
    }
  }, []);

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (ApiService.isAuthenticated()) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Load daily data when date changes or authentication status changes
  useEffect(() => {
    if (isAuthenticated && currentDate) {
      loadDailyData(currentDate);
    }
  }, [currentDate, isAuthenticated, loadDailyData]);

  // Load analytics data when switching to analytics tab
  useEffect(() => {
    const loadAnalyticsData = async () => {
      if (isAuthenticated && activeTab === 1) {
        try {
          const data = await ApiService.getAnalytics(30);
          setAnalyticsData(data);
        } catch (error) {
          console.error('Failed to load analytics data:', error);
        }
      }
    };
    loadAnalyticsData();
  }, [activeTab, isAuthenticated]);

  const handleLogin = async (credentials) => {
    setAuthLoading(true);
    try {
      const response = await ApiService.login(credentials);
      setUser(response.user);
      setIsAuthenticated(true);
    } catch (error) {
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (userData) => {
    setAuthLoading(true);
    try {
      const response = await ApiService.register(userData);
      setUser(response.user);
      setIsAuthenticated(true);
    } catch (error) {
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    ApiService.logout();
    setIsAuthenticated(false);
    setUser(null);
    setDailyData({});
    setAnalyticsData(null);
  };

  // Get current day data
  const getCurrentDayData = () => {
    return dailyData[currentDate] || initializeDayData(currentDate);
  };

  // Update daily data
  const updateDailyData = async (updates) => {
    const newData = {
      ...getCurrentDayData(),
      ...updates
    };
    
    setDailyData(prev => ({
      ...prev,
      [currentDate]: newData
    }));

    try {
      await ApiService.updateDailyData(currentDate, updates);
    } catch (error) {
      console.error('Failed to update daily data:', error);
    }
  };

  // Fiber-rich foods safe for eczema
  const fiberFoods = [
    { name: 'Broccoli (1 cup steamed)', fiber: '5g', safe: true },
    { name: 'Spinach (1 cup cooked)', fiber: '4g', safe: true },
    { name: 'Carrots (1 medium)', fiber: '2g', safe: true },
    { name: 'Sweet potato (1 medium)', fiber: '4g', safe: true },
    { name: 'Pears with skin (1 medium)', fiber: '6g', safe: true },
    { name: 'Apples with skin (1 medium)', fiber: '4g', safe: true },
    { name: 'Berries (1/2 cup)', fiber: '4g', safe: true },
    { name: 'Prunes (3-4 pieces)', fiber: '3g', safe: true, special: 'Especially effective!' }
  ];

  const supplements = [
    { name: 'Ground flaxseed (1 tsp)', note: 'Start small, mix in food' },
    { name: 'Chia seeds (1 tsp)', note: 'Soak in water first' },
    { name: 'Olive oil (1 tbsp)', note: 'Add to cooked vegetables' }
  ];

  const dailyRoutine = [
    'Morning warm water (1-2 glasses)',
    '15-20 minute walk',
    'Regular meal times',
    'Toilet time after meals',
    'Gentle abdominal massage'
  ];

  const currentData = getCurrentDayData();

  const handleItemCheck = (category, index) => {
    const key = `${category}-${index}`;
    const newCheckedItems = {
      ...currentData.checkedItems,
      [key]: !currentData.checkedItems[key]
    };
    updateDailyData({ checkedItems: newCheckedItems });
  };

  const isItemChecked = (category, index) => {
    const key = `${category}-${index}`;
    return currentData.checkedItems[key] || false;
  };

  const adjustWater = (amount) => {
    const newAmount = Math.max(0, currentData.waterGlasses + amount);
    updateDailyData({ waterGlasses: newAmount });
  };

  const addBowelMovement = async (bristolType, urgency, straining, satisfaction) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    try {
      const newMovement = await ApiService.addBowelMovement(currentDate, {
        time: timeString,
        bristolType,
        urgency,
        straining,
        satisfaction
      });

      const updatedMovements = [...(currentData.bowelMovements || []), newMovement];
      setDailyData(prev => ({
        ...prev,
        [currentDate]: {
          ...currentData,
          bowelMovements: updatedMovements,
          bowelMovement: true
        }
      }));
    } catch (error) {
      console.error('Failed to add bowel movement:', error);
    }
  };

  const removeBowelMovement = async (id) => {
    try {
      await ApiService.deleteBowelMovement(currentDate, id);
      const updatedMovements = (currentData.bowelMovements || []).filter(movement => movement.id !== id);
      setDailyData(prev => ({
        ...prev,
        [currentDate]: {
          ...currentData,
          bowelMovements: updatedMovements,
          bowelMovement: updatedMovements.length > 0
        }
      }));
    } catch (error) {
      console.error('Failed to remove bowel movement:', error);
    }
  };

  const addMeal = async (mealData) => {
    try {
      const newMeal = await ApiService.addMeal(currentDate, mealData);
      const updatedMeals = [...(currentData.meals || []), newMeal];
      setDailyData(prev => ({
        ...prev,
        [currentDate]: {
          ...currentData,
          meals: updatedMeals
        }
      }));
    } catch (error) {
      console.error('Failed to add meal:', error);
    }
  };

  const getWaterStatus = (glasses) => {
    if (glasses >= 8) return { color: 'success', message: 'Excellent hydration!' };
    if (glasses >= 6) return { color: 'primary', message: 'Good progress' };
    if (glasses >= 4) return { color: 'warning', message: 'Keep going' };
    return { color: 'error', message: 'Need more water' };
  };

  const waterStatus = getWaterStatus(currentData.waterGlasses);

  // Get advanced stats from analytics data
  const getAdvancedStats = () => {
    if (!analyticsData) return {
      avgWater: '0.0',
      bowelMovementDays: 0,
      totalBowelMovements: 0,
      bristolCounts: {},
      avgMood: '0.0',
      moodSamples: 0
    };

    const { historicalData, bristolDistribution } = analyticsData;
    
    const totalWater = historicalData.reduce((sum, day) => sum + (day.water_glasses || 0), 0);
    const bowelMovementDays = historicalData.filter(day => day.bowel_movement_count > 0).length;
    const avgWater = historicalData.length > 0 ? totalWater / historicalData.length : 0;
    const totalBowelMovements = historicalData.reduce((sum, day) => sum + (day.bowel_movement_count || 0), 0);
    
    // Bristol scale counts
    const bristolCounts = {};
    bristolDistribution.forEach(item => {
      bristolCounts[item.bristol_type] = item.count;
    });

    // Mood analysis
    const moodData = historicalData.filter(day => day.mood !== null);
    const avgMood = moodData.length > 0 ? 
      moodData.reduce((sum, day) => sum + day.mood, 0) / moodData.length : 0;

    return {
      avgWater: avgWater.toFixed(1),
      bowelMovementDays,
      totalBowelMovements,
      bristolCounts,
      avgMood: avgMood.toFixed(1),
      moodSamples: moodData.length
    };
  };

  const stats = getAdvancedStats();

  // Get historical data for trends
  const getHistoricalData = () => {
    if (!analyticsData || !analyticsData.historicalData) return [];
    return analyticsData.historicalData.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // Enhanced Bowel Movement Modal
  const BowelMovementModal = ({ isOpen, onClose, onSave }) => {
    const [selectedBristol, setSelectedBristol] = useState(null);
    const [urgency, setUrgency] = useState(3);
    const [straining, setStraining] = useState(false);
    const [satisfaction, setSatisfaction] = useState(3);

    return (
      <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <AccessTime color="primary" />
            Record Bowel Movement
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>Bristol Stool Scale Type:</Typography>
            <Grid container spacing={1}>
              {bristolScale.map((scale) => (
                <Grid item xs={12} key={scale.type}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      backgroundColor: scale.color,
                      border: `2px solid ${selectedBristol === scale.type ? theme.palette.primary.main : scale.borderColor}`,
                      '&:hover': {
                        backgroundColor: scale.color,
                        opacity: 0.8,
                      },
                    }}
                    onClick={() => setSelectedBristol(scale.type)}
                  >
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            Type {scale.type}: {scale.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {scale.description}
                          </Typography>
                        </Box>
                        <Chip
                          label={scale.severity}
                          color={scale.type <= 2 ? 'error' : scale.type <= 4 ? 'success' : 'warning'}
                          size="small"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Typography gutterBottom>Urgency (1-5)</Typography>
              <Slider
                value={urgency}
                onChange={(e, value) => setUrgency(value)}
                min={1}
                max={5}
                step={1}
                marks
                valueLabelDisplay="auto"
              />
              <Typography variant="body2" color="text.secondary">
                {urgency === 1 ? 'No urgency' : 
                 urgency === 2 ? 'Slight urgency' :
                 urgency === 3 ? 'Moderate urgency' :
                 urgency === 4 ? 'Strong urgency' : 'Extreme urgency'}
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography gutterBottom>Straining Required?</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={straining}
                    onChange={(e) => setStraining(e.target.checked)}
                    color="error"
                  />
                }
                label={straining ? 'Yes - Had to strain' : 'No - Easy passage'}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Typography gutterBottom>Satisfaction (1-5)</Typography>
              <Rating
                value={satisfaction}
                onChange={(e, value) => setSatisfaction(value)}
                max={5}
                size="large"
              />
              <Typography variant="body2" color="text.secondary">
                {satisfaction === 1 ? 'Very unsatisfied' : 
                 satisfaction === 2 ? 'Unsatisfied' :
                 satisfaction === 3 ? 'Neutral' :
                 satisfaction === 4 ? 'Satisfied' : 'Very satisfied'}
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              if (selectedBristol) {
                onSave(selectedBristol, urgency, straining, satisfaction);
                onClose();
                setSelectedBristol(null);
                setUrgency(3);
                setStraining(false);
                setSatisfaction(3);
              }
            }}
            disabled={!selectedBristol}
            variant="contained"
          >
            Save Movement
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Enhanced Food Tracking Modal
  const FoodTrackingModal = ({ isOpen, onClose, onSave }) => {
    const [mealType, setMealType] = useState('breakfast');
    const [foodItems, setFoodItems] = useState('');
    const [portion, setPortion] = useState('medium');
    const [triggerFoods, setTriggerFoods] = useState([]);

    const commonTriggers = ['Dairy', 'Gluten', 'Spicy Food', 'Caffeine', 'Alcohol', 'High Fat', 'Raw Vegetables', 'Beans'];

    return (
      <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <Restaurant color="success" />
            Log Meal
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Meal Type</InputLabel>
              <Select
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                label="Meal Type"
              >
                <MenuItem value="breakfast">Breakfast</MenuItem>
                <MenuItem value="lunch">Lunch</MenuItem>
                <MenuItem value="dinner">Dinner</MenuItem>
                <MenuItem value="snack">Snack</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Food Items"
              multiline
              rows={3}
              value={foodItems}
              onChange={(e) => setFoodItems(e.target.value)}
              placeholder="e.g., Grilled chicken, steamed broccoli, brown rice"
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Portion Size</InputLabel>
              <Select
                value={portion}
                onChange={(e) => setPortion(e.target.value)}
                label="Portion Size"
              >
                <MenuItem value="small">Small</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="large">Large</MenuItem>
              </Select>
            </FormControl>

            <Box>
              <Typography variant="subtitle1" gutterBottom>Potential Trigger Foods</Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {commonTriggers.map(trigger => (
                  <Chip
                    key={trigger}
                    label={trigger}
                    onClick={() => {
                      setTriggerFoods(prev => 
                        prev.includes(trigger) 
                          ? prev.filter(t => t !== trigger)
                          : [...prev, trigger]
                      );
                    }}
                    color={triggerFoods.includes(trigger) ? 'error' : 'default'}
                    variant={triggerFoods.includes(trigger) ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              if (foodItems.trim()) {
                onSave({ 
                  mealType, 
                  foodItems, 
                  portion, 
                  triggerFoods,
                  timestamp: new Date().toISOString()
                });
                onClose();
                setFoodItems('');
                setTriggerFoods([]);
              }
            }}
            variant="contained"
            color="success"
          >
            Save Meal
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Show authentication forms if not authenticated
  if (!isAuthenticated) {
    if (isLoading) {
      return (
        <ThemeProvider theme={theme}>
          <Backdrop open sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}>
            <Box textAlign="center">
              <Typography variant="h2" component="div" sx={{ mb: 2 }}>🐰</Typography>
              <CircularProgress color="inherit" />
              <Typography variant="h6" sx={{ mt: 2 }}>Loading...</Typography>
            </Box>
          </Backdrop>
        </ThemeProvider>
      );
    }
    return (
      <ThemeProvider theme={theme}>
        <AuthForms 
          onLogin={handleLogin} 
          onRegister={handleRegister} 
          isLoading={authLoading}
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
        {/* Modern App Bar */}
        <AppBar position="sticky" elevation={0} sx={{ backgroundColor: 'white', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Toolbar>
            <Box display="flex" alignItems="center" gap={2} flexGrow={1}>
              <Typography variant="h2" component="span">🐰</Typography>
              <Typography variant="h6" color="text.primary" fontWeight="bold">
                Constipation Relief Tracker
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                <Person />
              </Avatar>
              <Typography variant="body2" color="text.secondary">
                {user?.username || 'User'}
              </Typography>
              <Button
                startIcon={<Logout />}
                onClick={handleLogout}
                color="error"
                size="small"
              >
                Logout
              </Button>
            </Box>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ py: 4 }}>
          {/* Date Picker */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <CalendarToday color="primary" />
                  <TextField
                    type="date"
                    value={currentDate}
                    onChange={(e) => setCurrentDate(e.target.value)}
                    size="small"
                  />
                  <Typography variant="body1" color="text.secondary">
                    {new Date(currentDate).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </motion.div>

          {/* Tab Navigation */}
          <Card sx={{ mb: 3 }}>
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => setActiveTab(newValue)}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab 
                icon={<Today />} 
                label="Today's Tracking" 
                iconPosition="start"
              />
              <Tab 
                icon={<Analytics />} 
                label="Analytics & Trends" 
                iconPosition="start"
              />
            </Tabs>
          </Card>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 0 && (
              <motion.div
                key="today"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <Grid container spacing={3}>
                  {/* Daily Wellness Check */}
                  <Grid item xs={12}>
                    <GradientCard>
                      <CardHeader
                        avatar={<SentimentSatisfied />}
                        title="Daily Wellness Check"
                        titleTypographyProps={{ color: 'inherit', fontWeight: 'bold' }}
                      />
                      <CardContent>
                        <Grid container spacing={3}>
                          {/* Mood Tracking */}
                          <Grid item xs={12} md={4}>
                            <Paper sx={{ p: 2, textAlign: 'center' }}>
                              <Typography variant="h6" gutterBottom>Mood</Typography>
                              <Rating
                                value={currentData.mood || 0}
                                onChange={(e, value) => updateDailyData({ mood: value })}
                                max={5}
                                size="large"
                                icon={<SentimentSatisfied fontSize="inherit" />}
                                emptyIcon={<SentimentNeutral fontSize="inherit" />}
                              />
                              <Typography variant="body2" sx={{ mt: 1 }}>
                                {currentData.mood ? 
                                  `${currentData.mood === 1 ? 'Very Sad' :
                                    currentData.mood === 2 ? 'Sad' :
                                    currentData.mood === 3 ? 'Neutral' :
                                    currentData.mood === 4 ? 'Happy' : 'Very Happy'}` 
                                  : 'Rate your mood'}
                              </Typography>
                            </Paper>
                          </Grid>

                          {/* Stress Level */}
                          <Grid item xs={12} md={4}>
                            <Paper sx={{ p: 2 }}>
                              <Typography variant="h6" gutterBottom textAlign="center">Stress Level</Typography>
                              <Slider
                                value={currentData.stressLevel || 5}
                                onChange={(e, value) => updateDailyData({ stressLevel: value })}
                                min={1}
                                max={10}
                                step={1}
                                marks
                                valueLabelDisplay="auto"
                              />
                              <Box textAlign="center">
                                <Typography variant="h5" fontWeight="bold">
                                  {currentData.stressLevel || 5}/10
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {(currentData.stressLevel || 5) >= 7 ? 'High Stress' :
                                   (currentData.stressLevel || 5) >= 4 ? 'Moderate' : 'Low Stress'}
                                </Typography>
                              </Box>
                            </Paper>
                          </Grid>

                          {/* Sleep Quality */}
                          <Grid item xs={12} md={4}>
                            <Paper sx={{ p: 2 }}>
                              <Typography variant="h6" gutterBottom textAlign="center">Sleep Quality</Typography>
                              <Rating
                                value={currentData.sleepQuality || 0}
                                onChange={(e, value) => updateDailyData({ sleepQuality: value })}
                                max={5}
                                size="large"
                              />
                              <Box textAlign="center" sx={{ mt: 1 }}>
                                <Typography variant="h5" fontWeight="bold">
                                  {currentData.sleepQuality || 0}/5
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {(currentData.sleepQuality || 0) >= 4 ? 'Great Sleep' :
                                   (currentData.sleepQuality || 0) >= 3 ? 'Fair Sleep' : 
                                   (currentData.sleepQuality || 0) >= 1 ? 'Poor Sleep' : 'Not rated'}
                                </Typography>
                              </Box>
                            </Paper>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </GradientCard>
                  </Grid>

                  {/* Water Tracking */}
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardHeader
                        avatar={<WaterDrop color="primary" />}
                        title="Daily Hydration"
                        titleTypographyProps={{ fontWeight: 'bold' }}
                      />
                      <CardContent>
                        <Box display="flex" alignItems="center" justifyContent="center" gap={3} mb={3}>
                          <WaterButton onClick={() => adjustWater(-1)}>
                            <Remove />
                          </WaterButton>
                          
                          <Box textAlign="center">
                            <Typography variant="h2" color="primary.main" fontWeight="bold">
                              {currentData.waterGlasses}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              glasses (250ml each)
                            </Typography>
                          </Box>
                          
                          <WaterButton onClick={() => adjustWater(1)}>
                            <Add />
                          </WaterButton>
                        </Box>
                        
                        <Alert severity={waterStatus.color} sx={{ mb: 2 }}>
                          {waterStatus.message}
                        </Alert>
                        
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.min((currentData.waterGlasses / 10) * 100, 100)}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          Target: 8-10 glasses daily
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Quick Stats */}
                  <Grid item xs={12} md={6}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <StatsCard>
                          <Typography variant="h3" fontWeight="bold">
                            {currentData.bowelMovements?.length || 0}
                          </Typography>
                          <Typography variant="body2">
                            Bowel Movements Today
                          </Typography>
                        </StatsCard>
                      </Grid>
                      <Grid item xs={6}>
                        <StatsCard>
                          <Typography variant="h3" fontWeight="bold">
                            {currentData.meals?.length || 0}
                          </Typography>
                          <Typography variant="body2">
                            Meals Logged
                          </Typography>
                        </StatsCard>
                      </Grid>
                    </Grid>
                  </Grid>

                  {/* Bowel Movement Tracker */}
                  <Grid item xs={12}>
                    <Card>
                      <CardHeader
                        avatar={<AccessTime color="secondary" />}
                        title="Bowel Movement Tracker"
                        titleTypographyProps={{ fontWeight: 'bold' }}
                        action={
                          <Button
                            startIcon={<Add />}
                            onClick={() => setShowBowelModal(true)}
                            variant="contained"
                            color="secondary"
                          >
                            Record Movement
                          </Button>
                        }
                      />
                      <CardContent>
                        {currentData.bowelMovements && currentData.bowelMovements.length > 0 ? (
                          <Stack spacing={2}>
                            {currentData.bowelMovements.map((movement) => {
                              const bristolInfo = bristolScale.find(s => s.type === movement.bristolType);
                              return (
                                <Card 
                                  key={movement.id} 
                                  sx={{ 
                                    backgroundColor: bristolInfo?.color,
                                    border: `2px solid ${bristolInfo?.borderColor}` 
                                  }}
                                >
                                  <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="start">
                                      <Box flexGrow={1}>
                                        <Typography variant="h6">
                                          {new Date(movement.date || currentDate).toLocaleDateString()} at {movement.time}
                                        </Typography>
                                        <Typography variant="body1" sx={{ mt: 1 }}>
                                          <strong>Type {movement.bristolType}</strong>: {bristolInfo?.name}
                                        </Typography>
                                        <Box display="flex" gap={2} sx={{ mt: 1 }}>
                                          <Chip label={`Urgency: ${movement.urgency}/5`} size="small" />
                                          <Chip 
                                            label={movement.straining ? 'Had to strain' : 'Easy passage'}
                                            color={movement.straining ? 'error' : 'success'}
                                            size="small"
                                          />
                                          <Chip label={`Satisfaction: ${movement.satisfaction}/5`} size="small" />
                                        </Box>
                                      </Box>
                                      <IconButton
                                        onClick={() => removeBowelMovement(movement.id)}
                                        color="error"
                                        size="small"
                                      >
                                        <Delete />
                                      </IconButton>
                                    </Box>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </Stack>
                        ) : (
                          <Alert severity="info">No bowel movements recorded today</Alert>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Food Tracking */}
                  <Grid item xs={12}>
                    <Card>
                      <CardHeader
                        avatar={<RestaurantMenu color="success" />}
                        title="Food Tracking"
                        titleTypographyProps={{ fontWeight: 'bold' }}
                        action={
                          <Button
                            startIcon={<Add />}
                            onClick={() => setShowFoodModal(true)}
                            variant="contained"
                            color="success"
                          >
                            Log Meal
                          </Button>
                        }
                      />
                      <CardContent>
                        {currentData.meals && currentData.meals.length > 0 ? (
                          <Stack spacing={2}>
                            {currentData.meals.map((meal) => (
                              <Card key={meal.id} variant="outlined">
                                <CardContent>
                                  <Box display="flex" justifyContent="space-between" alignItems="start">
                                    <Box>
                                      <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                                        {meal.mealType}
                                      </Typography>
                                      <Typography variant="body1" sx={{ mt: 1 }}>
                                        {meal.foodItems}
                                      </Typography>
                                      <Box display="flex" gap={1} sx={{ mt: 1 }}>
                                        <Chip label={`Portion: ${meal.portion}`} size="small" />
                                        {meal.triggerFoods && meal.triggerFoods.length > 0 && (
                                          meal.triggerFoods.map(trigger => (
                                            <Chip key={trigger} label={trigger} color="warning" size="small" />
                                          ))
                                        )}
                                      </Box>
                                    </Box>
                                    <Typography variant="caption" color="text.secondary">
                                      {meal.timestamp && new Date(meal.timestamp).toLocaleTimeString('en-US', { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      })}
                                    </Typography>
                                  </Box>
                                </CardContent>
                              </Card>
                            ))}
                          </Stack>
                        ) : (
                          <Alert severity="info">No meals logged today</Alert>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Fiber Foods */}
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardHeader
                        avatar={<LocalPharmacy color="success" />}
                        title="Eczema-Safe Fiber Foods"
                        titleTypographyProps={{ fontWeight: 'bold' }}
                      />
                      <CardContent>
                        <List>
                          {fiberFoods.map((food, index) => (
                            <ListItem key={index} dense>
                              <ListItemIcon>
                                <Checkbox
                                  checked={isItemChecked('fiber', index)}
                                  onChange={() => handleItemCheck('fiber', index)}
                                  color="success"
                                />
                              </ListItemIcon>
                              <ListItemText
                                primary={food.name}
                                secondary={
                                  <Box>
                                    <Typography variant="body2" component="span">
                                      Fiber: {food.fiber}
                                    </Typography>
                                    {food.special && (
                                      <Chip 
                                        label={food.special} 
                                        color="warning" 
                                        size="small" 
                                        sx={{ ml: 1 }}
                                      />
                                    )}
                                  </Box>
                                }
                                sx={{ 
                                  textDecoration: isItemChecked('fiber', index) ? 'line-through' : 'none',
                                  opacity: isItemChecked('fiber', index) ? 0.6 : 1 
                                }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Daily Routine */}
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardHeader
                        avatar={<FitnessCenter color="primary" />}
                        title="Daily Routine Checklist"
                        titleTypographyProps={{ fontWeight: 'bold' }}
                      />
                      <CardContent>
                        <List>
                          {dailyRoutine.map((activity, index) => (
                            <ListItem key={index} dense>
                              <ListItemIcon>
                                <Checkbox
                                  checked={isItemChecked('routine', index)}
                                  onChange={() => handleItemCheck('routine', index)}
                                  color="primary"
                                />
                              </ListItemIcon>
                              <ListItemText
                                primary={activity}
                                sx={{ 
                                  textDecoration: isItemChecked('routine', index) ? 'line-through' : 'none',
                                  opacity: isItemChecked('routine', index) ? 0.6 : 1 
                                }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Notes */}
                  <Grid item xs={12}>
                    <Card>
                      <CardHeader
                        avatar={<Notes color="primary" />}
                        title="Daily Notes"
                        titleTypographyProps={{ fontWeight: 'bold' }}
                      />
                      <CardContent>
                        <TextField
                          fullWidth
                          multiline
                          rows={4}
                          value={currentData.notes}
                          onChange={(e) => updateDailyData({ notes: e.target.value })}
                          placeholder="How did you feel today? Any improvements or concerns?"
                          variant="outlined"
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </motion.div>
            )}

            {activeTab === 1 && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Grid container spacing={3}>
                  {/* Advanced Stats */}
                  <Grid item xs={12}>
                    <Card>
                      <CardHeader
                        avatar={<BarChart color="primary" />}
                        title="Advanced Analytics (30 Days)"
                        titleTypographyProps={{ fontWeight: 'bold' }}
                      />
                      <CardContent>
                        <Grid container spacing={3}>
                          <Grid item xs={12} sm={6} md={3}>
                            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'primary.50' }}>
                              <Typography variant="h3" color="primary.main" fontWeight="bold">
                                {stats.avgWater}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Avg Glasses/Day
                              </Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={12} sm={6} md={3}>
                            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'success.50' }}>
                              <Typography variant="h3" color="success.main" fontWeight="bold">
                                {stats.bowelMovementDays}/30
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Days with BM
                              </Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={12} sm={6} md={3}>
                            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'secondary.50' }}>
                              <Typography variant="h3" color="secondary.main" fontWeight="bold">
                                {stats.totalBowelMovements}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Total BM Count
                              </Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={12} sm={6} md={3}>
                            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'warning.50' }}>
                              <Typography variant="h3" color="warning.main" fontWeight="bold">
                                {stats.avgMood}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Avg Mood ({stats.moodSamples} samples)
                              </Typography>
                            </Paper>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Water Intake Trend */}
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardHeader title="Water Intake Trend" titleTypographyProps={{ fontWeight: 'bold' }} />
                      <CardContent>
                        <Box sx={{ width: '100%', height: 300 }}>
                          <ResponsiveContainer>
                            <LineChart data={getHistoricalData()}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="date" 
                                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              />
                              <YAxis />
                              <RechartsTooltip 
                                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="water_glasses" 
                                stroke={theme.palette.primary.main} 
                                strokeWidth={3}
                                dot={{ fill: theme.palette.primary.main, strokeWidth: 2, r: 4 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Bristol Scale Distribution */}
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardHeader title="Bristol Stool Scale Distribution" titleTypographyProps={{ fontWeight: 'bold' }} />
                      <CardContent>
                        <Box sx={{ width: '100%', height: 300 }}>
                          <ResponsiveContainer>
                            <PieChart>
                              <Pie
                                data={bristolScale.map(scale => ({
                                  name: `Type ${scale.type}`,
                                  value: stats.bristolCounts[scale.type] || 0,
                                  color: scale.borderColor
                                }))}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {bristolScale.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Historical Records */}
                  <Grid item xs={12}>
                    <Card>
                      <CardHeader title="Daily History" titleTypographyProps={{ fontWeight: 'bold' }} />
                      <CardContent>
                        {getHistoricalData().length > 0 ? (
                          <Stack spacing={2}>
                            {getHistoricalData().slice(0, 30).map((dayData) => (
                              <Card key={dayData.date} variant="outlined">
                                <CardContent>
                                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                                    <Typography variant="h6">
                                      {new Date(dayData.date).toLocaleDateString('en-US', { 
                                        weekday: 'long', 
                                        year: 'numeric', 
                                        month: 'short', 
                                        day: 'numeric' 
                                      })}
                                    </Typography>
                                    <Box display="flex" gap={1}>
                                      <Chip 
                                        icon={<WaterDrop />} 
                                        label={`${dayData.water_glasses || 0} glasses`} 
                                        color="primary" 
                                        size="small" 
                                      />
                                      <Chip 
                                        label={`${dayData.bowel_movement_count || 0} BM`} 
                                        color="success" 
                                        size="small" 
                                      />
                                      {dayData.mood && (
                                        <Chip 
                                          icon={<Mood />} 
                                          label={`${dayData.mood}/5`} 
                                          color="secondary" 
                                          size="small" 
                                        />
                                      )}
                                    </Box>
                                  </Box>
                                  
                                  {dayData.meal_count > 0 && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                      Meals logged: {dayData.meal_count}
                                    </Typography>
                                  )}
                                  
                                  {dayData.notes && (
                                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                      Notes: {dayData.notes}
                                    </Typography>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </Stack>
                        ) : (
                          <Alert severity="info" sx={{ textAlign: 'center' }}>
                            No historical data available yet. Start tracking today!
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </motion.div>
            )}
          </AnimatePresence>
        </Container>

        {/* Floating Action Button for Quick Actions */}
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setShowBowelModal(true)}
        >
          <Add />
        </Fab>

        {/* Enhanced Modals */}
        <BowelMovementModal 
          isOpen={showBowelModal}
          onClose={() => setShowBowelModal(false)}
          onSave={addBowelMovement}
        />
        
        <FoodTrackingModal 
          isOpen={showFoodModal}
          onClose={() => setShowFoodModal(false)}
          onSave={addMeal}
        />
      </Box>
    </ThemeProvider>
  );
};

export default ConstipationReliefTracker;