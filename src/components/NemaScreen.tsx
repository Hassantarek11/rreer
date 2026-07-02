import React, { useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Sparkles, 
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';

interface NemaScreenProps {
  onCompleted: () => void;
  defaultName?: string;
}

export default function NemaScreen({ onCompleted, defaultName = '' }: NemaScreenProps) {
  const [name, setName] = useState(defaultName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('الرجاء إدخال اسمك أولاً لمتابعة إعداد حسابك.');
      return;
    }

    if (trimmedName.length < 3) {
      setError('الرجاء كتابة اسم حقيقي ثنائي على الأقل (3 أحرف أو أكثر).');
      return;
    }

    setLoading(true);

    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        // 1. Update Firebase Authentication profile
        await updateProfile(currentUser, { displayName: trimmedName });

        // 2. Update Firestore user document
        const userDocRef = doc(db, 'users', currentUser.uid);
        try {
          await setDoc(userDocRef, {
            displayName: trimmedName,
            nemaCompleted: true
          }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
        }

        setSuccess('تم حفظ اسمك بنجاح! جاري توجيهك إلى المنظم الدراسي الخاص بك...');
        
        // Wait briefly for smooth transition
        setTimeout(() => {
          onCompleted();
        }, 1200);
      } else {
        setError('تعذر العثور على حساب مستخدم نشط. يرجى إعادة تسجيل الدخول.');
      }
    } catch (err: any) {
      console.error(err);
      setError('حدث خطأ أثناء حفظ الاسم: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans select-none" dir="rtl" id="nema-page">
      {/* Background Ornaments */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full translate-x-10 -translate-y-10 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full -translate-x-10 translate-y-10 blur-3xl pointer-events-none"></div>
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md bg-slate-800 border border-slate-700/60 rounded-3xl p-6 md:p-8 shadow-2xl relative z-10 space-y-6"
      >
        {/* Header containing NEMA */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-amber-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <GraduationCap className="w-9 h-9 animate-bounce" />
          </div>
          <div className="inline-block bg-indigo-600/30 border border-indigo-500/40 px-3 py-1 rounded-full text-[10px] font-extrabold text-indigo-300 tracking-wider uppercase">
            صفحة التعريف • NEMA
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">أهلاً بك في بيتك الدراسي الجديد! 🎓</h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            لقد قمت بتسجيل الدخول بنجاح بواسطة Google. يرجى إدخال اسمك المفضل لنقوم بعرضه في المنظم.
          </p>
        </div>

        {/* Alerts */}
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

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">ما هو اسمك الدراسي المفضل؟</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                placeholder="مثال: أحمد محمود"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pr-10 pl-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                autoFocus
              />
            </div>
            <span className="text-[10px] text-slate-400 block pr-1">
              * سيتم استخدام هذا الاسم لعرض جدول حصصك، وتخصيص نصائح الذكاء الاصطناعي لك.
            </span>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800/80 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/15 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>تأكيد الاسم ومتابعة الجدول</span>
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Information box */}
        <div className="bg-indigo-950/40 border border-indigo-900/40 p-4 rounded-2xl flex gap-3 text-xs text-slate-300 leading-relaxed">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p>
            تخصيص الاسم يساعدك في تنظيم يومك المدرسي بشكل فريد واستقبال الإشعارات والتحفيز الذاتي باسمك مباشرة.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
