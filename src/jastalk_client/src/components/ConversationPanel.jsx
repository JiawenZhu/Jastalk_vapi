import React, { useEffect, useRef } from 'react';

function ConversationPanel({ messages, isConnected, isSpeaking, isListening }) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 h-[600px] flex flex-col">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"></path>
        </svg>
        Conversation
        {isSpeaking && (
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
            Bot speaking
          </span>
        )}
        {isListening && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
            Listening
          </span>
        )}
      </h3>

      <div className="flex-1 overflow-y-auto space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"></path>
            </svg>
            <p className="text-lg">
              {isConnected
                ? 'Waiting for conversation to start...'
                : 'Connect to start the interview'}
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`message-bubble ${
                message.role === 'user' ? 'text-right' : 'text-left'
              }`}
            >
              <div
                className={`inline-block rounded-2xl px-4 py-2 max-w-md ${
                  message.role === 'user'
                    ? 'bg-purple-600 text-white rounded-tr-sm'
                    : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                } ${!message.isFinal ? 'opacity-70' : ''}`}
              >
                <div className="text-xs opacity-75 mb-1">
                  {message.role === 'user' ? 'You' : 'Interviewer'}
                  {!message.isFinal && ' (typing...)'}
                </div>
                <div className="text-sm whitespace-pre-wrap">{message.text}</div>
                <div className="text-xs opacity-50 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

export default ConversationPanel;
