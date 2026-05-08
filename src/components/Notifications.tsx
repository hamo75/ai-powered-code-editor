// src/components/Notifications.tsx
// نسخة محسَّنة: إشعارات صغيرة، إغلاق تلقائي ويدوي، تكديس محدود

import React, { useEffect, useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colorMap = {
  success: 'border-green-500/30 bg-green-900/30 text-green-400',
  error: 'border-red-500/30 bg-red-900/30 text-red-400',
  info: 'border-blue-500/30 bg-blue-900/30 text-blue-400',
  warning: 'border-yellow-500/30 bg-yellow-900/30 text-yellow-400',
};

const Notifications: React.FC = () => {
  const { notifications, removeNotification } = useStore();
  const [closingIds, setClosingIds] = useState<Set<string>>(new Set());

  // إغلاق تلقائي لكل إشعار بعد المدة المحددة (أو 4 ثوانٍ افتراضياً)
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    notifications.forEach((n) => {
      // تجاهل الإشعارات التي بدأ إغلاقها يدوياً
      if (closingIds.has(n.id)) return;

      const duration = n.duration || 4000;
      const timer = setTimeout(() => {
        handleClose(n.id);
      }, duration);
      timers.push(timer);
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [notifications, closingIds]);

  // إغلاق يدوي مع تأثير حركي بسيط
  const handleClose = useCallback(
    (id: string) => {
      // وضع الإشعار في قائمة الإغلاق لتشغيل أنيميشن الخروج
      setClosingIds((prev) => new Set(prev).add(id));

      // إزالته فعلياً بعد انتهاء الأنيميشن القصير
      setTimeout(() => {
        removeNotification(id);
        setClosingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 200); // مدة الأنيميشن 200ms
    },
    [removeNotification]
  );

  // إظهار آخر 3 إشعارات فقط
  const visibleNotifications = notifications.slice(-3);

  if (visibleNotifications.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-[280px]"
      aria-live="polite"
      aria-label="Notifications"
    >
      {visibleNotifications.map((n) => {
        const Icon = iconMap[n.type];
        const isClosing = closingIds.has(n.id);

        return (
          <div
            key={n.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border backdrop-blur-sm shadow-lg transition-all duration-200 ${
              colorMap[n.type]
            } ${
              isClosing
                ? 'opacity-0 translate-x-4 scale-95'
                : 'opacity-100 translate-x-0 scale-100'
            }`}
            role="alert"
          >
            <Icon size={14} className="flex-shrink-0" />
            <span className="text-[12px] flex-1 leading-tight">{n.message}</span>
            <button
              onClick={() => handleClose(n.id)}
              className="flex-shrink-0 p-0.5 rounded hover:bg-white/10 transition-colors"
              aria-label="إغلاق الإشعار"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default Notifications;