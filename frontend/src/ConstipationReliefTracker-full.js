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

  // Bristol Stool Scale definitions
  const bristolScale = [
    { type: 1, name: "Separate hard lumps", description: "Like nuts (hard to pass)", color: "bg-red-100 border-red-300", severity: "Severe Constipation" },
    { type: 2, name: "Sausage-shaped but lumpy", description: "Hard and lumpy", color: "bg-orange-100 border-orange-300", severity: "Mild Constipation" },
    { type: 3, name: "Sausage-shaped with cracks", description: "Like a sausage but with cracks on surface", color: "bg-yellow-100 border-yellow-300", severity: "Normal" },
    { type: 4, name: "Smooth and soft", description: "Like a sausage or snake, smooth and soft", color: "bg-green-100 border-green-300", severity: "Normal" },
    { type: 5, name: "Soft blobs with clear edges", description: "Soft blobs with clear-cut edges", color: "bg-blue-100 border-blue-300", severity: "Lacking Fiber" },
    { type: 6, name: "Fluffy pieces with ragged edges", description: "Fluffy pieces with ragged edges, mushy", color: "bg-purple-100 border-purple-300", severity: "Mild Diarrhea" },
    { type: 7, name: "Watery, no solid pieces", description: "Entirely liquid", color: "bg-red-100 border-red-300", severity: "Severe Diarrhea" }
  ];

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

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = () => {
      if (ApiService.isAuthenticated()) {
        setIsAuthenticated(true);
        // You might want to validate the token with the server here
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  // Load daily data when date changes
  useEffect(() => {
    if (isAuthenticated) {
      loadDailyData(currentDate);
    }
  }, [currentDate, isAuthenticated, loadDailyData]);

  // Load analytics data when switching to analytics tab
  useEffect(() => {
    if (isAuthenticated && activeTab === 'analytics') {
      loadAnalyticsData();
    }
  }, [activeTab, isAuthenticated]);

  const loadDailyData = useCallback(async (date) => {
    try {
      const data = await ApiService.getDailyData(date);
      setDailyData(prev => ({
        ...prev,
        [date]: data
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

  const loadAnalyticsData = async () => {
    try {
      const data = await ApiService.getAnalytics(30);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    }
  };

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
      // Could add user notification here
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

  const getWaterStatus = (glasses) => {
    if (glasses >= 8) return { color: 'text-green-600', message: 'Excellent hydration!' };
    if (glasses >= 6) return { color: 'text-blue-600', message: 'Good progress' };
    if (glasses >= 4) return { color: 'text-yellow-600', message: 'Keep going' };
    return { color: 'text-red-500', message: 'Need more water' };
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

  // Get historical data for trends (from your original design)
  const getHistoricalData = () => {
    if (!analyticsData || !analyticsData.historicalData) return [];
    return analyticsData.historicalData.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  // Show authentication forms if not authenticated
  if (!isAuthenticated) {
    if (isLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
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

  const TabButton = ({ id, label, isActive, onClick }) => (
    <button
      onClick={() => onClick(id)}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        isActive 
          ? 'bg-blue-500 text-white' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );

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
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedBristol === scale.type 
                        ? `${scale.color} border-blue-500` 
                        : `${scale.color} hover:border-gray-400`
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">Type {scale.type}: {scale.name}</span>
                        <div className="text-sm text-gray-600">{scale.description}</div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        scale.type <= 2 ? 'bg-red-100 text-red-800' :
                        scale.type <= 4 ? 'bg-green-100 text-green-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {scale.severity}
                      </span>
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

  const renderTodayTab = () => (
    <div className="space-y-6">
      {/* Mood & Wellness Tracking */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Daily Wellness Check</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block font-medium mb-2">Mood</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(mood => (
                <button
                  key={mood}
                  onClick={() => updateDailyData({ mood })}
                  className={`p-2 rounded-lg ${currentData.mood === mood ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                >
                  {mood === 1 ? <Frown size={20} /> :
                   mood === 2 ? <Frown size={20} /> :
                   mood === 3 ? <Meh size={20} /> :
                   mood === 4 ? <Smile size={20} /> : <Smile size={20} />}
                </button>
              ))}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {currentData.mood ? `Mood: ${currentData.mood}/5` : 'Tap to rate mood'}
            </div>
          </div>

          <div>
            <label className="block font-medium mb-2">Stress Level (1-10)</label>
            <input
              type="range"
              min="1"
              max="10"
              value={currentData.stressLevel || 5}
              onChange={(e) => updateDailyData({ stressLevel: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="text-sm text-gray-600 mt-1">
              Level: {currentData.stressLevel || 5}/10
            </div>
          </div>

          <div>
            <label className="block font-medium mb-2">Sleep Quality (1-5)</label>
            <input
              type="range"
              min="1"
              max="5"
              value={currentData.sleepQuality || 3}
              onChange={(e) => updateDailyData({ sleepQuality: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="text-sm text-gray-600 mt-1">
              Quality: {currentData.sleepQuality || 3}/5
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Bowel Movement Tracker */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Clock className="text-purple-500" size={24} />
            <h2 className="text-xl font-semibold text-gray-800">Advanced Bowel Movement Tracker</h2>
          </div>
          <button
            onClick={() => setShowBowelModal(true)}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            Record Movement
          </button>
        </div>
        
        <div className="space-y-3">
          {currentData.bowelMovements && currentData.bowelMovements.length > 0 ? (
            currentData.bowelMovements.map((movement) => {
              const bristolInfo = bristolScale.find(s => s.type === movement.bristolType);
              return (
                <div key={movement.id} className={`p-4 rounded-lg border-2 ${bristolInfo?.color || 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">
                        {new Date(movement.date).toLocaleDateString()} at {movement.time}
                      </div>
                      <div className="text-sm mt-1">
                        <span className="font-medium">Type {movement.bristolType}</span>: {bristolInfo?.name}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Urgency: {movement.urgency}/5 • 
                        {movement.straining ? ' Had to strain' : ' Easy passage'} • 
                        Satisfaction: {movement.satisfaction}/5
                      </div>
                    </div>
                    <button
                      onClick={() => removeBowelMovement(movement.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-gray-500 text-sm italic">No bowel movements recorded today</div>
          )}
        </div>
      </div>

      {/* Advanced Food Tracking */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Camera className="text-green-500" size={24} />
            <h2 className="text-xl font-semibold text-gray-800">Advanced Food Tracking</h2>
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

      {/* Hydration Tracker */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Droplets className="text-blue-500" size={24} />
          <h2 className="text-xl font-semibold text-gray-800">Daily Hydration</h2>
        </div>
        
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => adjustWater(-1)}
            className="bg-red-100 hover:bg-red-200 p-2 rounded-full transition-colors"
          >
            <Minus size={20} className="text-red-600" />
          </button>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{currentData.waterGlasses}</div>
            <div className="text-sm text-gray-600">glasses (250ml each)</div>
          </div>
          
          <button
            onClick={() => adjustWater(1)}
            className="bg-blue-100 hover:bg-blue-200 p-2 rounded-full transition-colors"
          >
            <Plus size={20} className="text-blue-600" />
          </button>
        </div>
        
        <div className={`text-center mb-4 font-medium ${waterStatus.color}`}>
          {waterStatus.message} (Target: 8-10 glasses)
        </div>
        
        <div>
          <h3 className="font-semibold mb-2 text-gray-700">Hydration Tips:</h3>
          <div className="grid md:grid-cols-2 gap-2">
            {hydrationTips.map((tip, index) => (
              <div key={index} className="flex items-center gap-2">
                <button
                  onClick={() => handleItemCheck('hydration', index)}
                  className="flex-shrink-0"
                >
                  {isItemChecked('hydration', index) ? 
                    <CheckCircle size={18} className="text-green-500" /> : 
                    <Circle size={18} className="text-gray-400" />
                  }
                </button>
                <span className={`text-sm ${isItemChecked('hydration', index) ? 'line-through text-gray-500' : ''}`}>
                  {tip}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fiber Foods */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Eczema-Safe Fiber Foods</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3 text-green-700">Daily Fiber Goals:</h3>
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
            <h3 className="font-semibold mb-3 text-blue-700">Helpful Supplements:</h3>
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
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Daily Routine Checklist</h2>
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

      {/* Symptom Tracking */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Symptom Tracking</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(currentData.symptoms).map(([symptom, level]) => (
            <div key={symptom}>
              <label className="block font-medium mb-2 capitalize">{symptom.replace(/([A-Z])/g, ' $1')}</label>
              <input
                type="range"
                min="0"
                max="10"
                value={level}
                onChange={(e) => updateDailyData({ 
                  symptoms: { 
                    ...currentData.symptoms, 
                    [symptom]: parseInt(e.target.value) 
                  } 
                })}
                className="w-full"
              />
              <div className="text-sm text-gray-600 mt-1">Level: {level}/10</div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Daily Notes</h2>
        <textarea
          value={currentData.notes}
          onChange={(e) => updateDailyData({ notes: e.target.value })}
          className="w-full p-3 border border-gray-300 rounded-lg resize-none"
          rows="3"
          placeholder="How did you feel today? Any improvements or concerns?"
        />
      </div>
    </div>
  );

  const renderAnalyticsTab = () => {
    if (!analyticsData) {
      return (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-center py-8">
            <div className="text-gray-500">Loading analytics...</div>
          </div>
        </div>
      );
    }

    const historicalData = getHistoricalData();
    
    return (
      <div className="space-y-6">
        {/* Advanced Stats */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="text-blue-500" size={24} />
            <h2 className="text-xl font-semibold text-gray-800">Advanced Analytics (30 Days)</h2>
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
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Bristol Stool Scale Distribution</h2>
          <div className="space-y-3">
            {bristolScale.map((scale) => {
              const count = stats.bristolCounts[scale.type] || 0;
              const percentage = stats.totalBowelMovements > 0 ? (count / stats.totalBowelMovements * 100).toFixed(1) : 0;
              
              return (
                <div key={scale.type} className={`p-3 rounded-lg ${scale.color}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">Type {scale.type}: {scale.name}</span>
                      <div className="text-sm text-gray-600">{scale.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{count} times</div>
                      <div className="text-sm text-gray-600">{percentage}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Correlation Insights */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Health Insights</h2>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">Hydration Pattern</h3>
              <p className="text-sm text-blue-700">
                {stats.avgWater >= 8 ? 
                  "Excellent hydration! Keep up the good work. Proper hydration supports healthy bowel movements." :
                  stats.avgWater >= 6 ?
                  "Good hydration levels. Try to reach 8-10 glasses daily for optimal digestive health." :
                  "Consider increasing water intake. Dehydration can worsen constipation significantly."
                }
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-800 mb-2">Bowel Movement Frequency</h3>
              <p className="text-sm text-green-700">
                {stats.bowelMovementDays >= 21 ? 
                  "Excellent regularity! You're having bowel movements most days." :
                  stats.bowelMovementDays >= 12 ?
                  "Moderate frequency. Aim for more consistent daily movements." :
                  "Low frequency detected. Consider consulting your healthcare provider if this pattern continues."
                }
              </p>
            </div>

            {stats.moodSamples > 0 && (
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h3 className="font-semibold text-yellow-800 mb-2">Mood & Stress Impact</h3>
                <p className="text-sm text-yellow-700">
                  {stats.avgMood >= 4 ? 
                    "Your mood tracking shows generally positive levels, which supports good digestive health." :
                    stats.avgMood >= 3 ?
                    "Moderate mood levels detected. Stress management techniques may help improve digestive symptoms." :
                    "Lower mood scores noted. Consider stress reduction activities as they can significantly impact gut health."
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Historical Records */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Daily History</h2>
          <div className="space-y-4">
            {historicalData.length > 0 ? (
              historicalData.slice(0, 30).map((dayData) => (
                <div key={dayData.date} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-gray-800">
                      {new Date(dayData.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-blue-600">💧 {dayData.water_glasses || 0}</span>
                      <span className="text-green-600">
                        ✓ {dayData.bowel_movement_count || 0} BM
                      </span>
                      {dayData.mood && <span className="text-purple-600">😊 {dayData.mood}/5</span>}
                    </div>
                  </div>
                  
                  {dayData.meal_count > 0 && (
                    <div className="mb-2">
                      <div className="text-sm text-gray-600 mb-1">Meals logged: {dayData.meal_count}</div>
                    </div>
                  )}
                  
                  {dayData.notes && (
                    <div className="text-sm text-gray-600 italic">
                      Notes: {dayData.notes}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-center py-8">
                No historical data available yet. Start tracking today!
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-gradient-to-br from-green-50 to-blue-50 min-h-screen">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Apple className="text-green-600" size={32} />
          <span className="text-4xl">🐰</span>
          <h1 className="text-2xl font-bold text-gray-800">Constipation Relief Tracker (Pinko)</h1>
          <div className="ml-auto flex items-center gap-4">
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              Bearo
            </span>
            <div className="flex items-center gap-2">
              <User className="text-gray-500" size={16} />
              <span className="text-sm text-gray-600">{user?.username || 'User'}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-red-500 hover:text-red-700 flex items-center gap-1 text-sm"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
        
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
          <TabButton 
            id="today" 
            label="Today" 
            isActive={activeTab === 'today'} 
            onClick={setActiveTab} 
          />
          <TabButton 
            id="analytics" 
            label="Analytics & Trends" 
            isActive={activeTab === 'analytics'} 
            onClick={setActiveTab} 
          />
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'today' && renderTodayTab()}
      {activeTab === 'analytics' && renderAnalyticsTab()}

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

      {/* Important Reminders */}
      <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <h3 className="font-semibold text-yellow-800 mb-2">Important Reminders:</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Your data is securely saved and synced across devices</li>
          <li>• Introduce new foods gradually to monitor eczema reactions</li>
          <li>• If no improvement after 2-3 weeks, consult a doctor</li>
          <li>• Normal frequency is 3 times per week to 3 times per day</li>
          <li>• Share your analytics data with healthcare providers for better treatment</li>
        </ul>
      </div>
    </div>
  );
};

export default ConstipationReliefTracker;