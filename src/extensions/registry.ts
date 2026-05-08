// ============================================================
// AI Code Studio Pro - Extensions Registry
// ============================================================

export interface ExtensionSnippet {
  prefix: string;
  description: string;
  body: string[];
  language?: string;
}

export interface MonacoThemeDef {
  base: 'vs' | 'vs-dark' | 'hc-black';
  inherit: boolean;
  rules: Array<{ token: string; foreground: string; background?: string; fontStyle?: string }>;
  colors: Record<string, string>;
}

export interface ExtensionThemeData {
  monacoTheme: MonacoThemeDef;
  accentColor: string;
  sidebarBg: string;
  activityBarBg: string;
  editorBg: string;
  statusBarBg: string;
  titleBarBg: string;
}

export interface ExtensionCommandDef {
  name: string;
  description: string;
  output: string[];
  outputDelay?: number;
}

export interface ExtensionAiProviderDef {
  id: string;
  name: string;
  endpoint: string;
  models: string[];
  icon: string;
}

export interface ExtensionFormatterDef {
  indent: number;
  semicolons: boolean;
  singleQuotes: boolean;
  trailingNewline: boolean;
  bracketSpacing: boolean;
}

export interface Extension {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  version: string;
  author: string;
  authorUrl?: string;
  icon: string;
  category: 'theme' | 'snippet' | 'tool' | 'ai' | 'productivity';
  installed: boolean;
  enabled: boolean;
  rating: number;
  downloads: number;
  tags: string[];
  features: string[];
  changelog?: string;
  // Type-specific data
  themeData?: ExtensionThemeData;
  snippetData?: ExtensionSnippet[];
  commandData?: ExtensionCommandDef[];
  aiProviderData?: ExtensionAiProviderDef;
  formatterData?: ExtensionFormatterDef;
}

// ============================================================
// MONACO THEME DEFINITIONS
// ============================================================

const ONE_DARK_THEME: MonacoThemeDef = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'c678dd' },
    { token: 'string', foreground: '98c379' },
    { token: 'number', foreground: 'd19a66' },
    { token: 'type', foreground: 'e5c07b' },
    { token: 'function', foreground: '61afef' },
    { token: 'variable', foreground: 'e06c75' },
    { token: 'variable.predefined', foreground: 'e5c07b' },
    { token: 'operator', foreground: '56b6c2' },
    { token: 'delimiter', foreground: 'abb2bf' },
    { token: 'tag', foreground: 'e06c75' },
    { token: 'attribute.name', foreground: 'd19a66' },
    { token: 'attribute.value', foreground: '98c379' },
    { token: 'regexp', foreground: '98c379' },
  ],
  colors: {
    'editor.background': '#282c34',
    'editor.foreground': '#abb2bf',
    'editorCursor.foreground': '#528bff',
    'editor.lineHighlightBackground': '#2c313a',
    'editor.selectionBackground': '#3e4451',
    'editor.inactiveSelectionBackground': '#2c313a',
    'editorIndentGuide.background': '#3b4048',
    'editorIndentGuide.activeBackground': '#4b5361',
    'editorWhitespace.foreground': '#3b4048',
    'editorLineNumber.foreground': '#4b5361',
    'editorLineNumber.activeForeground': '#abb2bf',
    'editorBracketMatch.background': '#3e4451',
    'editorBracketMatch.border': '#528bff',
  },
};

const DRACULA_THEME: MonacoThemeDef = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'ff79c6' },
    { token: 'string', foreground: 'f1fa8c' },
    { token: 'number', foreground: 'bd93f9' },
    { token: 'type', foreground: '8be9fd' },
    { token: 'function', foreground: '50fa7b' },
    { token: 'variable', foreground: 'f8f8f2' },
    { token: 'operator', foreground: 'ff79c6' },
    { token: 'delimiter', foreground: 'f8f8f2' },
    { token: 'tag', foreground: 'ff79c6' },
    { token: 'attribute.name', foreground: '50fa7b' },
    { token: 'attribute.value', foreground: 'f1fa8c' },
    { token: 'regexp', foreground: 'f1fa8c' },
  ],
  colors: {
    'editor.background': '#282a36',
    'editor.foreground': '#f8f8f2',
    'editorCursor.foreground': '#f8f8f0',
    'editor.lineHighlightBackground': '#44475a',
    'editor.selectionBackground': '#44475a',
    'editor.inactiveSelectionBackground': '#44475a75',
    'editorIndentGuide.background': '#6272a4',
    'editorIndentGuide.activeBackground': '#ff79c6',
    'editorWhitespace.foreground': '#6272a4',
    'editorLineNumber.foreground': '#6272a4',
    'editorLineNumber.activeForeground': '#f8f8f2',
    'editorBracketMatch.background': '#44475a',
    'editorBracketMatch.border': '#ff79c6',
  },
};

const NORD_THEME: MonacoThemeDef = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '616e88', fontStyle: 'italic' },
    { token: 'keyword', foreground: '81a1c1' },
    { token: 'string', foreground: 'a3be8c' },
    { token: 'number', foreground: 'b48ead' },
    { token: 'type', foreground: '8fbcbb' },
    { token: 'function', foreground: '88c0d0' },
    { token: 'variable', foreground: 'd8dee9' },
    { token: 'operator', foreground: '81a1c1' },
    { token: 'delimiter', foreground: 'eceff4' },
    { token: 'tag', foreground: '81a1c1' },
    { token: 'attribute.name', foreground: '8fbcbb' },
    { token: 'attribute.value', foreground: 'a3be8c' },
  ],
  colors: {
    'editor.background': '#2e3440',
    'editor.foreground': '#d8dee9',
    'editorCursor.foreground': '#d8dee9',
    'editor.lineHighlightBackground': '#3b4252',
    'editor.selectionBackground': '#434c5e',
    'editor.inactiveSelectionBackground': '#434c5e75',
    'editorIndentGuide.background': '#434c5e',
    'editorIndentGuide.activeBackground': '#4c566a',
    'editorWhitespace.foreground': '#4c566a',
    'editorLineNumber.foreground': '#4c566a',
    'editorLineNumber.activeForeground': '#d8dee9',
  },
};

const MONOKAI_THEME: MonacoThemeDef = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '727072', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'ff6188' },
    { token: 'string', foreground: 'ffd866' },
    { token: 'number', foreground: 'ab9df2' },
    { token: 'type', foreground: '78dce8' },
    { token: 'function', foreground: 'a9dc76' },
    { token: 'variable', foreground: 'fcfcfa' },
    { token: 'operator', foreground: 'ff6188' },
    { token: 'delimiter', foreground: 'fcfcfa' },
    { token: 'tag', foreground: 'ff6188' },
    { token: 'attribute.name', foreground: '78dce8' },
    { token: 'attribute.value', foreground: 'ffd866' },
  ],
  colors: {
    'editor.background': '#2d2a2e',
    'editor.foreground': '#fcfcfa',
    'editorCursor.foreground': '#fcfcfa',
    'editor.lineHighlightBackground': '#403e41',
    'editor.selectionBackground': '#403e41',
    'editor.inactiveSelectionBackground': '#403e4175',
    'editorIndentGuide.background': '#403e41',
    'editorIndentGuide.activeBackground': '#727072',
    'editorLineNumber.foreground': '#727072',
    'editorLineNumber.activeForeground': '#fcfcfa',
  },
};

