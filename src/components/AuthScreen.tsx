import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Mail, 
  Lock, 
  User, 
  Sparkles, 
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  School,
  CheckCircle2,
  GraduationCap,
  RefreshCw,
  Chrome
} from 'lucide-react';

interface AuthScreenProps {
  onPrepopulateNeeded: (uid: string) => Promise<void>;
}

export default function AuthScreen({ onPrepopulateNeeded }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleTranslateError = (code: string) => {
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التحقق وإعادة المحاولة.';
      case 'auth/email-already-in-use':
        return 'هذا البريد الإلكتروني مسجل بالفعل لدى حساب آخر. يرجى تسجيل الدخول.';
      case 'auth/weak-password':
        return 'كلمة المرور ضعيفة جداً. يجب أن تتكون من 6 خانات على الأقل.';
      case 'auth/invalid-email':
        return 'البريد الإلكتروني المدخل غير صحيح. يرجى كتابته بشكل سليم.';
      case 'auth/network-request-failed':
        return 'حدث خطأ في الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت.';
      case 'auth/too-many-requests':
        return 'تم حظر المحاولات مؤقتاً بسبب كثرة الطلبات الخاطئة. جرب لاحقاً.';
      default:
        return 'حدث خطأ غير متوقع أثناء تسجيل الدخول. يرجى المحاولة مجدداً.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim() || !password.trim()) {
      setError('برجاء ملء جميع الحقول المطلوبة.');
      return;
    }

    if (isSignUp && !fullName.trim()) {
      setError('برجاء إدخال الاسم الكامل لإنشاء الحساب.');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // Sign Up
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update Firebase profile
        await updateProfile(user, { displayName: fullName });
        
        // Check and pre-populate defaults in Firestore
        await onPrepopulateNeeded(user.uid);
        
        setSuccess('تم إنشاء حسابك بنجاح! جاري تحويلك...');
      } else {
        // Log In
        await signInWithEmailAndPassword(auth, email, password);
        setSuccess('تم تسجيل الدخول بنجاح! جاري تحميل جدولك...');
      }
    } catch (err: any) {
      console.error(err);
      setError(handleTranslateError(err.code || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      // Pre-populate data for the Google user if needed
      await onPrepopulateNeeded(user.uid);
      
      setSuccess('مرحباً بك! تم تسجيل الدخول بواسطة Google بنجاح.');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('تم إغلاق نافذة تسجيل الدخول من Google قبل إتمام العملية.');
      } else {
        setError('فشل تسجيل الدخول بواسطة Google. يرجى التأكد من تشغيل التطبيق في نافذة خارجية إذا واجهت مشكلة.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans select-none" dir="rtl">
      {/* Background Ornaments */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full translate-x-10 -translate-y-10 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full -translate-x-10 translate-y-10 blur-3xl pointer-events-none"></div>
      
      {/* Arabic Decorative Grid in Background */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]"></div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md bg-slate-800 border border-slate-700/60 rounded-3xl p-6 md:p-8 shadow-2xl relative z-10 space-y-6"
      >
        {/* App Logo & Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <GraduationCap className="w-9 h-9" />
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">نظام مُذكِّر الطالب الدراسي 📚</h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            تطبيق مدمج وذكي لتنظيم خطتك الدراسية ومواعيد الحصص الخارجية واللايف مع إشعارات ذكية حية.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 p-1 bg-slate-900/60 rounded-2xl border border-slate-700/40">
          <button
            onClick={() => { setIsSignUp(false); setError(null); }}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              !isSignUp 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            onClick={() => { setIsSignUp(true); setError(null); }}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              isSignUp 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            إنشاء حساب جديد
          </button>
        </div>

        {/* Error / Success Alerts */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2.5 text-xs text-red-400"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-400"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">اسم الطالب بالكامل</label>
              <div className="relative">
                <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد محمد علي"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">البريد الإلكتروني (الايميل)</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-left"
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">كلمة المرور (الباسورد)</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-left"
                dir="ltr"
              />
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800/80 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/15 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : isSignUp ? (
              <>
                <span>إنشاء الحساب والبدء</span>
                <CheckCircle2 className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>دخول آمن</span>
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-700/60"></div>
          <span className="flex-shrink mx-4 text-[10px] font-bold text-slate-500 uppercase">أو من خلال جوجل</span>
          <div className="flex-grow border-t border-slate-700/60"></div>
        </div>

        {/* Google Sign In Action */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs py-2.5 rounded-xl transition-all border border-slate-200 flex items-center justify-center gap-2 shadow-sm"
          >
            <Chrome className="w-4 h-4 text-red-500" />
            <span>تسجيل الدخول باستخدام حساب Google</span>
          </button>
          <p className="text-[9px] text-slate-400 text-center leading-relaxed px-2">
            تنويه: إذا كنت تستخدم التطبيق داخل نافذة المعاينة المدمجة وتواجه مشكلة في فتح نافذة Google، يرجى فتح التطبيق في علامة تبويب جديدة (Open in new tab).
          </p>
        </div>

        {/* Footer info */}
        <div className="text-center text-[10px] text-slate-500 flex items-center justify-center gap-1 mt-2">
          <span>التطبيق مؤمن بالكامل ومحمي بواسطة</span>
          <School className="w-3 h-3 text-indigo-400" />
          <span className="text-slate-400 font-semibold">Firebase Cloud Database</span>
        </div>
      </motion.div>
    </div>
  );
}
