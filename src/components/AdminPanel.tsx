import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  deleteDoc, 
  setDoc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  Search, 
  Trash2, 
  Plus, 
  CheckCircle, 
  X, 
  ArrowLeft, 
  Send, 
  CheckSquare, 
  Clock, 
  MapPin, 
  FileText, 
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface Task {
  id: string;
  day: string;
  subject: string;
  time: string;
  notes?: string;
  completed: boolean;
}

interface Lesson {
  id: string;
  day: string;
  subject: string;
  time: string;
  location: string;
  teacherName?: string;
  notes?: string;
}

interface Student {
  id: string;
  displayName: string;
  email?: string;
  nemaCompleted?: boolean;
  isAdmin?: boolean;
  telegram?: {
    botToken: string;
    chatId: string;
    reminderTime: string;
    enabled: boolean;
  };
  tasks: Task[];
  lessons: Lesson[];
}

interface AdminPanelProps {
  currentAdminEmail?: string | null;
  onBackToDashboard: () => void;
}

const DAYS_ARABIC: { [key: string]: { arabic: string; en: string } } = {
  'Saturday': { arabic: 'السبت', en: 'Saturday' },
  'Sunday': { arabic: 'الأحد', en: 'Sunday' },
  'Monday': { arabic: 'الإثنين', en: 'Monday' },
  'Tuesday': { arabic: 'الثلاثاء', en: 'Tuesday' },
  'Wednesday': { arabic: 'الأربعاء', en: 'Wednesday' },
  'Thursday': { arabic: 'الخميس', en: 'Thursday' },
  'Friday': { arabic: 'الجمعة', en: 'Friday' }
};

