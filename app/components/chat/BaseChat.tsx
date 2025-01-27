import type { Message } from 'ai';

import React, { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import chatStyles from './ChatStyles.module.scss';
import { SendButton } from './SendButton.client';
import { SpeechRecognitionButton } from '~/components/chat/SpeechRecognition';
import { IconButton } from '~/components/ui/IconButton';
import type { MessageRole } from '~/types/chat';
import type { ProviderInfo } from '~/types/model';
import { classNames } from '~/utils/classNames';

interface BaseChatProps {
  showChat?: boolean;
  exportChat?: () => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  input?: string;
  chatStarted?: boolean;
  isStreaming?: boolean;
  enhancingPrompt?: boolean;
  promptEnhanced?: boolean;
  sendMessage?: (event: React.UIEvent, messageInput?: string) => void;
  _model?: string;
  _setModel?: (model: string) => void;
  _provider?: ProviderInfo;
  _setProvider?: (provider: ProviderInfo) => void;
  _providerList?: ProviderInfo[];
  _messageRef?: React.RefObject<HTMLDivElement>;
  _scrollRef?: React.RefObject<HTMLDivElement>;
  _handleInputChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  _handleStop?: () => void;
  _description?: string;
  _importChat?: (description: string, messages: Message[]) => Promise<void>;
  _messages?: Message[];
  _enhancePrompt?: () => void;
  uploadedFiles?: File[];
  setUploadedFiles?: (files: File[]) => void;
  _imageDataList?: string[];
  _setImageDataList?: (data: string[]) => void;
  _actionAlert?: string;
  _clearAlert?: () => void;
}

interface ChatContext {
  previousMessages: { role: MessageRole; content: string }[];
  specialization: string[];
  uploadedFiles?: File[];
}

/**
 * Base chat component that provides core chat functionality
 * @component
 * @param {BaseChatProps} props - Component props
 * @returns {JSX.Element} Rendered chat interface
 */
export const BaseChat = React.forwardRef<HTMLDivElement, BaseChatProps>(
  (
    {
      showChat = true,
      exportChat,
      input: externalInput = '',
      chatStarted: externalChatStarted = false,
      isStreaming: externalIsStreaming = false,
      sendMessage: externalSendMessage,
      setUploadedFiles: externalSetUploadedFiles,
      _model = '',
      _setModel,
      _provider,
      _setProvider,
      _providerList,
      _messageRef,
      _scrollRef,
      _handleInputChange,
      _handleStop,
      _description,
      _importChat,
      _messages,
      _enhancePrompt,
      uploadedFiles,
      _imageDataList,
      _setImageDataList,
      _actionAlert,
      _clearAlert,
    },
    ref,
  ) => {
    const [input, setInput] = useState(externalInput);
    const [isStreaming] = useState(externalIsStreaming);
    const [isListening, setIsListening] = useState(false);
    const [chatStarted, setChatStarted] = useState(externalChatStarted);
    const [messagesState, setMessagesState] = useState<{ role: string; content: string }[]>([]);
    const [uploadedFilesState, setUploadedFilesState] = useState<File[]>(uploadedFiles || []);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(event.target.value);
    };

    const handleStartListening = () => {
      setIsListening(true);
    };

    const handleStopListening = () => {
      setIsListening(false);
    };

    /**
     * Handles file upload functionality with validation
     * @async
     * @function
     * @throws {Error} When file upload fails
     */
    const handleFileUpload = async () => {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*,.pdf,.doc,.docx,.txt';

        input.onchange = async (event) => {
          const files = Array.from((event.target as HTMLInputElement).files || []);

          // Validate file types and sizes
          const validFiles = files.filter((file) => {
            const validTypes = ['image/', 'application/pdf', 'application/msword', 'text/plain'];
            const isValidType = validTypes.some((type) => file.type.startsWith(type));
            const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit

            if (!isValidType) {
              toast.error(`Invalid file type: ${file.name}`);
            }

            if (!isValidSize) {
              toast.error(`File too large: ${file.name}`);
            }

            return isValidType && isValidSize;
          });

          if (validFiles.length > 0) {
            setUploadedFilesState(validFiles);

            if (externalSetUploadedFiles) {
              externalSetUploadedFiles(validFiles);
            }

            toast.success(`${validFiles.length} file(s) uploaded successfully`);
          }
        };

        input.click();
      } catch (error) {
        console.error('File upload error:', error);
        toast.error('Failed to upload files. Please try again.');
      }
    };

    /**
     * Handles paste events for images and text
     * @param {React.ClipboardEvent} event - Clipboard event
     */
    const handlePaste = (event: React.ClipboardEvent) => {
      const items = event.clipboardData?.items;

      if (!items) {
        return;
      }

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();

          if (!file) {
            continue;
          }

          const reader = new FileReader();

          reader.onload = () => {
            const newFiles = [...uploadedFilesState, file];
            setUploadedFilesState(newFiles);
            externalSetUploadedFiles?.(newFiles);
          };

          reader.readAsDataURL(file);
        }
      }
    };

    const handleSendMessage = async (_event: React.UIEvent) => {
      if (externalSendMessage) {
        externalSendMessage(_event, input);
        return;
      }

      try {
        setMessagesState([]);

        const chatContext: ChatContext = {
          previousMessages: (messagesState || []).map((msg) => ({
            role: msg.role as MessageRole,
            content: msg.content,
          })),
          specialization: ['coding', 'tool-use'],
          uploadedFiles: uploadedFilesState,
        };

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: input,
            context: chatContext,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const data = (await response.json()) as { message: { role: string; content: string } };
        setMessagesState((prev) => [...prev, data.message]);
        setChatStarted(true);
      } catch (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
      }
    };

    const baseChat = (
      <div
        ref={ref}
        className={classNames(chatStyles.chat, 'flex flex-col flex-grow lg:min-w-[var(--chat-min-width)] h-full')}
        data-chat-visible={showChat}
      >
        <div className={chatStyles.promptContainer}>
          <div className={chatStyles.textareaContainer}>
            <textarea
              ref={textareaRef}
              className={chatStyles.textarea}
              onChange={handleInputChange}
              onPaste={handlePaste}
              placeholder="How can Bolt help you today?"
              translate="no"
              value={input}
            />
          </div>

          <div className={chatStyles.promptEffectContainer}>
            <svg className={classNames(chatStyles.promptEffectLine)} pathLength="100" strokeLinecap="round">
              <rect width="100%" height="100%" rx="8" />
            </svg>
          </div>

          <div className={chatStyles.buttonContainer}>
            <div className={chatStyles.buttonGroup}>
              <IconButton title="Upload image" onClick={handleFileUpload} disabled={isStreaming}>
                <div className="i-ph:image-square text-xl" />
              </IconButton>

              <SpeechRecognitionButton
                isListening={isListening}
                onStart={handleStartListening}
                onStop={handleStopListening}
                disabled={isStreaming}
              />

              {chatStarted && <div>{exportChat && <button onClick={exportChat}>Export Chat</button>}</div>}
            </div>

            <div className={chatStyles.buttonGroup}>
              <SendButton
                show={input.length > 0 || isStreaming || uploadedFilesState.length > 0}
                isStreaming={isStreaming}
                onClick={handleSendMessage}
              />
            </div>
          </div>
        </div>
      </div>
    );

    return baseChat;
  },
);