const SOLARIZED_THEME: MonacoThemeDef = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '586e75', fontStyle: 'italic' },
    { token: 'keyword', foreground: '859900' },
    { token: 'string', foreground: '2aa198' },
    { token: 'number', foreground: 'd33682' },
    { token: 'type', foreground: 'b58900' },
    { token: 'function', foreground: '268bd2' },
    { token: 'variable', foreground: '839496' },
    { token: 'operator', foreground: '859900' },
    { token: 'delimiter', foreground: '839496' },
    { token: 'tag', foreground: '268bd2' },
    { token: 'attribute.name', foreground: 'b58900' },
    { token: 'attribute.value', foreground: '2aa198' },
  ],
  colors: {
    'editor.background': '#002b36',
    'editor.foreground': '#839496',
    'editorCursor.foreground': '#839496',
    'editor.lineHighlightBackground': '#073642',
    'editor.selectionBackground': '#073642',
    'editor.inactiveSelectionBackground': '#07364275',
    'editorIndentGuide.background': '#073642',
    'editorIndentGuide.activeBackground': '#586e75',
    'editorLineNumber.foreground': '#586e75',
    'editorLineNumber.activeForeground': '#839496',
  },
};

// ============================================================
// ALL BUILT-IN EXTENSIONS
// ============================================================

