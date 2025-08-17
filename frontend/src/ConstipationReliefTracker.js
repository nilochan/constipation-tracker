import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Minus, CheckCircle, Circle, Droplets, Apple, Calendar, Clock, BarChart3, Camera, Smile, Meh, Frown, LogOut, User } from 'lucide-react';
import ApiService from './services/api';
import AuthForms from './components/AuthForms';

const ConstipationReliefTracker = () => {
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('today');
  const [dailyData, setDailyData] = useState({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [showBowelModal, setShowBowelModal] = useState(false);
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileEmail, setProfileEmail] = useState('');

  // Bristol Stool Scale definitions with visual icons
  const bristolScale = [
    { 
      type: 1, 
      name: "Separate hard lumps", 
      description: "Like nuts (hard to pass)", 
      color: "bg-red-100 border-red-300", 
      severity: "Severe Constipation",
      icon: "🟤🟤🟤", // Small separate pieces
      emoji: "🔴",
      severityColor: "text-red-600"
    },
    { 
      type: 2, 
      name: "Sausage-shaped but lumpy", 
      description: "Hard and lumpy", 
      color: "bg-orange-100 border-orange-300", 
      severity: "Mild Constipation",
      icon: "🌭", // Sausage-like
      emoji: "🟠",
      severityColor: "text-orange-600"
    },
    { 
      type: 3, 
      name: "Sausage-shaped with cracks", 
      description: "Like a sausage but with cracks on surface", 
      color: "bg-yellow-100 border-yellow-300", 
      severity: "Normal",
      icon: "🥖", // Bread/sausage with cracks
      emoji: "🟡",
      severityColor: "text-yellow-600"
    },
    { 
      type: 4, 
      name: "Smooth and soft", 
      description: "Like a sausage or snake, smooth and soft", 
      color: "bg-green-100 border-green-300", 
      severity: "Normal",
      icon: "🌭", // Smooth sausage
      emoji: "🟢",
      severityColor: "text-green-600"
    },
    { 
      type: 5, 
      name: "Soft blobs with clear edges", 
      description: "Soft blobs with clear-cut edges", 
      color: "bg-blue-100 border-blue-300", 
      severity: "Lacking Fiber",
      icon: "⚫⚫⚫", // Blob shapes
      emoji: "🔵",
      severityColor: "text-blue-600"
    },
    { 
      type: 6, 
      name: "Fluffy pieces with ragged edges", 
      description: "Fluffy pieces with ragged edges, mushy", 
      color: "bg-purple-100 border-purple-300", 
      severity: "Mild Diarrhea",
      icon: "💭💭", // Cloud-like fluffy
      emoji: "🟣",
      severityColor: "text-purple-600"
    },
    { 
      type: 7, 
      name: "Watery, no solid pieces", 
      description: "Entirely liquid", 
      color: "bg-red-100 border-red-300", 
      severity: "Severe Diarrhea",
      icon: "💧💧💧", // Water drops
      emoji: "🔴",
      severityColor: "text-red-600"
    }
  ];

  // Initialize daily data structure
  const initializeDayData = (date) => ({
    date,
    waterGlasses: 0,
    checkedItems: {},
    bowelMovement: false,
    notes: '',
    dailyNotes: [], // Array for multiple notes per day
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
      // Initialize with empty data if load fails
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

  // Load profile when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
    }
  }, [isAuthenticated]);

  // Load analytics data when switching to analytics tab
  useEffect(() => {
    const loadAnalyticsData = async () => {
      if (isAuthenticated && activeTab === 'analytics') {
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

  const hydrationTips = [
    'Warm water first thing in morning',
    'Water 30 mins before each meal',
    'Herbal tea (caffeine-free)',
    'Room temperature water throughout day'
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

  // Daily notes functions
  const addDailyNote = async () => {
    if (!currentNote.trim()) return;

    try {
      const newNote = await ApiService.addDailyNote(currentDate, currentNote.trim());
      const updatedNotes = [...(currentData.dailyNotes || []), newNote];
      setDailyData(prev => ({
        ...prev,
        [currentDate]: {
          ...currentData,
          dailyNotes: updatedNotes
        }
      }));
      setCurrentNote('');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Failed to add daily note:', error);
    }
  };

  const deleteDailyNote = async (noteId) => {
    try {
      await ApiService.deleteDailyNote(currentDate, noteId);
      const updatedNotes = (currentData.dailyNotes || []).filter(note => note.id !== noteId);
      setDailyData(prev => ({
        ...prev,
        [currentDate]: {
          ...currentData,
          dailyNotes: updatedNotes
        }
      }));
    } catch (error) {
      console.error('Failed to delete daily note:', error);
    }
  };

  // Profile functions
  const loadProfile = async () => {
    try {
      const profile = await ApiService.getProfile();
      setProfileData(profile);
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const updateProfile = async (updates) => {
    try {
      const updated = await ApiService.updateProfile(updates);
      setProfileData(updated);
      setUser(updated);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const exportData = async () => {
    try {
      const blob = await ApiService.exportData();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `health_data_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const getWaterStatus = (glasses) => {
    if (glasses >= 8) return { color: 'text-green-600', message: 'Excellent hydration!' };
    if (glasses >= 6) return { color: 'text-blue-600', message: 'Good progress' };
    if (glasses >= 4) return { color: 'text-yellow-600', message: 'Keep going' };
    return { color: 'text-red-500', message: 'Need more water' };
  };

  const waterStatus = getWaterStatus(currentData.waterGlasses);

  // Get advanced stats from analytics data (including today's data)
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
    let allData = [...historicalData];
    
    // Add today's data if it exists and is not already in historical data
    const todayDate = new Date().toISOString().split('T')[0];
    const todayExists = allData.some(day => day.date === todayDate);
    
    if (!todayExists && dailyData[todayDate]) {
      const todayData = dailyData[todayDate];
      allData.push({
        date: todayDate,
        water_glasses: todayData.waterGlasses || 0,
        bowel_movement_count: (todayData.bowelMovements || []).length,
        mood: todayData.mood || null,
        stress_level: todayData.stressLevel || null,
        sleep_quality: todayData.sleepQuality || null,
        meal_count: (todayData.meals || []).length,
        notes: todayData.notes || ''
      });
    }
    
    const totalWater = allData.reduce((sum, day) => sum + (day.water_glasses || 0), 0);
    const bowelMovementDays = allData.filter(day => day.bowel_movement_count > 0).length;
    const avgWater = allData.length > 0 ? totalWater / allData.length : 0;
    const totalBowelMovements = allData.reduce((sum, day) => sum + (day.bowel_movement_count || 0), 0);
    
    // Bristol scale counts (from backend data + today's data)
    const bristolCounts = {};
    bristolDistribution.forEach(item => {
      bristolCounts[item.bristol_type] = item.count;
    });
    
    // Add today's bristol counts if available
    if (dailyData[todayDate] && dailyData[todayDate].bowelMovements) {
      dailyData[todayDate].bowelMovements.forEach(movement => {
        bristolCounts[movement.bristolType] = (bristolCounts[movement.bristolType] || 0) + 1;
      });
    }

    // Mood analysis
    const moodData = allData.filter(day => day.mood !== null);
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

  // Get historical data for trends (including today's data)
  const getHistoricalData = () => {
    if (!analyticsData || !analyticsData.historicalData) return [];
    
    let historicalData = [...analyticsData.historicalData];
    
    // Add today's data if it exists and is not already in historical data
    const todayDate = new Date().toISOString().split('T')[0];
    const todayExists = historicalData.some(day => day.date === todayDate);
    
    if (!todayExists && dailyData[todayDate]) {
      const todayData = dailyData[todayDate];
      const todayRecord = {
        date: todayDate,
        water_glasses: todayData.waterGlasses || 0,
        bowel_movement_count: (todayData.bowelMovements || []).length,
        mood: todayData.mood || null,
        stress_level: todayData.stressLevel || null,
        sleep_quality: todayData.sleepQuality || null,
        meal_count: (todayData.meals || []).length,
        notes: todayData.notes || ''
      };
      historicalData.unshift(todayRecord); // Add at beginning since we want latest first
    }
    
    return historicalData.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  // Modal components
  const BowelMovementModal = ({ isOpen, onClose, onSave }) => {
    const [selectedBristol, setSelectedBristol] = useState(null);
    const [urgency, setUrgency] = useState(3);
    const [straining, setStraining] = useState(false);
    const [satisfaction, setSatisfaction] = useState(3);

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <h3 className="text-xl font-bold mb-4">Record Bowel Movement</h3>
            
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Bristol Stool Scale Type:</h4>
              <div className="space-y-2">
                {bristolScale.map((scale) => (
                  <div
                    key={scale.type}
                    onClick={() => setSelectedBristol(scale.type)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:scale-105 ${
                      selectedBristol === scale.type 
                        ? `${scale.color} border-blue-500 shadow-lg` 
                        : `${scale.color} hover:border-gray-400 hover:shadow-md`
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                          <span className="text-2xl">{scale.icon}</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-800">Type {scale.type}</span>
                          <span className="text-xl">{scale.emoji}</span>
                          <span className="font-medium text-gray-700">{scale.name}</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">{scale.description}</div>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${scale.severityColor} bg-white/50`}>
                          {scale.severity}
                        </span>
                      </div>
                      {selectedBristol === scale.type && (
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm">✓</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block font-medium mb-2">Urgency (1-5)</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={urgency}
                  onChange={(e) => setUrgency(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="text-sm text-gray-600 mt-1">
                  {urgency === 1 ? 'No urgency' : 
                   urgency === 2 ? 'Slight urgency' :
                   urgency === 3 ? 'Moderate urgency' :
                   urgency === 4 ? 'Strong urgency' : 'Extreme urgency'}
                </div>
              </div>

              <div>
                <label className="block font-medium mb-2">Straining Required?</label>
                <button
                  onClick={() => setStraining(!straining)}
                  className={`w-full p-2 rounded-lg font-medium ${
                    straining ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}
                >
                  {straining ? 'Yes - Had to strain' : 'No - Easy passage'}
                </button>
              </div>

              <div>
                <label className="block font-medium mb-2">Satisfaction (1-5)</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={satisfaction}
                  onChange={(e) => setSatisfaction(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="text-sm text-gray-600 mt-1">
                  {satisfaction === 1 ? 'Very unsatisfied' : 
                   satisfaction === 2 ? 'Unsatisfied' :
                   satisfaction === 3 ? 'Neutral' :
                   satisfaction === 4 ? 'Satisfied' : 'Very satisfied'}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
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
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-300"
              >
                Save Movement
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const FoodTrackingModal = ({ isOpen, onClose, onSave }) => {
    const [mealType, setMealType] = useState('breakfast');
    const [foodItems, setFoodItems] = useState('');
    const [portion, setPortion] = useState('medium');
    const [triggerFoods, setTriggerFoods] = useState([]);

    const commonTriggers = ['Dairy', 'Gluten', 'Spicy Food', 'Caffeine', 'Alcohol', 'High Fat', 'Raw Vegetables', 'Beans'];

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
          <div className="p-6">
            <h3 className="text-xl font-bold mb-4">Log Meal</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block font-medium mb-2">Meal Type</label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-2">Food Items</label>
                <textarea
                  value={foodItems}
                  onChange={(e) => setFoodItems(e.target.value)}
                  placeholder="e.g., Grilled chicken, steamed broccoli, brown rice"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  rows="3"
                />
              </div>

              <div>
                <label className="block font-medium mb-2">Portion Size</label>
                <select
                  value={portion}
                  onChange={(e) => setPortion(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-2">Potential Trigger Foods</label>
                <div className="grid grid-cols-2 gap-2">
                  {commonTriggers.map(trigger => (
                    <button
                      key={trigger}
                      onClick={() => {
                        setTriggerFoods(prev => 
                          prev.includes(trigger) 
                            ? prev.filter(t => t !== trigger)
                            : [...prev, trigger]
                        );
                      }}
                      className={`p-2 rounded text-sm ${
                        triggerFoods.includes(trigger)
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {trigger}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
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
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Save Meal
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Show authentication forms if not authenticated
  if (!isAuthenticated) {
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">🐰</div>
            <div className="text-lg text-gray-600">Loading...</div>
          </div>
        </div>
      );
    }
    return (
      <AuthForms 
        onLogin={handleLogin} 
        onRegister={handleRegister} 
        isLoading={authLoading}
      />
    );
  }

  // Show loading if still authenticating
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🐰</div>
          <div className="text-lg text-gray-600">Signing you in...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Clean header with auth info */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🐰</span>
              <h1 className="text-xl font-bold text-gray-800">Constipation Relief Tracker</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setShowProfileModal(true);
                  setProfileEmail(user?.email || '');
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-gray-600 hover:bg-gray-100"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {(user?.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-sm font-medium">{user?.username || 'User'}</div>
                  <div className="text-xs text-gray-500">View Profile</div>
                </div>
              </button>
              <button
                onClick={handleLogout}
                className="text-red-500 hover:text-red-700 flex items-center gap-1 text-sm px-2 py-1 rounded hover:bg-red-50"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* Date picker */}
        <div className="flex items-center gap-4 mb-6">
          <Calendar className="text-blue-600" size={20} />
          <input
            type="date"
            value={currentDate}
            onChange={(e) => setCurrentDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('today')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'today'
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Analytics & Trends
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'today' && (
          <div className="space-y-4">
            {/* Daily Wellness Check */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Smile className="text-purple-600" size={24} />
                <h2 className="text-lg font-semibold text-gray-800">Daily Wellness Check</h2>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                {/* Mood Tracking */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="font-medium text-gray-800 mb-3 block">How's your mood?</label>
                  <div className="flex gap-2 justify-center mb-3">
                    {[1, 2, 3, 4, 5].map(mood => (
                      <button
                        key={mood}
                        onClick={() => updateDailyData({ mood })}
                        className={`p-2 rounded-lg transition-colors ${
                          currentData.mood === mood 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-white hover:bg-gray-100 text-gray-600'
                        }`}
                      >
                        {mood === 1 ? <Frown size={20} /> :
                         mood === 2 ? <Frown size={20} /> :
                         mood === 3 ? <Meh size={20} /> :
                         mood === 4 ? <Smile size={20} /> : <Smile size={20} />}
                      </button>
                    ))}
                  </div>
                  <div className="text-center text-sm">
                    {currentData.mood ? 
                      `${currentData.mood === 1 ? 'Very Sad' :
                        currentData.mood === 2 ? 'Sad' :
                        currentData.mood === 3 ? 'Neutral' :
                        currentData.mood === 4 ? 'Happy' : 'Very Happy'}` 
                      : 'Tap to rate'}
                  </div>
                </div>

                {/* Stress Level */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="font-medium text-gray-800 mb-3 block">Stress Level</label>
                  <div className="mb-3">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={currentData.stressLevel || 5}
                      onChange={(e) => updateDailyData({ stressLevel: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-800">
                      {currentData.stressLevel || 5}/10
                    </div>
                    <div className="text-sm text-gray-600">
                      {(currentData.stressLevel || 5) >= 7 ? 'High Stress' :
                       (currentData.stressLevel || 5) >= 4 ? 'Moderate' : 'Low Stress'}
                    </div>
                  </div>
                </div>

                {/* Sleep Quality */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="font-medium text-gray-800 mb-3 block">Sleep Quality</label>
                  <div className="mb-3">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={currentData.sleepQuality || 3}
                      onChange={(e) => updateDailyData({ sleepQuality: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-800">
                      {currentData.sleepQuality || 3}/5
                    </div>
                    <div className="text-sm text-gray-600">
                      {(currentData.sleepQuality || 3) >= 4 ? 'Great Sleep' :
                       (currentData.sleepQuality || 3) >= 3 ? 'Fair Sleep' : 'Poor Sleep'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Hydration */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Droplets className="text-blue-600" size={24} />
                <h2 className="text-lg font-semibold text-gray-800">Daily Hydration</h2>
              </div>
              
              <div className="flex items-center justify-center gap-6 mb-4">
                <button
                  onClick={() => adjustWater(-1)}
                  className="p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Minus size={24} className="text-red-500" />
                </button>
                
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-1">{currentData.waterGlasses}</div>
                  <div className="text-sm text-gray-600">glasses (250ml each)</div>
                </div>
                
                <button
                  onClick={() => adjustWater(1)}
                  className="p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Plus size={24} className="text-blue-500" />
                </button>
              </div>
              
              <div className="text-center mb-4">
                <div className={`text-sm font-medium ${waterStatus.color}`}>
                  {waterStatus.message}
                </div>
                <div className="text-xs text-gray-500">Target: 8-10 glasses daily</div>
              </div>
              
              {/* Progress bar */}
              <div className="bg-gray-200 rounded-full h-2 max-w-xs mx-auto">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentData.waterGlasses >= 8 ? 'bg-green-500' :
                    currentData.waterGlasses >= 6 ? 'bg-blue-500' :
                    currentData.waterGlasses >= 4 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min((currentData.waterGlasses / 10) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Bowel Movement Tracker */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 shadow-sm border border-purple-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    <Clock className="text-white" size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">Bowel Movement Tracker</h2>
                    <p className="text-sm text-gray-600">Medical grade Bristol Scale tracking</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBowelModal(true)}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Plus size={18} />
                  <span className="font-medium">Record Movement</span>
                </button>
              </div>
              
              <div className="space-y-4">
                {currentData.bowelMovements && currentData.bowelMovements.length > 0 ? (
                  <div className="grid gap-4">
                    {currentData.bowelMovements.map((movement) => {
                      const bristolInfo = bristolScale.find(s => s.type === movement.bristolType);
                      return (
                        <div key={movement.id} className={`relative p-5 rounded-xl border-2 ${bristolInfo?.color || 'bg-gray-50 border-gray-200'} shadow-sm hover:shadow-md transition-all`}>
                          <div className="flex items-start gap-4">
                            <div className="text-4xl">{bristolInfo?.icon || '📊'}</div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg font-bold text-gray-800">Type {movement.bristolType}</span>
                                <span className="text-xl">{bristolInfo?.emoji || '⚫'}</span>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${bristolInfo?.severityColor || 'text-gray-600'} bg-white bg-opacity-80`}>
                                  {bristolInfo?.severity || 'Unknown'}
                                </span>
                              </div>
                              <div className="text-sm font-medium text-gray-700 mb-1">{bristolInfo?.name}</div>
                              <div className="text-xs text-gray-600 mb-3">{bristolInfo?.description}</div>
                              
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1">
                                  <Clock size={14} className="text-purple-500" />
                                  <span className="font-medium">{movement.time}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-orange-500">⚡</span>
                                  <span>Urgency: {movement.urgency}/5</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className={movement.straining ? "text-red-500" : "text-green-500"}>
                                    {movement.straining ? "😓" : "😌"}
                                  </span>
                                  <span>{movement.straining ? 'Straining' : 'Easy'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-blue-500">😊</span>
                                  <span>Satisfaction: {movement.satisfaction}/5</span>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => removeBowelMovement(movement.id)}
                              className="absolute top-3 right-3 w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors text-sm"
                              title="Remove entry"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">🚽</div>
                    <div className="text-gray-500 text-sm italic">No bowel movements recorded today</div>
                    <div className="text-xs text-gray-400 mt-1">Click "Record Movement" to start tracking</div>
                  </div>
                )}
              </div>
            </div>

            {/* Food Tracking */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Camera className="text-green-500" size={24} />
                  <h2 className="text-lg font-semibold text-gray-800">Food Tracking</h2>
                </div>
                <button
                  onClick={() => setShowFoodModal(true)}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Plus size={18} />
                  Log Meal
                </button>
              </div>

              <div className="space-y-3">
                {currentData.meals && currentData.meals.length > 0 ? (
                  currentData.meals.map((meal) => (
                    <div key={meal.id} className="p-3 bg-gray-50 rounded-lg border">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium capitalize">{meal.mealType}</div>
                          <div className="text-sm text-gray-700">{meal.foodItems}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Portion: {meal.portion}
                            {meal.triggerFoods && meal.triggerFoods.length > 0 && (
                              <span className="ml-2">
                                Triggers: {meal.triggerFoods.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {meal.timestamp && new Date(meal.timestamp).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-sm italic">No meals logged today</div>
                )}
              </div>
            </div>

            {/* Fiber Foods */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Eczema-Safe Fiber Foods</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-3 text-green-700">Daily Fiber Goals:</h3>
                  <div className="space-y-2">
                    {fiberFoods.map((food, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                        <button
                          onClick={() => handleItemCheck('fiber', index)}
                          className="flex-shrink-0"
                        >
                          {isItemChecked('fiber', index) ? 
                            <CheckCircle size={20} className="text-green-500" /> : 
                            <Circle size={20} className="text-gray-400" />
                          }
                        </button>
                        <div className="flex-1">
                          <div className={`font-medium ${isItemChecked('fiber', index) ? 'line-through text-gray-500' : ''}`}>
                            {food.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            Fiber: {food.fiber}
                            {food.special && <span className="text-orange-600 font-medium ml-2">{food.special}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-3 text-blue-700">Helpful Supplements:</h3>
                  <div className="space-y-2">
                    {supplements.map((item, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                        <button
                          onClick={() => handleItemCheck('supplements', index)}
                          className="flex-shrink-0"
                        >
                          {isItemChecked('supplements', index) ? 
                            <CheckCircle size={20} className="text-green-500" /> : 
                            <Circle size={20} className="text-gray-400" />
                          }
                        </button>
                        <div>
                          <div className={`font-medium ${isItemChecked('supplements', index) ? 'line-through text-gray-500' : ''}`}>
                            {item.name}
                          </div>
                          <div className="text-sm text-gray-600">{item.note}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Routine */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Daily Routine Checklist</h2>
              <div className="space-y-3">
                {dailyRoutine.map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border">
                    <button
                      onClick={() => handleItemCheck('routine', index)}
                      className="flex-shrink-0"
                    >
                      {isItemChecked('routine', index) ? 
                        <CheckCircle size={22} className="text-green-500" /> : 
                        <Circle size={22} className="text-gray-400" />
                      }
                    </button>
                    <span className={`font-medium ${isItemChecked('routine', index) ? 'line-through text-gray-500' : ''}`}>
                      {activity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Daily Notes</h2>
                <div className="text-sm text-gray-500">
                  {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <textarea
                    value={currentNote}
                    onChange={(e) => setCurrentNote(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="4"
                    placeholder="How did you feel today? Any improvements, concerns, or observations?"
                    maxLength={500}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    {currentNote.length}/500 characters
                  </div>
                  <button
                    onClick={addDailyNote}
                    disabled={!currentNote.trim()}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentNote.trim()
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    💾 Save Note
                  </button>
                </div>
                
                {showSuccessMessage && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800 text-sm">
                      <span>✓</span>
                      <span>Note saved successfully!</span>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Advanced Stats */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="text-blue-500" size={24} />
                  <h2 className="text-lg font-semibold text-gray-800">Advanced Analytics (30 Days)</h2>
                </div>
                <div className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                  Including today's data
                </div>
              </div>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.avgWater}</div>
                  <div className="text-sm text-gray-600">Avg Glasses/Day</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats.bowelMovementDays}/30</div>
                  <div className="text-sm text-gray-600">Days with BM</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{stats.totalBowelMovements}</div>
                  <div className="text-sm text-gray-600">Total BM Count</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{stats.avgMood}</div>
                  <div className="text-sm text-gray-600">Avg Mood ({stats.moodSamples} samples)</div>
                </div>
              </div>
            </div>

            {/* Bristol Scale Distribution */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Bristol Stool Scale Distribution</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bristolScale.map((scale) => {
                  const count = stats.bristolCounts[scale.type] || 0;
                  const percentage = stats.totalBowelMovements > 0 ? (count / stats.totalBowelMovements * 100).toFixed(1) : 0;
                  
                  return (
                    <div key={scale.type} className={`relative p-4 rounded-xl border-2 ${scale.color} transition-all hover:shadow-md`}>
                      <div className="text-center mb-3">
                        <div className="text-3xl mb-2">{scale.icon}</div>
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <span className="text-lg font-bold">Type {scale.type}</span>
                          <span className="text-xl">{scale.emoji}</span>
                        </div>
                        <div className="text-sm font-medium text-gray-800">{scale.name}</div>
                        <div className="text-xs text-gray-600 mt-1">{scale.description}</div>
                      </div>
                      
                      <div className="bg-white bg-opacity-70 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-gray-800">{count}</div>
                        <div className="text-sm text-gray-600">times ({percentage}%)</div>
                        <div className={`text-xs font-medium ${scale.severityColor} mt-1`}>
                          {scale.severity}
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="mt-3 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Daily Notes History */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">📝</span>
                </div>
                <h2 className="text-lg font-semibold text-gray-800">Daily Notes History (30 Days)</h2>
              </div>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {analyticsData?.dailyNotes && analyticsData.dailyNotes.length > 0 ? (
                  analyticsData.dailyNotes.map((note) => (
                    <div key={note.id} className="bg-gradient-to-r from-green-50 to-teal-50 rounded-lg p-4 border border-green-100">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              {new Date(note.date).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-gray-800 text-sm leading-relaxed">{note.note}</p>
                        </div>
                        <button
                          onClick={() => deleteDailyNote(note.id)}
                          className="w-6 h-6 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-colors text-xs ml-3"
                          title="Delete note"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">📝</div>
                    <div className="text-gray-500 text-sm">No notes recorded in the past 30 days</div>
                    <div className="text-xs text-gray-400 mt-1">Start adding daily notes to see them here</div>
                  </div>
                )}
              </div>
            </div>

            {/* Historical Records */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">📊</span>
                </div>
                <h2 className="text-lg font-semibold text-gray-800">Daily Summary History (30 Days)</h2>
              </div>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {getHistoricalData().length > 0 ? (
                  getHistoricalData().slice(0, 30).map((dayData) => (
                    <div key={dayData.date} className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div className="font-medium text-gray-800">
                          {new Date(dayData.date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </div>
                        <div className="flex gap-3 text-sm">
                          <div className="flex items-center gap-1 bg-blue-100 px-2 py-1 rounded-full">
                            <span>💧</span>
                            <span className="font-medium">{dayData.water_glasses || 0}</span>
                          </div>
                          <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded-full">
                            <span>🚽</span>
                            <span className="font-medium">{dayData.bowel_movement_count || 0}</span>
                          </div>
                          {dayData.mood && (
                            <div className="flex items-center gap-1 bg-purple-100 px-2 py-1 rounded-full">
                              <span>😊</span>
                              <span className="font-medium">{dayData.mood}/5</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {dayData.stress_level && (
                          <div className="flex items-center gap-1">
                            <span>😰</span>
                            <span>Stress: {dayData.stress_level}/5</span>
                          </div>
                        )}
                        {dayData.sleep_quality && (
                          <div className="flex items-center gap-1">
                            <span>😴</span>
                            <span>Sleep: {dayData.sleep_quality}/5</span>
                          </div>
                        )}
                        {dayData.meal_count > 0 && (
                          <div className="flex items-center gap-1">
                            <span>🍽️</span>
                            <span>Meals: {dayData.meal_count}</span>
                          </div>
                        )}
                        {(dayData.bloating || dayData.abdominal_pain || dayData.nausea || dayData.fatigue) && (
                          <div className="flex items-center gap-1">
                            <span>⚠️</span>
                            <span>Symptoms</span>
                          </div>
                        )}
                      </div>
                      
                      {dayData.notes && (
                        <div className="mt-3 p-2 bg-white bg-opacity-70 rounded text-sm text-gray-700 italic">
                          "{dayData.notes}"
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">📊</div>
                    <div className="text-gray-500 text-sm">No historical data available yet</div>
                    <div className="text-xs text-gray-400 mt-1">Start tracking today to see your progress here!</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">Profile & Settings</h2>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Profile Section */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                  {(user?.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{user?.username || 'User'}</h3>
                  <p className="text-gray-600">{user?.email || 'No email provided'}</p>
                  <div className="text-sm text-gray-500">
                    Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recently'}
                  </div>
                </div>
              </div>

              {/* Update Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    placeholder="Add your email address"
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => updateProfile({ email: profileEmail })}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Update
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="grid gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-2">📥 Export Data</h4>
                  <p className="text-sm text-gray-600 mb-3">Download all your health tracking data</p>
                  <button
                    onClick={exportData}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Download Data
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-2">📸 Profile Photo</h4>
                  <p className="text-sm text-gray-600 mb-3">Feature coming soon - upload a profile picture</p>
                  <button
                    disabled
                    className="bg-gray-300 text-gray-500 px-4 py-2 rounded-lg text-sm cursor-not-allowed"
                  >
                    Upload Photo (Coming Soon)
                  </button>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-2">📊 Your Stats</h4>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-lg font-bold text-blue-600">
                        {Object.keys(dailyData).length}
                      </div>
                      <div className="text-xs text-gray-600">Days Tracked</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-green-600">
                        {Object.values(dailyData).reduce((total, day) => total + (day.bowelMovements?.length || 0), 0)}
                      </div>
                      <div className="text-xs text-gray-600">Total Entries</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-purple-600">
                        {Math.round(Object.values(dailyData).reduce((total, day) => total + (day.waterGlasses || 0), 0) / Object.keys(dailyData).length * 10) / 10 || 0}
                      </div>
                      <div className="text-xs text-gray-600">Avg Water/Day</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
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
    </div>
  );
};

export default ConstipationReliefTracker;