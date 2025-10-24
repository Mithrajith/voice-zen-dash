export const checkVoiceSupport = () => {
  const support = {
    speechRecognition: false,
    speechSynthesis: false,
    microphone: false,
    https: false,
    browser: 'Unknown',
    recommendations: [] as string[]
  };

  // Check browser
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Chrome')) {
    support.browser = 'Chrome';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    support.browser = 'Safari';
  } else if (userAgent.includes('Firefox')) {
    support.browser = 'Firefox';
  } else if (userAgent.includes('Edge')) {
    support.browser = 'Edge';
  }

  // Check HTTPS
  support.https = window.location.protocol === 'https:' || window.location.hostname === 'localhost';

  // Check Speech Recognition
  support.speechRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  // Check Speech Synthesis
  support.speechSynthesis = 'speechSynthesis' in window;

  // Check microphone availability (basic check)
  support.microphone = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;

  // Generate recommendations
  if (!support.speechRecognition) {
    if (support.browser === 'Firefox') {
      support.recommendations.push('Firefox has limited speech recognition support. Try Chrome or Safari for better results.');
    } else {
      support.recommendations.push('Speech recognition not supported. Please use Chrome, Safari, or Edge.');
    }
  }

  if (!support.https && support.browser !== 'Unknown') {
    support.recommendations.push('For security reasons, speech recognition requires HTTPS in production. Currently running on HTTP.');
  }

  if (!support.microphone) {
    support.recommendations.push('Microphone access may not be available in your browser.');
  }

  return support;
};

export const testMicrophoneAccess = async (): Promise<boolean> => {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.log('getUserMedia not supported');
      return false;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('Microphone access granted');
    
    // Stop the stream
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Microphone access denied or failed:', error);
    return false;
  }
};

export const initializeVoiceSystem = async () => {
  const support = checkVoiceSupport();
  console.log('Voice support check:', support);

  if (support.speechRecognition) {
    const micAccess = await testMicrophoneAccess();
    console.log('Microphone access test:', micAccess);
    
    return {
      ...support,
      microphoneAccess: micAccess
    };
  }

  return {
    ...support,
    microphoneAccess: false
  };
};