export const ALL_EXTENSIONS: Extension[] = [
  // ──────────── THEMES ────────────
  {
    id: 'theme-one-dark-pro',
    name: 'One Dark Pro',
    description: 'سمة داكنة مستوحاة من Atom مع ألوان مختارة بعناية',
    longDescription: 'واحدة من أكثر السمات شعبية في VS Code، مستوحاة من Atom One Dark. توفر ألواناً داكنة مريحة للعين مع تباين ممتاز للقراءة. تدعم تلوين بناء الجملة لجميع اللغات الشائعة.',
    version: '2.4.1',
    author: 'binaryforce',
    icon: '🎨',
    category: 'theme',
    installed: false,
    enabled: false,
    rating: 4.9,
    downloads: 125400,
    tags: ['dark', 'atom', 'popular', 'comfortable'],
    features: [
      'تلوين بناء جملة محسّن لجميع اللغات',
      'خلفية داكنة مريحة للعين #282c34',
      'ألوان وظيفية مميزة (أزرق للدوال، بنفسجي للكلمات المفتاحية)',
      'توافق مع جميع أنواع الملفات',
      'تحسين خطوط الشبكة والمؤشر',
    ],
    themeData: {
      monacoTheme: ONE_DARK_THEME,
      accentColor: '#61afef',
      sidebarBg: '#21252b',
      activityBarBg: '#282c34',
      editorBg: '#282c34',
      statusBarBg: '#21252b',
      titleBarBg: '#21252b',
    },
  },
  {
    id: 'theme-dracula',
    name: 'Dracula Official',
    description: 'سمة داكنة شعبية بألوان زاهية ومتباينة',
    longDescription: 'سمة Dracula الرسمية - واحدة من أكثر السمات شعبية في العالم مع أكثر من 168 منصة مدعومة. تتميز بألوان زاهية ومتباينة مع خلفية داكنة عميقة مثالية للبرمجة لفترات طويلة.',
    version: '3.0.2',
    author: 'dracula',
    icon: '🧛',
    category: 'theme',
    installed: false,
    enabled: false,
    rating: 4.8,
    downloads: 98700,
    tags: ['dark', 'colorful', 'popular', 'vibrant'],
    features: [
      'ألوان زاهية ومتباينة مميزة',
      'خلفية داكنة عميقة #282a36',
      'وردي للكلمات المفتاحية، أخضر للدوال',
      'مريحة للعين في البرمجة الطويلة',
      'دعم كامل لجميع اللغات',
    ],
    themeData: {
      monacoTheme: DRACULA_THEME,
      accentColor: '#bd93f9',
      sidebarBg: '#21222c',
      activityBarBg: '#191a21',
      editorBg: '#282a36',
      statusBarBg: '#191a21',
      titleBarBg: '#21222c',
    },
  },
  {
    id: 'theme-nord',
    name: 'Nord',
    description: 'سمة قطبية هادئة بألوان زرقاء باردة',
    longDescription: 'نظام ألوان Nord مستوحى من الشفق القطبي الشمالي. يوفر لوحة ألوان باردة وهادئة مثالية للتركيز. يتميز بألوان متناغمة وخلفية رمادية مائلة للزرقة.',
    version: '1.8.0',
    author: 'arcticicestudio',
    icon: '🏔️',
    category: 'theme',
    installed: false,
    enabled: false,
    rating: 4.7,
    downloads: 76500,
    tags: ['dark', 'blue', 'calm', 'arctic', 'clean'],
    features: [
      'لوحة ألوان قطبية متناغمة',
      'ألوان زرقاء باردة مهدئة',
      'خلفية #2e3440 مريحة للعين',
      'تصميم نظيف وغير مشتت',
      'دعم كامل لـ TypeScript, React, Python',
    ],
    themeData: {
      monacoTheme: NORD_THEME,
      accentColor: '#88c0d0',
      sidebarBg: '#2e3440',
      activityBarBg: '#2e3440',
      editorBg: '#2e3440',
      statusBarBg: '#3b4252',
      titleBarBg: '#3b4252',
    },
  },
  {
    id: 'theme-monokai-pro',
    name: 'Monokai Pro',
    description: 'السمة الكلاسيكية من Sublime Text بألوان جريئة',
    longDescription: 'النسخة المحسنة من سمة Monokai الكلاسيكية التي كانت الافتراضية في Sublime Text. تتميز بألوان جريئة وحيوية مع تركيز عالي على التباين والوضوح.',
    version: '1.2.5',
    author: 'monokai',
    icon: '🔥',
    category: 'theme',
    installed: false,
    enabled: false,
    rating: 4.6,
    downloads: 54300,
    tags: ['dark', 'classic', 'bold', 'vibrant'],
    features: [
      'ألوان جريئة وحيوية',
      'وردي للكلمات المفتاحية، أصفر للنصوص',
      'خلفية #2d2a2e دافئة',
      'كلاسيكية ومحبوبة منذ سنوات',
      'تباين عالي للقراءة',
    ],
    themeData: {
      monacoTheme: MONOKAI_THEME,
      accentColor: '#78dce8',
      sidebarBg: '#2d2a2e',
      activityBarBg: '#221f22',
      editorBg: '#2d2a2e',
      statusBarBg: '#221f22',
      titleBarBg: '#2d2a2e',
    },
  },
  {
    id: 'theme-solarized',
    name: 'Solarized Dark',
    description: 'سمة مصممة علمياً لراحة العين',
    longDescription: 'نظام ألوان Solarized مصمم علمياً بواسطة Ethan Schoonover. يستخدم نسب ألوان محسوبة بعناية لتقليل إجهاد العين مع الحفاظ على التباين المطلوب للقراءة.',
    version: '1.5.0',
    author: 'altercation',
    icon: '☀️',
    category: 'theme',
    installed: false,
    enabled: false,
    rating: 4.5,
    downloads: 45200,
    tags: ['dark', 'scientific', 'eye-care', 'classic'],
    features: [
      'مصممة علمياً لراحة العين',
      'خلفية زرقاء داكنة #002b36',
      'ألوان دافئة وباردة متوازنة',
      'مثالية للعمل لفترات طويلة',
      'إرث عريق في عالم البرمجة',
    ],
    themeData: {
      monacoTheme: SOLARIZED_THEME,
      accentColor: '#268bd2',
      sidebarBg: '#002b36',
      activityBarBg: '#073642',
      editorBg: '#002b36',
      statusBarBg: '#073642',
      titleBarBg: '#073642',
    },
  },

  // ──────────── SNIPPETS ────────────
  {
    id: 'snippets-react',
    name: 'React Snippets',
    description: 'قصاصات كود React شاملة مع TypeScript',
    longDescription: 'مجموعة شاملة من قصاصات كود React مع دعم TypeScript الكامل. تشمل: المكونات، الـ Hooks، معالجات الأحداث، الأنماط، وأكثر.',
    version: '3.2.0',
    author: 'dsznajder',
    icon: '⚛️',
    category: 'snippet',
    installed: false,
    enabled: false,
    rating: 4.8,
    downloads: 89000,
    tags: ['react', 'typescript', 'hooks', 'components'],
    features: [
      'قوالب مكونات React مع TypeScript',
      'جميع React Hooks (useState, useEffect, etc.)',
      'مكونات دالة وتصدير تلقائي',
      'معالجات أحداث جاهزة',
      'أنماط CSS Modules و Tailwind',
    ],
    snippetData: [
      { prefix: 'rfc', description: 'React مكون دالة', body: ['import React from \'react\';', '', 'interface $1Props {', '  $2', '}', '', 'const $1: React.FC<$1Props> = ($3) => {', '  return (', '    <div>$0</div>', '  );', '};', '', 'export default $1;'], language: 'typescript' },
      { prefix: 'rfe', description: 'React مكون مع تصدير مباشر', body: ['export const $1: React.FC = () => {', '  return (', '    <div>$0</div>', '  );', '};'], language: 'typescript' },
      { prefix: 'useState', description: 'React useState Hook', body: ['const [$1, set$2] = React.useState<$3>($4);'], language: 'typescript' },
      { prefix: 'useEffect', description: 'React useEffect Hook', body: ['React.useEffect(() => {', '  $0', '', '  return () => {', '    $4', '  };', '}, [$3]);'], language: 'typescript' },
      { prefix: 'useCallback', description: 'React useCallback Hook', body: ['const $1 = React.useCallback(($2) => {', '  $0', '}, [$3]);'], language: 'typescript' },
      { prefix: 'useMemo', description: 'React useMemo Hook', body: ['const $1 = React.useMemo(() => {', '  return $0;', '}, [$2]);'], language: 'typescript' },
      { prefix: 'useRef', description: 'React useRef Hook', body: ['const $1Ref = React.useRef<$2>($3);'], language: 'typescript' },
      { prefix: 'useContext', description: 'React useContext Hook', body: ['const $1 = React.useContext($2Context);'], language: 'typescript' },
      { prefix: 'handler', description: 'معالج حدث', body: ['const handle$1 = ($2: React.MouseEvent<HTMLButtonElement>) => {', '  $0', '};'], language: 'typescript' },
      { prefix: 'comp', description: 'مكون مع Props كامل', body: ['interface ${1:Component}Props {', '  children?: React.ReactNode;', '  className?: string;', '  $2', '}', '', 'const ${1:Component}: React.FC<${1:Component}Props> = ({ children, className, $3 }) => {', '  return (', '    <div className={className}>', '      {children}', '    </div>', '  );', '};', '', 'export default ${1:Component};'], language: 'typescript' },
      { prefix: 'ctx', description: 'إنشاء Context', body: ['interface ${1:Context}Type {', '  $2', '}', '', 'const ${1:Context} = React.createContext<${1:Context}Type | undefined>(undefined);', '', 'export const ${1:Context}Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {', '  const value = { $3 };', '  return (', '    <${1:Context}.Provider value={value}>', '      {children}', '    </${1:Context}.Provider>', '  );', '};', '', 'export const use$1 = () => {', '  const context = React.useContext(${1:Context});', '  if (!context) throw new Error(\'use$1 must be used within $1Provider\');', '  return context;', '};'], language: 'typescript' },
    ],
  },
  {
    id: 'snippets-typescript',
    name: 'TypeScript Snippets',
    description: 'قصاصات TypeScript للأنواع والواجهات والأصناف',
    longDescription: 'مجموعة قصاصات TypeScript تغطي جميع احتياجاتك: الواجهات، الأنواع، الأصناف، الدوال، الأدوية (Generics)، والمزيد. مصممة لتسريع كتابة كود TypeScript النظيف.',
    version: '2.1.0',
    author: 'lopeselias',
    icon: '🔷',
    category: 'snippet',
    installed: false,
    enabled: false,
    rating: 4.6,
    downloads: 56000,
    tags: ['typescript', 'types', 'interfaces', 'generics'],
    features: [
      'قوالب Interface و Type',
      'أصناف مع Constructors',
      'دوال عامة (Generic functions)',
      'Enum و Union types',
      'استيراد وتصدير مختصر',
    ],
    snippetData: [
      { prefix: 'int', description: 'Interface تعريف', body: ['interface $1 {', '  $2: $3;', '}'], language: 'typescript' },
      { prefix: 'type', description: 'Type Alias تعريف', body: ['type $1 = {', '  $2: $3;', '};'], language: 'typescript' },
      { prefix: 'enum', description: 'Enum تعريف', body: ['enum $1 {', '  $2 = \'$3\',', '}'], language: 'typescript' },
      { prefix: 'fn', description: 'دالة مع أنواع', body: ['const $1 = ($2: $3): $4 => {', '  $0', '};'], language: 'typescript' },
      { prefix: 'afn', description: 'Arrow Function مع أنواع', body: ['const $1 = ($2: $3): $4 => $0;'], language: 'typescript' },
      { prefix: 'cls', description: 'Class تعريف', body: ['class $1 {', '  private $2: $3;', '', '  constructor($2: $3) {', '    this.$2 = $2;', '  }', '', '  $0', '}'], language: 'typescript' },
      { prefix: 'generic', description: 'Generic Function', body: ['function $1<T>($2: T): T {', '  $0', '}'], language: 'typescript' },
      { prefix: 'imp', description: 'استيراد', body: ['import { $1 } from \'$2\';'], language: 'typescript' },
      { prefix: 'exp', description: 'تصدير افتراضي', body: ['export default $1;'], language: 'typescript' },
      { prefix: 'try', description: 'Try-Catch', body: ['try {', '  $1', '} catch (error) {', '  console.error(error);', '  $0', '}'], language: 'typescript' },
    ],
  },
  {
    id: 'snippets-css',
    name: 'CSS Power Snippets',
    description: 'قصاصات CSS متقدمة: Flexbox، Grid، حركات',
    longDescription: 'مجموعة قصاصات CSS احترافية تشمل تخطيطات Flexbox و Grid المتقدمة، الحركات والانتقالات، استعلامات الوسائط، والمتغيرات CSS. تساعدك على كتابة CSS احترافي بسرعة.',
    version: '1.4.0',
    author: 'grommet',
    icon: '🎨',
    category: 'snippet',
    installed: false,
    enabled: false,
    rating: 4.4,
    downloads: 34500,
    tags: ['css', 'flexbox', 'grid', 'animation'],
    features: [
      'قوالب Flexbox جاهزة',
      'تخطيطات CSS Grid',
      'حركات Keyframes متقدمة',
      'استعلامات Media Queries',
      'متغيرات CSS و Custom Properties',
    ],
    snippetData: [
      { prefix: 'flex', description: 'Flexbox Container', body: ['display: flex;', 'justify-content: $1;', 'align-items: $2;', 'gap: ${3:1rem};'], language: 'css' },
      { prefix: 'grid', description: 'CSS Grid Container', body: ['display: grid;', 'grid-template-columns: repeat(${1:auto-fit}, minmax(${2:300px}, 1fr));', 'gap: ${3:1.5rem};', 'padding: ${4:2rem};'], language: 'css' },
      { prefix: 'anim', description: 'Animation Keyframes', body: ['@keyframes $1 {', '  from {', '    $2', '  }', '  to {', '    $3', '  }', '}', '', 'animation: $1 ${4:0.3s} ${5:ease} ${6:forwards};'], language: 'css' },
      { prefix: 'media', description: 'Media Query', body: ['@media (max-width: ${1:768px}) {', '  $0', '}'], language: 'css' },
      { prefix: 'gradient', description: 'Linear Gradient', body: ['background: linear-gradient(${1:135deg}, ${2:#667eea} 0%, ${3:#764ba2} 100%);'], language: 'css' },
      { prefix: 'shadow', description: 'Box Shadow', body: ['box-shadow: 0 ${1:4px} ${2:6px} ${3:-1px} rgba(0, 0, 0, ${4:0.1}), 0 ${5:2px} ${6:4px} ${7:-2px} rgba(0, 0, 0, ${8:0.1});'], language: 'css' },
      { prefix: 'center', description: 'Center with Flexbox', body: ['display: flex;', 'justify-content: center;', 'align-items: center;', 'min-height: ${1:100vh};'], language: 'css' },
      { prefix: 'var', description: 'CSS Custom Property', body: ['--$1: $2;', 'color: var(--$1);'], language: 'css' },
    ],
  },

  // ──────────── TOOLS ────────────
  {
    id: 'tool-prettier',
    name: 'Prettier',
    description: 'منسق كود تلقائي يدعم JavaScript و TypeScript و CSS',
    longDescription: 'أداة تنسيق الكود الأكثر شعبية. تقوم تلقائياً بتنسيق الكود الخاص بك حسب قواعد محددة. تدعم JavaScript, TypeScript, CSS, HTML, JSON, Markdown وأكثر. يمكنك تخصيص الإعدادات مثل حجم المسافة البادئة وعلامات الاقتباس.',
    version: '10.2.0',
    author: 'prettier',
    icon: '✨',
    category: 'tool',
    installed: false,
    enabled: false,
    rating: 4.9,
    downloads: 201000,
    tags: ['formatter', 'javascript', 'typescript', 'css'],
    features: [
      'تنسيق تلقائي عند الطلب',
      'دعم TypeScript و JavaScript',
      'تنسيق CSS و HTML',
      'إعدادات قابلة للتخصيص',
      'أمر `prettier` في الطرفية',
    ],
    formatterData: {
      indent: 2,
      semicolons: true,
      singleQuotes: true,
      trailingNewline: true,
      bracketSpacing: true,
    },
    commandData: [
      {
        name: 'prettier',
        description: 'تنسيق الكود',
        output: [
          '\x1b[36m✨ Prettier v3.2.0\x1b[0m',
          '\x1b[32m✅ تم تنسيق الملف بنجاح\x1b[0m',
          '\x1b[90m── إعدادات التنسيق ──\x1b[0m',
          '  المسافة البادئة: 2',
          '  علامات اقتباس مفردة: ✓',
          '  فاصلة منقوطة: ✓',
        ],
        outputDelay: 500,
      },
      {
        name: 'prettier:check',
        description: 'فحص التنسيق',
        output: [
          '\x1b[36m✨ Checking formatting...\x1b[0m',
          '\x1b[32m✅ جميع الملفات منسقة بشكل صحيح\x1b[0m',
        ],
        outputDelay: 300,
      },
    ],
  },
  {
    id: 'tool-gitlens',
    name: 'GitLens Supercharged',
    description: 'أدوات Git متقدمة مع أوامر إضافية',
    longDescription: 'يعزز تجربة Git مع أوامر إضافية متقدمة. يوفر معلومات تفصيلية عن التغييرات، سجل الملفات، إحصائيات المشروع، وأدوات مقارنة متقدمة.',
    version: '14.3.0',
    author: 'gitkraken',
    icon: '🔍',
    category: 'tool',
    installed: false,
    enabled: false,
    rating: 4.7,
    downloads: 156000,
    tags: ['git', 'version-control', 'blame', 'history'],
    features: [
      'أمر git:blame لعرض معلومات الكاتب',
      'أمر git:diff لمقارنة التغييرات',
      'أمر git:stats لإحصائيات المشروع',
      'أمر git:log لعرض السجل التفصيلي',
      'لوحة Git محسنة مع معلومات إضافية',
    ],
    commandData: [
      {
        name: 'git:blame',
        description: 'عرض معلومات الكاتب لكل سطر',
        output: [
          '\x1b[36m📋 Git Blame - الملف الحالي\x1b[0m',
          '\x1b[90m────────────────────────────────────\x1b[0m',
          '\x1b[33mabc1234\x1b[0m developer (3 hours ago)',
          '  L1-15: إضافة المكون الرئيسي',
          '\x1b[33mdef5678\x1b[0m developer (1 day ago)',
          '  L16-30: تحديث التنسيق',
          '\x1b[33mghi9012\x1b[0m developer (3 days ago)',
          '  L31-50: إضافة معالجة الأخطاء',
        ],
        outputDelay: 400,
      },
      {
        name: 'git:diff',
        description: 'عرض التغييرات',
        output: [
          '\x1b[36m📋 Git Diff\x1b[0m',
          '\x1b[90m────────────────────────────────────\x1b[0m',
          '\x1b[32m+ import { useState } from \'react\'\x1b[0m',
          '\x1b[32m+ import { useEffect } from \'react\'\x1b[0m',
          '\x1b[31m- const App = () => {\x1b[0m',
          '\x1b[32m+ const App: React.FC = () => {\x1b[0m',
        ],
        outputDelay: 300,
      },
      {
        name: 'git:stats',
        description: 'إحصائيات Git',
        output: [
          '\x1b[36m📊 Git Statistics\x1b[0m',
          '\x1b[90m────────────────────────────────────\x1b[0m',
          '  📝 إجمالي Commits: 47',
          '  👤 المؤلفون: 2',
          '  📅 أول commit: 2024-01-15',
          '  📅 آخر commit: منذ ساعة',
          '  📁 ملفات متتبعة: 24',
          '  ➕ إضافات: 3,421 سطر',
          '  ➖ حذوفات: 892 سطر',
        ],
        outputDelay: 400,
      },
      {
        name: 'git:log',
        description: 'سجل Git التفصيلي',
        output: [
          '\x1b[36m📋 Git Log (آخر 5 commits)\x1b[0m',
          '\x1b[90m────────────────────────────────────\x1b[0m',
          '\x1b[33mabc1234\x1b[0m \x1b[32mfeat: add user auth\x1b[0m (1 hour ago)',
          '\x1b[33mdef5678\x1b[0m \x1b[36mfix: resolve layout bug\x1b[0m (3 hours ago)',
          '\x1b[33mghi9012\x1b[0m \x1b[33mchore: update deps\x1b[0m (1 day ago)',
          '\x1b[33mjkl3456\x1b[0m \x1b[32mfeat: add dashboard\x1b[0m (2 days ago)',
          '\x1b[33mmno7890\x1b[0m \x1b[36mfix: header responsive\x1b[0m (3 days ago)',
        ],
        outputDelay: 400,
      },
    ],
  },
  {
    id: 'tool-live-server',
    name: 'Live Server',
    description: 'خادم معاينة مباشرة لملفات HTML',
    longDescription: 'يضيف خادم تطوير محلي مع إعادة تحميل تلقائية. مثالي لمعاينة ملفات HTML أثناء التطوير. يدعم إعادة التحميل عند الحفظ مع تأخير قابل للتخصيص.',
    version: '5.7.9',
    author: 'ritwickdey',
    icon: '🌐',
    category: 'tool',
    installed: false,
    enabled: false,
    rating: 4.8,
    downloads: 178000,
    tags: ['server', 'preview', 'html', 'live-reload'],
    features: [
      'أمر live-server لبدء الخادم',
      'إعادة تحميل تلقائية عند الحفظ',
      'منفذ قابل للتخصيص',
      'دعم HTTPS محلي',
      'خادم ثابت لملفات HTML/CSS/JS',
    ],
    commandData: [
      {
        name: 'live-server',
        description: 'بدء خادم المعاينة',
        output: [
          '\x1b[32m🌐 Live Server v5.7.9\x1b[0m',
          '\x1b[90m────────────────────────────────────\x1b[0m',
          '  🏠 خادم التشغيل في:',
          '',
          '  \x1b[36m➜  Local:   http://localhost:3000\x1b[0m',
          '  \x1b[36m➜  Network: http://192.168.1.5:3000\x1b[0m',
          '',
          '  📁 الجذر: /workspace/my-app/public',
          '  🔄 إعادة تحميل تلقائية: مفعّلة',
          '',
          '\x1b[32m✅ الخادم جاهز! اضغط Ctrl+C للإيقاف\x1b[0m',
        ],
        outputDelay: 600,
      },
    ],
  },

  // ──────────── AI PROVIDERS ────────────
  {
    id: 'ai-claude',
    name: 'Claude AI Provider',
    description: 'إضافة مزود Anthropic Claude للذكاء الاصطناعي',
    longDescription: 'يضيف Claude من Anthropic كمزود ذكاء اصطناعي متاح في المحرر. Claude يتميز بقدرته على فهم التعليمات المعقدة وكتابة كود عالي الجودة مع شرح تفصيلي. يتطلب مفتاح API من Anthropic.',
    version: '1.0.0',
    author: 'anthropic',
    icon: '🤖',
    category: 'ai',
    installed: false,
    enabled: false,
    rating: 4.9,
    downloads: 89000,
    tags: ['ai', 'claude', 'anthropic', 'chat'],
    features: [
      'مزود Claude 3.5 Sonnet',
      'مزود Claude 3 Opus',
      'مزود Claude 3 Haiku',
      'توافق كامل مع OpenAI API format',
      'ردود عالية الجودة للكود',
    ],
    aiProviderData: {
      id: 'claude',
      name: 'Anthropic Claude',
      endpoint: 'https://api.anthropic.com/v1/messages',
      models: ['claude-3.5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
      icon: '🤖',
    },
  },
  {
    id: 'ai-deepseek',
    name: 'DeepSeek Provider',
    description: 'إضافة مزود DeepSeek للذكاء الاصطناعي',
    longDescription: 'يضيف DeepSeek كمزود ذكاء اصطناعي. DeepSeek يتميز بأداء ممتاز في كتابة الكود مع تكلفة منخفضة. يدعم نماذج V3 و Coder المتخصصة في البرمجة.',
    version: '1.0.0',
    author: 'deepseek',
    icon: '🔮',
    category: 'ai',
    installed: false,
    enabled: false,
    rating: 4.7,
    downloads: 45600,
    tags: ['ai', 'deepseek', 'code', 'affordable'],
    features: [
      'مزود DeepSeek V3',
      'مزود DeepSeek Coder متخصص',
      'أداء عالي بتكلفة منخفضة',
      'ممتاز في كتابة الكود',
      'سرعة استجابة عالية',
    ],
    aiProviderData: {
      id: 'deepseek',
      name: 'DeepSeek',
      endpoint: 'https://api.deepseek.com/v1/chat/completions',
      models: ['deepseek-chat', 'deepseek-coder'],
      icon: '🔮',
    },
  },
  {
    id: 'ai-groq',
    name: 'Groq Provider',
    description: 'إضافة مزود Groq للسرعة الفائقة',
    longDescription: 'يضيف Groq كمزود ذكاء اصطناعي. Groq يتميز بسرعة استجابة فائقة باستخدام معالجات LPU مخصصة. مثالي للمحادثات السريعة والمهام المتكررة.',
    version: '1.0.0',
    author: 'groq',
    icon: '⚡',
    category: 'ai',
    installed: false,
    enabled: false,
    rating: 4.6,
    downloads: 32100,
    tags: ['ai', 'groq', 'fast', 'speed'],
    features: [
      'سرعة استجابة فائقة',
      'مزود Llama 3.1 70B',
      'مزود Mixtral 8x7B',
      'مزود Gemma 2',
      'أسرع استدلال في العالم',
    ],
    aiProviderData: {
      id: 'groq',
      name: 'Groq (Fast)',
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      models: ['llama-3.1-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
      icon: '⚡',
    },
  },

  // ──────────── PRODUCTIVITY ────────────
  {
    id: 'prod-todo-highlight',
    name: 'TODO Highlight',
    description: 'تمييز كلمات TODO و FIXME و HACK في الكود',
    longDescription: 'يضيف تمييزاً ملوناً لكلمات TODO و FIXME و HACK و NOTE و BUG في الكود. يساعدك على تتبع المهام المعلقة والمشاكل المعروفة. يضيف أيضاً أمراً لعرض جميع التعليقات.',
    version: '2.0.5',
    author: 'wayou',
    icon: '📋',
    category: 'productivity',
    installed: false,
    enabled: false,
    rating: 4.5,
    downloads: 67000,
    tags: ['todo', 'highlight', 'annotations', 'productivity'],
    features: [
      'تمييز TODO بالأصفر',
      'تمييز FIXME بالأحمر',
      'تمييز HACK بالبرتقالي',
      'تمييز NOTE بالأزرق',
      'أمر todo:list لعرض الكل',
    ],
    commandData: [
      {
        name: 'todo:list',
        description: 'عرض جميع علامات TODO',
        output: [
          '\x1b[36m📋 TODO List\x1b[0m',
          '\x1b[90m────────────────────────────────────\x1b[0m',
          '\x1b[33m⚠ TODO\x1b[0m App.tsx:15 - إضافة التحقق من صحة البيانات',
          '\x1b[33m⚠ TODO\x1b[0m App.tsx:28 - تحسين أداء القائمة',
          '\x1b[31m🔴 FIXME\x1b[0m Button.tsx:12 - إصلاح حالة التحميل',
          '\x1b[34m📘 NOTE\x1b[0m Header.tsx:5 - التصميم مؤقت',
          '',
          '\x1b[90mالمجموع: 2 TODO, 1 FIXME, 1 NOTE\x1b[0m',
        ],
        outputDelay: 400,
      },
    ],
  },
  {
    id: 'prod-bracket-colorizer',
    name: 'Bracket Pair Colorizer',
    description: 'تلوين الأقواس المتداخلة بألوان مختلفة',
    longDescription: 'يضيف تلويناً تلقائياً للأقواس المتداخلة بألوان مختلفة مما يسهل قراءة الكود المعقد. يدعم (), [], {} <> مع إمكانية تخصيص الألوان.',
    version: '3.0.1',
    author: 'coenraads',
    icon: '🌈',
    category: 'productivity',
    installed: false,
    enabled: false,
    rating: 4.6,
    downloads: 134000,
    tags: ['brackets', 'colorization', 'readability', 'matching'],
    features: [
      'تلوين تلقائي للأقواس المتداخلة',
      'خطوط توصيل بين الأزواج',
      'ألوان قابلة للتخصيص',
      'دعم (), [], {}, <>',
      'تمييز القوس الحالي',
    ],
  },
  {
    id: 'prod-auto-close-tag',
    name: 'Auto Close Tag',
    description: 'إغلاق تلقائي لعلامات HTML/JSX',
    longDescription: 'يغلق تلقائياً علامات HTML و JSX عند الكتابة. عند كتابة <div> يتم إضافة </div> تلقائياً. يدعم XML، HTML، React JSX، Vue Templates وأكثر.',
    version: '0.5.14',
    author: 'formulahendry',
    icon: '🏷️',
    category: 'productivity',
    installed: false,
    enabled: false,
    rating: 4.4,
    downloads: 98000,
    tags: ['html', 'jsx', 'auto-complete', 'tags'],
    features: [
      'إغلاق تلقائي عند كتابة >',
      'دعم HTML و JSX',
      'دعم Vue و Angular templates',
      'إغلاق ذكي للعلامات ذاتية الإغلاق',
      'إدراج المسافة البادئة المناسبة',
    ],
  },
  {
    id: 'prod-path-intellisense',
    name: 'Path Intellisense',
    description: 'إكمال تلقائي لمسارات الملفات عند الاستيراد',
    longDescription: 'يوفر إكمالاً تلقائياً لمسارات الملفات عند كتابة عبارات الاستيراد. يعرض قائمة بالملفات والمجلدات المتاحة مع أيقونات توضيحية.',
    version: '2.8.5',
    author: 'christian-kohler',
    icon: '📁',
    category: 'productivity',
    installed: false,
    enabled: false,
    rating: 4.5,
    downloads: 87000,
    tags: ['paths', 'autocomplete', 'imports', 'files'],
    features: [
      'إكمال مسارات الاستيراد',
      'عرض ملفات المشروع',
      'أيقونات حسب نوع الملف',
      'دعم Absolute imports',
      'دعم TypeScript path aliases',
    ],
  },

  // ──────────── FLUTTER / DART ────────────
  {
    id: 'lang-flutter-dart',
    name: 'Flutter & Dart',
    description: 'دعم شامل لـ Flutter و Dart: أوامر، قصاصات، تحليل، تنسيق',
    longDescription: 'إضافة شاملة لدعم Flutter و Dart في المحرر. توفر أوامر Flutter الكاملة (create, run, build, pub get, test, clean, doctor)، أوامر Dart (analyze, format, run, test)، بالإضافة إلى أكثر من 25 قصاصة كود جاهزة تشمل StatefulWidget، StatelessWidget، Widget build، Riverpod providers، BLoC patterns، Navigation، Forms، Animations، والمزيد. تدعم التحليل التلقائي للأخطاء والتنسيق التلقائي لكود Dart.',
    version: '1.8.0',
    author: 'dart-code',
    icon: '💙',
    category: 'tool',
    installed: false,
    enabled: false,
    rating: 4.9,
    downloads: 245000,
    tags: ['flutter', 'dart', 'mobile', 'widgets', 'snippets', 'analyzer'],
    features: [
      'أوامر Flutter: create, run, build, pub get, test, clean',
      'أوامر Dart: analyze, format, run, test',
      'أكثر من 25 قصاصة كود Dart/Flutter جاهزة',
      'StatefulWidget و StatelessWidget templates',
      'Riverpod Provider قوالب',
      'أوامر Hot Reload و Hot Restart',
      'flutter doctor للتحقق من البيئة',
      'تحليل تلقائي لأخطاء Dart',
      'تنسيق تلقائي لكود Dart',
    ],
    commandData: [
      {
        name: 'flutter:create',
        description: 'إنشاء مشروع Flutter جديد',
        output: [
          '\x1b[36m💙 Flutter Create\x1b[0m',
          '\x1b[90m────────────────────────────────────\x1b[0m',
          '\x1b[32m✓\x1b[0m Creating project...',
          '\x1b[32m✓\x1b[0m Generating Flutter project structure',
          '\x1b[32m✓\x1b[0m Writing lib/main.dart',
          '\x1b[32m✓\x1b[0m Writing pubspec.yaml',
          '\x1b[32m✓\x1b[0m Writing analysis_options.yaml',
          '\x1b[32m✓\x1b[0m Writing test/widget_test.dart',
          '',
          '\x1b[32m✅ Project created successfully!\x1b[0m',
          '\x1b[36m💡 Run `flutter run` to start your app\x1b[0m',
        ],
        outputDelay: 800,
      },
      {
        name: 'flutter:run',
        description: 'تشغيل تطبيق Flutter',
        output: [
          '\x1b[36m💙 Flutter Run\x1b[0m',
          '\x1b[90m────────────────────────────────────\x1b[0m',
          '\x1b[33m⣾\x1b[0m Launching lib/main.dart on Chrome in debug mode...',
          '\x1b[32m✓\x1b[0m Building application...',
          '\x1b[32m✓\x1b[0m Compiling dart to JavaScript',
          '\x1b[32m✓\x1b[0m Generating source maps',
          '',
          '\x1b[32m✓\x1b[0m App running on \x1b[36mhttp://localhost:5000\x1b[0m',
          '',
          '\x1b[36m🔥 Hot Reload:\x1b[0m press \x1b[33mr\x1b[0m in terminal',
          '\x1b[36m🔄 Hot Restart:\x1b[0m press \x1b[33mR\x1b[0m in terminal',
          '\x1b[36m🛑 Quit:\x1b[0m press \x1b[33mq\x1b[0m in terminal',
          '',
          '\x1b[32m✅ Application running\x1b[0m',
        ],
        outputDelay: 1200,
      },
      {
        name: 'flutter:build',
        description: 'بناء تطبيق Flutter للإنتاج',
        output: [
          '\x1b[36m💙 Flutter Build\x1b[0m',
          '\x1b[90m────────────────────────────────────\x1b[0m',
          '\x1b[33m⣾\x1b[0m Building for release...',
          '\x1b[32m✓\x1b[0m Running Gradle task \'assembleRelease\'...',
          '\x1b[32m✓\x1b[0m Compiling Dart to AOT snapshot',
          '\x1b[32m✓\x1b[0m Bundling assets',
          '\x1b[32m✓\x1b[0m Signing APK',
          '',
          '\x1b[32m✅ Build successful!\x1b[0m',
          '\x1b[90m   build/app/outputs/flutter-apk/app-release.apk (15.2MB)\x1b[0m',
        ],
        outputDelay: 1500,
      },
      {
        name: 'flutter:pub-get',
        description: 'تثبيت الحزم (flutter pub get)',
        output: [
          '\x1b[36m💙 Flutter Pub Get\x1b[0m',
          '\x1b[90m────────────────────────────────────\x1b[0m',
          '\x1b[32m✓\x1b[0m Resolving dependencies...',
          '\x1b[32m✓\x1b[0m + flutter_riverpod 2.4.9',
          '\x1b[32m✓\x1b[0m + dio 5.4.0',
          '\x1b[32m✓\x1b[0m + go_router 13.0.0',
          '\x1b[32m✓\x1b[0m + freezed_annotation 2.4.1',
          '\x1b[32m✓\x1b[0m + json_annotation 4.8.1',
          '\x1b[32m✓\x1b[0m Changed 5 dependencies!',
          '\x1b[32m✅ Got dependencies!\x1b[0m',
        ],
        outputDelay: 600,
      },
      {
        name: 'flutter:test',
        description: 'تشغيل اختبارات Flutter',
        output: [
          '\x1b[36m💙 Flutter Test\x1b[0m',
          '\x1b[90m────────────────────────────────────\x1b[0m',
          '\x1b[33m⣾\x1b[0m Running tests...',
          '',
          '\x1b[32m✓\x1b[0m widget_test.dart: Counter increments smoke test (\x1b[32m12ms\x1b[0m)',
          '\x1b[32m✓\x1b[0m widget_test.dart: App renders correctly (\x1b[32m8ms\x1b[0m)',
          '\x1b[32m✓\x1b[0m unit_test.dart: Calculator adds correctly (\x1b[32m3ms\x1b[0m)',
          '\x1b[32m✓\x1b[0m unit_test.dart: Calculator subtracts correctly (\x1b[32m2ms\x1b[0m)',
          '',
          '\x1b[32m✅ All 4 tests passed!\x1b[0m',
          '\x1b[90m   Total time: 1.2s\x1b[0m',
        ],
        outputDelay: 1000,
      },
      {
        name: 'flutter:clean',
        description: 'تنظيف ملفات البناء (flutter clean)',
        output: [
          '\x1b[36m💙 Flutter Clean\x1b[0m',
          '\x1b[90m────────────────────────────────────\x1b[0m',
          '\x1b[32m✓\x1b[0m Deleting build/',
          '\x1b[32m✓\x1b[0m Deleting .dart_tool/',
          '\x1b[32m✓\x1b[0m Deleting .flutter-plugins',
          '\x1b[32m✓\x1b[0m Deleting .flutter-plugins-dependencies',
          '\x1b[32m✓\x1b[0m Deleting .packages',
          '',
          '\x1b[32m✅ Clean complete!\x1b[0m',
          '\x1b[36m💡 Run `flutter pub get` to get dependencies\x1b[0m',
        ],
        outputDelay: 400,
      },
      {
        name: 'flutter:doctor',
        description: 'فحص بيئة Flutter',
        output: [
          '\x1b[36m💙 Flutter Doctor\x1b[0m',
          '\x1b[90m────────────────────────────────────\x1b[0m',
          '[✓] Flutter (Channel stable, 3.22.0, on macOS 14.4)',
          '[✓] Android toolchain (Android SDK version 34.0.0)',
          '[✓] Chrome - develop for the web',
          '[✓] Xcode - develop for iOS and macOS (Xcode 15.3)',
          '[✓] Android Studio (version 2023.2)',
          '[✓] VS Code (version 1.88)',
          '[✓] Connected device (4 available)',
          '[✓] Network resources',
          '',
          '\x1b[32m✅ No issues found!\x1b[0m',
        ],
        outputDelay: 600,
      },
      {
        name: 'flutter:hot-reload',
        description: 'Hot Reload - إعادة تحميل سريعة',
        output: [
          '\x1b[36m🔥 Hot Reload\x1b[0m',
          '\x1b[90m────────────────────────────────────\x1b[0m',
          '\x1b[32m✓\x1b[0m Performing hot reload...',
          '\x1b[32m✓\x1b[0m Reloaded 1 of 12 libraries in 142ms',
          '\x1b[32m✅ Hot reload complete!\x1b[0m',
        ],
        outputDelay: 200,
      },
      {
        name: 'flutter:hot-restart',
        description: 'Hot Restart - إعادة تشغيل كاملة',
        output: [
          '\x1b[36m🔄 Hot Restart\x1b[0m',
          '\x1b[90m────────────────────────────────────\x1b[0m',
          '\x1b[32m✓\x1b[0m Performing hot restart...',
          '\x1b[32m✓\x1b[0m Restarted application in 1,234ms',
          '\x1b[32m✅ Hot restart complete!\x1b[0m',
        ],
        outputDelay: 400,
      },
      {
        name: 'dart:analyze',
        description: 'تحليل كود Dart للبحث عن الأخطاء',
        output: [
          '\x1b[36m🔷 Dart Analyze\x1b[0m',
          '\x1b[90m────────────────────────────────────\x1b[0m',
          '\x1b[33m⣾\x1b[0m Analyzing project...',
          '',
          '\x1b[32m✅ No issues found!\x1b[0m',
          '\x1b[90m   Analyzed 12 files, 0 issues\x1b[0m',
        ],
        outputDelay: 600,
      },
      {
        name: 'dart:format',
        description: 'تنسيق كود Dart',
        output: [
          '\x1b[36m🔷 Dart Format\x1b[0m',
          '\x1b[90m────────────────────────────────────\x1b[0m',
          '\x1b[32m✓\x1b[0m Formatting lib/main.dart',
          '\x1b[32m✓\x1b[0m Formatting lib/screens/home.dart',
          '\x1b[32m✓\x1b[0m Formatting lib/models/user.dart',
          '\x1b[32m✓\x1b[0m Formatting lib/services/api.dart',
          '',
          '\x1b[32m✅ Formatted 4 files\x1b[0m',
        ],
        outputDelay: 400,
      },
      {
        name: 'dart:run',
        description: 'تشغيل ملف Dart',
        output: [
          '\x1b[36m🔷 Dart Run\x1b[0m',
          '\x1b[90m────────────────────────────────────\x1b[0m',
          '\x1b[33m⣾\x1b[0m Compiling main.dart...',
          '\x1b[32m✓\x1b[0m Compiled successfully',
          '',
          '\x1b[32mHello, Flutter!\x1b[0m',
          '\x1b[32mApp started on port 8080\x1b[0m',
          '',
          '\x1b[32m✅ Exited with code 0\x1b[0m',
        ],
        outputDelay: 500,
      },
      {
        name: 'dart:test',
        description: 'تشغيل اختبارات Dart',
        output: [
          '\x1b[36m🔷 Dart Test\x1b[0m',
          '\x1b[90m────────────────────────────────────\x1b[0m',
          '\x1b[33m⣾\x1b[0m Running tests...',
          '',
          '\x1b[32m✓\x1b[0m test/utils_test.dart: parseJSON returns Map (\x1b[32m5ms\x1b[0m)',
          '\x1b[32m✓\x1b[0m test/utils_test.dart: formatDate returns String (\x1b[32m3ms\x1b[0m)',
          '\x1b[32m✓\x1b[0m test/models_test.dart: User fromMap (\x1b[32m4ms\x1b[0m)',
          '',
          '\x1b[32m✅ All 3 tests passed!\x1b[0m',
        ],
        outputDelay: 800,
      },
    ],
    snippetData: [
      // ── Widget Snippets ──
      { prefix: 'stless', description: 'StatelessWidget', body: ['class ${1:WidgetName} extends StatelessWidget {', '  const ${1:WidgetName}({super.key});', '', '  @override', '  Widget build(BuildContext context) {', '    return Container(', '      $0', '    );', '  }', '}'], language: 'dart' },
      { prefix: 'stful', description: 'StatefulWidget', body: ['class ${1:WidgetName} extends StatefulWidget {', '  const ${1:WidgetName}({super.key});', '', '  @override', '  State<${1:WidgetName}> createState() => _${1:WidgetName}State();', '}', '', 'class _${1:WidgetName}State extends State<${1:WidgetName}> {', '  @override', '  Widget build(BuildContext context) {', '    return Container(', '      $0', '    );', '  }', '}'], language: 'dart' },
      { prefix: 'stanim', description: 'StatefulWidget with SingleTickerProviderStateMixin', body: ['class ${1:WidgetName} extends StatefulWidget {', '  const ${1:WidgetName}({super.key});', '', '  @override', '  State<${1:WidgetName}> createState() => _${1:WidgetName}State();', '}', '', 'class _${1:WidgetName}State extends State<${1:WidgetName}>', '    with SingleTickerProviderStateMixin {', '  late AnimationController _controller;', '', '  @override', '  void initState() {', '    super.initState();', '    _controller = AnimationController(', '      vsync: this,', '      duration: const Duration(milliseconds: $2),', '    );', '  }', '', '  @override', '  void dispose() {', '    _controller.dispose();', '    super.dispose();', '  }', '', '  @override', '  Widget build(BuildContext context) {', '    return Container(', '      $0', '    );', '  }', '}'], language: 'dart' },
      // ── Build Method ──
      { prefix: 'build', description: 'Widget build method', body: ['@override', 'Widget build(BuildContext context) {', '  return $0;', '}'], language: 'dart' },
      // ── Imports ──
      { prefix: 'import-material', description: 'Import Material package', body: ["import 'package:flutter/material.dart';"], language: 'dart' },
      { prefix: 'import-cupertino', description: 'Import Cupertino package', body: ["import 'package:flutter/cupertino.dart';"], language: 'dart' },
      { prefix: 'import-services', description: 'Import Services package', body: ["import 'package:flutter/services.dart';"], language: 'dart' },
      { prefix: 'import-foundation', description: 'Import Foundation package', body: ["import 'package:flutter/foundation.dart';"], language: 'dart' },
      // ── Main ──
      { prefix: 'main', description: 'Flutter main entry point', body: ["import 'package:flutter/material.dart';", '', 'void main() {', '  runApp(const $1());', '}'], language: 'dart' },
      // ── Scaffold ──
      { prefix: 'scaffold', description: 'Scaffold widget', body: ['Scaffold(', '  appBar: AppBar(', '    title: const Text(\'$1\'),', '  ),', '  body: $2,', '  floatingActionButton: FloatingActionButton(', '    onPressed: () {},', '    child: const Icon(Icons.add),', '  ),', ')'], language: 'dart' },
      // ── AppBar ──
      { prefix: 'appbar', description: 'AppBar widget', body: ['AppBar(', '  title: const Text(\'$1\'),', '  actions: [', '    IconButton(', '      icon: const Icon(Icons.$2),', '      onPressed: () {},', '    ),', '  ],', ')'], language: 'dart' },
      // ── Column / Row ──
      { prefix: 'col', description: 'Column widget', body: ['Column(', '  children: [', '    $0', '  ],', ')'], language: 'dart' },
      { prefix: 'row', description: 'Row widget', body: ['Row(', '  children: [', '    $0', '  ],', ')'], language: 'dart' },
      // ── ListView ──
      { prefix: 'listview', description: 'ListView.builder', body: ['ListView.builder(', '  itemCount: ${1:items}.length,', '  itemBuilder: (context, index) {', '    final item = ${1:items}[index];', '    return ListTile(', '      title: Text(item.$2),', '      onTap: () {', '        $0', '      },', '    );', '  },', ')'], language: 'dart' },
      // ── Container / Card ──
      { prefix: 'container', description: 'Container widget', body: ['Container(', '  padding: const EdgeInsets.all($1),', '  child: $0,', ')'], language: 'dart' },
      { prefix: 'card', description: 'Card widget', body: ['Card(', '  child: Padding(', '    padding: const EdgeInsets.all(8.0),', '    child: $0,', '  ),', ')'], language: 'dart' },
      // ── Padding / Expanded ──
      { prefix: 'pad', description: 'Padding widget', body: ['Padding(', '  padding: const EdgeInsets.all($1),', '  child: $0,', ')'], language: 'dart' },
      { prefix: 'expanded', description: 'Expanded widget', body: ['Expanded(', '  child: $0,', ')'], language: 'dart' },
      // ── Text / TextField ──
      { prefix: 'textfield', description: 'TextField widget', body: ['TextField(', '  decoration: InputDecoration(', '    labelText: \'$1\',', '    hintText: \'$2\',', '    border: const OutlineInputBorder(),', '  ),', '  onChanged: (value) {', '    $0', '  },', ')'], language: 'dart' },
      // ── Navigator ──
      { prefix: 'nav-push', description: 'Navigator.push', body: ['Navigator.push(', '  context,', '  MaterialPageRoute(', '    builder: (context) => $1(),', '  ),', ');'], language: 'dart' },
      { prefix: 'nav-pop', description: 'Navigator.pop', body: ['Navigator.pop(context$1);'], language: 'dart' },
      { prefix: 'nav-named', description: 'Navigator.pushNamed', body: ['Navigator.pushNamed(context, \'$1\'$2);'], language: 'dart' },
      // ── Riverpod ──
      { prefix: 'riverpod-provider', description: 'Riverpod Provider', body: ['final ${1:providerName}Provider = Provider<${2:Type}>((ref) {', '  return $0;', '});'], language: 'dart' },
      { prefix: 'riverpod-notifier', description: 'Riverpod NotifierProvider', body: ['class ${1:Name}Notifier extends Notifier<${2:Type}> {', '  @override', '  ${2:Type} build() {', '    return $3;', '  }', '', '  void ${4:method}() {', '    state = $0;', '  }', '}', '', 'final ${1:lowerName}Provider = NotifierProvider<${1:Name}Notifier, ${2:Type}>(', '  ${1:Name}Notifier.new,', ');'], language: 'dart' },
      { prefix: 'riverpod-future', description: 'Riverpod FutureProvider', body: ['final ${1:providerName}Provider = FutureProvider<${2:Type}>((ref) async {', '  final response = await $0;', '  return response;', '});'], language: 'dart' },
      // ── BLoC Pattern ──
      { prefix: 'bloc-event', description: 'BLoC Event class', body: ['abstract class ${1:Feature}Event {}', '', 'class ${2:LoadItems} extends ${1:Feature}Event {', '  $0', '}'], language: 'dart' },
      { prefix: 'bloc-state', description: 'BLoC State class', body: ['abstract class ${1:Feature}State {}', '', 'class ${1:Feature}Initial extends ${1:Feature}State {}', '', 'class ${1:Feature}Loading extends ${1:Feature}State {}', '', 'class ${1:Feature}Loaded extends ${1:Feature}State {', '  final $2 data;', '  ${1:Feature}Loaded(this.data);', '}', '', 'class ${1:Feature}Error extends ${1:Feature}State {', '  final String message;', '  ${1:Feature}Error(this.message);', '}'], language: 'dart' },
      // ── initState / dispose ──
      { prefix: 'initstate', description: 'initState method', body: ['@override', 'void initState() {', '  super.initState();', '  $0', '}'], language: 'dart' },
      { prefix: 'dispose', description: 'dispose method', body: ['@override', 'void dispose() {', '  $0', '  super.dispose();', '}'], language: 'dart' },
      // ── showDialog ──
      { prefix: 'dialog', description: 'showDialog', body: ['showDialog(', '  context: context,', '  builder: (context) => AlertDialog(', '    title: const Text(\'$1\'),', '    content: const Text(\'$2\'),', '    actions: [', '      TextButton(', '        onPressed: () => Navigator.pop(context),', '        child: const Text(\'إلغاء\'),', '      ),', '      TextButton(', '        onPressed: () {', '          $0', '          Navigator.pop(context);', '        },', '        child: const Text(\'تأكيد\'),', '      ),', '    ],', '  ),', ');'], language: 'dart' },
      // ── SnackBar ──
      { prefix: 'snackbar', description: 'ScaffoldMessenger SnackBar', body: ['ScaffoldMessenger.of(context).showSnackBar(', '  SnackBar(', '    content: const Text(\'$1\'),', '    behavior: SnackBarBehavior.floating,', '    action: SnackBarAction(', '      label: \'$2\',', '      onPressed: () {', '        $0', '      },', '    ),', '  ),', ');'], language: 'dart' },
    ],
  },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export const getExtensionCategories = () => [
  { id: 'all', label: 'الكل', icon: '📦' },
  { id: 'installed', label: 'مثبتة', icon: '✅' },
  { id: 'theme', label: 'السمات', icon: '🎨' },
  { id: 'snippet', label: 'قصاصات', icon: '✂️' },
  { id: 'tool', label: 'أدوات', icon: '🔧' },
  { id: 'ai', label: 'ذكاء اصطناعي', icon: '🤖' },
  { id: 'productivity', label: 'إنتاجية', icon: '⚡' },
];

export const formatDownloads = (n: number): string => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
};
