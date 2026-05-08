import React, { useState, useMemo } from 'react';
import {
  Search, Download, Trash2, ToggleLeft, ToggleRight,
  ChevronLeft, Star, Check,
  Blocks, Sparkles,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  Extension,
  ExtensionThemeData,
  getExtensionCategories,
  formatDownloads,
} from '../extensions/registry';

const ThemePreviewCode: React.FC<{ themeData: ExtensionThemeData }> = ({ themeData }) => {
  const rules = themeData.monacoTheme.rules;
  const getColor = (token: string) => rules.find(r => r.token === token)?.foreground || '#cccccc';
  const base = rules.find(r => r.token === 'delimiter')?.foreground || '#cccccc';
  
  return (
    <pre className="text-[10px] font-mono leading-relaxed" style={{ color: base }}>
      <div>{'<'}<span style={{ color: getColor('keyword') }}>const</span> App = () =&gt; &#123;</div>
      <div>  <span style={{ color: getColor('keyword') }}>const</span> [<span style={{ color: getColor('variable') }}>count</span>, <span style={{ color: getColor('function') }}>setCount</span>] = <span style={{ color: getColor('function') }}>useState</span>(<span style={{ color: getColor('number') }}>0</span>);</div>
      <div>  <span style={{ color: getColor('keyword') }}>return</span> &lt;<span style={{ color: getColor('tag') }}>div</span>&gt;&#123;</div>
      <div>    &lt;<span style={{ color: getColor('tag') }}>h1</span>&gt;&#123;<span style={{ color: getColor('variable') }}>count</span>&#125;&lt;/<span style={{ color: getColor('tag') }}>h1</span>&gt;</div>
      <div>  &#125;&lt;/<span style={{ color: getColor('tag') }}>div</span>&gt;;</div>
      <div>&#125;;</div>
    </pre>
  );
};

const Stars: React.FC<{ rating: number }> = ({ rating }) => {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={10}
          className={i <= full ? 'text-yellow-400 fill-yellow-400' : i === full + 1 && half ? 'text-yellow-400 fill-yellow-400/50' : 'text-[#3c3c3c]'}
        />
      ))}
      <span className="text-[10px] text-[#6c6c6c] ml-1">{rating}</span>
    </div>
  );
};

