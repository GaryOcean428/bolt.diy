/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import { useStore } from '@nanostores/react';
import { useSearchParams } from '@remix-run/react';
import type { Message } from 'ai';
import { useChat } from 'ai/react';
import Cookies from 'js-cookie';
import React from 'react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { cssTransition, toast, ToastContainer } from 'react-toastify';
import { BaseChat } from './BaseChat';
import { useMessageParser, useShortcuts } from '~/lib/hooks';
import { useSettings } from '~/lib/hooks/useSettings';
import { description, useChatHistory } from '~/lib/persistence';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import type { ProviderInfo } from '~/types/model';
import { DEFAULT_MODEL, DEFAULT_PROVIDER, PROMPT_COOKIE_KEY, PROVIDER_LIST } from '~/utils/constants';
import { debounce } from '~/utils/debounce';
import { createScopedLogger, renderLogger } from '~/utils/logger';
import { createSampler } from '~/utils/sampler';

const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight',
});

const logger = createScopedLogger('Chat');

export function Chat() {
  renderLogger.trace('Chat');

  const { ready, initialMessages, storeMessageHistory, importChat, exportChat } = useChatHistory();
  const title = useStore(description);
  useEffect(() => {
    workbenchStore.setReloadedMessages(initialMessages.map((m) => m.id));
  }, [initialMessages]);

  return (
    <>
      {ready && (
        <ChatImpl
          description={title}
          initialMessages={initialMessages}
          exportChat={exportChat}
          storeMessageHistory={storeMessageHistory}
          importChat={importChat}
        />
      )}
      <ToastContainer
        closeButton={({ closeToast }) => (
          <button className="Toastify__close-button" onClick={closeToast} title="Close Notification">
            <div className="i-ph:x text-lg" />
          </button>
        )}
        icon={({ type }) => {
          switch (type) {
            case 'success': {
              return <div className="i-ph:check-bold text-bolt-elements-icon-success text-2xl" />;
            }
            case 'error': {
              return <div className="i-ph:warning-circle-bold text-bolt-elements-icon-error text-2xl" />;
            }
          }

          return undefined;
        }}
        position="bottom-right"
        pauseOnFocusLoss
        transition={toastAnimation}
      />
    </>
  );
}

const processSampledMessages = createSampler(
  (options: {
    messages: Message[];
    initialMessages: Message[];
    isLoading: boolean;
    parseMessages: (messages: Message[], isLoading: boolean) => void;
    storeMessageHistory: (messages: Message[]) => Promise<void>;
  }) => {
    const { messages, initialMessages, isLoading, parseMessages, storeMessageHistory } = options;
    parseMessages(messages, isLoading);

    if (messages.length > initialMessages.length) {
      storeMessageHistory(messages).catch((error) => toast.error(error.message));
    }
  },
  50,
);

interface ChatProps {
  initialMessages: Message[];
  storeMessageHistory: (messages: Message[]) => Promise<void>;
  importChat: (description: string, messages: Message[]) => Promise<void>;
  exportChat: () => void;
  description?: string;
}

