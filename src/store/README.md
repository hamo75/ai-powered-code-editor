# Store Module - AI Code Studio

## 📁 البنية (Structure)

```
store/
├── index.ts              # نقطة الدخول الرئيسية
├── useStore.ts           # تطبيق Zustand store الرئيسي
├── types/
│   ├── index.ts          # تصدير جميع الـ types
│   └── store.ts          # تعريف EditorStore interface
├── constants/
│   └── index.ts          # الثوابت
├── utils/
│   ├── helpers.ts        # دوال مساعدة
│   ├── defaultFiles.ts   # قوالب الملفات الافتراضية
│   └── persistence.ts    # دوال الحفظ والتحميل
└── slices/
    ├── index.ts          # تصدير جميع الـ slices
    ├── fileSlice.ts      # إدارة الملفات والمشروع
    ├── editorSlice.ts    # إعدادات المحرر
    ├── aiSlice.ts        # الذكاء الاصطناعي والدردشة
    ├── uiSlice.ts        # واجهة المستخدم والبحث
    └── terminalSlice.ts  # الطرفية
```

## 📊 الإحصائيات (Statistics)

| الملف | الحجم (سطور) | الوظيفة |
|-------|--------------|---------|
| `useStore.ts` | ~165 | تجميع الـ Slices |
| `fileSlice.ts` | ~523 | إدارة الملفات |
| `uiSlice.ts` | ~317 | واجهة المستخدم |
| `aiSlice.ts` | ~250 | الذكاء الاصطناعي |
| `editorSlice.ts` | ~180 | إعدادات المحرر |
| `terminalSlice.ts` | ~57 | الطرفية |
| **المجموع** | **~1,492** | |

## 🎯 الفوائد (Benefits)

### قبل التقسيم
- ❌ ملف واحد ضخم (~4,800 سطر)
- ❌ صعوبة الصيانة
- ❌ عدم إمكانية إعادة الاستخدام
- ❌ اختبار صعب

### بعد التقسيم
- ✅ ملفات صغيرة ومنظمة
- ✅ سهولة الصيانة والتطوير
- ✅ إمكانية إعادة استخدام الـ Slices
- ✅ اختبار سهل لكل وحدة
- ✅ Tree-shaking محسن
- ✅ تحميل أسرع

## 🔧 الاستخدام (Usage)

```typescript
import { useStore } from './store';

// استخدام عادي
const { files, activeFileId, updateFile } = useStore();

// استخدام في مكونات React
function MyComponent() {
  const files = useStore(state => state.files);
  const updateFile = useStore(state => state.updateFile);
  
  return <div>...</div>;
}
```

## 📝 ملاحظات (Notes)

1. كل Slice مستقل ويمكن اختباره منفصلاً
2. يمكن إضافة Slices جديدة بسهولة
3. الـ Types معرفة في مكان مركزي
4. الـ Utils مشتركة بين جميع الـ Slices
