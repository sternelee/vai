import structuredClone from '@ungap/structured-clone';
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  const setupPolyfills = async () => {
    const { polyfillGlobal } = await import(
      'react-native/Libraries/Utilities/PolyfillFunctions'
    );

    // Polyfill structuredClone if not available
    if (!('structuredClone' in global)) {
      polyfillGlobal('structuredClone', () => structuredClone);
    }

    // Check if TextEncoderStream and TextDecoderStream are needed
    try {
      if (!global.TextEncoderStream || !global.TextDecoderStream) {
        const { TextEncoderStream, TextDecoderStream } = await import(
          '@stardazed/streams-text-encoding'
        );

        polyfillGlobal('TextEncoderStream', () => TextEncoderStream);
        polyfillGlobal('TextDecoderStream', () => TextDecoderStream);
      }
    } catch (error) {
      console.warn('Failed to load text encoding streams polyfill:', error);
    }
  };

  setupPolyfills();
}

export { };
