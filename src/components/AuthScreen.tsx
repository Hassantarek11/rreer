import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  updatePassword
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
  const [isDomainError, setIsDomainError] = useState(false);

  const handleTranslateError = (code: string) => {
    switch (code) {
      case 'auth/unauthorized-domain':
        return 'عذراً! نطاق هذا التطبيق الحالي غير مصرح له باستخدام المصادقة في مشروع Firebase الخاص بك (auth/unauthorized-domain).';
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

  const clearErrors = () => {
    setError(null);
    setIsDomainError(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
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
        let emailToUse = email.trim();
        let passwordToUse = password;

        try {
          const adminDocRef = doc(db, 'admins', 'admin');
          const adminDocSnap = await getDoc(adminDocRef);
          if (adminDocSnap.exists()) {
            const adminData = adminDocSnap.data();
            const dbUsername = adminData.username || 'hassan';
            const dbPassword = adminData.password || '01126269124hassan';

            const enteredUser = email.trim().toLowerCase();
            if (
              (enteredUser === dbUsername.toLowerCase() || 
               enteredUser === 'hassantareknshshs@gmail.com' || 
               enteredUser === 'admin@nema.com') && 
              password === dbPassword
            ) {
              emailToUse = 'hassantareknshshs@gmail.com';
              passwordToUse = dbPassword;
              
              try {
                await signInWithEmailAndPassword(auth, emailToUse, passwordToUse);
              } catch (signInErr: any) {
                if (signInErr.code === 'auth/wrong-password' || signInErr.code === 'auth/invalid-credential' || signInErr.message?.includes('password') || signInErr.message?.includes('credential')) {
                  try {
                    // Try with original default password
                    const defaultPass = '01126269124hassan';
                    const userCredential = await signInWithEmailAndPassword(auth, emailToUse, defaultPass);
                    
                    // Success! Now update the password in Firebase Auth to the new one from Firestore
                    await updatePassword(userCredential.user, passwordToUse);
                    console.log("Successfully synchronized Firebase Auth password with Firestore admin password.");
                  } catch (updateErr) {
                    console.error("Could not auto-sync changed password:", updateErr);
                    throw signInErr;
                  }
                } else if (signInErr.code === 'auth/user-not-found' || signInErr.message?.includes('user-not-found')) {
                  // Create user if not exists
                  const userCredential = await createUserWithEmailAndPassword(auth, emailToUse, passwordToUse);
                  await updateProfile(userCredential.user, { displayName: 'Hassan (Admin)' });
                  await onPrepopulateNeeded(userCredential.user.uid);
                  
                  // Mark the user as isAdmin in users/{userId} document
                  await setDoc(doc(db, 'users', userCredential.user.uid), {
                    displayName: 'Hassan (Admin)',
                    email: emailToUse,
                    nemaCompleted: true,
                    isAdmin: true
                  }, { merge: true });
                } else {
                  throw signInErr;
                }
              }

              setSuccess('مرحباً بك يا مسؤول النظام! تم تسجيل الدخول بنجاح.');
              setLoading(false);
              return;
            }
          }
        } catch (adminErr) {
          console.error("Non-blocking error checking database admin document:", adminErr);
        }

        await signInWithEmailAndPassword(auth, emailToUse, passwordToUse);
        setSuccess('تم تسجيل الدخول بنجاح! جاري تحميل جدولك...');
      }
    } catch (err: any) {
      console.error(err);
      const errCode = err.code || '';
      const errMsg = err.message || '';
      if (errCode === 'auth/unauthorized-domain' || errMsg.includes('unauthorized-domain') || errMsg.includes('auth/unauthorized-domain')) {
        setIsDomainError(true);
        setError(handleTranslateError('auth/unauthorized-domain'));
      } else {
        setError(handleTranslateError(errCode));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    clearErrors();
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
      const errCode = err.code || '';
      const errMsg = err.message || '';
      if (errCode === 'auth/unauthorized-domain' || errMsg.includes('unauthorized-domain') || errMsg.includes('auth/unauthorized-domain')) {
        setIsDomainError(true);
        setError(handleTranslateError('auth/unauthorized-domain'));
      } else if (errCode === 'auth/popup-closed-by-user') {
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
              className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex flex-col gap-2 text-xs text-red-400 animate-none"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              
              {isDomainError && (
                <div className="mt-2 p-3 bg-slate-900/80 rounded-xl border border-red-500/10 space-y-2 text-slate-300">
                  <div className="font-extrabold text-amber-400 flex items-center gap-1.5 text-[11px]">
                    ⚠️ خطوات تفعيل نطاق التطبيق في Firebase Console:
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    منع مشروع الفايربيس الخاص بك تسجيل الدخول لأن هذا النطاق غير مصرح له بعد. لحل هذا، يرجى القيام بالتالي:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-[10px] text-slate-300 pr-1 leading-relaxed">
                    <li>افتح <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline hover:text-indigo-300 font-bold">وحدة تحكم Firebase (Console)</a> ثم اختر مشروعك.</li>
                    <li>من القائمة الجانبية، اذهب إلى <b>Authentication</b> ثم تبويب <b>Settings</b>.</li>
                    <li>اضغط على <b>Authorized domains</b> ثم زر <b>Add domain</b>.</li>
                    <li>قم بنسخ وإضافة النطاق التالي للمشروع:
                      <div className="mt-1 bg-slate-950 p-1.5 rounded font-mono text-[9px] text-slate-300 text-center select-all border border-slate-800 break-all">
                        {window.location.hostname}
                      </div>
                    </li>
                  </ol>
                  <p className="text-[10px] text-amber-500 font-extrabold leading-relaxed pt-1">
                    💡 بعد إضافة النطاق، قم بتحديث الصفحة (Reload) وحاول مجدداً!
                  </p>
                </div>
              )}
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