const ChatImpl: React.FC<ChatProps> = memo(
  ({ description, initialMessages, storeMessageHistory, importChat, exportChat }) => {
    useShortcuts();

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [chatStarted] = useState(initialMessages.length > 0);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [imageDataList, setImageDataList] = useState<string[]>([]);
    const [searchParams, setSearchParams] = useSearchParams();
    const files = useStore(workbenchStore.files);
    const actionAlert = useStore(workbenchStore.alert);
    const { activeProviders, promptId } = useSettings();

    const [model, setModel] = useState(() => {
      const savedModel = Cookies.get('selectedModel');
      return savedModel || DEFAULT_MODEL;
    });
    const [provider, setProvider] = useState(() => {
      const savedProvider = Cookies.get('selectedProvider');
      return (PROVIDER_LIST.find((p) => p.name === savedProvider) || DEFAULT_PROVIDER) as ProviderInfo;
    });

    const { showChat } = useStore(chatStore);

    const [apiKeys, setApiKeys] = useState<Record<string, string>>({});

    const {
      messages,
      isLoading,
      input,
      handleInputChange: originalHandleInputChange,
      setInput,
      stop,
      append,
    } = useChat({
      api: '/api/chat',
      body: ({ messages, data }: { messages: Message[]; data?: { input?: string } }) => ({
        apiKeys,
        files,
        promptId,
        complexity: {
          tokenCount: data?.input?.length || 0,
          specializedKnowledge: (data?.input || '').includes('code') || (data?.input || '').includes('programming'),
          securitySensitive: (data?.input || '').includes('security') || (data?.input || '').includes('auth'),
          languageSpecific: true,
          expectedDuration: 1,
        },
        messages,
      }),
      sendExtraMessageFields: true,
      onError: (error) => {
        logger.error('Request failed\n\n', error);
        toast.error(
          'There was an error processing your request: ' + (error.message ? error.message : 'No details were returned'),
        );
      },
      onFinish: (message, response) => {
        const usage = response.usage;

        if (usage) {
          console.log('Token usage:', usage);
        }

        logger.debug('Finished streaming');
      },
      initialMessages,
      initialInput: Cookies.get(PROMPT_COOKIE_KEY) || '',
    });
    useEffect(() => {
      const prompt = searchParams.get('prompt');
      console.log(prompt, searchParams, model, provider);

      if (prompt) {
        setSearchParams({});
        append({
          role: 'user',
          content: [
            {
              type: 'text',
              text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${prompt}`,
            },
          ] as any,
        });
      }
    }, [model, provider, searchParams, append]);

    const { parseMessages } = useMessageParser();

    const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;

    useEffect(() => {
      chatStore.setKey('started', initialMessages.length > 0);
    }, []);

    useEffect(() => {
      processSampledMessages({
        messages,
        initialMessages,
        isLoading,
        parseMessages,
        storeMessageHistory,
      });
    }, [messages, isLoading, parseMessages, storeMessageHistory]);

    useEffect(() => {
      const textarea = textareaRef.current;

      if (textarea) {
        textarea.style.height = 'auto';

        const scrollHeight = textarea.scrollHeight;

        textarea.style.height = `${Math.min(scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
        textarea.style.overflowY = scrollHeight > TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
      }
    }, [input, textareaRef]);

    const sendMessage = async (_event: React.UIEvent, messageInput?: string) => {
      const _input = messageInput || input;

      if (_input.length === 0 || isLoading) {
        return;
      }

      await workbenchStore.saveAllFiles();

      const fileModifications = workbenchStore.getFileModifcations();

      chatStore.setKey('aborted', false);

      if (fileModifications !== undefined) {
        append({
          role: 'user',
          content: [
            {
              type: 'text',
              text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${_input}`,
            },
            ...imageDataList.map((imageData) => ({
              type: 'image',
              image: imageData,
            })),
          ] as any,
        });

        workbenchStore.resetAllFileModifications();
      } else {
        append({
          role: 'user',
          content: [
            {
              type: 'text',
              text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${_input}`,
            },
            ...imageDataList.map((imageData) => ({
              type: 'image',
              image: imageData,
            })),
          ] as any,
        });
      }

      setInput('');
      Cookies.remove(PROMPT_COOKIE_KEY);

      setUploadedFiles([]);
      setImageDataList([]);

      textareaRef.current?.blur();
    };

    const messageRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      originalHandleInputChange(e);

      const debouncedCachePrompt = useCallback(
        debounce((event: React.ChangeEvent<HTMLTextAreaElement>) => {
          const trimmedValue = event.target.value.trim();
          Cookies.set(PROMPT_COOKIE_KEY, trimmedValue, { expires: 30 });
        }, 1000),
        [],
      );
      debouncedCachePrompt(e);
    };

    useEffect(() => {
      const storedApiKeys = Cookies.get('apiKeys');

      if (storedApiKeys) {
        setApiKeys(JSON.parse(storedApiKeys));
      }
    }, []);

    const handleModelChange = (newModel: string) => {
      setModel(newModel);
      Cookies.set('selectedModel', newModel, { expires: 30 });
    };

    const handleProviderChange = (newProvider: ProviderInfo) => {
      setProvider(newProvider);
      Cookies.set('selectedProvider', newProvider.name, { expires: 30 });
    };

    const handleStop = () => {
      stop();
      chatStore.setKey('aborted', true);
      workbenchStore.abortAllActions();
    };
    const clearAlert = () => workbenchStore.clearAlert();

    return (
      <BaseChat
        showChat={showChat}
        exportChat={exportChat}
        input={input}
        chatStarted={chatStarted}
        isStreaming={isLoading}
        sendMessage={sendMessage}
        _messageRef={messageRef}
        _scrollRef={scrollRef}
        _handleInputChange={handleInputChange}
        _handleStop={handleStop}
        _description={description}
        _importChat={importChat}
        _messages={messages}
        uploadedFiles={uploadedFiles}
        setUploadedFiles={setUploadedFiles}
        _imageDataList={imageDataList}
        _setImageDataList={setImageDataList}
        _actionAlert={actionAlert?.content || ''}
        _clearAlert={clearAlert}
        _model={model}
        _setModel={handleModelChange}
        _provider={provider}
        _setProvider={handleProviderChange}
        _providerList={activeProviders}
      />
    );
  },
);

// Removed default export to avoid import/export confusion - use named export 'Chat' instead