const ExtensionCard: React.FC<{
  ext: Extension;
  onInstall: () => void;
  onUninstall: () => void;
  onToggle: () => void;
  onSelect: () => void;
}> = ({ ext, onInstall, onUninstall, onToggle, onSelect }) => {
  const categoryIcons: Record<string, string> = {
    theme: '🎨', snippet: '✂️', tool: '🔧', ai: '🤖', productivity: '⚡',
  };

  return (
    <div
      className={`group mx-2 mb-1.5 rounded-lg border transition-all cursor-pointer ${
        ext.installed
          ? 'border-[#007acc]/30 bg-[#007acc]/5'
          : 'border-[#3c3c3c] hover:border-[#505050] bg-[#1e1e1e]/50'
      }`}
      onClick={onSelect}
    >
      <div className="p-2.5">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-lg flex-shrink-0">
            {ext.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold text-white truncate">{ext.name}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#2d2d2d] text-[#6c6c6c] flex-shrink-0">
                {categoryIcons[ext.category] || '📦'} {ext.category}
              </span>
            </div>
            <div className="text-[10px] text-[#6c6c6c] mt-0.5">
              {ext.author} • v{ext.version}
            </div>
            <p className="text-[11px] text-[#858585] mt-1 line-clamp-2 leading-relaxed">
              {ext.description}
            </p>
            <div className="flex items-center gap-3 mt-1.5">
              <Stars rating={ext.rating} />
              <span className="text-[10px] text-[#4c4c4c]">↓ {formatDownloads(ext.downloads)}</span>
            </div>
          </div>
        </div>
        {/* Actions */}
        {ext.installed && (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[#3c3c3c]/50" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onToggle}
              className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors ${
                ext.enabled
                  ? 'text-[#4ec9b0] bg-[#4ec9b0]/10 hover:bg-[#4ec9b0]/20'
                  : 'text-[#6c6c6c] bg-[#2d2d2d] hover:bg-[#3c3c3c]'
              }`}
            >
              {ext.enabled ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
              {ext.enabled ? 'مفعّل' : 'معطّل'}
            </button>
            <button
              onClick={onUninstall}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded text-[#f44747]/70 bg-[#2d2d2d] hover:bg-[#f44747]/10 hover:text-[#f44747] transition-colors"
            >
              <Trash2 size={10} />
              إزالة
            </button>
            {ext.enabled && (
              <span className="flex items-center gap-1 text-[10px] text-[#4ec9b0] mr-auto">
                <Check size={10} />
                نشط
              </span>
            )}
          </div>
        )}
        {!ext.installed && (
          <div className="mt-2 pt-2 border-t border-[#3c3c3c]/50" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onInstall}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg bg-[#007acc] hover:bg-[#0098ff] text-white transition-colors font-medium"
            >
              <Download size={11} />
              تثبيت
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ExtensionDetail: React.FC<{
  ext: Extension;
  onBack: () => void;
  onInstall: () => void;
  onUninstall: () => void;
  onToggle: () => void;
}> = ({ ext, onBack, onInstall, onUninstall, onToggle }) => {
  const categoryLabels: Record<string, string> = {
    theme: 'سمة', snippet: 'قصاصات', tool: 'أداة', ai: 'ذكاء اصطناعي', productivity: 'إنتاجية',
  };

  return (
    <div className="flex flex-col h-full animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#3c3c3c]">
        <button onClick={onBack} className="p-1 text-[#858585] hover:text-white hover:bg-[#3c3c3c] rounded transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="text-[12px] text-[#6c6c6c]">تفاصيل الإضافة</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Extension Info */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-14 h-14 rounded-xl bg-[#2d2d2d] border border-[#3c3c3c] flex items-center justify-center text-2xl flex-shrink-0">
            {ext.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-bold text-white">{ext.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-[#007acc]">{ext.author}</span>
              <span className="text-[10px] text-[#4c4c4c]">v{ext.version}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#007acc]/10 text-[#007acc]">
                {categoryLabels[ext.category]}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <Stars rating={ext.rating} />
              <span className="text-[10px] text-[#4c4c4c]">↓ {formatDownloads(ext.downloads)}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mb-4">
          {ext.installed ? (
            <>
              <button
                onClick={onToggle}
                className={`flex items-center gap-1.5 text-[12px] px-3 py-2 rounded-lg transition-colors font-medium ${
                  ext.enabled
                    ? 'bg-[#4ec9b0]/10 text-[#4ec9b0] border border-[#4ec9b0]/30 hover:bg-[#4ec9b0]/20'
                    : 'bg-[#2d2d2d] text-[#858585] border border-[#3c3c3c] hover:text-white'
                }`}
              >
                {ext.enabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                {ext.enabled ? 'مفعّل' : 'تفعيل'}
              </button>
              <button
                onClick={onUninstall}
                className="flex items-center gap-1.5 text-[12px] px-3 py-2 rounded-lg text-[#f44747]/80 border border-[#f44747]/30 hover:bg-[#f44747]/10 hover:text-[#f44747] transition-colors"
              >
                <Trash2 size={13} />
                إزالة التثبيت
              </button>
            </>
          ) : (
            <button
              onClick={onInstall}
              className="flex items-center gap-1.5 text-[12px] px-4 py-2 rounded-lg bg-[#007acc] hover:bg-[#0098ff] text-white transition-colors font-medium"
            >
              <Download size={13} />
              تثبيت
            </button>
          )}
        </div>

        {/* Description */}
        <div className="mb-4">
          <h4 className="text-[11px] font-semibold text-[#bbbbbb] uppercase tracking-wider mb-2">الوصف</h4>
          <p className="text-[12px] text-[#858585] leading-relaxed">{ext.longDescription}</p>
        </div>

        {/* Features */}
        <div className="mb-4">
          <h4 className="text-[11px] font-semibold text-[#bbbbbb] uppercase tracking-wider mb-2">المميزات</h4>
          <div className="space-y-1.5">
            {ext.features.map((feature, i) => (
              <div key={i} className="flex items-start gap-2 text-[12px] text-[#858585]">
                <span className="text-[#4ec9b0] mt-0.5 flex-shrink-0">✓</span>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="mb-4">
          <h4 className="text-[11px] font-semibold text-[#bbbbbb] uppercase tracking-wider mb-2">العلامات</h4>
          <div className="flex flex-wrap gap-1.5">
            {ext.tags.map((tag, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[#2d2d2d] text-[#6c6c6c] border border-[#3c3c3c]">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Snippet Preview */}
        {ext.snippetData && ext.snippetData.length > 0 && (
          <div className="mb-4">
            <h4 className="text-[11px] font-semibold text-[#bbbbbb] uppercase tracking-wider mb-2">القصاصات المتاحة ({ext.snippetData.length})</h4>
            <div className="space-y-1">
              {ext.snippetData.slice(0, 8).map((snippet, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] p-1.5 rounded bg-[#1e1e1e] border border-[#2d2d2d]">
                  <code className="text-[#ce9178] font-mono">{snippet.prefix}</code>
                  <span className="text-[#6c6c6c] truncate flex-1">{snippet.description}</span>
                  {snippet.language && (
                    <span className="text-[9px] text-[#4c4c4c] bg-[#2d2d2d] px-1.5 py-0.5 rounded">{snippet.language}</span>
                  )}
                </div>
              ))}
              {ext.snippetData.length > 8 && (
                <div className="text-[10px] text-[#4c4c4c] text-center py-1">
                  +{ext.snippetData.length - 8} قصاصات أخرى
                </div>
              )}
            </div>
          </div>
        )}

        {/* Command Preview */}
        {ext.commandData && ext.commandData.length > 0 && (
          <div className="mb-4">
            <h4 className="text-[11px] font-semibold text-[#bbbbbb] uppercase tracking-wider mb-2">الأوامر المضافة ({ext.commandData.length})</h4>
            <div className="space-y-1">
              {ext.commandData.map((cmd, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] p-1.5 rounded bg-[#1e1e1e] border border-[#2d2d2d]">
                  <code className="text-[#4ec9b0] font-mono">{cmd.name}</code>
                  <span className="text-[#6c6c6c] truncate flex-1">{cmd.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Provider Preview */}
        {ext.aiProviderData && (
          <div className="mb-4">
            <h4 className="text-[11px] font-semibold text-[#bbbbbb] uppercase tracking-wider mb-2">مزود AI</h4>
            <div className="p-2.5 rounded bg-[#1e1e1e] border border-[#2d2d2d]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{ext.aiProviderData.icon}</span>
                <span className="text-[12px] text-white font-medium">{ext.aiProviderData.name}</span>
              </div>
              <div className="text-[10px] text-[#6c6c6c] mb-1">النماذج:</div>
              <div className="flex flex-wrap gap-1">
                {ext.aiProviderData.models.map((m, i) => (
                  <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-[#2d2d2d] text-[#858585]">{m}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Theme Preview */}
        {ext.themeData && (
          <div className="mb-4">
            <h4 className="text-[11px] font-semibold text-[#bbbbbb] uppercase tracking-wider mb-2">معاينة السمة</h4>
            <div className="rounded-lg overflow-hidden border border-[#3c3c3c]">
              <div className="p-2.5" style={{ backgroundColor: ext.themeData.editorBg }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ff5f57' }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ffbd2e' }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#28ca41' }} />
                </div>
                <ThemePreviewCode themeData={ext.themeData} />
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1.5" style={{ backgroundColor: ext.themeData.statusBarBg }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ext.themeData.accentColor }} />
                <span className="text-[9px]" style={{ color: ext.themeData.accentColor }}>{ext.name}</span>
                <span className="text-[8px] text-[#6c6c6c] ml-auto">TypeScript React</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ExtensionsPanel: React.FC = () => {
  const { extensions, installExtension, uninstallExtension, toggleExtension } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedExtension, setSelectedExtension] = useState<Extension | null>(null);

  const categories = useMemo(() => getExtensionCategories(), []);

  const filteredExtensions = useMemo(() => {
    let filtered = extensions;

    // Filter by category
    if (activeCategory === 'installed') {
      filtered = filtered.filter(e => e.installed);
    } else if (activeCategory !== 'all') {
      filtered = filtered.filter(e => e.category === activeCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.author.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    // Sort: installed first, then by downloads
    return [...filtered].sort((a, b) => {
      if (a.installed && !b.installed) return -1;
      if (!a.installed && b.installed) return 1;
      return b.downloads - a.downloads;
    });
  }, [extensions, activeCategory, searchQuery]);

  const installedCount = extensions.filter(e => e.installed).length;

  // Detail view
  if (selectedExtension) {
    const ext = extensions.find(e => e.id === selectedExtension.id) || selectedExtension;
    return (
      <ExtensionDetail
        ext={ext}
        onBack={() => setSelectedExtension(null)}
        onInstall={() => installExtension(ext.id)}
        onUninstall={() => uninstallExtension(ext.id)}
        onToggle={() => toggleExtension(ext.id)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#3c3c3c]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Blocks size={14} className="text-[#007acc]" />
            <span className="text-[11px] font-semibold text-[#bbbbbb] uppercase tracking-wider">الإضافات</span>
            {installedCount > 0 && (
              <span className="text-[9px] bg-[#007acc] text-white px-1.5 py-0.5 rounded-full">{installedCount}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Sparkles size={12} className="text-[#007acc]" />
            <span className="text-[9px] text-[#4c4c4c]">{extensions.length} متاحة</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#4c4c4c]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في الإضافات..."
            className="w-full bg-[#1e1e1e] text-white text-[11px] pl-2 pr-7 py-1.5 rounded-md outline-none border border-[#3c3c3c] focus:border-[#007acc] transition-colors"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[#3c3c3c] overflow-x-auto scrollbar-hide">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          const count = cat.id === 'all'
            ? extensions.length
            : cat.id === 'installed'
            ? installedCount
            : extensions.filter(e => e.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-[#007acc]/15 text-[#007acc] border border-[#007acc]/30'
                  : 'text-[#6c6c6c] hover:text-white hover:bg-[#2d2d2d] border border-transparent'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              <span className={`text-[8px] ${isActive ? 'text-[#007acc]' : 'text-[#4c4c4c]'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Extensions List */}
      <div className="flex-1 overflow-y-auto py-1.5">
        {filteredExtensions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#3c3c3c] p-4">
            <div className="text-3xl mb-2">
              {searchQuery ? '🔍' : activeCategory === 'installed' ? '📦' : '🧩'}
            </div>
            <p className="text-[12px] text-center">
              {searchQuery
                ? 'لا توجد نتائج'
                : activeCategory === 'installed'
                ? 'لم يتم تثبيت أي إضافات بعد'
                : 'لا توجد إضافات'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[11px] text-[#007acc] hover:underline mt-1"
              >
                مسح البحث
              </button>
            )}
          </div>
        ) : (
          filteredExtensions.map((ext) => (
            <ExtensionCard
              key={ext.id}
              ext={ext}
              onInstall={() => installExtension(ext.id)}
              onUninstall={() => uninstallExtension(ext.id)}
              onToggle={() => toggleExtension(ext.id)}
              onSelect={() => setSelectedExtension(ext)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-[#3c3c3c] flex items-center justify-between">
        <span className="text-[9px] text-[#4c4c4c]">تم عرض {filteredExtensions.length} من {extensions.length}</span>
        <span className="text-[9px] text-[#4c4c4c]">{installedCount} مثبتة</span>
      </div>
    </div>
  );
};

export default ExtensionsPanel;
