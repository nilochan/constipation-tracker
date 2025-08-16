import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Fab,
  Stack,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  CircularProgress,
  Backdrop,
  Divider,
  Tooltip,
  Badge,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  FormHelperText,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
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
  SentimentSatisfied,
  SentimentNeutral,
  LocalPharmacy,
  FitnessCenter,
  RestaurantMenu,
  Delete,
  CalendarToday,
  WaterDrop,
  BarChart,
  Save,
  CheckCircle,
  Refresh,
  TrendingUp,
  Timeline,
  Assessment,
  History,
  CloudUpload,
  GetApp,
  Print,
  Share,
  Favorite,
  ExpandMore,
  Edit,
  Schedule,
  LocalDining,
  SportsHandball,
  Psychology,
  Hotel,
  MonitorWeight,
  Insights
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart as RechartsBarChart, Bar, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { createTheme, ThemeProvider, styled } from '@mui/material/styles';
import ApiService from './services/api';
import AuthForms from './components/AuthForms-Enhanced';

// Debounce utility function
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Create enhanced theme
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
    info: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
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

// Enhanced styled components
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

const AnalyticsCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%)',
  border: `1px solid ${theme.palette.info.light}`,
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
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [lastSaved, setLastSaved] = useState(null);
  const [notesText, setNotesText] = useState('');
  const [notesSaved, setNotesSaved] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [dateRange, setDateRange] = useState(30);
  const [showInsights, setShowInsights] = useState(false);

  // Debounced values for better performance
  const debouncedWaterGlasses = useDebounce(dailyData[currentDate]?.waterGlasses || 0, 300);
  const debouncedMood = useDebounce(dailyData[currentDate]?.mood || null, 500);
  const debouncedStress = useDebounce(dailyData[currentDate]?.stressLevel || null, 500);
  const debouncedSleep = useDebounce(dailyData[currentDate]?.sleepQuality || null, 500);

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

  // Show notification
  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  // Load daily data function with enhanced error handling
  const loadDailyData = useCallback(async (date) => {
    try {
      console.log(`📅 Loading daily data for ${date}...`);
      const data = await ApiService.getDailyData(date);
      console.log('✅ Loaded data:', data);
      
      const dayData = data || initializeDayData(date);
      setDailyData(prev => ({
        ...prev,
        [date]: dayData
      }));
      
      // Set notes text
      setNotesText(dayData.notes || '');
      setNotesSaved(true);
      
    } catch (error) {
      console.error('❌ Failed to load daily data:', error);
      showNotification('Failed to load daily data', 'error');
      setDailyData(prev => ({
        ...prev,
        [date]: initializeDayData(date)
      }));
    }
  }, []);

  // Enhanced analytics loading with better error handling
  const loadAnalyticsData = useCallback(async (days = 30) => {
    if (!isAuthenticated) return;
    
    setAnalyticsLoading(true);
    try {
      console.log(`📊 Loading analytics data for ${days} days...`);
      const data = await ApiService.getAnalytics(days);
      console.log('✅ Analytics data loaded:', data);
      setAnalyticsData(data);
    } catch (error) {
      console.error('❌ Failed to load analytics data:', error);
      showNotification('Failed to load analytics data', 'error');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [isAuthenticated]);

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

  // Load analytics data when switching to analytics tab or date range changes
  useEffect(() => {
    if (isAuthenticated && activeTab === 1) {
      loadAnalyticsData(dateRange);
    }
  }, [activeTab, isAuthenticated, loadAnalyticsData, dateRange]);

  // Debounced auto-save effects for better performance
  useEffect(() => {
    if (isAuthenticated && currentDate && debouncedWaterGlasses !== (dailyData[currentDate]?.waterGlasses || 0)) {
      updateDailyDataSilent({ waterGlasses: debouncedWaterGlasses });
    }
  }, [debouncedWaterGlasses, isAuthenticated, currentDate]);

  useEffect(() => {
    if (isAuthenticated && currentDate && debouncedMood !== (dailyData[currentDate]?.mood || null)) {
      updateDailyDataSilent({ mood: debouncedMood });
    }
  }, [debouncedMood, isAuthenticated, currentDate]);

  useEffect(() => {
    if (isAuthenticated && currentDate && debouncedStress !== (dailyData[currentDate]?.stressLevel || null)) {
      updateDailyDataSilent({ stressLevel: debouncedStress });
    }
  }, [debouncedStress, isAuthenticated, currentDate]);

  useEffect(() => {
    if (isAuthenticated && currentDate && debouncedSleep !== (dailyData[currentDate]?.sleepQuality || null)) {
      updateDailyDataSilent({ sleepQuality: debouncedSleep });
    }
  }, [debouncedSleep, isAuthenticated, currentDate]);

  const handleLogin = async (credentials) => {
    setAuthLoading(true);
    try {
      const response = await ApiService.login(credentials);
      setUser(response.user);
      setIsAuthenticated(true);
      showNotification('Welcome back! 🎉', 'success');
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
      showNotification('Account created successfully! 🎉', 'success');
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
    showNotification('See you next time! 👋', 'info');
  };

  // Get current day data
  const getCurrentDayData = () => {
    return dailyData[currentDate] || initializeDayData(currentDate);
  };

  // Silent update for debounced auto-save (no notifications)
  const updateDailyDataSilent = async (updates) => {
    const newData = {
      ...getCurrentDayData(),
      ...updates
    };
    
    setDailyData(prev => ({
      ...prev,
      [currentDate]: newData
    }));

    try {
      console.log('🔄 Silent auto-save:', updates);
      await ApiService.updateDailyData(currentDate, updates);
      setLastSaved(new Date());
    } catch (error) {
      console.error('❌ Silent save failed:', error);
    }
  };

  // Enhanced update daily data with notifications
  const updateDailyData = async (updates, silent = false) => {
    const newData = {
      ...getCurrentDayData(),
      ...updates
    };
    
    setDailyData(prev => ({
      ...prev,
      [currentDate]: newData
    }));

    if (!silent) setIsSaving(true);
    try {
      console.log('💾 Saving updates:', updates);
      await ApiService.updateDailyData(currentDate, updates);
      setLastSaved(new Date());
      if (!silent) showNotification('Data saved! ✅', 'success');
      
      // Refresh analytics if on analytics tab
      if (activeTab === 1) {
        loadAnalyticsData(dateRange);
      }
    } catch (error) {
      console.error('❌ Failed to update daily data:', error);
      if (!silent) showNotification('Failed to save data', 'error');
      
      // Revert optimistic update on error
      setDailyData(prev => ({
        ...prev,
        [currentDate]: getCurrentDayData()
      }));
    } finally {
      if (!silent) setIsSaving(false);
    }
  };

  // Manual save for notes
  const saveNotes = async () => {
    setIsSaving(true);
    try {
      await updateDailyData({ notes: notesText }, false);
      setNotesSaved(true);
      showNotification('Notes saved! 📝', 'success');
    } catch (error) {
      showNotification('Failed to save notes', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle notes text change
  const handleNotesChange = (e) => {
    setNotesText(e.target.value);
    setNotesSaved(false);
  };

  // Fiber-rich foods and supplements
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
    { name: 'Olive oil (1 tbsp)', note: 'Add to cooked vegetables' },
    { name: 'Probiotics', note: 'Support gut health' },
    { name: 'Magnesium', note: 'Consult doctor first' }
  ];

  const dailyRoutine = [
    'Morning warm water (1-2 glasses)',
    '15-20 minute walk',
    'Regular meal times',
    'Toilet time after meals',
    'Gentle abdominal massage',
    'Deep breathing exercises',
    'Adequate sleep (7-8 hours)'
  ];

  const currentData = getCurrentDayData();

  const handleItemCheck = async (category, index) => {
    const key = `${category}-${index}`;
    const newCheckedItems = {
      ...currentData.checkedItems,
      [key]: !currentData.checkedItems[key]
    };
    console.log(`✅ Updating checklist item ${key}:`, !currentData.checkedItems[key]);
    await updateDailyData({ checkedItems: newCheckedItems });
  };

  const isItemChecked = (category, index) => {
    const key = `${category}-${index}`;
    return currentData.checkedItems[key] || false;
  };

  const adjustWater = async (amount) => {
    const newAmount = Math.max(0, currentData.waterGlasses + amount);
    console.log(`💧 Updating water glasses to: ${newAmount}`);
    // Update immediately for responsive UI
    setDailyData(prev => ({
      ...prev,
      [currentDate]: {
        ...getCurrentDayData(),
        waterGlasses: newAmount
      }
    }));
  };

  const addBowelMovement = async (bristolType, urgency, straining, satisfaction) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    setIsSaving(true);
    try {
      console.log('🚽 Adding bowel movement:', { bristolType, urgency, straining, satisfaction });
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

      showNotification('Bowel movement recorded! 🎯', 'success');
      
      // Refresh analytics if on analytics tab
      if (activeTab === 1) {
        loadAnalyticsData(dateRange);
      }
    } catch (error) {
      console.error('❌ Failed to add bowel movement:', error);
      showNotification('Failed to record bowel movement', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const removeBowelMovement = async (id) => {
    setIsSaving(true);
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
      showNotification('Record deleted', 'info');
      
      // Refresh analytics if on analytics tab
      if (activeTab === 1) {
        loadAnalyticsData(dateRange);
      }
    } catch (error) {
      console.error('❌ Failed to remove bowel movement:', error);
      showNotification('Failed to delete record', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const addMeal = async (mealData) => {
    setIsSaving(true);
    try {
      console.log('🍽️ Adding meal:', mealData);
      const newMeal = await ApiService.addMeal(currentDate, mealData);
      const updatedMeals = [...(currentData.meals || []), newMeal];
      setDailyData(prev => ({
        ...prev,
        [currentDate]: {
          ...currentData,
          meals: updatedMeals
        }
      }));
      showNotification('Meal logged! 🍽️', 'success');
      
      // Refresh analytics if on analytics tab
      if (activeTab === 1) {
        loadAnalyticsData(dateRange);
      }
    } catch (error) {
      console.error('❌ Failed to add meal:', error);
      showNotification('Failed to log meal', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const getWaterStatus = (glasses) => {
    if (glasses >= 8) return { color: 'success', message: 'Excellent hydration! 🎉' };
    if (glasses >= 6) return { color: 'primary', message: 'Good progress! 👍' };
    if (glasses >= 4) return { color: 'warning', message: 'Keep going! 💪' };
    return { color: 'error', message: 'Need more water 💧' };
  };

  const waterStatus = getWaterStatus(currentData.waterGlasses);

  // Enhanced analytics calculations
  const getAdvancedStats = useMemo(() => {
    if (!analyticsData || !analyticsData.historicalData) return {
      avgWater: '0.0',
      bowelMovementDays: 0,
      totalBowelMovements: 0,
      bristolCounts: {},
      avgMood: '0.0',
      moodSamples: 0,
      consistencyScore: 0,
      hydrationTrend: 'stable',
      healthScore: 0
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

    // Consistency score (percentage of days with BM)
    const consistencyScore = historicalData.length > 0 ? 
      (bowelMovementDays / historicalData.length) * 100 : 0;

    // Hydration trend
    const recentWater = historicalData.slice(-7).reduce((sum, day) => sum + (day.water_glasses || 0), 0) / 7;
    const olderWater = historicalData.slice(-14, -7).reduce((sum, day) => sum + (day.water_glasses || 0), 0) / 7;
    const hydrationTrend = recentWater > olderWater ? 'improving' : 
                          recentWater < olderWater ? 'declining' : 'stable';

    // Overall health score (0-100)
    const waterScore = Math.min((avgWater / 8) * 30, 30);
    const moodScore = (avgMood / 5) * 20;
    const consistencyScore2 = consistencyScore * 0.3;
    const normalBristolPercentage = ((bristolCounts[3] || 0) + (bristolCounts[4] || 0)) / Math.max(totalBowelMovements, 1) * 20;
    const healthScore = waterScore + moodScore + consistencyScore2 + normalBristolPercentage;

    return {
      avgWater: avgWater.toFixed(1),
      bowelMovementDays,
      totalBowelMovements,
      bristolCounts,
      avgMood: avgMood.toFixed(1),
      moodSamples: moodData.length,
      consistencyScore: consistencyScore.toFixed(1),
      hydrationTrend,
      healthScore: Math.round(healthScore)
    };
  }, [analyticsData]);

  // Get historical data for trends
  const getHistoricalData = () => {
    if (!analyticsData || !analyticsData.historicalData) return [];
    return analyticsData.historicalData.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // Generate health insights
  const generateInsights = () => {
    const stats = getAdvancedStats;
    const insights = [];

    if (parseFloat(stats.avgWater) < 6) {
      insights.push({
        type: 'warning',
        title: 'Hydration Needs Attention',
        message: 'Your average water intake is below recommended levels. Aim for 8-10 glasses daily.',
        icon: <WaterDrop />
      });
    }

    if (parseFloat(stats.consistencyScore) < 70) {
      insights.push({
        type: 'info',
        title: 'Consistency Can Improve',
        message: 'Regular bowel movements are important. Consider adding more fiber and routine.',
        icon: <Schedule />
      });
    }

    if (parseFloat(stats.avgMood) >= 4) {
      insights.push({
        type: 'success',
        title: 'Great Mood Tracking!',
        message: 'Your mood has been consistently positive. Keep up the good work!',
        icon: <Mood />
      });
    }

    if (stats.healthScore >= 80) {
      insights.push({
        type: 'success',
        title: 'Excellent Health Score!',
        message: 'Your overall digestive health tracking shows great consistency.',
        icon: <Favorite />
      });
    }

    return insights;
  };

  // Enhanced Bowel Movement Modal with step-by-step guide
  const BowelMovementModal = ({ isOpen, onClose, onSave }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [selectedBristol, setSelectedBristol] = useState(null);
    const [urgency, setUrgency] = useState(3);
    const [straining, setStraining] = useState(false);
    const [satisfaction, setSatisfaction] = useState(3);

    const steps = ['Select Bristol Type', 'Rate Experience', 'Review & Save'];

    const handleNext = () => {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    };

    const handleBack = () => {
      setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    const handleSave = () => {
      if (selectedBristol) {
        onSave(selectedBristol, urgency, straining, satisfaction);
        onClose();
        setActiveStep(0);
        setSelectedBristol(null);
        setUrgency(3);
        setStraining(false);
        setSatisfaction(3);
      }
    };

    return (
      <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <AccessTime color="primary" />
            Record Bowel Movement
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} orientation="vertical">
            <Step>
              <StepLabel>Select Bristol Stool Scale Type</StepLabel>
              <StepContent>
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
                <Box sx={{ mb: 2, mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={!selectedBristol}
                  >
                    Next
                  </Button>
                </Box>
              </StepContent>
            </Step>
            
            <Step>
              <StepLabel>Rate Your Experience</StepLabel>
              <StepContent>
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
                <Box sx={{ mb: 2, mt: 2 }}>
                  <Button onClick={handleBack} sx={{ mr: 1 }}>
                    Back
                  </Button>
                  <Button variant="contained" onClick={handleNext}>
                    Next
                  </Button>
                </Box>
              </StepContent>
            </Step>
            
            <Step>
              <StepLabel>Review & Save</StepLabel>
              <StepContent>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="h6" gutterBottom>Summary</Typography>
                  <Typography>Bristol Type: {selectedBristol}</Typography>
                  <Typography>Urgency: {urgency}/5</Typography>
                  <Typography>Straining: {straining ? 'Yes' : 'No'}</Typography>
                  <Typography>Satisfaction: {satisfaction}/5</Typography>
                </Paper>
                <Box sx={{ mb: 2, mt: 2 }}>
                  <Button onClick={handleBack} sx={{ mr: 1 }}>
                    Back
                  </Button>
                  <Button 
                    variant="contained" 
                    onClick={handleSave}
                    disabled={isSaving}
                    startIcon={isSaving ? <CircularProgress size={16} /> : <Save />}
                  >
                    {isSaving ? 'Saving...' : 'Save Movement'}
                  </Button>
                </Box>
              </StepContent>
            </Step>
          </Stepper>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
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
                <MenuItem value="breakfast">🌅 Breakfast</MenuItem>
                <MenuItem value="lunch">☀️ Lunch</MenuItem>
                <MenuItem value="dinner">🌙 Dinner</MenuItem>
                <MenuItem value="snack">🍎 Snack</MenuItem>
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
              helperText="Describe what you ate in detail"
            />

            <FormControl fullWidth>
              <InputLabel>Portion Size</InputLabel>
              <Select
                value={portion}
                onChange={(e) => setPortion(e.target.value)}
                label="Portion Size"
              >
                <MenuItem value="small">🥄 Small</MenuItem>
                <MenuItem value="medium">🍽️ Medium</MenuItem>
                <MenuItem value="large">🍖 Large</MenuItem>
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
            disabled={isSaving}
            variant="contained"
            color="success"
            startIcon={isSaving ? <CircularProgress size={16} /> : <Save />}
          >
            {isSaving ? 'Saving...' : 'Save Meal'}
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
        {/* Enhanced App Bar */}
        <AppBar position="sticky" elevation={0} sx={{ backgroundColor: 'white', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Toolbar>
            <Box display="flex" alignItems="center" gap={2} flexGrow={1}>
              <Typography variant="h2" component="span">🐰</Typography>
              <Box>
                <Typography variant="h6" color="text.primary" fontWeight="bold">
                  Constipation Relief Tracker
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Professional Health Monitoring
                </Typography>
              </Box>
            </Box>
            <Box display="flex" alignItems="center" gap={2}>
              {/* Health Score Badge */}
              {getAdvancedStats.healthScore > 0 && (
                <Tooltip title="Overall Health Score">
                  <Badge badgeContent={`${getAdvancedStats.healthScore}%`} color="primary">
                    <Assessment color="action" />
                  </Badge>
                </Tooltip>
              )}
              
              {/* Save status indicator */}
              {isSaving && (
                <Box display="flex" alignItems="center" gap={1}>
                  <CircularProgress size={16} />
                  <Typography variant="caption" color="text.secondary">Saving...</Typography>
                </Box>
              )}
              {lastSaved && !isSaving && (
                <Tooltip title={`Last saved: ${lastSaved.toLocaleString()}`}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <CheckCircle color="success" fontSize="small" />
                    <Typography variant="caption" color="text.secondary">
                      {lastSaved.toLocaleTimeString()}
                    </Typography>
                  </Box>
                </Tooltip>
              )}
              
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
          {/* Enhanced Date Picker */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
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
                  
                  <Box display="flex" gap={1}>
                    <Button
                      size="small"
                      startIcon={<Refresh />}
                      onClick={() => {
                        loadDailyData(currentDate);
                        if (activeTab === 1) loadAnalyticsData(dateRange);
                      }}
                    >
                      Refresh
                    </Button>
                    <Button
                      size="small"
                      startIcon={<Insights />}
                      onClick={() => setShowInsights(!showInsights)}
                      color={showInsights ? 'primary' : 'inherit'}
                    >
                      Insights
                    </Button>
                  </Box>
                </Box>
                
                {/* Daily Health Insights */}
                {showInsights && (
                  <Box sx={{ mt: 2 }}>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="h6" gutterBottom>Today's Quick Stats</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'info.50' }}>
                          <Typography variant="h4" color="info.main">
                            {currentData.waterGlasses}
                          </Typography>
                          <Typography variant="caption">Glasses</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'success.50' }}>
                          <Typography variant="h4" color="success.main">
                            {currentData.bowelMovements?.length || 0}
                          </Typography>
                          <Typography variant="caption">BM Today</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'warning.50' }}>
                          <Typography variant="h4" color="warning.main">
                            {currentData.meals?.length || 0}
                          </Typography>
                          <Typography variant="caption">Meals</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'secondary.50' }}>
                          <Typography variant="h4" color="secondary.main">
                            {currentData.mood || 0}
                          </Typography>
                          <Typography variant="caption">Mood</Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Enhanced Tab Navigation */}
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
                icon={analyticsLoading ? <CircularProgress size={16} /> : <Analytics />} 
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
                        action={
                          <Chip 
                            label={`Health Score: ${getAdvancedStats.healthScore}%`} 
                            color="primary" 
                            size="small"
                            sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.2)' }}
                          />
                        }
                      />
                      <CardContent>
                        <Grid container spacing={3}>
                          {/* Mood Tracking */}
                          <Grid item xs={12} md={4}>
                            <Paper sx={{ p: 2, textAlign: 'center' }}>
                              <Typography variant="h6" gutterBottom>Mood</Typography>
                              <Rating
                                value={currentData.mood || 0}
                                onChange={(e, value) => {
                                  setDailyData(prev => ({
                                    ...prev,
                                    [currentDate]: { ...getCurrentDayData(), mood: value }
                                  }));
                                }}
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
                                onChange={(e, value) => {
                                  setDailyData(prev => ({
                                    ...prev,
                                    [currentDate]: { ...getCurrentDayData(), stressLevel: value }
                                  }));
                                }}
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
                                  {(currentData.stressLevel || 5) >= 7 ? 'High Stress 😰' :
                                   (currentData.stressLevel || 5) >= 4 ? 'Moderate 😐' : 'Low Stress 😌'}
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
                                onChange={(e, value) => {
                                  setDailyData(prev => ({
                                    ...prev,
                                    [currentDate]: { ...getCurrentDayData(), sleepQuality: value }
                                  }));
                                }}
                                max={5}
                                size="large"
                              />
                              <Box textAlign="center" sx={{ mt: 1 }}>
                                <Typography variant="h5" fontWeight="bold">
                                  {currentData.sleepQuality || 0}/5
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {(currentData.sleepQuality || 0) >= 4 ? 'Great Sleep 😴' :
                                   (currentData.sleepQuality || 0) >= 3 ? 'Fair Sleep 😊' : 
                                   (currentData.sleepQuality || 0) >= 1 ? 'Poor Sleep 😞' : 'Not rated'}
                                </Typography>
                              </Box>
                            </Paper>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </GradientCard>
                  </Grid>

                  {/* Enhanced Water Tracking */}
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardHeader
                        avatar={<WaterDrop color="primary" />}
                        title="Daily Hydration"
                        titleTypographyProps={{ fontWeight: 'bold' }}
                        subheader={`Target: 8-10 glasses • Progress: ${Math.round((currentData.waterGlasses / 8) * 100)}%`}
                      />
                      <CardContent>
                        <Box display="flex" alignItems="center" justifyContent="center" gap={3} mb={3}>
                          <WaterButton onClick={() => adjustWater(-1)} disabled={isSaving || currentData.waterGlasses <= 0}>
                            <Remove />
                          </WaterButton>
                          
                          <Box textAlign="center">
                            <Typography variant="h2" color="primary.main" fontWeight="bold">
                              {currentData.waterGlasses}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              glasses (250ml each)
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              = {(currentData.waterGlasses * 250).toLocaleString()}ml total
                            </Typography>
                          </Box>
                          
                          <WaterButton onClick={() => adjustWater(1)} disabled={isSaving}>
                            <Add />
                          </WaterButton>
                        </Box>
                        
                        <Alert severity={waterStatus.color} sx={{ mb: 2 }}>
                          {waterStatus.message}
                        </Alert>
                        
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.min((currentData.waterGlasses / 10) * 100, 100)}
                          sx={{ height: 12, borderRadius: 6 }}
                        />
                        
                        {/* Quick add buttons */}
                        <Box display="flex" gap={1} sx={{ mt: 2 }}>
                          <Button size="small" onClick={() => adjustWater(2)} disabled={isSaving}>
                            +2 glasses
                          </Button>
                          <Button size="small" onClick={() => adjustWater(4)} disabled={isSaving}>
                            +4 glasses
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Enhanced Quick Stats */}
                  <Grid item xs={12} md={6}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <StatsCard>
                          <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={1}>
                            <SportsHandball />
                            <Typography variant="h3" fontWeight="bold">
                              {currentData.bowelMovements?.length || 0}
                            </Typography>
                          </Box>
                          <Typography variant="body2">
                            Bowel Movements Today
                          </Typography>
                        </StatsCard>
                      </Grid>
                      <Grid item xs={6}>
                        <StatsCard>
                          <Box display="flex" alignItems="center" justifyContent="center" gap={1} mb={1}>
                            <LocalDining />
                            <Typography variant="h3" fontWeight="bold">
                              {currentData.meals?.length || 0}
                            </Typography>
                          </Box>
                          <Typography variant="body2">
                            Meals Logged
                          </Typography>
                        </StatsCard>
                      </Grid>
                    </Grid>
                    
                    {/* Completion Progress */}
                    <Card sx={{ mt: 2 }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Daily Progress</Typography>
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Completion: {Math.round(((currentData.waterGlasses > 0 ? 1 : 0) + 
                                        (currentData.mood ? 1 : 0) + 
                                        (currentData.bowelMovements?.length > 0 ? 1 : 0) + 
                                        (currentData.meals?.length > 0 ? 1 : 0)) / 4 * 100)}%
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={((currentData.waterGlasses > 0 ? 1 : 0) + 
                                   (currentData.mood ? 1 : 0) + 
                                   (currentData.bowelMovements?.length > 0 ? 1 : 0) + 
                                   (currentData.meals?.length > 0 ? 1 : 0)) / 4 * 100}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Enhanced Bowel Movement Tracker */}
                  <Grid item xs={12}>
                    <Card>
                      <CardHeader
                        avatar={<AccessTime color="secondary" />}
                        title="Bowel Movement Tracker"
                        titleTypographyProps={{ fontWeight: 'bold' }}
                        subheader="Track frequency, consistency, and quality"
                        action={
                          <Button
                            startIcon={<Add />}
                            onClick={() => setShowBowelModal(true)}
                            variant="contained"
                            color="secondary"
                            disabled={isSaving}
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
                                          🕐 {movement.time} • {new Date(movement.date || currentDate).toLocaleDateString()}
                                        </Typography>
                                        <Typography variant="body1" sx={{ mt: 1 }}>
                                          <strong>Bristol Type {movement.bristolType}</strong>: {bristolInfo?.name}
                                        </Typography>
                                        <Box display="flex" gap={1} sx={{ mt: 1 }} flexWrap="wrap">
                                          <Chip 
                                            label={`Urgency: ${movement.urgency}/5`} 
                                            size="small"
                                            color={movement.urgency >= 4 ? 'error' : movement.urgency >= 3 ? 'warning' : 'success'}
                                          />
                                          <Chip 
                                            label={movement.straining ? 'Had to strain' : 'Easy passage'}
                                            color={movement.straining ? 'error' : 'success'}
                                            size="small"
                                          />
                                          <Chip 
                                            label={`Satisfaction: ${movement.satisfaction}/5`} 
                                            size="small"
                                            color={movement.satisfaction >= 4 ? 'success' : movement.satisfaction >= 3 ? 'primary' : 'warning'}
                                          />
                                        </Box>
                                      </Box>
                                      <IconButton
                                        onClick={() => removeBowelMovement(movement.id)}
                                        color="error"
                                        size="small"
                                        disabled={isSaving}
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
                          <Alert severity="info" icon={<Schedule />}>
                            No bowel movements recorded today. Regular tracking helps identify patterns!
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Enhanced Food Tracking */}
                  <Grid item xs={12}>
                    <Card>
                      <CardHeader
                        avatar={<RestaurantMenu color="success" />}
                        title="Food Tracking"
                        titleTypographyProps={{ fontWeight: 'bold' }}
                        subheader="Monitor meals and identify triggers"
                        action={
                          <Button
                            startIcon={<Add />}
                            onClick={() => setShowFoodModal(true)}
                            variant="contained"
                            color="success"
                            disabled={isSaving}
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
                                        {meal.mealType === 'breakfast' ? '🌅' : 
                                         meal.mealType === 'lunch' ? '☀️' : 
                                         meal.mealType === 'dinner' ? '🌙' : '🍎'} {meal.mealType}
                                      </Typography>
                                      <Typography variant="body1" sx={{ mt: 1 }}>
                                        {meal.foodItems}
                                      </Typography>
                                      <Box display="flex" gap={1} sx={{ mt: 1 }} flexWrap="wrap">
                                        <Chip 
                                          label={`Portion: ${meal.portion}`} 
                                          size="small"
                                          color={meal.portion === 'large' ? 'warning' : 'primary'}
                                        />
                                        {meal.triggerFoods && meal.triggerFoods.length > 0 && (
                                          meal.triggerFoods.map(trigger => (
                                            <Chip key={trigger} label={`⚠️ ${trigger}`} color="error" size="small" />
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
                          <Alert severity="info" icon={<LocalDining />}>
                            No meals logged today. Track your food to identify patterns and triggers!
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Enhanced Fiber Foods */}
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardHeader
                        avatar={<LocalPharmacy color="success" />}
                        title="Eczema-Safe Fiber Foods"
                        titleTypographyProps={{ fontWeight: 'bold' }}
                        subheader="Daily fiber checklist"
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
                                  disabled={isSaving}
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

                  {/* Enhanced Daily Routine */}
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardHeader
                        avatar={<FitnessCenter color="primary" />}
                        title="Daily Routine Checklist"
                        titleTypographyProps={{ fontWeight: 'bold' }}
                        subheader="Healthy habits tracker"
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
                                  disabled={isSaving}
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
                        
                        {/* Progress indicator */}
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Routine Completion: {Math.round((dailyRoutine.filter((_, index) => isItemChecked('routine', index)).length / dailyRoutine.length) * 100)}%
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={(dailyRoutine.filter((_, index) => isItemChecked('routine', index)).length / dailyRoutine.length) * 100}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Enhanced Notes with Manual Save */}
                  <Grid item xs={12}>
                    <Card>
                      <CardHeader
                        avatar={<Notes color="primary" />}
                        title="Daily Notes"
                        titleTypographyProps={{ fontWeight: 'bold' }}
                        subheader="Record observations and feelings"
                        action={
                          <Button
                            startIcon={<Save />}
                            onClick={saveNotes}
                            variant={notesSaved ? "outlined" : "contained"}
                            color={notesSaved ? "success" : "primary"}
                            disabled={isSaving || notesSaved}
                            size="small"
                          >
                            {isSaving ? 'Saving...' : notesSaved ? 'Saved' : 'Save Notes'}
                          </Button>
                        }
                      />
                      <CardContent>
                        <TextField
                          fullWidth
                          multiline
                          rows={4}
                          value={notesText}
                          onChange={handleNotesChange}
                          placeholder="How did you feel today? Any improvements or concerns? What worked well?"
                          variant="outlined"
                          disabled={isSaving}
                          helperText={
                            !notesSaved ? (
                              <Box display="flex" alignItems="center" gap={1} sx={{ color: 'warning.main' }}>
                                <Edit fontSize="small" />
                                You have unsaved changes
                              </Box>
                            ) : (
                              <Box display="flex" alignItems="center" gap={1} sx={{ color: 'success.main' }}>
                                <CheckCircle fontSize="small" />
                                Notes saved successfully
                              </Box>
                            )
                          }
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
                {analyticsLoading ? (
                  <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <CircularProgress size={60} />
                    <Typography variant="h6" sx={{ ml: 2 }}>Loading Analytics...</Typography>
                  </Box>
                ) : (
                  <Grid container spacing={3}>
                    {/* Date Range Selector */}
                    <Grid item xs={12}>
                      <Card>
                        <CardContent>
                          <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Typography variant="h6">Analytics Dashboard</Typography>
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                              <InputLabel>Time Range</InputLabel>
                              <Select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                                label="Time Range"
                              >
                                <MenuItem value={7}>Last 7 days</MenuItem>
                                <MenuItem value={14}>Last 2 weeks</MenuItem>
                                <MenuItem value={30}>Last 30 days</MenuItem>
                                <MenuItem value={90}>Last 3 months</MenuItem>
                              </Select>
                            </FormControl>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Health Insights */}
                    <Grid item xs={12}>
                      <AnalyticsCard>
                        <CardHeader
                          avatar={<Psychology color="info" />}
                          title="Health Insights"
                          titleTypographyProps={{ fontWeight: 'bold' }}
                        />
                        <CardContent>
                          <Grid container spacing={2}>
                            {generateInsights().map((insight, index) => (
                              <Grid item xs={12} md={6} key={index}>
                                <Alert 
                                  severity={insight.type} 
                                  icon={insight.icon}
                                  sx={{ height: '100%' }}
                                >
                                  <Typography variant="subtitle1" fontWeight="bold">
                                    {insight.title}
                                  </Typography>
                                  <Typography variant="body2">
                                    {insight.message}
                                  </Typography>
                                </Alert>
                              </Grid>
                            ))}
                          </Grid>
                        </CardContent>
                      </AnalyticsCard>
                    </Grid>

                    {/* Advanced Stats */}
                    <Grid item xs={12}>
                      <Card>
                        <CardHeader
                          avatar={<BarChart color="primary" />}
                          title={`Advanced Analytics (${dateRange} Days)`}
                          titleTypographyProps={{ fontWeight: 'bold' }}
                        />
                        <CardContent>
                          <Grid container spacing={3}>
                            <Grid item xs={12} sm={6} md={3}>
                              <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'primary.50' }}>
                                <WaterDrop color="primary" sx={{ fontSize: 40, mb: 1 }} />
                                <Typography variant="h3" color="primary.main" fontWeight="bold">
                                  {getAdvancedStats.avgWater}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Avg Glasses/Day
                                </Typography>
                                <Chip 
                                  label={getAdvancedStats.hydrationTrend} 
                                  color={getAdvancedStats.hydrationTrend === 'improving' ? 'success' : 
                                         getAdvancedStats.hydrationTrend === 'declining' ? 'error' : 'primary'}
                                  size="small"
                                  sx={{ mt: 1 }}
                                />
                              </Paper>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'success.50' }}>
                                <Schedule color="success" sx={{ fontSize: 40, mb: 1 }} />
                                <Typography variant="h3" color="success.main" fontWeight="bold">
                                  {getAdvancedStats.bowelMovementDays}/{dateRange}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Days with BM
                                </Typography>
                                <Chip 
                                  label={`${getAdvancedStats.consistencyScore}% consistency`}
                                  color={parseFloat(getAdvancedStats.consistencyScore) >= 70 ? 'success' : 'warning'}
                                  size="small"
                                  sx={{ mt: 1 }}
                                />
                              </Paper>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'secondary.50' }}>
                                <MonitorWeight color="secondary" sx={{ fontSize: 40, mb: 1 }} />
                                <Typography variant="h3" color="secondary.main" fontWeight="bold">
                                  {getAdvancedStats.totalBowelMovements}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Total BM Count
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {(getAdvancedStats.totalBowelMovements / Math.max(dateRange, 1)).toFixed(1)} per day avg
                                </Typography>
                              </Paper>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                              <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'warning.50' }}>
                                <Mood color="warning" sx={{ fontSize: 40, mb: 1 }} />
                                <Typography variant="h3" color="warning.main" fontWeight="bold">
                                  {getAdvancedStats.avgMood}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Avg Mood ({getAdvancedStats.moodSamples} samples)
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {parseFloat(getAdvancedStats.avgMood) >= 4 ? '😊 Great mood' : 
                                   parseFloat(getAdvancedStats.avgMood) >= 3 ? '😐 Neutral' : '😞 Needs attention'}
                                </Typography>
                              </Paper>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Overall Health Score */}
                    <Grid item xs={12}>
                      <Card>
                        <CardHeader
                          avatar={<Assessment color="info" />}
                          title="Overall Health Score"
                          titleTypographyProps={{ fontWeight: 'bold' }}
                        />
                        <CardContent>
                          <Box display="flex" alignItems="center" gap={4}>
                            <Box textAlign="center">
                              <Typography variant="h2" color="info.main" fontWeight="bold">
                                {getAdvancedStats.healthScore}%
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Health Score
                              </Typography>
                            </Box>
                            <Box flexGrow={1}>
                              <LinearProgress 
                                variant="determinate" 
                                value={getAdvancedStats.healthScore}
                                sx={{ height: 20, borderRadius: 10 }}
                                color={getAdvancedStats.healthScore >= 80 ? 'success' : 
                                       getAdvancedStats.healthScore >= 60 ? 'primary' : 'warning'}
                              />
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Based on hydration, mood, consistency, and Bristol scale patterns
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Water Intake Trend */}
                    <Grid item xs={12} md={6}>
                      <Card>
                        <CardHeader 
                          title="Water Intake Trend" 
                          titleTypographyProps={{ fontWeight: 'bold' }}
                          avatar={<Timeline color="primary" />}
                        />
                        <CardContent>
                          <Box sx={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                              <AreaChart data={getHistoricalData()}>
                                <defs>
                                  <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                  dataKey="date" 
                                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                />
                                <YAxis />
                                <RechartsTooltip 
                                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                                  formatter={(value) => [value, 'Glasses']}
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="water_glasses" 
                                  stroke={theme.palette.primary.main}
                                  fillOpacity={1}
                                  fill="url(#colorWater)"
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Bristol Scale Distribution */}
                    <Grid item xs={12} md={6}>
                      <Card>
                        <CardHeader 
                          title="Bristol Stool Scale Distribution" 
                          titleTypographyProps={{ fontWeight: 'bold' }}
                          avatar={<Assessment color="secondary" />}
                        />
                        <CardContent>
                          <Box sx={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                              <PieChart>
                                <Pie
                                  data={bristolScale.map(scale => ({
                                    name: `Type ${scale.type}`,
                                    value: getAdvancedStats.bristolCounts[scale.type] || 0,
                                    color: scale.borderColor
                                  })).filter(item => item.value > 0)}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, percent }) => percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
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

                    {/* Historical Records with Enhanced Display */}
                    <Grid item xs={12}>
                      <Card>
                        <CardHeader 
                          title="Daily History" 
                          titleTypographyProps={{ fontWeight: 'bold' }}
                          avatar={<History color="primary" />}
                          action={
                            <Button
                              startIcon={<Refresh />}
                              onClick={() => loadAnalyticsData(dateRange)}
                              size="small"
                            >
                              Refresh
                            </Button>
                          }
                        />
                        <CardContent>
                          {getHistoricalData().length > 0 ? (
                            <Stack spacing={2}>
                              {getHistoricalData().slice(0, dateRange).map((dayData) => (
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
                                      <Box display="flex" gap={1} flexWrap="wrap">
                                        <Chip 
                                          icon={<WaterDrop />} 
                                          label={`${dayData.water_glasses || 0} glasses`} 
                                          color={dayData.water_glasses >= 8 ? 'success' : dayData.water_glasses >= 6 ? 'primary' : 'warning'}
                                          size="small" 
                                        />
                                        <Chip 
                                          label={`${dayData.bowel_movement_count || 0} BM`} 
                                          color={dayData.bowel_movement_count > 0 ? 'success' : 'default'}
                                          size="small" 
                                        />
                                        {dayData.mood && (
                                          <Chip 
                                            icon={<Mood />} 
                                            label={`${dayData.mood}/5`} 
                                            color={dayData.mood >= 4 ? 'success' : dayData.mood >= 3 ? 'primary' : 'warning'}
                                            size="small" 
                                          />
                                        )}
                                      </Box>
                                    </Box>
                                    
                                    {dayData.meal_count > 0 && (
                                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        🍽️ Meals logged: {dayData.meal_count}
                                      </Typography>
                                    )}
                                    
                                    {dayData.notes && (
                                      <Typography variant="body2" sx={{ fontStyle: 'italic', bgcolor: 'grey.50', p: 1, borderRadius: 1 }}>
                                        📝 Notes: {dayData.notes}
                                      </Typography>
                                    )}
                                  </CardContent>
                                </Card>
                              ))}
                            </Stack>
                          ) : (
                            <Alert severity="info" sx={{ textAlign: 'center' }}>
                              <Typography variant="h6" gutterBottom>
                                No historical data available yet
                              </Typography>
                              <Typography variant="body2">
                                Start tracking your daily health metrics to see analytics and trends here!
                              </Typography>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </Container>

        {/* Enhanced Speed Dial for Quick Actions */}
        <SpeedDial
          ariaLabel="Quick Actions"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          icon={<SpeedDialIcon />}
          open={speedDialOpen}
          onClose={() => setSpeedDialOpen(false)}
          onOpen={() => setSpeedDialOpen(true)}
        >
          <SpeedDialAction
            icon={<AccessTime />}
            tooltipTitle="Record Bowel Movement"
            onClick={() => {
              setShowBowelModal(true);
              setSpeedDialOpen(false);
            }}
          />
          <SpeedDialAction
            icon={<Restaurant />}
            tooltipTitle="Log Meal"
            onClick={() => {
              setShowFoodModal(true);
              setSpeedDialOpen(false);
            }}
          />
          <SpeedDialAction
            icon={<WaterDrop />}
            tooltipTitle="Add Water"
            onClick={() => {
              adjustWater(1);
              setSpeedDialOpen(false);
            }}
          />
          <SpeedDialAction
            icon={<Refresh />}
            tooltipTitle="Refresh Data"
            onClick={() => {
              loadDailyData(currentDate);
              if (activeTab === 1) loadAnalyticsData(dateRange);
              setSpeedDialOpen(false);
            }}
          />
        </SpeedDial>

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

        {/* Enhanced Notification Snackbar */}
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={() => setNotification({ ...notification, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Alert 
            onClose={() => setNotification({ ...notification, open: false })} 
            severity={notification.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};

export default ConstipationReliefTracker;