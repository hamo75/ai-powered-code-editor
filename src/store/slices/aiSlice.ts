import { StateCreator } from 'zustand';
import { EditorStore, ChatMessage, AiProvider } from '../types/store';
import { AI_PROVIDERS } from '../constants';
import { fetchWithTimeout } from '../utils/helpers';

export interface AiSlice {
  // AI State
  chatMessages: ChatMessage[];
  apiKey: string;
  aiProviderId: string;
  aiModel: string;
  customEndpoint: string;
  isAiThinking: boolean;

  // AI Actions
  addChatMessage: (msg: ChatMessage) => void;
  updateLastMessage: (content: string) => void;
  clearChat: () => void;
  setApiKey: (key: string) => void;
  setAiProvider: (id: string) => void;
  setAiModel: (model: string) => void;
  setCustomEndpoint: (url: string) => void;
  setIsAiThinking: (val: boolean) => void;
  applyCodeToFile: (fileName: string, code: string) => boolean;
  sendMessageToAI: (message: string) => Promise<void>;
  getAvailableAiProviders: () => AiProvider[];
}

export const createAiSlice: StateCreator<EditorStore, [], [], AiSlice> = (set, get) => ({
  // Initial State
  chatMessages: [],
  apiKey: '',
  aiProviderId: 'mistral',
  aiModel: 'mistral-small-latest',
  customEndpoint: '',
  isAiThinking: false,

  // AI Actions
  addChatMessage: (msg) => {
    set((state) => ({ chatMessages: [...state.chatMessages, msg] }));
  },

  updateLastMessage: (content) => {
    set((state) => {
      const messages = [...state.chatMessages];
      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        messages[messages.length - 1] = { ...lastMsg, content };
      }
      return { chatMessages: messages };
    });
  },

  clearChat: () => {
    set({ chatMessages: [] });
  },

  setApiKey: (key) => {
    set({ apiKey: key });
    get().persist();
  },

  setAiProvider: (id) => {
    const provider = AI_PROVIDERS.find(p => p.id === id);
    set({ 
      aiProviderId: id,
      aiModel: provider?.models[0] || '',
    });
    get().persist();
  },

  setAiModel: (model) => {
    set({ aiModel: model });
    get().persist();
  },

  setCustomEndpoint: (url) => {
    set({ customEndpoint: url });
    get().persist();
  },

  setIsAiThinking: (val) => {
    set({ isAiThinking: val });
  },

  applyCodeToFile: (fileName, code) => {
    const state = get();
    const file = state.files.find(f => f.name === fileName && f.type === 'file');
    if (file) {
      get().updateFile(file.id, code);
      get().addNotification({
        id: Date.now().toString(),
        type: 'success',
        message: `✅ تم تطبيق الكود على ${fileName}`,
      });
      return true;
    }
    
    // Create new file if not found
    const rootId = state.files.find(f => f.type === 'folder' && f.parentId === null)?.id;
    if (rootId) {
      const newFile = get().addFileToFolder(rootId, fileName, 'file');
      if (newFile) {
        get().updateFile(newFile.id, code);
        get().addNotification({
          id: Date.now().toString(),
          type: 'success',
          message: `✅ تم إنشاء وتطبيق ${fileName}`,
        });
        return true;
      }
    }
    
    get().addNotification({
      id: Date.now().toString(),
      type: 'error',
      message: `❌ فشل تطبيق الكود`,
    });
    return false;
  },

  sendMessageToAI: async (message) => {
    const state = get();
    
    // Add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };
    get().addChatMessage(userMsg);
    get().setIsAiThinking(true);

    try {
      const provider = AI_PROVIDERS.find(p => p.id === state.aiProviderId);
      if (!provider) throw new Error('مزود AI غير صالح');

      const endpoint = state.aiProviderId === 'custom' 
        ? state.customEndpoint 
        : provider.endpoint;

      if (!endpoint) throw new Error('لم يتم تعيين نقطة النهاية');
      if (!state.apiKey) throw new Error('يرجى إدخال مفتاح API');

      // Build context from open files
      const contextFiles = state.openTabs
        .map(tabId => state.files.find(f => f.id === tabId))
        .filter(f => f && f.type === 'file')
        .map(f => `\n// File: ${f!.name}\n${f!.content}`)
        .join('\n');

      const systemPrompt = state.aiSystemPrompt || 'أنت مساعد ذكي متخصص في البرمجة.';
      
      const requestBody: any = {
        model: state.aiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          ...state.chatMessages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: message + (contextFiles ? `\n\nContext:\n${contextFiles}` : '') },
        ],
        temperature: state.aiTemperature,
        max_tokens: state.aiMaxTokens,
        stream: state.aiStreaming,
      };

      const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      }, 90000);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      if (state.aiStreaming) {
        const reader = response.body?.getReader();
        if (!reader) throw new Error('لا يمكن قراءة الاستجابة');

        const decoder = new TextDecoder();
        let assistantMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          isStreaming: true,
        };
        get().addChatMessage(assistantMsg);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || '';
                if (content) {
                  get().updateLastMessage(assistantMsg.content + content);
                }
              } catch {}
            }
          }
        }

        // Mark as complete
        set((state) => {
          const messages = [...state.chatMessages];
          if (messages.length > 0) {
            messages[messages.length - 1] = { ...messages[messages.length - 1], isStreaming: false };
          }
          return { chatMessages: messages };
        });
      } else {
        const data = await response.json();
        const assistantContent = data.choices?.[0]?.message?.content || 'لا توجد إجابة';

        const assistantMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: assistantContent,
          timestamp: Date.now(),
        };
        get().addChatMessage(assistantMsg);
      }
    } catch (error: any) {
      get().addNotification({
        id: Date.now().toString(),
        type: 'error',
        message: `❌ خطأ في AI: ${error.message}`,
      });
    } finally {
      get().setIsAiThinking(false);
    }
  },

  getAvailableAiProviders: () => {
    return AI_PROVIDERS;
  },
});
