import React from 'react';
import GeminiChatAgent from '../components/GeminiChatAgent';

const ChatWithAgent = ({ interview, userInfo, onClose, t }) => {
  return (
    <GeminiChatAgent 
      interview={interview}
      userInfo={userInfo}
      onClose={onClose}
      t={t}
    />
  );
};

export default ChatWithAgent;
