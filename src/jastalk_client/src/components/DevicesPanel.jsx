import React from 'react';

function DevicesPanel({
  availableCams,
  availableMics,
  selectedCam,
  selectedMic,
  onUpdateCam,
  onUpdateMic
}) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
        </svg>
        Devices
      </h3>

      <div className="space-y-4">
        {/* Microphones */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"/>
              </svg>
              Microphone
            </div>
          </label>
          <select
            value={selectedMic?.deviceId || ''}
            onChange={(e) => {
              const device = availableMics.find(d => d.deviceId === e.target.value);
              if (device) onUpdateMic(device.deviceId);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-sm"
          >
            {availableMics && availableMics.length > 0 ? (
              availableMics.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                </option>
              ))
            ) : (
              <option>No microphones detected</option>
            )}
          </select>
        </div>

        {/* Cameras */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
              </svg>
              Camera
            </div>
          </label>
          <select
            value={selectedCam?.deviceId || ''}
            onChange={(e) => {
              const device = availableCams.find(d => d.deviceId === e.target.value);
              if (device) onUpdateCam(device.deviceId);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-sm"
          >
            {availableCams && availableCams.length > 0 ? (
              availableCams.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                </option>
              ))
            ) : (
              <option>No cameras detected</option>
            )}
          </select>
        </div>

        {/* Device Info */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <p>✓ {availableMics?.length || 0} microphone(s) available</p>
            <p>✓ {availableCams?.length || 0} camera(s) available</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DevicesPanel;
