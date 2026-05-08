import React, { useState } from 'react';
import { useStore, AI_PROVIDERS } from '../store/useStore';
import {
  X, Bot, Palette, Type, Key, Globe, Eye,
  Sparkles, Monitor, Terminal,
  Settings, FileText, Zap, Sliders, Info,
  RotateCcw, Check, Search, Code, MousePointer, Keyboard,
} from 'lucide-react';

// === Reusable Setting Components ===

const Toggle: React.FC<{
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}> = ({ value, onChange, label, description }) => (
  <div className="flex items-center justify-between py-2">
    <div>
      <div className="text-[13px] text-[#cccccc]">{label}</div>
      {description && <div className="text-[11px] text-[#6c6c6c] mt-0.5">{description}</div>}
    </div>
    <button
      onClick={() => onChange(!value)}
      className={`w-9 h-5 rounded-full transition-all relative flex-shrink-0 ${
        value ? 'bg-[#007acc]' : 'bg-[#3c3c3c]'
      }`}
    >
      <div
        className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all ${
          value ? 'left-[18px]' : 'left-0.5'
        }`}
      />
    </button>
  </div>
);

const SelectSetting: React.FC<{
  value: string;
  onChange: (v: any) => void;
  options: { value: string; label: string }[];
  label: string;
  description?: string;
}> = ({ value, onChange, options, label, description }) => (
  <div className="py-2">
    <div className="text-[13px] text-[#cccccc] mb-1.5">{label}</div>
    {description && <div className="text-[11px] text-[#6c6c6c] mb-1.5">{description}</div>}
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-md text-[12px] transition-all ${
            value === opt.value
              ? 'bg-[#007acc] text-white'
              : 'bg-[#1e1e1e] text-[#858585] border border-[#3c3c3c] hover:text-white hover:border-[#505050]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

const SliderSetting: React.FC<{
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  label: string;
  unit?: string;
  description?: string;
}> = ({ value, onChange, min, max, step = 1, label, unit = '', description }) => (
  <div className="py-2">
    <div className="flex items-center justify-between mb-1.5">
      <div className="text-[13px] text-[#cccccc]">{label}</div>
      <span className="text-[12px] text-[#007acc] bg-[#007acc]/10 px-2 py-0.5 rounded">
        {value}{unit}
      </span>
    </div>
    {description && <div className="text-[11px] text-[#6c6c6c] mb-1.5">{description}</div>}
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-[#007acc] h-1"
    />
    <div className="flex justify-between text-[10px] text-[#4c4c4c] mt-0.5">
      <span>{min}{unit}</span>
      <span>{max}{unit}</span>
    </div>
  </div>
);

const TextSetting: React.FC<{
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder?: string;
  description?: string;
  mono?: boolean;
  dir?: string;
}> = ({ value, onChange, label, placeholder, description, mono, dir }) => (
  <div className="py-2">
    <div className="text-[13px] text-[#cccccc] mb-1.5">{label}</div>
    {description && <div className="text-[11px] text-[#6c6c6c] mb-1.5">{description}</div>}
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      dir={dir}
      className={`w-full bg-[#1e1e1e] border border-[#3c3c3c] text-white text-[13px] px-3 py-2 rounded-lg outline-none focus:border-[#007acc] ${
        mono ? 'font-mono' : ''
      }`}
    />
  </div>
);

const TextAreaSetting: React.FC<{
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder?: string;
  description?: string;
  rows?: number;
}> = ({ value, onChange, label, placeholder, description, rows = 4 }) => (
  <div className="py-2">
    <div className="text-[13px] text-[#cccccc] mb-1.5">{label}</div>
    {description && <div className="text-[11px] text-[#6c6c6c] mb-1.5">{description}</div>}
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      dir="ltr"
      className="w-full bg-[#1e1e1e] border border-[#3c3c3c] text-white text-[13px] px-3 py-2 rounded-lg outline-none focus:border-[#007acc] font-mono resize-y"
    />
  </div>
);

const SectionDivider: React.FC<{ title: string; icon?: React.ReactNode }> = ({ title, icon }) => (
  <div className="flex items-center gap-2 pt-4 pb-1">
    {icon}
    <span className="text-[12px] font-semibold text-[#6c6c6c] uppercase tracking-wider">{title}</span>
    <div className="flex-1 h-px bg-[#2a2a2a]" />
  </div>
);

// === Main Settings Modal ===

const SettingsModal: React.FC = () => {
  const store = useStore();
  const [activeTab, setActiveTab] = useState('ai');
  const [showApiKey, setShowApiKey] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedProvider = AI_PROVIDERS.find((p) => p.id === store.aiProviderId);
  const models = selectedProvider?.models || [];

  const accentColor = store.accentColor;

  const tabs = [
    { id: 'ai', label: 'الذكاء الاصطناعي', icon: <Bot size={16} /> },
    { id: 'editor', label: 'المحرر', icon: <Code size={16} /> },
    { id: 'appearance', label: 'المظهر', icon: <Palette size={16} /> },
    { id: 'terminal', label: 'الطرفية', icon: <Terminal size={16} /> },
    { id: 'files', label: 'الملفات', icon: <FileText size={16} /> },
    { id: 'keybindings', label: 'الاختصارات', icon: <Keyboard size={16} /> },
    { id: 'about', label: 'حول', icon: <Info size={16} /> },
  ];

  const editorThemes = [
    { id: 'vs-dark' as const, name: 'داكن (Dark+)', color: '#1e1e1e' },
    { id: 'hc-black' as const, name: 'أسود عالي التباين', color: '#000000' },
    { id: 'vs-light' as const, name: 'فاتح (Light+)', color: '#ffffff' },
  ];

  const accentColors = [
    { id: '#007acc', name: 'أزرق (افتراضي)' },
    { id: '#0098ff', name: 'أزرق فاتح' },
    { id: '#22c55e', name: 'أخضر' },
    { id: '#f59e0b', name: 'برتقالي' },
    { id: '#ef4444', name: 'أحمر' },
    { id: '#a855f7', name: 'بنفسجي' },
    { id: '#ec4899', name: 'وردي' },
    { id: '#14b8a6', name: 'تيل' },
  ];

  const shortcuts = [
    { keys: 'Ctrl+S', action: 'حفظ الملف' },
    { keys: 'Ctrl+Shift+S', action: 'حفظ الكل' },
    { keys: 'Ctrl+B', action: 'تبديل الشريط الجانبي' },
    { keys: 'Ctrl+J', action: 'تبديل الطرفية' },
    { keys: 'Ctrl+K', action: 'لوحة الأوامر' },
    { keys: 'Ctrl+,', action: 'الإعدادات' },
    { keys: 'Ctrl+P', action: 'البحث عن ملف' },
    { keys: 'Ctrl+F', action: 'بحث' },
    { keys: 'Ctrl+H', action: 'بحث واستبدال' },
    { keys: 'Ctrl+G', action: 'الانتقال لسطر' },
    { keys: 'Ctrl+D', action: 'تحديد التالي' },
    { keys: 'Ctrl+/', action: 'تبديل التعليق' },
    { keys: 'Ctrl+Z', action: 'تراجع' },
    { keys: 'Ctrl+Shift+Z', action: 'إعادة' },
    { keys: 'Tab', action: 'إكمال / مسافة بادئة' },
    { keys: 'Shift+Tab', action: 'إزالة مسافة بادئة' },
    { keys: 'Ctrl+Space', action: 'اقتراحات' },
    { keys: 'Alt+↑/↓', action: 'نقل السطر' },
    { keys: 'Ctrl+Shift+K', action: 'حذف السطر' },
    { keys: 'Ctrl+\\', action: 'تقسيم المحرر' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => store.setShowSettings(false)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-[850px] max-w-[95vw] max-h-[85vh] bg-[#252526] border border-[#3c3c3c] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#3c3c3c] bg-[#1e1e1e]">
          <div className="flex items-center gap-2">
            <Sliders size={18} style={{ color: accentColor }} />
            <span className="text-[15px] font-semibold text-white">الإعدادات</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6c6c6c]" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في الإعدادات..."
                className="bg-[#2d2d2d] border border-[#3c3c3c] text-white text-[12px] pl-3 pr-8 py-1.5 rounded-md outline-none focus:border-[#505050] w-52"
              />
            </div>
            <button
              onClick={() => store.setShowSettings(false)}
              className="p-1.5 text-[#6c6c6c] hover:text-white hover:bg-[#3c3c3c] rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar Tabs */}
          <div className="w-48 flex-shrink-0 border-r border-[#3c3c3c] bg-[#1e1e1e] py-1 overflow-y-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] transition-colors ${
                  activeTab === tab.id
                    ? `text-white bg-[#094771]/30 border-r-2`
                    : 'text-[#858585] hover:text-white hover:bg-[#2a2d2e]'
                }`}
                style={activeTab === tab.id ? { borderRightColor: accentColor } : {}}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-1">
            {/* ===== AI TAB ===== */}
            {activeTab === 'ai' && (
              <>
                <SectionDivider title="مزود الذكاء الاصطناعي" icon={<Globe size={13} className="text-[#6c6c6c]" />} />
                <div className="grid grid-cols-2 gap-2 py-2">
                  {AI_PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { store.setAiProvider(p.id); if (p.models.length > 0) store.setAiModel(p.models[0]); }}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all ${
                        store.aiProviderId === p.id
                          ? `border-[${accentColor}] bg-[${accentColor}]/10 text-white`
                          : 'border-[#3c3c3c] text-[#858585] hover:border-[#505050] hover:text-white'
                      }`}
                      style={store.aiProviderId === p.id ? { borderColor: accentColor, backgroundColor: accentColor + '15' } : {}}
                    >
                      <span className="text-lg">{p.icon}</span>
                      <div className="text-right">
                        <div className="text-[13px] font-medium">{p.name}</div>
                        <div className="text-[10px] opacity-60">{p.models.length > 0 ? p.models[0] : 'مخصص'}</div>
                      </div>
                    </button>
                  ))}
                </div>

                {store.aiProviderId === 'custom' && (
                  <TextSetting
                    value={store.customEndpoint}
                    onChange={store.setCustomEndpoint}
                    label="نقطة النهاية المخصصة"
                    placeholder="https://api.example.com/v1/chat/completions"
                    mono
                    dir="ltr"
                  />
                )}

                {models.length > 0 && (
                  <SelectSetting
                    value={store.aiModel}
                    onChange={store.setAiModel}
                    label="النموذج"
                    description="النموذج المستخدم لتوليد الاستجابات"
                    options={models.map((m) => ({ value: m, label: m }))}
                  />
                )}

                <SectionDivider title="مفتاح API" icon={<Key size={13} className="text-[#6c6c6c]" />} />
                <div className="py-2">
                  <div className="relative">
                    <input
                      value={store.apiKey}
                      onChange={(e) => store.setApiKey(e.target.value)}
                      type={showApiKey ? 'text' : 'password'}
                      placeholder="sk-... أو مفتاح API الخاص بك"
                      className="w-full bg-[#1e1e1e] border border-[#3c3c3c] text-white text-[13px] px-3 py-2 rounded-lg outline-none focus:border-[#007acc] font-mono"
                      dir="ltr"
                    />
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-[#6c6c6c] hover:text-white px-2 py-0.5 bg-[#3c3c3c] rounded"
                    >
                      {showApiKey ? 'إخفاء' : 'عرض'}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#4c4c4c] mt-1.5">💾 يتم حفظ الإعدادات تلقائياً في المتصفح</p>
                </div>

                <SectionDivider title="إعدادات متقدمة" icon={<Sliders size={13} className="text-[#6c6c6c]" />} />

                <SliderSetting
                  value={store.aiTemperature}
                  onChange={store.setAiTemperature}
                  min={0} max={2} step={0.1}
                  label="درجة الحرارة (Temperature)"
                  description="قيم أعلى = إبداع أكثر، قيم أقل = دقة أكثر"
                />

                <SliderSetting
                  value={store.aiMaxTokens}
                  onChange={store.setAiMaxTokens}
                  min={100} max={16000} step={100}
                  label="الحد الأقصى للرموز (Max Tokens)"
                  description="عدد الرموز الأقصى في الاستجابة الواحدة"
                />

                <TextAreaSetting
                  value={store.aiSystemPrompt}
                  onChange={store.setAiSystemPrompt}
                  label="رسالة النظام (System Prompt)"
                  placeholder="أنت مساعد برمجي خبير..."
                  description="تعليمات مخصصة تُرسل مع كل طلب"
                  rows={3}
                />

                <Toggle
                  value={store.aiStreaming}
                  onChange={store.setAiStreaming}
                  label="البث المباشر (Streaming)"
                  description="عرض الاستجابة كلمة بكلمة"
                />

                <Toggle
                  value={store.aiAutoFix}
                  onChange={store.setAiAutoFix}
                  label="الإصلاح التلقائي بالذكاء الاصطناعي"
                  description="إصلاح الأخطاء تلقائياً عند الحفظ"
                />
              </>
            )}

            {/* ===== EDITOR TAB ===== */}
            {activeTab === 'editor' && (
              <>
                <SectionDivider title="الخط" icon={<Type size={13} className="text-[#6c6c6c]" />} />

                <SliderSetting
                  value={store.fontSize}
                  onChange={store.setFontSize}
                  min={10} max={28}
                  label="حجم الخط"
                  unit="px"
                />

                <TextSetting
                  value={store.fontFamily}
                  onChange={store.setFontFamily}
                  label="عائلة الخط"
                  placeholder="Fira Code, Consolas, monospace"
                  mono
                  dir="ltr"
                  description="خطوط منفصلة بفاصلة. الخط الأول المتاح سيتم استخدامه."
                />

                <SliderSetting
                  value={store.lineHeight}
                  onChange={store.setLineHeight}
                  min={0} max={40}
                  label="ارتفاع السطر"
                  description="0 = تلقائي"
                  unit="px"
                />

                <SliderSetting
                  value={store.letterSpacing}
                  onChange={store.setLetterSpacing}
                  min={-5} max={10} step={0.5}
                  label="تباعد الأحرف"
                  unit="px"
                />

                <SectionDivider title="المحرر" icon={<Code size={13} className="text-[#6c6c6c]" />} />

                <SliderSetting
                  value={store.tabSize}
                  onChange={store.setTabSize}
                  min={2} max={8}
                  label="حجم التبويب"
                  description="عدد المسافات لكل تبويب"
                />

                <SelectSetting
                  value={store.wordWrap}
                  onChange={store.setWordWrap}
                  label="التفاف النص"
                  options={[
                    { value: 'on', label: 'مفعّل' },
                    { value: 'off', label: 'معطّل' },
                  ]}
                />

                <SelectSetting
                  value={store.lineNumbers}
                  onChange={store.setLineNumbers}
                  label="أرقام الأسطر"
                  options={[
                    { value: 'on', label: 'مفعّل' },
                    { value: 'off', label: 'معطّل' },
                    { value: 'relative', label: 'نسبي' },
                  ]}
                />

                <SectionDivider title="المؤشر" icon={<MousePointer size={13} className="text-[#6c6c6c]" />} />

                <SelectSetting
                  value={store.cursorStyle}
                  onChange={store.setCursorStyle}
                  label="نمط المؤشر"
                  options={[
                    { value: 'line', label: 'خط' },
                    { value: 'block', label: 'كتلة' },
                    { value: 'underline', label: 'خط سفلي' },
                  ]}
                />

                <SelectSetting
                  value={store.cursorBlinking}
                  onChange={store.setCursorBlinking}
                  label="وميض المؤشر"
                  options={[
                    { value: 'blink', label: 'وميض' },
                    { value: 'smooth', label: 'سلس' },
                    { value: 'phase', label: 'مرحلي' },
                    { value: 'expand', label: 'تمدد' },
                    { value: 'solid', label: 'ثابت' },
                  ]}
                />

                <SectionDivider title="السلوك" icon={<Zap size={13} className="text-[#6c6c6c]" />} />

                <Toggle
                  value={store.minimap}
                  onChange={() => store.toggleMinimap()}
                  label="الخريطة المصغرة"
                  description="عرض مصغر للكود على الجانب"
                />

                <Toggle
                  value={store.bracketPairColorization}
                  onChange={store.setBracketPairColorization}
                  label="تلوين أزواج الأقواس"
                  description="ألوان مختلفة لكل زوج أقواس متداخل"
                />

                <SelectSetting
                  value={store.autoClosingBrackets}
                  onChange={store.setAutoClosingBrackets}
                  label="الإغلاق التلقائي للأقواس"
                  options={[
                    { value: 'always', label: 'دائماً' },
                    { value: 'languageDefined', label: 'حسب اللغة' },
                    { value: 'beforeWhitespace', label: 'قبل المسافة' },
                    { value: 'never', label: 'أبداً' },
                  ]}
                />

                <SelectSetting
                  value={store.renderWhitespace}
                  onChange={store.setRenderWhitespace}
                  label="عرض المسافات البيضاء"
                  options={[
                    { value: 'none', label: 'بدون' },
                    { value: 'boundary', label: 'الحدود' },
                    { value: 'selection', label: 'التحديد' },
                    { value: 'trailing', label: 'الزائدة' },
                    { value: 'all', label: 'الكل' },
                  ]}
                />

                <Toggle
                  value={store.smoothScrolling}
                  onChange={store.setSmoothScrolling}
                  label="التمرير السلس"
                  description="حركة تمرير أنعم"
                />
              </>
            )}

            {/* ===== APPEARANCE TAB ===== */}
            {activeTab === 'appearance' && (
              <>
                <SectionDivider title="سمة المحرر" icon={<Monitor size={13} className="text-[#6c6c6c]" />} />
                <div className="space-y-2 py-2">
                  {editorThemes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => store.setEditorTheme(theme.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                        store.editorTheme === theme.id
                          ? 'border-[#007acc] bg-[#007acc]/10'
                          : 'border-[#3c3c3c] hover:border-[#505050]'
                      }`}
                    >
                      <div
                        className="w-10 h-7 rounded border border-[#3c3c3c] flex items-center justify-center overflow-hidden"
                        style={{ backgroundColor: theme.color }}
                      >
                        <div className="flex flex-col gap-0.5 scale-75">
                          <div className="h-1 rounded-full" style={{ width: 24, backgroundColor: theme.color === '#ffffff' ? '#333' : '#569cd6' }} />
                          <div className="h-1 rounded-full" style={{ width: 16, backgroundColor: theme.color === '#ffffff' ? '#555' : '#6a9955' }} />
                          <div className="h-1 rounded-full" style={{ width: 20, backgroundColor: theme.color === '#ffffff' ? '#444' : '#ce9178' }} />
                        </div>
                      </div>
                      <span className="text-[13px] text-white">{theme.name}</span>
                      {store.editorTheme === theme.id && <Check size={14} style={{ color: accentColor }} className="mr-auto" />}
                    </button>
                  ))}
                </div>

                <SectionDivider title="لون التمييز (Accent)" icon={<Palette size={13} className="text-[#6c6c6c]" />} />
                <div className="grid grid-cols-4 gap-2 py-2">
                  {accentColors.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => store.setAccentColor(c.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                        accentColor === c.id
                          ? 'border-white/30 bg-white/5'
                          : 'border-[#3c3c3c] hover:border-[#505050]'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: c.id }} />
                      <span className="text-[11px] text-[#cccccc] truncate">{c.name}</span>
                    </button>
                  ))}
                </div>

                <SectionDivider title="عناصر الواجهة" icon={<Eye size={13} className="text-[#6c6c6c]" />} />

                <Toggle
                  value={store.showActivityBar}
                  onChange={store.setShowActivityBar}
                  label="شريط الأنشطة"
                  description="الشريط الجانبي الأيسر مع الأيقونات"
                />

                <Toggle
                  value={store.showStatusBar}
                  onChange={store.setShowStatusBar}
                  label="شريط الحالة"
                  description="الشريط السفلي مع المعلومات"
                />
              </>
            )}

            {/* ===== TERMINAL TAB ===== */}
            {activeTab === 'terminal' && (
              <>
                <SectionDivider title="الخط" icon={<Type size={13} className="text-[#6c6c6c]" />} />

                <SliderSetting
                  value={store.terminalFontSize}
                  onChange={store.setTerminalFontSize}
                  min={10} max={24}
                  label="حجم الخط"
                  unit="px"
                />

                <SectionDivider title="السلوك" icon={<Settings size={13} className="text-[#6c6c6c]" />} />

                <SelectSetting
                  value={store.terminalCursorStyle}
                  onChange={store.setTerminalCursorStyle}
                  label="نمط المؤشر"
                  options={[
                    { value: 'bar', label: 'شريط' },
                    { value: 'block', label: 'كتلة' },
                    { value: 'underline', label: 'خط سفلي' },
                  ]}
                />

                <SliderSetting
                  value={store.terminalScrollback}
                  onChange={store.setTerminalScrollback}
                  min={100} max={50000} step={100}
                  label="حد الذاكرة (Scrollback)"
                  description="عدد الأسطر المحفوظة في التاريخ"
                />
              </>
            )}

            {/* ===== FILES TAB ===== */}
            {activeTab === 'files' && (
              <>
                <SectionDivider title="الحفظ التلقائي" icon={<Zap size={13} className="text-[#6c6c6c]" />} />

                <SelectSetting
                  value={store.autoSave}
                  onChange={store.setAutoSave}
                  label="وضع الحفظ التلقائي"
                  description="متى يتم حفظ الملفات تلقائياً"
                  options={[
                    { value: 'off', label: 'معطّل' },
                    { value: 'afterDelay', label: 'بعد تأخير' },
                    { value: 'onFocusChange', label: 'عند تغيير التركيز' },
                  ]}
                />

                {store.autoSave === 'afterDelay' && (
                  <SliderSetting
                    value={store.autoSaveDelay}
                    onChange={store.setAutoSaveDelay}
                    min={200} max={10000} step={100}
                    label="تأخير الحفظ التلقائي"
                    unit="ms"
                    description="الوقت بالمللي ثانية قبل الحفظ التلقائي"
                  />
                )}

                <Toggle
                  value={store.formatOnSave}
                  onChange={store.setFormatOnSave}
                  label="تنسيق عند الحفظ"
                  description="تنسيق الملف تلقائياً عند الحفظ"
                />

                <SectionDivider title="محتوى الملف" icon={<FileText size={13} className="text-[#6c6c6c]" />} />

                <Toggle
                  value={store.trimTrailingWhitespace}
                  onChange={store.setTrimTrailingWhitespace}
                  label="إزالة المسافات الزائدة"
                  description="إزالة المسافات البيضاء في نهاية كل سطر عند الحفظ"
                />

                <Toggle
                  value={store.insertFinalNewline}
                  onChange={store.setInsertFinalNewline}
                  label="إضافة سطر فارغ نهائي"
                  description="إضافة سطر فارغ في نهاية الملف عند الحفظ"
                />

                <SectionDivider title="إدارة المشاريع" icon={<RotateCcw size={13} className="text-[#6c6c6c]" />} />

                <div className="py-2">
                  <button
                    onClick={() => {
                      if (confirm('هل أنت متأكد من إعادة تعيين المشروع؟')) {
                        store.resetProject();
                        store.addNotification({
                          id: Date.now().toString(),
                          type: 'success',
                          message: '✅ تم إعادة تعيين المشروع',
                        });
                      }
                    }}
                    className="px-4 py-2 rounded-lg text-[13px] bg-[#5a1d1d] text-[#f48771] hover:bg-[#6b2222] transition-colors"
                  >
                    <RotateCcw size={13} className="inline mr-1.5" />
                    إعادة تعيين المشروع
                  </button>
                  <p className="text-[11px] text-[#4c4c4c] mt-1.5">سيتم حذف جميع الملفات والعودة للمشروع الافتراضي</p>
                </div>

                <div className="py-2 space-y-2">
                  <button
                    onClick={() => {
                      const json = store.exportProject();
                      const blob = new Blob([json], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${store.projectName || 'project'}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="w-full px-4 py-2 rounded-lg text-[13px] bg-[#1e1e1e] border border-[#3c3c3c] text-[#cccccc] hover:border-[#505050] transition-colors text-right"
                  >
                    📦 تصدير المشروع كملف JSON
                  </button>

                  <label className="block w-full px-4 py-2 rounded-lg text-[13px] bg-[#1e1e1e] border border-[#3c3c3c] text-[#cccccc] hover:border-[#505050] transition-colors text-right cursor-pointer">
                    📥 استيراد مشروع من JSON
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const result = store.importProject(ev.target?.result as string);
                          store.addNotification({
                            id: Date.now().toString(),
                            type: result ? 'success' : 'error',
                            message: result ? '✅ تم استيراد المشروع' : '❌ فشل استيراد المشروع',
                          });
                        };
                        reader.readAsText(file);
                      }}
                    />
                  </label>
                </div>
              </>
            )}

            {/* ===== KEYBINDINGS TAB ===== */}
            {activeTab === 'keybindings' && (
              <>
                <SectionDivider title="اختصارات لوحة المفاتيح" icon={<Keyboard size={13} className="text-[#6c6c6c]" />} />
                <div className="py-2 space-y-0.5">
                  {shortcuts.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#2a2d2e] transition-colors group"
                    >
                      <span className="text-[13px] text-[#cccccc]">{s.action}</span>
                      <kbd className="text-[11px] bg-[#1e1e1e] border border-[#3c3c3c] text-[#858585] px-2 py-0.5 rounded font-mono group-hover:text-[#cccccc] group-hover:border-[#505050] transition-colors">
                        {s.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ===== ABOUT TAB ===== */}
            {activeTab === 'about' && (
              <>
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4"
                    style={{ backgroundColor: accentColor + '20' }}>
                    <Sparkles size={32} style={{ color: accentColor }} />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">AI Code Studio Pro</h2>
                  <p className="text-[13px] text-[#6c6c6c] mb-6">v3.0.0</p>

                  <div className="w-full max-w-sm space-y-3 text-right">
                    <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg p-4">
                      <h3 className="text-[13px] font-medium text-white mb-2">🚀 مميزات المحرر</h3>
                      <ul className="text-[12px] text-[#858585] space-y-1">
                        <li>• محرر Monaco Engine (مثل VS Code)</li>
                        <li>• دعم Dart, TypeScript, Python, وأكثر</li>
                        <li>• تحليل أخطاء في الوقت الفعلي</li>
                        <li>• إكمال تلقائي ذكي</li>
                        <li>• تنسيق كود تلقائي</li>
                      </ul>
                    </div>

                    <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg p-4">
                      <h3 className="text-[13px] font-medium text-white mb-2">🤖 الذكاء الاصطناعي</h3>
                      <ul className="text-[12px] text-[#858585] space-y-1">
                        <li>• دعم Mistral, OpenAI, Gemini, OpenRouter</li>
                        <li>• وكيل ذكي متعدد الخطوات</li>
                        <li>• إصلاح أخطاء تلقائي</li>
                        <li>• بناء مشاريع كاملة</li>
                        <li>• إدارة ملفات كاملة</li>
                      </ul>
                    </div>

                    <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg p-4">
                      <h3 className="text-[13px] font-medium text-white mb-2">🧩 نظام الإضافات</h3>
                      <ul className="text-[12px] text-[#858585] space-y-1">
                        <li>• متجر إضافات مدمج</li>
                        <li>• سمات، منسقات، مزودات AI</li>
                        <li>• قصاصات كود</li>
                        <li>• أوامر مخصصة</li>
                      </ul>
                    </div>

                    <div className="text-[11px] text-[#4c4c4c] pt-2">
                      صنع بـ ❤️ باستخدام React + Monaco + Tailwind CSS
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
