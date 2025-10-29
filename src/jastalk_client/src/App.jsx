import React, { useCallback, useEffect, useState } from 'react';
import { PipecatClient } from '@pipecat-ai/client-js';
import { SmallWebRTCTransport } from '@pipecat-ai/small-webrtc-transport';
import { PipecatClientProvider } from '@pipecat-ai/client-react';
import InterviewUI from './components/InterviewUI';

function App() {
  const [client, setClient] = useState(null);

  useEffect(() => {
    // Create Pipecat client with SmallWebRTC transport
    const pipecatClient = new PipecatClient({
      transport: new SmallWebRTCTransport({
        offerUrl: '/api/offer'
      }),
      enableMic: true,
      enableCam: false,
      params: {
        requestData: {},
        services: {}
      }
    });

    setClient(pipecatClient);

    return () => {
      if (pipecatClient) {
        pipecatClient.disconnect();
      }
    };
  }, []);

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing Jastalk Interview Agent...</p>
        </div>
      </div>
    );
  }

  return (
    <PipecatClientProvider client={client}>
      <InterviewUI />
    </PipecatClientProvider>
  );
}

export default App;
