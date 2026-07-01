export type DayOfWeek = 
  | 'saturday' 
  | 'sunday' 
  | 'monday' 
  | 'tuesday' 
  | 'wednesday' 
  | 'thursday' 
  | 'friday';

export interface StudyTask {
  id: string;
  day: DayOfWeek;
  subject: string;
  time: string; // e.g., "09:30"
  duration: number; // in minutes, e.g. 120 (2 hours)
  notes?: string;
  completed?: boolean;
}

export interface StudyLesson {
  id: string;
  day: DayOfWeek;
  subject: string;
  time: string; // e.g., "14:00"
  location: string; // e.g. "السنتر" / "أونلاين" / "منزل"
  teacherName?: string;
  notes?: string;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  reminderTime: string; // e.g., "08:00"
  enabled: boolean;
  lastSentDate?: string; // format "YYYY-MM-DD" to avoid double sending
  sentNotifications?: Record<string, boolean>;
}

export interface AppState {
  tasks: StudyTask[];
  lessons: StudyLesson[];
  telegram: TelegramConfig;
}

export const DAYS_ARABIC: Record<DayOfWeek, { english: string; arabic: string; short: string }> = {
  saturday: { english: 'Saturday', arabic: 'السبت', short: 'السبت' },
  sunday: { english: 'Sunday', arabic: 'الأحد', short: 'الأحد' },
  monday: { english: 'Monday', arabic: 'الإثنين', short: 'الإثنين' },
  tuesday: { english: 'Tuesday', arabic: 'الثلاثاء', short: 'الثلاثاء' },
  wednesday: { english: 'Wednesday', arabic: 'الأربعاء', short: 'الأربعاء' },
  thursday: { english: 'Thursday', arabic: 'الخميس', short: 'الخميس' },
  friday: { english: 'Friday', arabic: 'الجمعة', short: 'الجمعة' },
};

export const DAYS_ORDER: DayOfWeek[] = [
  'saturday',
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday'
];
