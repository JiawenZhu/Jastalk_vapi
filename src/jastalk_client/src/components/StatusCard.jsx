import React from 'react';

function StatusCard({ transportState, sessionStatus, isSpeaking, isListening }) {
  const getStatusInfo = () => {
    if (sessionStatus.error) {
      return {
        color: 'red',
        text: 'Error: ' + sessionStatus.error,
        indicator: 'bg-red-500'
      };
    }

    if (sessionStatus.botReady) {
      return {
        color: 'green',
        text: 'Interview in progress',
        indicator: 'bg-green-500 animate-pulse'
      };
    }

    if (sessionStatus.connected) {
      return {
        color: 'yellow',
        text: 'Connecting to bot...',
        indicator: 'bg-yellow-500 animate-pulse'
      };
    }

    if (transportState === 'connecting') {
      return {
        color: 'yellow',
        text: 'Establishing connection...',
        indicator: 'bg-yellow-500 animate-pulse'
      };
    }

    return {
      color: 'gray',
      text: 'Not connected',
      indicator: 'bg-gray-400'
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${statusInfo.indicator}`}></div>
          <span className="text-gray-700 font-medium">{statusInfo.text}</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Speaking Indicator */}
          {isSpeaking && (
            <div className="flex items-center gap-2 text-purple-600">
              <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"/>
              </svg>
              <span className="text-sm font-medium">Bot Speaking</span>
            </div>
          )}

          {/* Listening Indicator */}
          {isListening && (
            <div className="flex items-center gap-2 text-blue-600">
              <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"/>
              </svg>
              <span className="text-sm font-medium">Listening</span>
            </div>
          )}

          {/* Volume Indicator */}
          {sessionStatus.botReady && (
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"/>
              </svg>
              <div className="flex gap-1 items-end h-6">
                {[20, 40, 60, 80, 100].map((height, i) => (
                  <div
                    key={i}
                    className="volume-bar w-1 bg-purple-400 rounded-full"
                    style={{ height: `${height}%` }}
                  ></div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StatusCard;
