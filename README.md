# AI Code Studio Pro

محرر كود Web (React + TypeScript + Tailwind) مستوحى من تجربة VS Code—مع:
- محرر ملفات (Tabs + تحرير)
- Terminal داخلي
- AI Chat لتنفيذ/تحسين/إصلاح الكود داخل المشروع مباشرة.

---

## Quick Start

### Install
```bash
npm install
```

### Run (Dev)
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Preview
```bash
npm run preview
```

---

## Main Capabilities

### AI Chat (AiChat)
- Conversation و Agent Mode
- Commands quick menu عند كتابة `/`
- تطبيق التغييرات عبر صيغ مثل:
  - `[FILE:...]`
  - `[PATCH:<fileName>:<startLine>:<endLine>]`

### Smart Fix + Bottom Panel
- Problems (Errors/Warnings/Info + فلترة وتجميع حسب الملف)
- إصلاح مشاكل Dart عبر AI عند توفر الإعدادات
- Output + Debug Console

---

## Development Notes
- عرض الأوامر داخل Chat يعتمد على منطق Command/Intent داخل التطبيق.
- إصلاحات Smart Fix تعتمد على Engines مثل:
  - `src/services/smartAgent.ts`
  - `src/services/surgicalFixEngine.ts`

---

## License
All rights reserved.
