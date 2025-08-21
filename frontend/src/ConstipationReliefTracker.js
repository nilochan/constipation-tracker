import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Minus, CheckCircle, Circle, Droplets, Calendar, Clock, BarChart3, Camera, Smile, Meh, Frown, LogOut } from 'lucide-react';
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
  // eslint-disable-next-line no-unused-vars
  const [profileData, setProfileData] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileEmail, setProfileEmail] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingChatHistory, setUploadingChatHistory] = useState(false);
  const [chatHistoryStatus, setChatHistoryStatus] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminData, setAdminData] = useState({ logs: [], users: [], database: null, loading: false });
  const [showAdminPromote, setShowAdminPromote] = useState(false);
  const [adminSecret, setAdminSecret] = useState('');
  const [aiSummary, setAiSummary] = useState({ daily: '', weekly: '', loading: false });
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [showGameFullscreen, setShowGameFullscreen] = useState(false);
  const [showTetrisFullscreen, setShowTetrisFullscreen] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [notesHistoryExpanded, setNotesHistoryExpanded] = useState(false);

  // Make getCurrentUser available to iframe
  window.getCurrentUser = () => user;

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

  // Load AI summaries when analytics tab is accessed
  useEffect(() => {
    if (activeTab === 'analytics' && isAuthenticated) {
      loadAISummaries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAuthenticated, currentDate]);

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

  // eslint-disable-next-line no-unused-vars
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

  const exportData = async (format = 'json') => {
    try {
      const blob = await ApiService.exportData(format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      const extension = format === 'excel' ? 'xlsx' : 'json';
      a.download = `health_data_${new Date().toISOString().split('T')[0]}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export data:', error);
      alert(`Failed to export ${format} data. Please try again.`);
    }
  };

  const uploadProfilePhoto = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|jpg|png|gif)$/)) {
      alert('Please select a valid image file (JPEG, PNG, or GIF)');
      return;
    }

    setUploadingPhoto(true);
    try {
      const updatedUser = await ApiService.uploadProfilePhoto(file);
      setUser(updatedUser);
      setProfileData(updatedUser);
      alert('Profile photo updated successfully!');
    } catch (error) {
      console.error('Failed to upload photo:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
      // Clear the input
      event.target.value = '';
    }
  };

  const uploadChatHistory = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    // Validate file type
    if (!file.name.match(/\.(txt|json)$/i)) {
      alert('Please select a text (.txt) or JSON (.json) file');
      return;
    }

    setUploadingChatHistory(true);
    setChatHistoryStatus('');
    
    try {
      const text = await file.text();
      let chatHistory = [];
      let source = 'other';

      // Parse WhatsApp chat export
      if (file.name.toLowerCase().includes('whatsapp') || text.includes('Messages and calls are end-to-end encrypted')) {
        source = 'whatsapp';
        const lines = text.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          // Skip WhatsApp system messages
          if (line.includes('Messages and calls are end-to-end encrypted') ||
              line.includes('created group') ||
              line.includes('added you') ||
              line.includes('left') ||
              line.includes('changed their phone number')) {
            continue;
          }
          
          // WhatsApp formats:
          // [DD/MM/YYYY, HH:MM:SS] Contact Name: Message
          // DD/MM/YY, HH:MM - Contact Name: Message
          // M/D/YY, H:MM AM/PM - Contact Name: Message
          const whatsappMatch = line.match(/^\[(.+?)\] (.+?): (.+)$/) ||     // [timestamp] name: message
                               line.match(/^(.+?),\s*(.+?)\s*-\s*(.+?): (.+)$/) || // date, time - name: message
                               line.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*(.+?)\s*-\s*(.+?): (.+)$/); // simplified
          
          if (whatsappMatch) {
            let timestamp, sender, message;
            if (whatsappMatch.length === 4) {
              [, timestamp, sender, message] = whatsappMatch;
            } else {
              [, timestamp, , sender, message] = whatsappMatch; // Skip time part for date,time format
            }
            
            chatHistory.push({
              timestamp: timestamp.trim(),
              sender: sender.trim(),
              message: message.trim()
            });
          }
        }
      }
      // Parse LINE chat export or any text file
      else if (file.name.toLowerCase().includes('line') || text.includes('Line chat history') || file.name.toLowerCase().endsWith('.txt')) {
        source = file.name.toLowerCase().includes('line') ? 'line' : 'other';
        const lines = text.split('\n').filter(line => line.trim());
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // Skip header lines, date lines, and system messages
          if (line.includes('[LINE] Chat history') || 
              line.includes('Saved on:') ||
              line.includes('Members:') ||
              line.match(/^[A-Za-z]{3}, \d{1,2}\/\d{1,2}\/\d{4}$/) ||
              line.match(/^\d{4}年\d{1,2}月\d{1,2}日\([月火水木金土日]\)$/)) {
            continue;
          }
          
          // LINE formats:
          // HH:MM\tName\tMessage (tab-separated)
          // HH:MM Name Message (space-separated)
          // [HH:MM] Name: Message
          const lineMatch = line.match(/^(.+?)\t(.+?)\t(.+)$/) ||               // tab format
                           line.match(/^(\d{1,2}:\d{2})\s+(.+?)\s+(.+)$/) ||    // time name message
                           line.match(/^\[(\d{1,2}:\d{2})\]\s*(.+?):\s*(.+)$/) || // [time] name: message
                           line.match(/^(\d{1,2}:\d{2})\s*(.+?):\s*(.+)$/);     // time name: message
          
          if (lineMatch) {
            const [, timestamp, sender, message] = lineMatch;
            chatHistory.push({
              timestamp: timestamp.trim(),
              sender: sender.trim(),
              message: message.trim()
            });
          }
          // Generic chat patterns
          else {
            const genericMatch = line.match(/^(.+?) (.+?): (.+)$/) ||    // Timestamp Name: Message
                                line.match(/^\[(.+?)\] (.+?): (.+)$/) || // [Timestamp] Name: Message
                                line.match(/^(.+?) - (.+?): (.+)$/);     // Timestamp - Name: Message
            
            if (genericMatch) {
              const [, timestamp, sender, message] = genericMatch;
              chatHistory.push({
                timestamp: timestamp.trim(),
                sender: sender.trim(),
                message: message.trim()
              });
            } else if (line.length > 5 && !line.match(/^[\d\s\-\/\:]+$/)) {
              // If no pattern matches and it's not just numbers/dates, treat as message
              chatHistory.push({
                timestamp: new Date().toISOString(),
                sender: 'Unknown',
                message: line
              });
            }
          }
        }
      }
      // Try JSON format
      else if (file.name.toLowerCase().endsWith('.json')) {
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            chatHistory = parsed;
          }
        } catch (e) {
          throw new Error('Invalid JSON format');
        }
      }

      if (chatHistory.length === 0) {
        throw new Error('No chat messages found. Please check the file format.');
      }

      // Upload to backend
      const response = await ApiService.uploadChatHistory(chatHistory, source);
      setChatHistoryStatus(`${response.processed} messages processed from ${source}`);
      
    } catch (error) {
      console.error('Failed to upload chat history:', error);
      alert(`Failed to upload chat history: ${error.message}`);
    } finally {
      setUploadingChatHistory(false);
      // Clear the input
      event.target.value = '';
    }
  };

  // Admin Functions
  const loadAdminData = async () => {
    if (!user?.is_admin) return;
    
    setAdminData(prev => ({ ...prev, loading: true }));
    try {
      const [logsResponse, usersResponse, databaseResponse] = await Promise.all([
        ApiService.getAdminActivityLogs(),
        ApiService.getAdminUserStats(),
        ApiService.getAdminDatabaseStats()
      ]);
      
      setAdminData({
        logs: logsResponse.logs || [],
        users: usersResponse.users || [],
        database: databaseResponse || null,
        loading: false
      });
    } catch (error) {
      console.error('Failed to load admin data:', error);
      setAdminData(prev => ({ ...prev, loading: false }));
    }
  };

  const promoteToAdmin = async () => {
    if (!adminSecret.trim()) {
      alert('Please enter the admin secret key');
      return;
    }

    try {
      const response = await ApiService.promoteToAdmin(user.username, adminSecret);
      alert(response.message);
      
      // Update user state to reflect admin status
      const updatedUser = { ...user, is_admin: true };
      setUser(updatedUser);
      setProfileData(updatedUser);
      
      // Clear form and close modal
      setAdminSecret('');
      setShowAdminPromote(false);
    } catch (error) {
      console.error('Admin promotion failed:', error);
      alert('Failed to promote to admin. Please check your secret key.');
    }
  };

  const checkAdminSecret = async () => {
    try {
      const response = await fetch('/api/debug/admin-secret');
      const data = await response.json();
      
      alert(`Server expects admin secret: "${data.adminSecret}"\n\nUsing default: ${data.envCheck.usingDefault}\nHas env secret: ${data.envCheck.hasEnvSecret}`);
    } catch (error) {
      console.error('Failed to check admin secret:', error);
      alert('Failed to check admin secret');
    }
  };

  const emergencyAdminPromotion = async () => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`Are you sure you want to promote "${user.username}" to admin using emergency method?`)) {
      return;
    }

    try {
      const response = await fetch('/api/debug/emergency-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: user.username })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert(data.message);
        
        // Update user state to reflect admin status
        const updatedUser = { ...user, is_admin: true };
        setUser(updatedUser);
        setProfileData(updatedUser);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Emergency admin promotion failed:', error);
      alert(`Emergency admin promotion failed: ${error.message}`);
    }
  };

  const simpleAdminPromotion = async () => {
    try {
      // eslint-disable-next-line no-restricted-globals
      const username = prompt('Enter username to promote to admin:');
      
      if (!username) return;
      
      // Promote the user
      const response = await fetch('/api/debug/make-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username.trim() })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert(data.message);
        
        // If the promoted user is the current user, refresh their token
        if (user && user.username === username.trim()) {
          try {
            const refreshData = await ApiService.refreshUserData();
            
            // Update token and user data
            ApiService.setToken(refreshData.token);
            setUser(refreshData.user);
            setProfileData(refreshData.user);
            
            alert('Token refreshed! You now have admin access.');
          } catch (refreshError) {
            console.error('Failed to refresh token:', refreshError);
            alert('You are now admin, but please refresh the page to access admin features.');
            
            // Fallback: update local state
            const updatedUser = { ...user, is_admin: true };
            setUser(updatedUser);
            setProfileData(updatedUser);
          }
        }
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Simple admin promotion failed:', error);
      alert(`Simple admin promotion failed: ${error.message}`);
    }
  };

  const handleSimpleAdminPromotion = async () => {
    if (!user) {
      alert('Please login first');
      return;
    }

    try {
      // Use the admin secret to promote current user
      const response = await fetch('/api/admin/promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: user.username,
          adminSecret: adminSecret.trim()
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('🎉 Admin access granted! You now have admin privileges.');
        
        // Refresh user token with updated admin status
        try {
          const refreshData = await ApiService.refreshUserData();
          
          // Update token and user data
          ApiService.setToken(refreshData.token);
          setUser(refreshData.user);
          setProfileData(refreshData.user);
          
          // Clear the secret input
          setAdminSecret('');
          
        } catch (refreshError) {
          console.error('Failed to refresh token:', refreshError);
          alert('You are now admin, but please refresh the page to access admin features.');
          
          // Fallback: update local state
          const updatedUser = { ...user, is_admin: true };
          setUser(updatedUser);
          setProfileData(updatedUser);
        }
      } else {
        throw new Error(data.error || 'Invalid admin secret');
      }
    } catch (error) {
      console.error('Admin promotion failed:', error);
      alert(`Admin access failed: ${error.message}`);
      setAdminSecret(''); // Clear on error
    }
  };

  const showAllUsers = async () => {
    try {
      const response = await fetch('/api/debug/users');
      const data = await response.json();
      
      if (response.ok && data.users) {
        const userList = data.users.map(u => 
          `${u.username} (Admin: ${u.is_admin ? 'Yes' : 'No'}) - Created: ${new Date(u.created_at).toLocaleDateString('en-US', { timeZone: 'Asia/Singapore' })}`
        ).join('\n');
        
        alert(`All Users in Database:\n\n${userList}\n\nCopy one of these usernames to use with admin promotion.`);
      } else {
        alert(`Error: ${data.error || 'Failed to get users'}`);
      }
    } catch (error) {
      console.error('Show users failed:', error);
      alert(`Show users failed: ${error.message}`);
    }
  };

  // AI Functions
  const loadAISummaries = async () => {
    setAiSummary(prev => ({ ...prev, loading: true }));
    try {
      const [dailyResult, weeklyResult] = await Promise.all([
        ApiService.getDailySummary(currentDate),
        ApiService.getWeeklySummary()
      ]);
      setAiSummary({
        daily: dailyResult.summary,
        weekly: weeklyResult.summary,
        loading: false
      });
    } catch (error) {
      console.error('Failed to load AI summaries:', error);
      setAiSummary({
        daily: "Great job tracking your health today! 🌟",
        weekly: "Keep up the great work with your wellness journey! 💪",
        loading: false
      });
    }
  };

  const sendChatMessage = async () => {
    if (!currentMessage.trim() || chatLoading) return;

    const userMessage = { role: 'user', content: currentMessage, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setChatLoading(true);

    try {
      const response = await ApiService.chatWithAI(currentMessage);
      const aiMessage = { 
        role: 'assistant', 
        content: response.response, 
        timestamp: new Date(response.timestamp) 
      };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to send chat message:', error);
      const errorMessage = { 
        role: 'assistant', 
        content: "I'm having trouble responding right now. Please try again later! 💙", 
        timestamp: new Date() 
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
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
              <h1 className="text-xl font-bold text-gray-800">Pinko's Constipation Relief Tracker</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setShowProfileModal(true);
                  setProfileEmail(user?.email || '');
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-gray-600 hover:bg-gray-100"
              >
                {user?.profile_photo ? (
                  <img 
                    src={user.profile_photo} 
                    alt="Profile" 
                    className="w-10 h-10 sm:w-8 sm:h-8 rounded-full object-cover border border-gray-300"
                  />
                ) : (
                  <div className="w-10 h-10 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {(user?.username || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
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
          <button
            onClick={() => setActiveTab('games')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'games'
                ? 'bg-blue-500 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            🎮 Games
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'today' && (
          <div className="space-y-4">
            {/* AI Assistant Quick Access */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 shadow-sm border border-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">🐰</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">AI Health Assistant</h3>
                    <p className="text-sm text-gray-600">Ask questions about digestive health, wellness tips, or concerns</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowChatModal(true)}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg"
                >
                  💬 Ask AI
                </button>
              </div>
            </div>

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
                    {[1, 2, 3, 4, 5].map(mood => {
                      const isSelected = currentData.mood === mood;
                      const moodConfig = {
                        1: { color: 'text-red-500', bgColor: 'bg-red-100 hover:bg-red-200', selectedBg: 'bg-red-500' },
                        2: { color: 'text-orange-500', bgColor: 'bg-orange-100 hover:bg-orange-200', selectedBg: 'bg-orange-500' },
                        3: { color: 'text-yellow-500', bgColor: 'bg-yellow-100 hover:bg-yellow-200', selectedBg: 'bg-yellow-500' },
                        4: { color: 'text-green-500', bgColor: 'bg-green-100 hover:bg-green-200', selectedBg: 'bg-green-500' },
                        5: { color: 'text-emerald-500', bgColor: 'bg-emerald-100 hover:bg-emerald-200', selectedBg: 'bg-emerald-500' }
                      };
                      
                      return (
                        <button
                          key={mood}
                          onClick={() => updateDailyData({ mood })}
                          className={`p-2 rounded-lg transition-colors ${
                            isSelected 
                              ? `${moodConfig[mood].selectedBg} text-white shadow-md` 
                              : `${moodConfig[mood].bgColor} ${moodConfig[mood].color}`
                          }`}
                        >
                          {mood === 1 ? <Frown size={20} /> :
                           mood === 2 ? <Frown size={20} /> :
                           mood === 3 ? <Meh size={20} /> :
                           mood === 4 ? <Smile size={20} /> : <Smile size={20} />}
                        </button>
                      );
                    })}
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
                        <div key={movement.id} className={`relative p-4 rounded-xl border-2 ${bristolInfo?.color || 'bg-gray-50 border-gray-200'} shadow-sm hover:shadow-md transition-all overflow-hidden`}>
                          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                            <div className="text-3xl sm:text-4xl text-center sm:text-left">{bristolInfo?.icon || '📊'}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="text-lg font-bold text-gray-800">Type {movement.bristolType}</span>
                                <span className="text-xl">{bristolInfo?.emoji || '⚫'}</span>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${bristolInfo?.severityColor || 'text-gray-600'} bg-white bg-opacity-80 whitespace-nowrap`}>
                                  {bristolInfo?.severity || 'Unknown'}
                                </span>
                              </div>
                              <div className="text-sm font-medium text-gray-700 mb-1 truncate">{bristolInfo?.name}</div>
                              <div className="text-xs text-gray-600 mb-3 line-clamp-2">{bristolInfo?.description}</div>
                              
                              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm">
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

            {/* AI Health Summary */}
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6 shadow-sm border border-green-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">🐰</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">AI Health Insights</h2>
                    <p className="text-sm text-gray-600">Personalized analysis of {user?.username || 'your'}'s wellness data</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={loadAISummaries}
                    disabled={aiSummary.loading}
                    className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    {aiSummary.loading ? '🔄 Analyzing...' : '🔄 Refresh'}
                  </button>
                  <button
                    onClick={() => setShowChatModal(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    💬 Ask AI
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Daily Summary */}
                <div className="bg-white rounded-lg p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">📅</span>
                    <h3 className="text-lg font-semibold text-gray-800">Today's Summary</h3>
                  </div>
                  {aiSummary.loading ? (
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="animate-spin w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full"></div>
                      <span className="text-sm">AI analyzing your day...</span>
                    </div>
                  ) : (
                    <p className="text-gray-700 leading-relaxed">{aiSummary.daily}</p>
                  )}
                </div>

                {/* Weekly Summary */}
                <div className="bg-white rounded-lg p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">📊</span>
                    <h3 className="text-lg font-semibold text-gray-800">This Week's Progress</h3>
                  </div>
                  {aiSummary.loading ? (
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      <span className="text-sm">AI reviewing your week...</span>
                    </div>
                  ) : (
                    <p className="text-gray-700 leading-relaxed">{aiSummary.weekly}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                  💡 AI insights are based on {user?.username || 'your'}'s tracked data. Always consult your doctor for medical advice and also inform 🐻 Bearo 🐻 as well !
                </p>
              </div>
            </div>

            {/* Bristol Scale Distribution - Redesigned for Better UX */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 shadow-sm border border-purple-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg">🚽</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Bristol Stool Scale Analysis</h2>
                  <p className="text-sm text-gray-600">Your bowel movement patterns over the past 30 days</p>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalBowelMovements}</div>
                  <div className="text-xs text-gray-600">Total Movements</div>
                </div>
                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <div className="text-2xl font-bold text-green-600">
                    {stats.totalBowelMovements > 0 ? Math.round((stats.totalBowelMovements / 30) * 10) / 10 : 0}
                  </div>
                  <div className="text-xs text-gray-600">Avg per Day</div>
                </div>
                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <div className="text-2xl font-bold text-purple-600">
                    {Object.keys(stats.bristolCounts).length}
                  </div>
                  <div className="text-xs text-gray-600">Types Used</div>
                </div>
                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <div className="text-2xl font-bold text-orange-600">
                    {stats.totalBowelMovements > 0 ? 
                      Object.entries(stats.bristolCounts).reduce((max, [type, count]) => 
                        count > (stats.bristolCounts[max] || 0) ? type : max, '1') : '-'}
                  </div>
                  <div className="text-xs text-gray-600">Most Common</div>
                </div>
              </div>

              {/* Visual Scale with Better Layout */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Detailed Breakdown</h3>
                {bristolScale.map((scale) => {
                  const count = stats.bristolCounts[scale.type] || 0;
                  const percentage = stats.totalBowelMovements > 0 ? (count / stats.totalBowelMovements * 100) : 0;
                  const isUsed = count > 0;
                  
                  return (
                    <div key={scale.type} className={`relative bg-white rounded-xl p-5 shadow-sm border-2 transition-all hover:shadow-md ${
                      isUsed ? scale.color : 'border-gray-200 opacity-60'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                        {/* Type Icon and Number */}
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                            isUsed ? 'bg-white shadow-sm' : 'bg-gray-100'
                          }`}>
                            {scale.icon}
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-gray-800">Type {scale.type}</div>
                            <div className="text-xl">{scale.emoji}</div>
                          </div>
                        </div>

                        {/* Description */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-800 mb-1">{scale.name}</div>
                          <div className="text-sm text-gray-600 mb-2">{scale.description}</div>
                          <div className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${
                            isUsed ? `${scale.severityColor} bg-white bg-opacity-80` : 'text-gray-500 bg-gray-100'
                          }`}>
                            {scale.severity}
                          </div>
                        </div>

                        {/* Statistics */}
                        <div className="text-center sm:text-right min-w-[120px]">
                          <div className="text-3xl font-bold text-gray-800 mb-1">{count}</div>
                          <div className="text-sm text-gray-600 mb-2">times ({percentage.toFixed(1)}%)</div>
                          
                          {/* Progress Bar */}
                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-700 ${
                                isUsed ? 'bg-gradient-to-r from-purple-500 to-blue-500' : 'bg-gray-300'
                              }`}
                              style={{ width: `${Math.max(percentage, isUsed ? 5 : 0)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Usage Indicator */}
                      {isUsed && (
                        <div className="absolute top-3 right-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Health Insights */}
              <div className="mt-6 bg-white rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-3">💡 Health Insights</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span><strong>Types 3-4:</strong> Normal, healthy bowel movements</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500">⚠️</span>
                      <span><strong>Types 1-2:</strong> May indicate constipation</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-500">ℹ️</span>
                      <span><strong>Type 5:</strong> Soft but formed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-orange-500">⚠️</span>
                      <span><strong>Types 6-7:</strong> May indicate diarrhea</span>
                    </div>
                  </div>
                </div>
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
                            <span>Stress: {dayData.stress_level}/10</span>
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

            {/* Daily Notes History - Moved to Bottom */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">📝</span>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-800">Daily Notes History (30 Days)</h2>
                </div>
                <button
                  onClick={() => setNotesHistoryExpanded(!notesHistoryExpanded)}
                  className="text-pink-500 hover:text-pink-600 text-lg font-bold transition-colors"
                >
                  {notesHistoryExpanded ? '−' : '+'}
                </button>
              </div>
              
              {notesHistoryExpanded && (
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
                                {(() => {
                                  const utcDate = new Date(note.created_at);
                                  const sgTime = new Date(utcDate.getTime() + (8 * 60 * 60 * 1000)); // Add 8 hours for Singapore
                                  return sgTime.toLocaleString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit',
                                    hour12: true
                                  });
                                })()}
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
              )}
            </div>
          </div>
        )}

        {activeTab === 'games' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">🎮 Games</h2>
                <p className="text-gray-600">Play Pinko's Tetris and more Exciting games are coming soon to make your health tracking journey more fun!</p>
              </div>
              
              {/* Coming Soon Games */}
              <div className="grid md:grid-cols-2 gap-6">
                
                {/* Tetris Game - NOW AVAILABLE! */}
                <div className="bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg p-6 text-white text-center">
                  <div className="text-4xl mb-3">🐰🐻🦆🐱🐧🐸🐹</div>
                  <h3 className="text-xl font-bold mb-2">Pinko's Tetris</h3>
                  <p className="text-sm opacity-90 mb-4">Cony and Brown love blocks! Stack with love! 💕</p>
                  <button
                    onClick={() => setShowTetrisFullscreen(true)}
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg px-4 py-2 text-sm transition-colors font-bold"
                  >
                    🎮 Play Now!
                  </button>
                </div>

                {/* Memory Game - Coming Soon */}
                <div className="bg-gradient-to-br from-blue-400 to-teal-500 rounded-lg p-6 text-white text-center">
                  <div className="text-4xl mb-3">🧠</div>
                  <h3 className="text-xl font-bold mb-2">Memory Trainer</h3>
                  <p className="text-sm opacity-90 mb-4">Boost your brain while managing your health!</p>
                  <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2 text-sm">
                    🚧 Coming Soon 🚧
                  </div>
                </div>

                {/* Puzzle Game - Coming Soon */}
                <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-lg p-6 text-white text-center">
                  <div className="text-4xl mb-3">🧩</div>
                  <h3 className="text-xl font-bold mb-2">Wellness Puzzle</h3>
                  <p className="text-sm opacity-90 mb-4">Solve puzzles to unlock health tips!</p>
                  <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2 text-sm">
                    🚧 Coming Soon 🚧
                  </div>
                </div>

                {/* Hidden Snake Game - Only show for testing */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="bg-gradient-to-br from-green-400 to-blue-500 rounded-lg p-6 text-white text-center">
                    <div className="text-4xl mb-3">🐍</div>
                    <h3 className="text-xl font-bold mb-2">Snake Game (Hidden)</h3>
                    <p className="text-sm opacity-90 mb-4">Classic snake with love photos!</p>
                    <button
                      onClick={() => setShowGameFullscreen(true)}
                      className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg px-4 py-2 text-sm transition-colors"
                    >
                      🎮 Play (Dev Only)
                    </button>
                  </div>
                )}
              </div>
              
              <div className="text-center mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">🎯</div>
                <h3 className="font-bold text-gray-800 mb-2">Game Development Roadmap</h3>
                <p className="text-sm text-gray-600">
                  We're working on bringing you fun, health-themed games to make wellness tracking enjoyable. 
                  Stay tuned for updates!
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Full Screen Snake Game Modal */}
      {showGameFullscreen && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Exit Button */}
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setShowGameFullscreen(false)}
              className="bg-red-500 hover:bg-red-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-lg transition-colors"
              title="Exit Game"
            >
              ✕
            </button>
          </div>
          
          {/* Game Container */}
          <iframe
            src="/snake-game/index.html"
            title="Pinko's Snake Game - Full Screen"
            className="w-full h-full border-0"
            style={{ 
              background: '#f0f0f0'
            }}
            onError={() => {
              console.log('Snake game failed to load');
            }}
          />
        </div>
      )}

      {/* Full Screen Tetris Game Modal */}
      {showTetrisFullscreen && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Exit Button */}
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setShowTetrisFullscreen(false)}
              className="bg-red-500 hover:bg-red-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-lg transition-colors"
              title="Exit Tetris"
            >
              ✕
            </button>
          </div>
          
          {/* Tetris Game Container */}
          <iframe
            src="/tetris-game/index.html"
            title="Pinko's Tetris - Full Screen"
            className="w-full h-full border-0"
            style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}
            onError={() => {
              console.log('Tetris game failed to load');
            }}
          />
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
                <div className="relative">
                  {user?.profile_photo ? (
                    <img 
                      src={user.profile_photo} 
                      alt="Profile" 
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                      {(user?.username || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <input
                    type="file"
                    id="photoUpload"
                    accept="image/*"
                    onChange={uploadProfilePhoto}
                    className="hidden"
                  />
                  <button
                    onClick={() => document.getElementById('photoUpload').click()}
                    disabled={uploadingPhoto}
                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center text-xs transition-colors"
                    title="Change photo"
                  >
                    {uploadingPhoto ? '⏳' : '📷'}
                  </button>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{user?.username || 'User'}</h3>
                  <p className="text-gray-600">{user?.email || 'No email provided'}</p>
                  <div className="text-sm text-gray-500">
                    Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { timeZone: 'Asia/Singapore' }) : 'Recently'}
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
                  <div className="flex gap-2">
                    <button
                      onClick={() => exportData('json')}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      📄 JSON Format
                    </button>
                    <button
                      onClick={() => exportData('excel')}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      📊 Excel Format
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Excel format is perfect for doctors and spreadsheet analysis
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-2">📸 Profile Photo</h4>
                  <p className="text-sm text-gray-600 mb-3">Upload a profile picture to personalize your account</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      {user?.profile_photo ? (
                        <p className="text-xs text-green-600">✓ Photo uploaded successfully</p>
                      ) : (
                        <p className="text-xs text-gray-500">No photo uploaded yet</p>
                      )}
                    </div>
                    <button
                      onClick={() => document.getElementById('photoUpload').click()}
                      disabled={uploadingPhoto}
                      className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      {uploadingPhoto ? 'Uploading...' : user?.profile_photo ? 'Change Photo' : 'Upload Photo'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Supported: JPEG, PNG, GIF (max 5MB)
                  </p>
                </div>

{user?.is_admin && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-800 mb-2">💬 Chat History Integration (Admin Only)</h4>
                    <p className="text-sm text-gray-600 mb-3">Upload WhatsApp/LINE chat history to enhance AI responses with personal context for all users</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          id="chatHistoryUpload"
                          accept=".txt,.json"
                          onChange={uploadChatHistory}
                          className="hidden"
                        />
                        <button
                          onClick={() => document.getElementById('chatHistoryUpload').click()}
                          disabled={uploadingChatHistory}
                          className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          {uploadingChatHistory ? 'Processing...' : 'Upload Chat History'}
                        </button>
                        <div className="flex-1">
                          {chatHistoryStatus && (
                            <p className="text-xs text-green-600">✓ {chatHistoryStatus}</p>
                          )}
                        </div>
                      </div>
                      <div className="bg-white rounded p-3">
                        <p className="text-xs text-gray-700 font-medium mb-1">📱 How to export chat history:</p>
                        <div className="text-xs text-gray-600 space-y-1">
                          <p><strong>WhatsApp:</strong> Open chat → ⋮ → More → Export chat → Without media</p>
                          <p><strong>LINE:</strong> Open chat → Settings → Export chat history → Text only</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        Chat history is vectorized and stored securely to provide personalized AI responses for all users
                      </p>
                    </div>
                  </div>
                )}

                {user?.is_admin && (
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-800 mb-2">👑 Admin Dashboard</h4>
                    <p className="text-sm text-gray-600 mb-3">Monitor user activity and system usage</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          setShowAdminModal(true);
                          loadAdminData();
                        }}
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        View Admin Dashboard
                      </button>
                    </div>
                  </div>
                )}

                {/* Show admin promotion for non-admin users OR when not logged in */}
                {((user && !user.is_admin) || !user) && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-800 mb-2">👑 Admin Access</h4>
                    <p className="text-sm text-gray-600 mb-3">Enter secret key to access admin features</p>
                    <div className="space-y-3">
                      <input
                        type="password"
                        value={adminSecret}
                        onChange={(e) => setAdminSecret(e.target.value)}
                        placeholder="Admin secret key"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleSimpleAdminPromotion}
                        disabled={!adminSecret.trim()}
                        className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        🔓 Access Admin Panel
                      </button>
                    </div>
                  </div>
                )}

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

      {/* AI Chat Modal */}
      {showChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">🐰</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-800">AI Health Assistant</h2>
                </div>
                <button
                  onClick={() => setShowChatModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-96">
              {chatMessages.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">🐰</div>
                  <div className="text-gray-600 text-sm mb-2">Hi! I'm your AI health assistant.</div>
                  <div className="text-gray-500 text-xs">Ask me about hydration, digestive health, wellness tips, or personal stats!!!!</div>
                </div>
              )}
              
              {chatMessages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      <span className="text-sm">AI is typing...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  placeholder="Ask about digestive health, hydration, wellness tips..."
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={500}
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!currentMessage.trim() || chatLoading}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Send
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 For serious medical concerns, always consult your doctor.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Admin Dashboard Modal */}
      {showAdminModal && user?.is_admin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 bg-white border-b p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">👑 Admin Dashboard</h2>
                <button
                  onClick={() => setShowAdminModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Database Overview */}
              {adminData.database && (
                <div className="bg-purple-50 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Database Overview</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600">{adminData.database.database?.totalUsers || 0}</div>
                      <div className="text-xs text-gray-600">Total Users</div>
                    </div>
                    <div className="bg-white rounded p-3 text-center">
                      <div className="text-2xl font-bold text-green-600">{adminData.database.database?.totalAdmins || 0}</div>
                      <div className="text-xs text-gray-600">Admins</div>
                    </div>
                    <div className="bg-white rounded p-3 text-center">
                      <div className="text-2xl font-bold text-purple-600">{adminData.database.database?.totalBowelMovements || 0}</div>
                      <div className="text-xs text-gray-600">Bowel Movements</div>
                    </div>
                    <div className="bg-white rounded p-3 text-center">
                      <div className="text-2xl font-bold text-orange-600">{adminData.database.database?.totalNotes || 0}</div>
                      <div className="text-xs text-gray-600">Notes</div>
                    </div>
                    <div className="bg-white rounded p-3 text-center">
                      <div className="text-2xl font-bold text-red-600">{adminData.database.database?.totalDailyData || 0}</div>
                      <div className="text-xs text-gray-600">Daily Records</div>
                    </div>
                    <div className="bg-white rounded p-3 text-center">
                      <div className="text-2xl font-bold text-indigo-600">{adminData.database.database?.totalMeals || 0}</div>
                      <div className="text-xs text-gray-600">Meals</div>
                    </div>
                    <div className="bg-white rounded p-3 text-center">
                      <div className="text-2xl font-bold text-yellow-600">{adminData.database.recent?.newUsersLast7Days || 0}</div>
                      <div className="text-xs text-gray-600">New Users (7d)</div>
                    </div>
                    <div className="bg-white rounded p-3 text-center">
                      <div className="text-2xl font-bold text-pink-600">{adminData.database.recent?.actionsLast7Days || 0}</div>
                      <div className="text-xs text-gray-600">Actions (7d)</div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Stats */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">👥 User Statistics</h3>
                  {adminData.loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                      <p className="text-gray-600 mt-2">Loading...</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {adminData.users.map(user => (
                        <div key={user.id} className="bg-white rounded p-3 border">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-800">{user.username}</span>
                              {user.is_admin && (
                                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">👑 Admin</span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">ID: {user.id}</span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>📧 {user.email || 'No email'}</p>
                            <p>📅 Joined: {new Date(user.created_at).toLocaleDateString('en-US', { timeZone: 'Asia/Singapore' })}</p>
                            <p>📊 {user.days_tracked} days tracked, {user.total_bowel_movements} BMs, {user.total_notes} notes</p>
                            <p>🕒 Last active: {user.last_activity ? new Date(user.last_activity).toLocaleDateString('en-US', { timeZone: 'Asia/Singapore' }) : 'Never'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Activity Logs */}
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">📋 Activity Logs</h3>
                  {adminData.loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full mx-auto"></div>
                      <p className="text-gray-600 mt-2">Loading...</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {adminData.logs.map(log => (
                        <div key={log.id} className="bg-white rounded p-3 border text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-800">{log.username}</span>
                            <span className="text-gray-500">{new Date(log.created_at).toLocaleString('en-US', { timeZone: 'Asia/Singapore', hour12: true })}</span>
                          </div>
                          <div className="text-gray-600">
                            <span className="font-medium text-blue-600">{log.action}</span>
                            {log.details && <span className="ml-2">- {log.details}</span>}
                          </div>
                          <div className="text-gray-400 mt-1">
                            IP: {log.ip_address}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  onClick={loadAdminData}
                  disabled={adminData.loading}
                  className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  {adminData.loading ? 'Loading...' : 'Refresh Data'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Promotion Modal */}
      {showAdminPromote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">👑 Promote to Admin</h2>
                <button
                  onClick={() => {
                    setShowAdminPromote(false);
                    setAdminSecret('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Secret Key
                  </label>
                  <input
                    type="password"
                    value={adminSecret}
                    onChange={(e) => setAdminSecret(e.target.value)}
                    placeholder="Enter admin secret key"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Contact the system administrator for the secret key
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowAdminPromote(false);
                      setAdminSecret('');
                    }}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={promoteToAdmin}
                    disabled={!adminSecret.trim()}
                    className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Promote
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConstipationReliefTracker;