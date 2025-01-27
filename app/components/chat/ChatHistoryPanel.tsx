import type { Message } from 'ai';
import { formatDistanceToNow } from 'date-fns';
import React, { useMemo, useState } from 'react';

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messages: Message[];
}

interface ChatHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  onSessionSelect: (session: ChatSession) => void;
  currentSessionId?: string;
}

export const ChatHistoryPanel: React.FC<ChatHistoryPanelProps> = React.memo(
  ({ isOpen, onClose, sessions, onSessionSelect, currentSessionId }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredSessions = useMemo(() => {
      return sessions.filter(
        (session) =>
          session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          session.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }, [sessions, searchQuery]);

    return (
      <div
        className={`fixed left-0 top-0 h-full w-80 bg-white dark:bg-gray-800 shadow-lg transform transition-transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold">Chat History</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            aria-label="Close panel"
          >
            <div className="i-ph:x text-xl" />
          </button>
        </div>

        <div className="p-2">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full p-2 pl-8 border rounded dark:bg-gray-700 dark:border-gray-600"
            />
            <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
              <div className="i-ph:magnifying-glass text-gray-400" />
            </div>
          </div>
        </div>

        <div className="overflow-y-auto h-[calc(100%-8rem)]">
          {filteredSessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSessionSelect(session)}
              className={`w-full p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-700 border-b dark:border-gray-700 ${
                currentSessionId === session.id ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-medium truncate flex-1">{session.title}</h3>
                <span className="text-xs text-gray-500 ml-2">
                  {formatDistanceToNow(session.timestamp, { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-gray-500 truncate">{session.lastMessage}</p>
            </button>
          ))}
        </div>

        <div className="absolute bottom-0 w-full p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800">
          <button
            onClick={() => {
              /* Implement new chat */
            }}
            className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center gap-2"
          >
            <div className="i-ph:plus" />
            New Chat
          </button>
        </div>
      </div>
    );
  },
);