const DAYS_ORDER = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function AdminPanel({ currentAdminEmail, onBackToDashboard }: AdminPanelProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  
  // Modals / Quick Forms State
  const [addingTaskForId, setAddingTaskForId] = useState<string | null>(null);
  const [addingLessonForId, setAddingLessonForId] = useState<string | null>(null);
  
  // Task Form State
  const [taskSubject, setTaskSubject] = useState('');
  const [taskDay, setTaskDay] = useState('Saturday');
  const [taskTime, setTaskTime] = useState('16:00');
  const [taskNotes, setTaskNotes] = useState('');
  
  // Lesson Form State
  const [lessonSubject, setLessonSubject] = useState('');
  const [lessonDay, setLessonDay] = useState('Saturday');
  const [lessonTime, setLessonTime] = useState('16:00');
  const [lessonLocation, setLessonLocation] = useState('');
  const [lessonTeacher, setLessonTeacher] = useState('');
  const [lessonNotes, setLessonNotes] = useState('');

  const [savingAction, setSavingAction] = useState(false);

  useEffect(() => {
    fetchEverything();
  }, []);

  const fetchEverything = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 1. Fetch all users
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const loadedStudents: Student[] = [];
      
      // 2. Map and fetch tasks/lessons for each user
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // Fetch tasks subcollection
        const tasksRef = collection(db, 'users', userId, 'tasks');
        const tasksSnapshot = await getDocs(tasksRef);
        const tasks: Task[] = tasksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Task));

        // Fetch lessons subcollection
        const lessonsRef = collection(db, 'users', userId, 'lessons');
        const lessonsSnapshot = await getDocs(lessonsRef);
        const lessons: Lesson[] = lessonsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Lesson));

        loadedStudents.push({
          id: userId,
          displayName: userData.displayName || 'طالب غير مسمى',
          email: userData.email || '',
          nemaCompleted: userData.nemaCompleted || false,
          isAdmin: userData.isAdmin || false,
          telegram: userData.telegram ? {
            botToken: userData.telegram.botToken || '',
            chatId: userData.telegram.chatId || '',
            reminderTime: userData.telegram.reminderTime || '08:00',
            enabled: userData.telegram.enabled || false
          } : undefined,
          tasks,
          lessons
        });
      }

      setStudents(loadedStudents);
    } catch (err: any) {
      console.error("Error fetching admin data:", err);
      setError("فشل في تحميل بيانات الطلاب. يرجى التأكد من صلاحيات المشرف الخاصة بك.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الطالب "${name}" بالكامل من النظام؟ سيؤدي ذلك لحذف جميع الحصص والمذاكرات الخاصة به.`)) {
      return;
    }

    try {
      setSavingAction(true);
      // Delete tasks
      const tasksSnapshot = await getDocs(collection(db, 'users', studentId, 'tasks'));
      for (const tDoc of tasksSnapshot.docs) {
        await deleteDoc(doc(db, 'users', studentId, 'tasks', tDoc.id));
      }

      // Delete lessons
      const lessonsSnapshot = await getDocs(collection(db, 'users', studentId, 'lessons'));
      for (const lDoc of lessonsSnapshot.docs) {
        await deleteDoc(doc(db, 'users', studentId, 'lessons', lDoc.id));
      }

      // Delete user doc
      await deleteDoc(doc(db, 'users', studentId));
      
      setStudents(prev => prev.filter(s => s.id !== studentId));
      if (expandedStudentId === studentId) setExpandedStudentId(null);
    } catch (err) {
      console.error("Error deleting student:", err);
      alert("حدث خطأ أثناء حذف الطالب.");
    } finally {
      setSavingAction(false);
    }
  };

  const handleToggleAdmin = async (studentId: string, currentIsAdmin: boolean) => {
    try {
      const studentRef = doc(db, 'users', studentId);
      await updateDoc(studentRef, { isAdmin: !currentIsAdmin });
      
      // Update local state
      setStudents(prev => prev.map(s => {
        if (s.id === studentId) {
          return {
            ...s,
            isAdmin: !currentIsAdmin
          };
        }
        return s;
      }));
    } catch (err) {
      console.error("Error toggling admin status:", err);
      alert("فشل في تعديل رتبة الأدمن.");
    }
  };

  const handleToggleTask = async (studentId: string, task: Task) => {
    try {
      const taskRef = doc(db, 'users', studentId, 'tasks', task.id);
      await updateDoc(taskRef, { completed: !task.completed });
      
      // Update local state
      setStudents(prev => prev.map(s => {
        if (s.id === studentId) {
          return {
            ...s,
            tasks: s.tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t)
          };
        }
        return s;
      }));
    } catch (err) {
      console.error("Error toggling task:", err);
    }
  };

  const handleDeleteTask = async (studentId: string, taskId: string) => {
    if (!window.confirm("هل تريد حذف مادة المذاكرة هذه؟")) return;
    try {
      await deleteDoc(doc(db, 'users', studentId, 'tasks', taskId));
      
      setStudents(prev => prev.map(s => {
        if (s.id === studentId) {
          return {
            ...s,
            tasks: s.tasks.filter(t => t.id !== taskId)
          };
        }
        return s;
      }));
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  const handleDeleteLesson = async (studentId: string, lessonId: string) => {
    if (!window.confirm("هل تريد حذف هذه الحصة؟")) return;
    try {
      await deleteDoc(doc(db, 'users', studentId, 'lessons', lessonId));
      
      setStudents(prev => prev.map(s => {
        if (s.id === studentId) {
          return {
            ...s,
            lessons: s.lessons.filter(l => l.id !== lessonId)
          };
        }
        return s;
      }));
    } catch (err) {
      console.error("Error deleting lesson:", err);
    }
  };

  const handleAddTask = async (studentId: string) => {
    if (!taskSubject.trim()) {
      alert("الرجاء إدخال اسم المادة.");
      return;
    }
    try {
      setSavingAction(true);
      const newTaskRef = doc(collection(db, 'users', studentId, 'tasks'));
      const newTask: Task = {
        id: newTaskRef.id,
        day: taskDay,
        subject: taskSubject,
        time: taskTime,
        notes: taskNotes,
        completed: false
      };
      
      await setDoc(newTaskRef, newTask);
      
      setStudents(prev => prev.map(s => {
        if (s.id === studentId) {
          return { ...s, tasks: [...s.tasks, newTask] };
        }
        return s;
      }));

      // Reset Form
      setTaskSubject('');
      setTaskNotes('');
      setAddingTaskForId(null);
    } catch (err) {
      console.error("Error adding task:", err);
      alert("فشل في إضافة المذاكرة.");
    } finally {
      setSavingAction(false);
    }
  };

  const handleAddLesson = async (studentId: string) => {
    if (!lessonSubject.trim() || !lessonLocation.trim()) {
      alert("الرجاء إدخال اسم المادة ومكان الدرس.");
      return;
    }
    try {
      setSavingAction(true);
      const newLessonRef = doc(collection(db, 'users', studentId, 'lessons'));
      const newLesson: Lesson = {
        id: newLessonRef.id,
        day: lessonDay,
        subject: lessonSubject,
        time: lessonTime,
        location: lessonLocation,
        teacherName: lessonTeacher,
        notes: lessonNotes
      };
      
      await setDoc(newLessonRef, newLesson);
      
      setStudents(prev => prev.map(s => {
        if (s.id === studentId) {
          return { ...s, lessons: [...s.lessons, newLesson] };
        }
        return s;
      }));

      // Reset Form
      setLessonSubject('');
      setLessonLocation('');
      setLessonTeacher('');
      setLessonNotes('');
      setAddingLessonForId(null);
    } catch (err) {
      console.error("Error adding lesson:", err);
      alert("فشل في إضافة الدرس.");
    } finally {
      setSavingAction(false);
    }
  };

  // Filter students based on search
  const filteredStudents = students.filter(s => 
    s.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Stats calculation
  const totalStudentsCount = students.length;
  const totalTasksCount = students.reduce((sum, s) => sum + s.tasks.length, 0);
  const totalLessonsCount = students.reduce((sum, s) => sum + s.lessons.length, 0);
  const activeTelegramCount = students.filter(s => s.telegram?.enabled).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 md:p-8" dir="rtl" id="admin-container">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Admin Header Card */}
        <header className="bg-gradient-to-r from-red-600 via-rose-600 to-rose-700 rounded-2xl p-4 sm:p-6 md:p-8 text-white shadow-xl relative overflow-hidden" id="admin-header">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-20 -translate-y-20 blur-3xl pointer-events-none"></div>
          
          <div className="relative z-10 flex justify-between items-center border-b border-white/10 pb-4 mb-4 text-[11px] sm:text-xs">
            <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-full backdrop-blur-sm border border-white/5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>وضع المسؤول: <b className="font-extrabold text-white">{currentAdminEmail}</b></span>
            </div>
            
            <button
              onClick={onBackToDashboard}
              className="bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5 transition-all text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              العودة للوحة الطلاب
            </button>
          </div>

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
            <div className="space-y-2 text-right">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">لوحة تحكم المسؤول الشاملة 🛡️✨</h1>
              <p className="text-rose-100 max-w-xl text-xs sm:text-sm md:text-base leading-relaxed">
                متابعة الطلاب المسجلين، جداول مذاكراتهم، مواعيد حصصهم الخارجية، وحالة تفعيل إشعارات تيليجرام مع إمكانية التعديل والإضافة المباشرة لحساباتهم.
              </p>
            </div>
          </div>
        </header>

        {/* Stats Bento Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="p-3 rounded-lg bg-rose-50 text-rose-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] md:text-xs font-bold text-slate-400">إجمالي الطلاب</p>
              <p className="text-lg md:text-2xl font-extrabold text-slate-800">{totalStudentsCount}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] md:text-xs font-bold text-slate-400">حصص المذاكرة</p>
              <p className="text-lg md:text-2xl font-extrabold text-slate-800">{totalTasksCount}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] md:text-xs font-bold text-slate-400">الدروس الخارجية</p>
              <p className="text-lg md:text-2xl font-extrabold text-slate-800">{totalLessonsCount}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] md:text-xs font-bold text-slate-400">بوت تيليجرام نشط</p>
              <p className="text-lg md:text-2xl font-extrabold text-slate-800">{activeTelegramCount}</p>
            </div>
          </div>
        </div>

        {/* Directory & Management Section */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-rose-500" />
              <h2 className="font-extrabold text-slate-800 text-lg">قائمة الطلاب وحساباتهم</h2>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ابحث باسم الطالب أو البريد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-9 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-slate-50 focus:bg-white transition-all text-right"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-rose-500" />
              <p className="text-sm font-semibold">جاري جلب وتحميل بيانات الطلاب والخطط الدراسية...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 bg-red-50 border-y border-red-100 flex items-center justify-center gap-2">
              <span>⚠️</span>
              <p className="text-xs font-bold">{error}</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <span className="text-3xl">🔍</span>
              <p className="text-sm font-bold">لم يتم العثور على طلاب يطابقون معايير البحث.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredStudents.map((student) => {
                const isExpanded = expandedStudentId === student.id;
                
                return (
                  <div key={student.id} className="transition-all hover:bg-slate-50/50">
                    
                    {/* Main Row summary */}
                    <div 
                      onClick={() => setExpandedStudentId(isExpanded ? null : student.id)}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-slate-800 text-sm">{student.displayName}</h3>
                          {student.telegram?.enabled ? (
                            <span className="text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                              تيليجرام متصل
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold bg-slate-50 text-slate-400 border border-slate-100 px-2 py-0.5 rounded-full">
                              تيليجرام غير نشط
                            </span>
                          )}
                          {student.isAdmin && (
                            <span className="text-[9px] font-bold bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                              🛡️ مسؤول النظام
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-mono select-all">{student.email || `بدون بريد (${student.id.substring(0, 8)}...)`}</p>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-3 text-slate-500">
                          <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg font-bold text-[11px]">
                            {student.tasks.length} مادة مذاكرة
                          </span>
                          <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg font-bold text-[11px]">
                            {student.lessons.length} درس خارجي
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStudent(student.id, student.displayName);
                            }}
                            className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                            title="حذف الطالب بالكامل"
                            disabled={savingAction}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          
                          <span className="text-slate-300 font-light hidden sm:inline">|</span>
                          
                          <span className="text-[11px] font-bold text-indigo-500 hidden sm:inline">
                            {isExpanded ? 'إغلاق التفاصيل ▲' : 'عرض التفاصيل والجدول ▼'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Details Container */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="bg-slate-50/50 border-t border-slate-100 overflow-hidden"
                        >
                          <div className="p-4 sm:p-6 space-y-6">
                            
                            {/* Role management section */}
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <h4 className="text-xs font-extrabold text-slate-400 flex items-center gap-1.5">
                                  <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
                                  صلاحيات التحكم والمسؤول (Admin):
                                </h4>
                                <p className="text-xs text-slate-500 font-medium">
                                  عند تفعيل صلاحيات المسؤول، سيتمكن هذا الطالب من الدخول إلى لوحة التحكم ومتابعة وتعديل بيانات جميع الطلاب الآخرين بالكامل.
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleAdmin(student.id, student.isAdmin || false);
                                }}
                                className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 border transition-all shrink-0 ${
                                  student.isAdmin 
                                    ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100/80' 
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                {student.isAdmin ? (
                                  <>
                                    <ToggleRight className="w-5 h-5 text-rose-600" />
                                    إلغاء صلاحية المسؤول
                                  </>
                                ) : (
                                  <>
                                    <ToggleLeft className="w-5 h-5 text-slate-400" />
                                    منح صلاحية المسؤول
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Telegram config quick view */}
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                              <h4 className="text-xs font-extrabold text-slate-400 flex items-center gap-1.5">
                                <Send className="w-3.5 h-3.5 text-indigo-500" />
                                إعدادات إشعارات التليجرام للطالب:
                              </h4>
                              {student.telegram ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
                                  <div>
                                    <span className="text-slate-400 block mb-0.5">رمز البوت (Bot Token):</span>
                                    <span className="font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded select-all block truncate max-w-xs">{student.telegram.botToken || 'غير مدخل'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block mb-0.5">رقم المعرف (Chat ID):</span>
                                    <span className="font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded select-all block">{student.telegram.chatId || 'غير مدخل'}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block mb-0.5">وقت الإرسال الصباحي:</span>
                                    <span className="font-bold text-slate-700">{student.telegram.reminderTime} صباحاً</span>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 italic">لم يقم الطالب بتهيئة إعدادات تليجرام بعد.</p>
                              )}
                            </div>

                            {/* Two Column Layout for Tasks & Lessons */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              
                              {/* Tasks Column */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-extrabold text-indigo-600 flex items-center gap-1.5">
                                    <CheckSquare className="w-4 h-4" />
                                    حصص ومواد المذاكرة الفردية:
                                  </h4>
                                  <button
                                    onClick={() => setAddingTaskForId(student.id)}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-all"
                                  >
                                    <Plus className="w-3 h-3" />
                                    إضافة مادة
                                  </button>
                                </div>

                                {student.tasks.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic bg-white p-4 rounded-xl border border-slate-100">لا توجد مواد مذاكرة مضافة لهذا الطالب.</p>
                                ) : (
                                  <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-none pr-1">
                                    {student.tasks.map((task) => (
                                      <div key={task.id} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between gap-3 shadow-sm hover:border-slate-200 transition-all">
                                        <div className="flex items-center gap-3">
                                          <button 
                                            onClick={() => handleToggleTask(student.id, task)}
                                            className={`p-1 rounded-full border transition-all ${
                                              task.completed 
                                                ? 'bg-emerald-500 border-emerald-500 text-white' 
                                                : 'border-slate-200 text-slate-300 hover:border-indigo-400'
                                            }`}
                                          >
                                            <CheckCircle className="w-4 h-4" />
                                          </button>
                                          <div>
                                            <p className={`text-xs font-extrabold ${task.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.subject}</p>
                                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                              <span className="font-bold text-indigo-500">{DAYS_ARABIC[task.day]?.arabic || task.day}</span>
                                              <span>•</span>
                                              <span>الساعة {task.time}</span>
                                            </p>
                                            {task.notes && (
                                              <p className="text-[10px] text-slate-400 bg-slate-50 p-1 rounded mt-1">{task.notes}</p>
                                            )}
                                          </div>
                                        </div>

                                        <button 
                                          onClick={() => handleDeleteTask(student.id, task.id)}
                                          className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-50 transition-all"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Lessons Column */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-extrabold text-amber-600 flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4" />
                                    مواعيد حصص الدروس الخارجية:
                                  </h4>
                                  <button
                                    onClick={() => setAddingLessonForId(student.id)}
                                    className="text-xs font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg transition-all"
                                  >
                                    <Plus className="w-3 h-3" />
                                    إضافة درس
                                  </button>
                                </div>

                                {student.lessons.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic bg-white p-4 rounded-xl border border-slate-100">لا توجد دروس خارجية مضافة لهذا الطالب.</p>
                                ) : (
                                  <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-none pr-1">
                                    {student.lessons.map((lesson) => (
                                      <div key={lesson.id} className="bg-white p-3 rounded-xl border border-slate-100 flex items-center justify-between gap-3 shadow-sm hover:border-slate-200 transition-all">
                                        <div>
                                          <p className="text-xs font-extrabold text-slate-700">{lesson.subject}</p>
                                          <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                            <span className="font-bold text-amber-600">{DAYS_ARABIC[lesson.day]?.arabic || lesson.day}</span>
                                            <span>•</span>
                                            <span>الساعة {lesson.time}</span>
                                            <span>•</span>
                                            <span className="text-slate-500 bg-slate-50 px-1.5 rounded border border-slate-100">{lesson.location}</span>
                                          </p>
                                          {lesson.teacherName && (
                                            <p className="text-[10px] text-slate-500 mt-1">المعلم: <b className="font-extrabold">{lesson.teacherName}</b></p>
                                          )}
                                          {lesson.notes && (
                                            <p className="text-[10px] text-slate-400 bg-slate-50 p-1 rounded mt-1">{lesson.notes}</p>
                                          )}
                                        </div>

                                        <button 
                                          onClick={() => handleDeleteLesson(student.id, lesson.id)}
                                          className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-50 transition-all"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                            </div>

                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Adding Task Modal Overlay */}
      <AnimatePresence>
        {addingTaskForId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100 text-right space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-800 text-sm">إضافة مادة مذاكرة جديدة للطالب</h3>
                <button 
                  onClick={() => setAddingTaskForId(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">اسم المادة / الواجب:</label>
                  <input
                    type="text"
                    value={taskSubject}
                    onChange={(e) => setTaskSubject(e.target.value)}
                    placeholder="مثال: مراجعة الباب الأول في الفيزياء"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs text-right"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">اليوم:</label>
                    <select
                      value={taskDay}
                      onChange={(e) => setTaskDay(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs text-right"
                    >
                      {DAYS_ORDER.map(day => (
                        <option key={day} value={day}>{DAYS_ARABIC[day].arabic}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">الموعد (الوقت):</label>
                    <input
                      type="time"
                      value={taskTime}
                      onChange={(e) => setTaskTime(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs text-right"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">ملاحظات إضافية (اختياري):</label>
                  <textarea
                    value={taskNotes}
                    onChange={(e) => setTaskNotes(e.target.value)}
                    placeholder="تفاصيل المراجعة أو الواجب الدراسي المطلوب..."
                    rows={3}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs text-right"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleAddTask(addingTaskForId)}
                  disabled={savingAction}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all"
                >
                  {savingAction ? 'جاري الإضافة...' : 'إضافة المذاكرة لجدول الطالب'}
                </button>
                <button
                  onClick={() => setAddingTaskForId(null)}
                  className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-2.5 rounded-xl transition-all"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Adding Lesson Modal Overlay */}
      <AnimatePresence>
        {addingLessonForId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100 text-right space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-800 text-sm">إضافة حصة أو درس خارجي جديد</h3>
                <button 
                  onClick={() => setAddingLessonForId(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">المادة الدراسية:</label>
                  <input
                    type="text"
                    value={lessonSubject}
                    onChange={(e) => setLessonSubject(e.target.value)}
                    placeholder="مثال: كيمياء"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs text-right"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">اسم المدرس (اختياري):</label>
                    <input
                      type="text"
                      value={lessonTeacher}
                      onChange={(e) => setLessonTeacher(e.target.value)}
                      placeholder="مثال: أ. محمد أحمد"
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs text-right"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">مكان الدرس / الرابط:</label>
                    <input
                      type="text"
                      value={lessonLocation}
                      onChange={(e) => setLessonLocation(e.target.value)}
                      placeholder="مثال: سنتر الأوائل أو أونلاين"
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">اليوم:</label>
                    <select
                      value={lessonDay}
                      onChange={(e) => setLessonDay(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs text-right"
                    >
                      {DAYS_ORDER.map(day => (
                        <option key={day} value={day}>{DAYS_ARABIC[day].arabic}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">الموعد (الوقت):</label>
                    <input
                      type="time"
                      value={lessonTime}
                      onChange={(e) => setLessonTime(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs text-right"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">ملاحظات إضافية (اختياري):</label>
                  <textarea
                    value={lessonNotes}
                    onChange={(e) => setLessonNotes(e.target.value)}
                    placeholder="مثال: إحضار كتاب المراجعة وحل الواجب 4..."
                    rows={3}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs text-right"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleAddLesson(addingLessonForId)}
                  disabled={savingAction}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2.5 rounded-xl transition-all"
                >
                  {savingAction ? 'جاري الإضافة...' : 'إضافة الدرس لجدول الطالب'}
                </button>
                <button
                  onClick={() => setAddingLessonForId(null)}
                  className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-2.5 rounded-xl transition-all"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
