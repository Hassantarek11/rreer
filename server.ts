import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { DayOfWeek, StudyTask, StudyLesson, TelegramConfig, AppState, DAYS_ARABIC, DAYS_ORDER } from './src/types.js';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

// Ensure database file exists
const defaultState: AppState = {
  tasks: [
    { id: '1', day: 'saturday', subject: 'رياضيات', time: '10:00', duration: 120, notes: 'حل تمارين التفاضل والتكامل' },
    { id: '2', day: 'sunday', subject: 'فيزياء', time: '12:00', duration: 90, notes: 'مراجعة قوانين نيوتن والكهربية' },
    { id: '3', day: 'monday', subject: 'كيمياء', time: '09:00', duration: 120, notes: 'مذاكرة الكيمياء العضوية' },
    { id: '4', day: 'tuesday', subject: 'لغة عربية', time: '15:00', duration: 60, notes: 'قراءة نصوص ومذاكرة النحو' },
    { id: '5', day: 'wednesday', subject: 'لغة إنجليزية', time: '11:00', duration: 90, notes: 'مذاكرة كلمات وقواعد الوحدة الثالثة' },
    { id: '6', day: 'thursday', subject: 'أحياء', time: '14:00', duration: 120, notes: 'مراجعة فصل الوراثة' }
  ],
  lessons: [
    { id: 'l1', day: 'saturday', subject: 'ميكانيكا', time: '16:00', location: 'سنتر الأمل', teacherName: 'أ/ أحمد محمود', notes: 'تجهيز مذكرة الشرح وحضور الحصة الأولى' },
    { id: 'l2', day: 'tuesday', subject: 'فيزياء', time: '18:00', location: 'أونلاين (لايف)', teacherName: 'م/ خالد جلال', notes: 'حل الواجب قبل بداية الحصة' }
  ],
  telegram: {
    botToken: '',
    chatId: '',
    reminderTime: '08:00',
    enabled: false
  }
};

function readDb(): AppState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const state = JSON.parse(data);
      if (!state.tasks) state.tasks = [];
      if (!state.lessons) state.lessons = [];
      return state;
    }
  } catch (error) {
    console.error('Error reading database file:', error);
  }
  return defaultState;
}

function writeDb(state: AppState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing to database file:', error);
  }
}

// Middleware
app.use(express.json());

// API: Get State
app.get('/api/state', (req, res) => {
  const state = readDb();
  res.json(state);
});

// API: Add/Update Task
app.post('/api/tasks', (req, res) => {
  const state = readDb();
  const task: StudyTask = req.body;
  
  if (!task.id) {
    task.id = Math.random().toString(36).substr(2, 9);
    state.tasks.push(task);
  } else {
    const idx = state.tasks.findIndex(t => t.id === task.id);
    if (idx !== -1) {
      state.tasks[idx] = task;
    } else {
      state.tasks.push(task);
    }
  }
  
  writeDb(state);
  res.json({ success: true, task, state });
});

// API: Delete Task
app.delete('/api/tasks/:id', (req, res) => {
  const state = readDb();
  const id = req.params.id;
  state.tasks = state.tasks.filter(t => t.id !== id);
  writeDb(state);
  res.json({ success: true, state });
});

// API: Add/Update Lesson
app.post('/api/lessons', (req, res) => {
  const state = readDb();
  const lesson: StudyLesson = req.body;
  
  if (!lesson.id) {
    lesson.id = 'l_' + Math.random().toString(36).substr(2, 9);
    state.lessons.push(lesson);
  } else {
    const idx = state.lessons.findIndex(l => l.id === lesson.id);
    if (idx !== -1) {
      state.lessons[idx] = lesson;
    } else {
      state.lessons.push(lesson);
    }
  }
  
  writeDb(state);
  res.json({ success: true, lesson, state });
});

// API: Delete Lesson
app.delete('/api/lessons/:id', (req, res) => {
  const state = readDb();
  const id = req.params.id;
  state.lessons = state.lessons.filter(l => l.id !== id);
  writeDb(state);
  res.json({ success: true, state });
});

// API: Get AI Advisor Tips
app.post('/api/ai/tips', async (req, res) => {
  const { day } = req.body;
  if (!day) {
    return res.status(400).json({ success: false, error: 'برجاء تحديد اليوم' });
  }

  const state = readDb();
  const dayTasks = state.tasks
    .filter(t => t.day === day)
    .sort((a, b) => a.time.localeCompare(b.time));

  if (dayTasks.length === 0) {
    return res.json({ 
      success: true, 
      tips: '🎉 ليس لديك أي مواد مجدولة اليوم! يمكنك أخذ قسط من الراحة لشحن طاقتك، أو مراجعة سريعة لما ذاكرته سابقاً. تذكر أن الراحة جزء لا يتجزأ من التفوق الدراسي! 🧠🧘‍♂️' 
    });
  }

  const tasksDescription = dayTasks.map(t => `- المادة: ${t.subject} في الساعة ${t.time} (المدة: ${t.duration} دقيقة). ملاحظات: ${t.notes || 'لا توجد'}`).join('\n');

  try {
    const ai = getAi();
    const prompt = `أنت مستشار دراسي خبير للطلاب. اكتب نصيحة ذهبية ومحفزة قصيرة جداً ومباشرة (في سطرين كحد أقصى) لتستهدف الاستفادة القصوى والإنتاجية أثناء دراسة المواد التالية اليوم:\n${tasksDescription}\n\nاجعل النصيحة مركزة وعملية ومباشرة جداً ومفيدة للقراءة السريعة مع إيموجي ملهم واحد أو اثنين فقط.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 150,
        temperature: 0.7
      }
    });

    res.json({ success: true, tips: response.text });
  } catch (error: any) {
    console.warn('Warning: Could not generate AI study tips, using fallback:', error?.message || error);
    // Return a friendly fallback quote if AI isn't configured
    const fallbacks = [
      "💪 النجاح ليس صدفة، بل هو نتيجة للتخطيط والمثابرة والعمل الذكي والتعلم من الأخطاء والالتزام بجدولك!",
      "🚀 الطريق إلى القمة يبدأ بخطوات بسيطة؛ ركز على إنهاء مهام اليوم واحدة تلو الأخرى وسوف تذهلك النتيجة!",
      "📚 العقل البشري ينمو بالممارسة والتركيز. خذ فترات راحة منتظمة (تقنية بومودورو) وادرس بشغف."
    ];
    const fallbackText = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    res.json({ 
      success: true, 
      tips: `💡 <b>نصيحة للتفوق:</b> ${fallbackText}\n\n<span style="font-size:0.85em; opacity:0.8;">(يمكن لمشرفك إعداد مفتاح GEMINI_API_KEY لتفعيل المستشار الدراسي المدعوم بالذكاء الاصطناعي بالكامل!)</span>` 
    });
  }
});

// Serve Frontend static assets in Production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Student Study Reminder server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
