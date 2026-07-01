import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  Settings, 
  Send, 
  Sparkles, 
  Clock, 
  Info, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Bell, 
  BookOpen, 
  Award, 
  AlertCircle,
  Clock3,
  CheckCircle,
  HelpCircle,
  RefreshCw,
  MapPin,
  User,
  GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DayOfWeek, StudyTask, StudyLesson, TelegramConfig, AppState, DAYS_ARABIC, DAYS_ORDER } from './types.js';

export default function App() {
  const [appState, setAppState] = useState<AppState>({
    tasks: [],
    lessons: [],
    telegram: {
      botToken: '',
      chatId: '',
      reminderTime: '08:00',
      enabled: false
    }
  });

  // Get current local day
  const getTodayDayOfWeek = (): DayOfWeek => {
    const dayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday...
    const DAYS_MAPPING: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return DAYS_MAPPING[dayIndex];
  };

  // Real-time clock for lesson countdowns
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate live countdown to a lesson
  const getLessonCountdown = (lesson: StudyLesson) => {
    const now = currentTime;
    const todayDayIdx = now.getDay(); // 0 is Sunday
    const DAYS_MAPPING: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDayIdx = DAYS_MAPPING.indexOf(lesson.day);
    
    // Target date construction
    let daysOffset = targetDayIdx - todayDayIdx;
    if (daysOffset < 0) {
      daysOffset += 7;
    }
    
    const [h, m] = lesson.time.split(':').map(Number);
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + daysOffset);
    targetDate.setHours(h, m, 0, 0);
    
    // If it is today and already passed, check if active or next week
    if (daysOffset === 0 && targetDate.getTime() < now.getTime()) {
      const diffMinutes = Math.floor((now.getTime() - targetDate.getTime()) / 60000);
      if (diffMinutes < 120) { // assume 2h class duration
        return {
          text: `جارٍ الآن ⚡ (بدأ منذ ${diffMinutes} دقيقة)`,
          type: 'active' as const,
          secondsLeft: 0,
          hasPassedToday: false,
          formattedCountdown: '00:00:00',
          badgeColor: 'bg-emerald-500 text-white animate-pulse'
        };
      } else {
        return {
          text: 'انتهى الدرس اليوم 🏁',
          type: 'today-passed' as const,
          secondsLeft: 0,
          hasPassedToday: true,
          formattedCountdown: '--:--:--',
          badgeColor: 'bg-slate-300 text-slate-700'
        };
      }
    }
    
    const diffMs = targetDate.getTime() - now.getTime();
    const totalSecs = Math.max(0, Math.floor(diffMs / 1000));
    
    const days = Math.floor(totalSecs / (3600 * 24));
    const hours = Math.floor((totalSecs % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    
    let textParts = [];
    if (days > 0) textParts.push(`${days} يوم`);
    if (hours > 0) textParts.push(`${hours} ساعة`);
    if (minutes > 0) textParts.push(`${minutes} دقيقة`);
    if (days === 0 && hours === 0) textParts.push(`${seconds} ثانية`);
    
    const text = `يبدأ خلال ${textParts.join(' و ')} ⏳`;
    
    const dayStr = days > 0 ? `${days} يوم و ` : '';
    const hrStr = String(hours).padStart(2, '0');
    const minStr = String(minutes).padStart(2, '0');
    const secStr = String(seconds).padStart(2, '0');
    
    return {
      text,
      type: 'upcoming' as const,
      secondsLeft: totalSecs,
      hasPassedToday: false,
      formattedCountdown: `${dayStr}${hrStr}:${minStr}:${secStr}`,
      badgeColor: days === 0 && hours === 0 ? 'bg-amber-500 text-white animate-pulse' : 'bg-indigo-50 text-indigo-700'
    };
  };

  const todayDayOfWeek = getTodayDayOfWeek();
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(todayDayOfWeek);
  const [activeTab, setActiveTab] = useState<'study' | 'lessons'>('study');
  
  // Tasks state
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);
  const [formSubject, setFormSubject] = useState('');
  const [formTime, setFormTime] = useState('09:00');
  const [formDuration, setFormDuration] = useState(90);
  const [formNotes, setFormNotes] = useState('');

  // Lessons state
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [editingLesson, setEditingLesson] = useState<StudyLesson | null>(null);
  const [lessonSubject, setLessonSubject] = useState('');
  const [lessonTime, setLessonTime] = useState('14:00');
  const [lessonLocation, setLessonLocation] = useState('سنتر الأمل');
  const [lessonTeacher, setLessonTeacher] = useState('');
  const [lessonNotes, setLessonNotes] = useState('');

  // Local Mobile Browser Notification permissions and helper state
  const [notificationPermission, setNotificationPermission] = useState<'default' | 'granted' | 'denied' | 'unsupported'>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission as 'default' | 'granted' | 'denied';
    }
    return 'unsupported';
  });

  const [sentLocalNotifications, setSentLocalNotifications] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('sent_local_notifications');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // State for notification history
  const [notificationHistory, setNotificationHistory] = useState<Array<{ id: string; time: string; title: string; body: string }>>(() => {
    try {
      const saved = localStorage.getItem('local_notification_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // State to track if deletion of task or lesson is confirming
  const [confirmDeleteTaskId, setConfirmDeleteTaskId] = useState<string | null>(null);
  const [confirmDeleteLessonId, setConfirmDeleteLessonId] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('sent_local_notifications', JSON.stringify(sentLocalNotifications));
    } catch (e) {
      console.warn(e);
    }
  }, [sentLocalNotifications]);

  useEffect(() => {
    try {
      localStorage.setItem('local_notification_history', JSON.stringify(notificationHistory));
    } catch (e) {
      console.warn(e);
    }
  }, [notificationHistory]);

  // Synthesized chime for instant feedback
  const playNotificationChime = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.value = 659.25; // E5 (Ding)
      osc1.type = 'sine';
      
      gain1.gain.setValueAtTime(0, ctx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.4);
      
      setTimeout(() => {
        try {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.value = 523.25; // C5 (Dong)
          osc2.type = 'sine';
          
          gain2.gain.setValueAtTime(0, ctx.currentTime);
          gain2.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
          
          osc2.start(ctx.currentTime);
          osc2.stop(ctx.currentTime + 0.5);
        } catch (e) { }
      }, 150);
    } catch (err) {
      console.warn('Dual-tone chime could not play:', err);
    }
  };

  const triggerLocalNotification = (title: string, body: string) => {
    // 1. Play synthesized tone
    playNotificationChime();

    // 2. Try vibrating mobile device
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    // 3. System Notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: 'lesson-alert',
          requireInteraction: true
        });
      } catch (err) {
        console.warn('System notification failed, fallback to in-app:', err);
      }
    }

    // 4. Update history
    const nowStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setNotificationHistory(prev => [
      { id: Math.random().toString(36).substring(2, 9), time: nowStr, title, body },
      ...prev.slice(0, 19) // Keep last 20 notifications
    ]);
  };

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('متصفحك الحالي لا يدعم إشعارات النظام الحية. الرجاء التأكد من استخدام متصفح حديث (مثل Chrome أو Safari) وتثبيت التطبيق على الشاشة الرئيسية.');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        triggerLocalNotification(
          '🔔 تم تفعيل إشعارات الهاتف بنجاح!',
          'سنقوم بإرسال إشعار لك قبل الدرس بـ 10 دقائق وعند بدئه، وتذكير كل 5 دقائق أثناء الحصة!'
        );
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  const testLocalNotification = () => {
    triggerLocalNotification(
      '🧪 إشعار تجريبي من المنظم الدراسي',
      'هكذا ستصلك إشعارات وتنبيهات الدروس والحصص مباشرة على شاشة هاتفك المحمول!'
    );
  };

  const clearNotificationHistory = () => {
    setNotificationHistory([]);
  };

  // AI tips state
  const [aiTips, setAiTips] = useState('');
  const [isGeneratingTips, setIsGeneratingTips] = useState(false);

  // Fetch initial state
  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      const data = await res.json();
      setAppState({
        tasks: data.tasks || [],
        lessons: data.lessons || [],
        telegram: data.telegram || { botToken: '', chatId: '', reminderTime: '08:00', enabled: false }
      });
    } catch (error) {
      console.error('Error fetching application state:', error);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  // Fetch AI Tips whenever selectedDay changes, or when requested
  const generateAiTipsForSelectedDay = async (force: boolean = false) => {
    if (!force && aiTips) return; // Avoid re-generating unnecessarily if already there
    setIsGeneratingTips(true);
    try {
      const response = await fetch('/api/ai/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day: selectedDay })
      });
      const data = await response.json();
      if (data.success) {
        setAiTips(data.tips);
      } else {
        throw new Error(data.error || 'Failed to generate study tips');
      }
    } catch (error: any) {
      console.warn('Warning: Could not fetch AI study tips, using fallback:', error?.message || error);
      const defaultTips = [
        "⏳ **تقسيم الوقت الفعّال**: جرب استخدام تقنية البومودورو (مذاكرة 25 دقيقة متواصلة ثم 5 دقائق راحة) للحفاظ على نشاطك الذهني وتركيزك العالي اليوم.",
        "✍️ **التدوين والتلخيص**: تلخيص المفاهيم الأساسية بأسلوبك الخاص وكتابتها يدويًا يعزز الفهم ويرسخ المعلومات في الذاكرة لفترات أطول بكثير.",
        "📵 **بيئة دراسية خالية من المشتتات**: ابعد هاتفك الذكي تمامًا عن مكتبك وافصل الإشعارات لخلق جو مثالي يساعدك على إنهاء مهامك بسرعة وجودة.",
        "💡 **المراجعة التراكمية**: خصص أول 10 دقائق من وقتك اليوم لمراجعة سريعة لما أنجزته بالأمس قبل البدء بمهام جديدة لبناء ترابط قوي للمعلومات."
      ];
      const randomTip = defaultTips[Math.floor(Math.random() * defaultTips.length)];
      setAiTips(`💡 **مستشارك الدراسي (نصيحة بديلة):**\n\n${randomTip}\n\n*(مساعد الذكاء الاصطناعي مستريح حالياً، تم تفعيل بنك النصائح المدمج لتستمر رحلتك الدراسية بنجاح!)*`);
    } finally {
      setIsGeneratingTips(false);
    }
  };

  useEffect(() => {
    setAiTips(''); // Clear old tips
    generateAiTipsForSelectedDay(false);
  }, [selectedDay]);

  // Handle Task Save
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubject.trim()) return;

    const taskData: Partial<StudyTask> = {
      day: selectedDay,
      subject: formSubject,
      time: formTime,
      duration: Number(formDuration),
      notes: formNotes,
      completed: false
    };

    if (editingTask) {
      taskData.id = editingTask.id;
      taskData.completed = editingTask.completed || false;
    }

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      const data = await response.json();
      if (data.success) {
        setAppState(prev => ({ ...prev, tasks: data.state.tasks, lessons: data.state.lessons || prev.lessons }));
        setIsAddingTask(false);
        setEditingTask(null);
        resetTaskForm();
        // Refresh AI tips for the modified schedule
        generateAiTipsForSelectedDay(true);
      }
    } catch (error) {
      console.error('Error saving study task:', error);
    }
  };

  // Reset task form fields
  const resetTaskForm = () => {
    setFormSubject('');
    setFormTime('09:00');
    setFormDuration(90);
    setFormNotes('');
  };

  // Open task editor
  const handleEditTaskClick = (task: StudyTask) => {
    setEditingTask(task);
    setFormSubject(task.subject);
    setFormTime(task.time);
    setFormDuration(task.duration);
    setFormNotes(task.notes || '');
    setIsAddingTask(true);
  };

  // Delete Task
  const handleDeleteTask = async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        setAppState(prev => ({ ...prev, tasks: data.state.tasks, lessons: data.state.lessons || prev.lessons }));
        // Refresh AI tips
        generateAiTipsForSelectedDay(true);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // Toggle Completed status client-side only for visual feedback, or we can save it
  const handleToggleCompleted = async (task: StudyTask) => {
    const updated = { ...task, completed: !task.completed };
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await response.json();
      if (data.success) {
        setAppState(prev => ({ ...prev, tasks: data.state.tasks, lessons: data.state.lessons || prev.lessons }));
      }
    } catch (error) {
      console.error('Error toggling task completion:', error);
    }
  };

  // Handle Lesson Save
  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonSubject.trim() || !lessonLocation.trim()) return;

    const lessonData: Partial<StudyLesson> = {
      day: selectedDay,
      subject: lessonSubject,
      time: lessonTime,
      location: lessonLocation,
      teacherName: lessonTeacher,
      notes: lessonNotes
    };

    if (editingLesson) {
      lessonData.id = editingLesson.id;
    }

    try {
      const response = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lessonData)
      });
      const data = await response.json();
      if (data.success) {
        setAppState(prev => ({ ...prev, tasks: data.state.tasks || prev.tasks, lessons: data.state.lessons }));
        setIsAddingLesson(false);
        setEditingLesson(null);
        resetLessonForm();
        // Refresh AI tips
        generateAiTipsForSelectedDay(true);
      }
    } catch (error) {
      console.error('Error saving study lesson:', error);
    }
  };

  const resetLessonForm = () => {
    setLessonSubject('');
    setLessonTime('14:00');
    setLessonLocation('سنتر الأمل');
    setLessonTeacher('');
    setLessonNotes('');
  };

  const handleEditLessonClick = (lesson: StudyLesson) => {
    setEditingLesson(lesson);
    setLessonSubject(lesson.subject);
    setLessonTime(lesson.time);
    setLessonLocation(lesson.location);
    setLessonTeacher(lesson.teacherName || '');
    setLessonNotes(lesson.notes || '');
    setIsAddingLesson(true);
  };

  const handleDeleteLesson = async (id: string) => {
    try {
      const response = await fetch(`/api/lessons/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        setAppState(prev => ({ ...prev, tasks: data.state.tasks || prev.tasks, lessons: data.state.lessons }));
        // Refresh AI tips
        generateAiTipsForSelectedDay(true);
      }
    } catch (error) {
      console.error('Error deleting lesson:', error);
    }
  };

  // Local Browser Notifications checking useEffect (Runs every second alongside clock ticking)
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const now = currentTime;
    const todayDayIdx = now.getDay();
    const DAYS_MAPPING: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayDayOfWeek = DAYS_MAPPING[todayDayIdx];
    
    const todayLessons = (appState.lessons || []).filter(l => l.day === todayDayOfWeek);
    const todayStr = now.toISOString().split('T')[0]; // "YYYY-MM-DD"
    
    let stateChanged = false;
    const newSentMap = { ...sentLocalNotifications };

    // Prune older dates' tracking keys to prevent local storage growth
    Object.keys(newSentMap).forEach(key => {
      if (!key.endsWith(todayStr)) {
        delete newSentMap[key];
        stateChanged = true;
      }
    });

    todayLessons.forEach(lesson => {
      const [lHours, lMinutes] = lesson.time.split(':').map(Number);
      const lessonDate = new Date(now);
      lessonDate.setHours(lHours, lMinutes, 0, 0);

      const diffMs = lessonDate.getTime() - now.getTime();
      const diffMinutes = Math.round(diffMs / 60000); // positive in future, negative in past

      // Case 1: Exactly 10 minutes before the lesson
      if (diffMinutes === 10) {
        const key = `${lesson.id}_10m_${todayStr}`;
        if (!newSentMap[key]) {
          newSentMap[key] = true;
          stateChanged = true;
          triggerLocalNotification(
            `⏳ باقي 10 دقائق على بداية درس ${lesson.subject}!`,
            `المعلم: ${lesson.teacherName || 'غير محدد'} | المكان: ${lesson.location}. استعد للبدء في موعدك!`
          );
        }
      }

      // Case 2: Exactly 5 minutes before the lesson
      if (diffMinutes === 5) {
        const key = `${lesson.id}_5m_${todayStr}`;
        if (!newSentMap[key]) {
          newSentMap[key] = true;
          stateChanged = true;
          triggerLocalNotification(
            `🚨 باقي 5 دقائق على بداية درس ${lesson.subject}!`,
            `المكان: ${lesson.location}. جهز كشكولك وأقلامك والتحق فوراً!`
          );
        }
      }

      // Case 3: Exactly at starting time (0 minutes left)
      if (diffMinutes === 0) {
        const key = `${lesson.id}_now_${todayStr}`;
        if (!newSentMap[key]) {
          newSentMap[key] = true;
          stateChanged = true;
          triggerLocalNotification(
            `🔔 بدأ الآن: حان موعد درس ${lesson.subject}! 🏫`,
            `الأستاذ: ${lesson.teacherName || 'غير محدد'} | المكان: ${lesson.location}. بالتوفيق والنشاط!`
          );
        }
      }

      // Case 4: Every 5 minutes during the lesson
      if (diffMinutes < 0) {
        const elapsed = Math.abs(diffMinutes);
        if (elapsed <= 120 && elapsed % 5 === 0) {
          const key = `${lesson.id}_elapsed_${elapsed}_${todayStr}`;
          if (!newSentMap[key]) {
            newSentMap[key] = true;
            stateChanged = true;
            triggerLocalNotification(
              `⏱️ تنبيه: درس ${lesson.subject} جاري الآن!`,
              `الدرس بدأ منذ ${elapsed} دقيقة في ${lesson.location}. التحق بحصتك إن لم تفعل بعد لكي لا يتراكم الشرح!`
            );
          }
        }
      }
    });

    if (stateChanged) {
      setSentLocalNotifications(newSentMap);
    }
  }, [currentTime, appState.lessons, sentLocalNotifications]);

  // Filter tasks for current day
  const filteredTasks = appState.tasks
    .filter(t => t.day === selectedDay)
    .sort((a, b) => a.time.localeCompare(b.time));

  // Filter lessons for current day
  const filteredLessons = (appState.lessons || [])
    .filter(l => l.day === selectedDay)
    .sort((a, b) => a.time.localeCompare(b.time));

  // Find the next upcoming lesson of the selected day
  const getNextLessonOfSelectedDay = () => {
    if (filteredLessons.length === 0) return null;
    
    if (selectedDay === todayDayOfWeek) {
      const upcoming = filteredLessons.find(l => {
        const cd = getLessonCountdown(l);
        return cd.type === 'upcoming' || cd.type === 'active';
      });
      return upcoming || null;
    } else {
      return filteredLessons[0];
    }
  };

  const nextLesson = getNextLessonOfSelectedDay();

  // Calculating statistics
  const todayTasks = appState.tasks.filter(t => t.day === todayDayOfWeek);
  const todayCompletedTasks = todayTasks.filter(t => t.completed);
  const completionPercentage = todayTasks.length > 0 
    ? Math.round((todayCompletedTasks.length / todayTasks.length) * 100) 
    : 0;

  // Format Time to 12h for Display (Arabic)
  const formatTimeDisplay = (timeStr: string): string => {
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'مساءً' : 'صباحاً';
    const hours12 = h % 12 === 0 ? 12 : h % 12;
    return `${hours12}:${String(m).padStart(2, '0')} ${period}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 md:p-8" dir="rtl" id="app-container">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Header Card */}
        <header className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden" id="main-header">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-20 -translate-y-20 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-500/20 rounded-full translate-x-10 translate-y-20 blur-2xl pointer-events-none"></div>

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="bg-indigo-500/40 text-indigo-100 text-xs font-semibold px-3 py-1 rounded-full border border-indigo-400/30 inline-flex items-center gap-1.5">
                <Clock3 className="w-3.5 h-3.5" />
                تخطيط وجدولة دراسية متكاملة (مذاكرة + دروس)
              </span>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">نظام مُذكِّر الطالب الدراسي الشامل 📚✨</h1>
              <p className="text-indigo-100 max-w-xl text-sm md:text-base">
                نظم جدول مذاكرتك اليومي وسجل مواعيد حصص الدروس الخارجية، وسيتكفل النظام بإرسال تقرير مدمج وشامل لجدولك على حساب التليجرام الخاص بك كل صباح!
              </p>
            </div>

            {/* Daily Stat Badge */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 min-w-[200px] flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center font-bold text-xl shadow-lg">
                %{completionPercentage}
              </div>
              <div>
                <h4 className="text-xs text-indigo-200 font-medium">إنجاز خطة اليوم ({DAYS_ARABIC[todayDayOfWeek].arabic})</h4>
                <p className="text-sm font-bold mt-0.5">
                  {todayCompletedTasks.length} من أصل {todayTasks.length} مواد مذاكرة
                </p>
                <div className="w-24 bg-white/20 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div className="bg-amber-400 h-full" style={{ width: `${completionPercentage}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Horizontal Days Calendar */}
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100" id="calendar-bar">
          <h2 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            اختر اليوم لعرض وتعديل الجدول الدراسي والحصص المحددة:
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {DAYS_ORDER.map((day) => {
              const isSelected = selectedDay === day;
              const isToday = getTodayDayOfWeek() === day;
              const dayTasksCount = appState.tasks.filter(t => t.day === day).length;
              const dayLessonsCount = (appState.lessons || []).filter(l => l.day === day).length;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  id={`day-btn-${day}`}
                  className={`relative p-3 rounded-xl transition-all duration-200 text-right flex flex-col justify-between h-24 ${
                    isSelected 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 ring-2 ring-indigo-600 ring-offset-2' 
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-sm">{DAYS_ARABIC[day].arabic}</span>
                    {isToday && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                        اليوم
                      </span>
                    )}
                  </div>

                  <div className="mt-1 space-y-0.5 text-[10px] text-right">
                    <div className={`flex items-center gap-1 ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                      مذاكرة: {dayTasksCount}
                    </div>
                    <div className={`flex items-center gap-1 ${isSelected ? 'text-amber-200' : 'text-slate-500'}`}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      دروس: {dayLessonsCount}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Main Content Split Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Right Column: Day Schedule List (2/3 width) */}
          <div className="lg:col-span-2 space-y-6" id="schedule-section">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              
              {/* Header Title with tabs */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800">
                    جدول وتفاصيل يوم {DAYS_ARABIC[selectedDay].arabic}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">تنظيم المذاكرة الذاتية ومواعيد الحصص والدروس الخارجية بالتوازي</p>
                </div>

                {/* Main Tab Selector */}
                <div className="flex bg-slate-100 p-1 rounded-xl" id="schedule-tabs">
                  <button
                    onClick={() => setActiveTab('study')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
                      activeTab === 'study'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    ✍️ جدول المذاكرة ({filteredTasks.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('lessons')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
                      activeTab === 'lessons'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    🏫 حصص الدروس ({filteredLessons.length})
                  </button>
                </div>
              </div>

              {/* STUDY TAB */}
              {activeTab === 'study' && (
                <div className="space-y-4" id="study-tab-content">
                  
                  {/* Action Header bar inside Tab */}
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-xs font-extrabold text-slate-500">خطة المذاكرة الفردية الذاتية للمواد والواجبات</span>
                    <button
                      onClick={() => {
                        resetTaskForm();
                        setEditingTask(null);
                        setIsAddingTask(true);
                      }}
                      id="add-task-trigger"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3 py-2 rounded-lg shadow-sm transition-all flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      إضافة مادة مذاكرة
                    </button>
                  </div>

                  {/* Add/Edit Task Form */}
                  <AnimatePresence>
                    {isAddingTask && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden bg-slate-50 border border-slate-200/60 rounded-xl mb-4"
                        id="task-form-container"
                      >
                        <form onSubmit={handleSaveTask} className="p-4 space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
                            <span className="font-extrabold text-slate-800 text-xs">
                              {editingTask ? 'تعديل مادة مجدولة' : 'إضافة مادة دراسية جديدة للمذاكرة'} ليوم {DAYS_ARABIC[selectedDay].arabic}
                            </span>
                            <button 
                              type="button" 
                              onClick={() => {
                                setIsAddingTask(false);
                                setEditingTask(null);
                              }}
                              className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                            >
                              إلغاء
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-600 block">اسم المادة الدراسيّة</label>
                              <input
                                type="text"
                                required
                                placeholder="مثال: رياضيات، فيزياء، لغة عربية"
                                value={formSubject}
                                onChange={(e) => setFormSubject(e.target.value)}
                                id="input-subject-name"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 block">وقت البدء</label>
                                <input
                                  type="time"
                                  required
                                  value={formTime}
                                  onChange={(e) => setFormTime(e.target.value)}
                                  id="input-subject-time"
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 block">المدة (بالدقائق)</label>
                                <input
                                  type="number"
                                  required
                                  min="10"
                                  max="480"
                                  value={formDuration}
                                  onChange={(e) => setFormDuration(Number(e.target.value))}
                                  id="input-subject-duration"
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-600 block">ماذا ستذاكر اليوم؟ (ملاحظات أو واجبات)</label>
                            <textarea
                              placeholder="اكتب هنا الأجزاء والدروس المحددة للمذاكرة والتمارين لحلها..."
                              value={formNotes}
                              onChange={(e) => setFormNotes(e.target.value)}
                              rows={2}
                              id="input-subject-notes"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingTask(false);
                                setEditingTask(null);
                              }}
                              className="bg-slate-200 text-slate-700 hover:bg-slate-300 px-3.5 py-1.5 rounded-lg text-[11px] font-bold"
                            >
                              إلغاء
                            </button>
                            <button
                              type="submit"
                              id="submit-task-btn"
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-[11px] font-bold shadow-sm"
                            >
                              {editingTask ? 'حفظ التعديلات' : 'إضافة للجدول الدراسي'}
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Tasks List container */}
                  {filteredTasks.length === 0 ? (
                    <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200" id="no-tasks-fallback">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-slate-700 text-xs">لا توجد مواد مذاكرة ذاتية ليوم {DAYS_ARABIC[selectedDay].arabic}</h3>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                        قم بإضافة المواد التي تود التركيز ومذاكرتها بنفسك اليوم وسوف يتم تنبيهك بها.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3.5" id="tasks-list">
                      {filteredTasks.map((task) => (
                        <div 
                          key={task.id} 
                          id={`task-card-${task.id}`}
                          className={`p-4 rounded-xl border transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                            task.completed 
                              ? 'bg-emerald-50/40 border-emerald-100 text-slate-600' 
                              : 'bg-white border-slate-100 shadow-sm hover:border-slate-200'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => handleToggleCompleted(task)}
                              title={task.completed ? 'تحديد كغير مكتمل' : 'تحديد كمكتمل'}
                              id={`toggle-task-${task.id}`}
                              className={`w-5.5 h-5.5 rounded-lg flex items-center justify-center mt-0.5 border transition-colors ${
                                task.completed 
                                  ? 'bg-emerald-500 border-emerald-500 text-white' 
                                  : 'bg-white border-slate-300 hover:border-indigo-500 text-transparent'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </button>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className={`font-bold text-sm md:text-base ${task.completed ? 'line-through text-slate-400 font-medium' : 'text-slate-800'}`}>
                                  {task.subject}
                                </h4>
                                <span className="bg-indigo-50 text-indigo-600 text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {task.duration} دقيقة
                                </span>
                              </div>

                              <p className="text-xs text-indigo-600 font-bold flex items-center gap-1">
                                <Clock3 className="w-3.5 h-3.5" />
                                موعد البدء: {formatTimeDisplay(task.time)}
                              </p>

                              {task.notes && (
                                <p className="text-xs text-slate-400 italic mt-1 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                  {task.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 self-end md:self-center">
                            <button
                              onClick={() => handleEditTaskClick(task)}
                              title="تعديل المادة"
                              id={`edit-task-${task.id}`}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            
                            {confirmDeleteTaskId === task.id ? (
                              <div className="flex items-center gap-1 bg-red-50 border border-red-200 p-1 rounded-lg animate-pulse">
                                <span className="text-[10px] font-bold text-red-600 px-1">متأكد؟</span>
                                <button
                                  onClick={() => {
                                    handleDeleteTask(task.id);
                                    setConfirmDeleteTaskId(null);
                                  }}
                                  className="text-[10px] font-extrabold bg-red-600 text-white px-2 py-0.5 rounded-md hover:bg-red-700 transition-colors"
                                >
                                  نعم
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteTaskId(null)}
                                  className="text-[10px] font-extrabold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md hover:bg-slate-300 transition-colors"
                                >
                                  لا
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteTaskId(task.id)}
                                title="حذف من الجدول"
                                id={`delete-task-${task.id}`}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* LESSONS TAB */}
              {activeTab === 'lessons' && (
                <div className="space-y-4" id="lessons-tab-content">
                  
                  {/* Action Header bar for Lesson */}
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-xs font-extrabold text-slate-500">حصص الدروس والسناتر والمحاضرات الخارجية والأونلاين</span>
                    <button
                      onClick={() => {
                        resetLessonForm();
                        setEditingLesson(null);
                        setIsAddingLesson(true);
                      }}
                      id="add-lesson-trigger"
                      className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs px-3 py-2 rounded-lg shadow-sm transition-all flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      إضافة موعد درس (سنتر/أونلاين)
                    </button>
                  </div>

                  {/* Add/Edit Lesson Form */}
                  <AnimatePresence>
                    {isAddingLesson && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden bg-slate-50 border border-slate-200/60 rounded-xl mb-4"
                        id="lesson-form-container"
                      >
                        <form onSubmit={handleSaveLesson} className="p-4 space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
                            <span className="font-extrabold text-slate-800 text-xs">
                              {editingLesson ? 'تعديل موعد الدرس' : 'إضافة موعد درس جديد'} ليوم {DAYS_ARABIC[selectedDay].arabic}
                            </span>
                            <button 
                              type="button" 
                              onClick={() => {
                                setIsAddingLesson(false);
                                setEditingLesson(null);
                              }}
                              className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                            >
                              إلغاء
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-600 block">موضوع أو مادة الدرس</label>
                              <input
                                type="text"
                                required
                                placeholder="مثال: ميكانيكا، فيزياء حديثة، لغة فرنسية"
                                value={lessonSubject}
                                onChange={(e) => setLessonSubject(e.target.value)}
                                id="input-lesson-subject"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 block">وقت الدرس (الساعة)</label>
                                <input
                                  type="time"
                                  required
                                  value={lessonTime}
                                  onChange={(e) => setLessonTime(e.target.value)}
                                  id="input-lesson-time"
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-600 block">الموقع أو المكان</label>
                                <input
                                  type="text"
                                  required
                                  placeholder="مثال: سنتر الأمل، زووم لايف"
                                  value={lessonLocation}
                                  onChange={(e) => setLessonLocation(e.target.value)}
                                  id="input-lesson-location"
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-600 block">اسم المعلم / المحاضر (اختياري)</label>
                              <input
                                type="text"
                                placeholder="مثال: أ/ محمد صلاح"
                                value={lessonTeacher}
                                onChange={(e) => setLessonTeacher(e.target.value)}
                                id="input-lesson-teacher"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-600 block">ملاحظات الدرس والتحضير (اختياري)</label>
                              <input
                                type="text"
                                placeholder="مثال: تجهيز كشكول الواجب وحضور امتحان تجريبي"
                                value={lessonNotes}
                                onChange={(e) => setLessonNotes(e.target.value)}
                                id="input-lesson-notes"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingLesson(false);
                                setEditingLesson(null);
                              }}
                              className="bg-slate-200 text-slate-700 hover:bg-slate-300 px-3.5 py-1.5 rounded-lg text-[11px] font-bold"
                            >
                              إلغاء
                            </button>
                            <button
                              type="submit"
                              id="submit-lesson-btn"
                              className="bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-1.5 rounded-lg text-[11px] font-bold shadow-sm"
                            >
                              {editingLesson ? 'حفظ التعديلات' : 'إضافة موعد الدرس'}
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Next Lesson Live Countdown Alert */}
                  {nextLesson && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-indigo-500/5 border border-amber-500/20 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                      id="next-lesson-countdown-banner"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-amber-200 shrink-0">
                          <Clock3 className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-amber-700">
                            الدرس القادم المحدّد ليوم {DAYS_ARABIC[selectedDay].arabic}:
                          </h4>
                          <p className="text-sm font-extrabold text-slate-800 mt-0.5">
                            {nextLesson.subject} {nextLesson.teacherName ? `(مع ${nextLesson.teacherName})` : ''} 📍 {nextLesson.location}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl shadow-sm border border-amber-100/50 self-start md:self-auto">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0"></span>
                        <span className="font-mono text-xs font-extrabold text-slate-800 tracking-wide">
                          {getLessonCountdown(nextLesson).formattedCountdown}
                        </span>
                        <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md mr-1 select-none">
                          {getLessonCountdown(nextLesson).text}
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {selectedDay === todayDayOfWeek && filteredLessons.length > 0 && !nextLesson && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-800" id="all-lessons-completed-banner">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold">انتهت جميع حصص ودروس اليوم! 🎉</h4>
                        <p className="text-[11px] text-emerald-700 mt-0.5">استغل وقتك الآن في مراجعة ما تم شرحه والتحضير للدروس القادمة.</p>
                      </div>
                    </div>
                  )}

                  {/* Lessons List View */}
                  {filteredLessons.length === 0 ? (
                    <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200" id="no-lessons-fallback">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-slate-700 text-xs">لا توجد حصص أو دروس مجدولة ليوم {DAYS_ARABIC[selectedDay].arabic}</h3>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                        قم بإضافة الحصص الخارجية في السناتر أو محاضرات الأونلاين لمراقبتها بجانب خطتك المذاكرة.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5" id="lessons-list">
                      {filteredLessons.map((lesson) => (
                        <div 
                          key={lesson.id} 
                          id={`lesson-card-${lesson.id}`}
                          className="bg-amber-50/20 border border-amber-100/70 rounded-xl p-4 flex flex-col justify-between hover:border-amber-200 transition-all duration-150 relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-12 h-12 bg-amber-400/5 rounded-full pointer-events-none translate-x-3 -translate-y-3"></div>
                          
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <h4 className="font-extrabold text-slate-800 text-sm md:text-base flex items-center gap-1.5">
                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                {lesson.subject}
                              </h4>
                              
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleEditLessonClick(lesson)}
                                  title="تعديل الدرس"
                                  id={`edit-lesson-${lesson.id}`}
                                  className="p-1 text-slate-400 hover:text-amber-600 rounded-md transition-colors"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                
                                {confirmDeleteLessonId === lesson.id ? (
                                  <div className="flex items-center gap-1 bg-red-50 border border-red-200 p-1 rounded-lg animate-pulse z-10">
                                    <span className="text-[10px] font-bold text-red-600 px-1">متأكد؟</span>
                                    <button
                                      onClick={() => {
                                        handleDeleteLesson(lesson.id);
                                        setConfirmDeleteLessonId(null);
                                      }}
                                      className="text-[10px] font-extrabold bg-red-600 text-white px-2 py-0.5 rounded-md hover:bg-red-700 transition-colors"
                                    >
                                      نعم
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteLessonId(null)}
                                      className="text-[10px] font-extrabold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md hover:bg-slate-300 transition-colors"
                                    >
                                      لا
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDeleteLessonId(lesson.id)}
                                    title="حذف الدرس"
                                    id={`delete-lesson-${lesson.id}`}
                                    className="p-1 text-slate-400 hover:text-red-500 rounded-md transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="space-y-1.5 text-xs">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-amber-700 font-bold flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 shrink-0" />
                                  موعد الحصة: {formatTimeDisplay(lesson.time)}
                                </p>
                                <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold ${getLessonCountdown(lesson).badgeColor}`}>
                                  {getLessonCountdown(lesson).text}
                                </span>
                              </div>
                              
                              <p className="text-slate-600 flex items-center gap-1.5 font-medium">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                المكان: {lesson.location}
                              </p>

                              {lesson.teacherName && (
                                <p className="text-slate-600 flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  الأستاذ: {lesson.teacherName}
                                </p>
                              )}

                              {lesson.notes && (
                                <div className="mt-2 text-[11px] text-slate-500 bg-white/60 p-2 rounded-lg border border-amber-100/30">
                                  <b>ملاحظات:</b> {lesson.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* AI Advisor Card */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-6 relative overflow-hidden" id="ai-advisor-panel">
              <div className="absolute top-0 left-0 w-32 h-32 bg-amber-200/20 rounded-full -translate-x-10 -translate-y-10 blur-xl pointer-events-none"></div>
              
              <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-amber-800">
                    <Sparkles className="w-5 h-5 fill-amber-500 stroke-amber-600" />
                    <h3 className="font-extrabold text-base">مستشار المذاكرة الذكي (المساعد الشخصي) ✨</h3>
                  </div>
                  <p className="text-xs text-amber-700">تحليل فوري وجدول مذاكرة مقترح لليوم الحالي</p>
                </div>

                <button
                  onClick={() => generateAiTipsForSelectedDay(true)}
                  disabled={isGeneratingTips}
                  id="get-ai-tips-btn"
                  className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-amber-200 inline-flex items-center gap-1.5 self-start"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingTips ? 'animate-spin' : ''}`} />
                  {isGeneratingTips ? 'جاري التحضير...' : 'توليد نصيحة ذكية'}
                </button>
              </div>

              {/* Tips Container */}
              <div className="mt-4 bg-white/70 backdrop-blur-sm border border-amber-200/50 rounded-xl p-4">
                {isGeneratingTips ? (
                  <div className="space-y-2 py-4">
                    <div className="h-3.5 bg-slate-200 rounded-full w-3/4 animate-pulse"></div>
                    <div className="h-3.5 bg-slate-200 rounded-full w-5/6 animate-pulse"></div>
                    <div className="h-3.5 bg-slate-200 rounded-full w-2/3 animate-pulse"></div>
                  </div>
                ) : aiTips ? (
                  <div className="text-sm text-slate-700 leading-relaxed space-y-1" id="ai-tips-content">
                    {/* Render paragraphs cleanly */}
                    {aiTips.split('\n').map((line, idx) => (
                      <p key={idx} className={line.startsWith('-') || line.startsWith('*') ? 'mr-2 font-medium' : ''} dangerouslySetInnerHTML={{ __html: line }} />
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 py-3 text-center">
                    اضغط على الزر أعلاه لتحليل جدولك اليومي وتلقي نصائح دراسية ذكية وخطة للمواد المختارة.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Left Column: Local Browser Notifications & settings (1/3 width) */}
          <div className="space-y-6" id="settings-column">
            
            {/* Local Notifications Panel */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Bell className="w-5 h-5 text-indigo-600 animate-bounce" />
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">إشعارات الهاتف الفورية 📱</h3>
                  <p className="text-[11px] text-slate-400">تنبيهات حية حركية وصوتية على متصفحك وهاتفك</p>
                </div>
              </div>

              {/* Timezone & Egypt Time Clarification Block */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-3.5 space-y-2">
                <div className="flex items-start gap-2 text-indigo-800">
                  <Clock className="w-4 h-4 mt-0.5 text-indigo-600 shrink-0" />
                  <span className="font-extrabold text-xs">ساعة مصر والتوقيت المحلي 🇪🇬</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  التطبيق يعتمد بالكامل على <b>ساعة جهازك الفعلية</b>. طالما أن هاتفك مضبوط على توقيت جمهورية مصر العربية، فإن التنبيهات والعد التنازلي للدروس ستنطلق بدقة متناهية متزامنة مع وقت مصر الحقيقي دون أي تأخير أو فارق توقيت!
                </p>
              </div>

              {/* Notification Permission Status Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 block">حالة الإشعارات بالهاتف:</span>
                  {notificationPermission === 'granted' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-emerald-100 text-emerald-800">
                      ✅ نشطة ومفعّلة
                    </span>
                  )}
                  {notificationPermission === 'default' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-amber-100 text-amber-800">
                      ⚠️ بانتظار السماح
                    </span>
                  )}
                  {notificationPermission === 'denied' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-red-100 text-red-800">
                      ❌ محظورة بالمتصفح
                    </span>
                  )}
                  {notificationPermission === 'unsupported' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-slate-200 text-slate-800">
                      🚫 غير مدعومة
                    </span>
                  )}
                </div>

                {notificationPermission === 'default' && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-500 leading-normal">
                      اضغط على الزر أدناه للسماح للتطبيق بإرسال تنبيهات على شاشة القفل والاهتزاز قبل بدء الدرس بـ 10 دقائق وتذكيرك كل 5 دقائق.
                    </p>
                    <button
                      type="button"
                      onClick={requestNotificationPermission}
                      id="enable-notifications-btn"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      تفعيل إشعارات الهاتف الآن
                    </button>
                  </div>
                )}

                {notificationPermission === 'granted' && (
                  <div className="space-y-2.5">
                    <p className="text-[10px] text-slate-500 leading-normal">
                      رائع! إشعارات الهاتف مفعّلة بنجاح. سيتلقى الطالب تنبيهاً على شاشة هاتفه، مع نغمة اهتزاز رنين (Ding-Dong) لضمان عدم تفويت الحصص.
                    </p>
                    <button
                      type="button"
                      onClick={testLocalNotification}
                      id="test-notifications-btn"
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 rounded-xl transition-all border border-slate-200 flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      إرسال تنبيه تجريبي لهاتفي 🧪
                    </button>
                  </div>
                )}

                {notificationPermission === 'denied' && (
                  <div className="text-[10px] text-red-600 leading-normal p-2.5 bg-red-50 rounded-lg border border-red-100">
                    💡 <b>تنبيه هام:</b> لقد قمت بحظر الإشعارات لهذا الموقع سابقاً. لتلقي المنبهات على هاتفك، يرجى الضغط على أيقونة القفل أو الإعدادات بجانب رابط الموقع في أعلى المتصفح، ثم قم بتغيير صلاحية الإشعارات إلى <b>سماح (Allow)</b>.
                  </div>
                )}

                {notificationPermission === 'unsupported' && (
                  <div className="text-[10px] text-slate-600 leading-normal p-2.5 bg-slate-100 rounded-lg border border-slate-200">
                    📱 <b>تثبيت كـتطبيق (PWA):</b> إذا كنت تستخدم هاتف iPhone، يرجى الضغط على زر <b>مشاركة (Share)</b> في المتصفح ثم اختر <b>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</b> لكي تتمكن من تفعيل الإشعارات وتجربتها كتطبيق متكامل!
                  </div>
                )}
              </div>

              {/* Notification History Section */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-700">📋 سجل آخر الإشعارات المرسلة</span>
                  {notificationHistory.length > 0 && (
                    <button
                      onClick={clearNotificationHistory}
                      className="text-[10px] font-bold text-red-500 hover:text-red-700"
                    >
                      مسح السجل
                    </button>
                  )}
                </div>

                {notificationHistory.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic text-center py-2">
                    لم يتم إرسال أي تنبيهات حية خلال هذه الجلسة بعد.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1" id="notifications-history-list">
                    {notificationHistory.map(item => (
                      <div key={item.id} className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-100 text-[11px] space-y-1">
                        <div className="flex items-center justify-between font-bold text-[10px]">
                          <span className="text-slate-800">{item.title}</span>
                          <span className="text-indigo-600 font-mono" dir="ltr">{item.time}</span>
                        </div>
                        <p className="text-slate-500 text-[10px] leading-tight">{item.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Step-by-Step Instructions Panel */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-4" id="instructions-panel">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
                <Info className="w-4.5 h-4.5 text-blue-400" />
                <span className="font-extrabold text-xs text-slate-100">كيف تثبت التطبيق على هاتفك؟ 📱💡</span>
              </div>
              
              <div className="overflow-hidden text-xs text-slate-300 space-y-3" id="instructions-content">
                <div className="space-y-2">
                  <p className="font-bold text-white text-xs">الأندرويد (Chrome / Samsung):</p>
                  <ul className="list-decimal list-inside pr-2 space-y-1 text-slate-400">
                    <li>افتح رابط الموقع من متصفح جوجل كروم على هاتفك.</li>
                    <li>اضغط على النقاط الثلاث بالأعلى <span className="text-blue-300">⋮</span>.</li>
                    <li>اختر <b>"الإضافة إلى الشاشة الرئيسية"</b> أو <b>"تثبيت التطبيق"</b>.</li>
                    <li>سيظهر كتطبيق رسمي على هاتفك وتعمل الإشعارات والخلفية بنجاح!</li>
                  </ul>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800/50">
                  <p className="font-bold text-white text-xs">الآيفون (Safari):</p>
                  <ul className="list-decimal list-inside pr-2 space-y-1 text-slate-400">
                    <li>افتح رابط الموقع من متصفح سفاري الرسمي.</li>
                    <li>اضغط على زر <b>مشاركة (Share)</b> بالأسفل 📤.</li>
                    <li>اسحب للأعلى ثم اختر <b>"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</b>.</li>
                    <li>افتح التطبيق من الشاشة الرئيسية، واضغط على زر تفعيل الإشعارات بالأعلى!</li>
                  </ul>
                </div>
                
                <div className="bg-blue-950/40 p-2.5 rounded-lg border border-blue-900/40 text-[10px] text-blue-300 mt-2">
                  💡 <b>ملاحظة ذكية:</b> التثبيت على الهاتف كـ تطبيق (PWA) يمنحك سرعة تشغيل فائقة، كما يضمن استقرار عمل الإشعارات والمنبهات الصوتية في الخلفية بشكل ممتاز!
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
