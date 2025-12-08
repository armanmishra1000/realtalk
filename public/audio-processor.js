/* eslint-disable */
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array();
    this.targetSampleRate = 16000;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input.length) return true;

    const channelData = input[0]; // Mono input
    if (!channelData) return true;

    // Append new data to buffer
    const newBuffer = new Float32Array(this.buffer.length + channelData.length);
    newBuffer.set(this.buffer);
    newBuffer.set(channelData, this.buffer.length);
    this.buffer = newBuffer;

    // Calculate downsampling ratio
    // globalThis.sampleRate is the context's sample rate (e.g., 44100 or 48000)
    const ratio = sampleRate / this.targetSampleRate;
    
    // We want to process chunks of reasonable size, e.g., 1024 samples at 16kHz
    // This corresponds to 1024 * ratio samples in the input buffer
    const neededOutputSamples = 512; // 32ms chunk at 16kHz (approx)
    const neededInputSamples = Math.floor(neededOutputSamples * ratio);

    while (this.buffer.length >= neededInputSamples) {
      const outputBuffer = new Int16Array(neededOutputSamples);
      
      for (let i = 0; i < neededOutputSamples; i++) {
        // Linear Interpolation for better quality than nearest neighbor
        const inputIndex = i * ratio;
        const index = Math.floor(inputIndex);
        const decimal = inputIndex - index;
        
        let val;
        // Check bounds
        if (index + 1 < this.buffer.length) {
            const v0 = this.buffer[index];
            const v1 = this.buffer[index + 1];
            val = v0 + (v1 - v0) * decimal;
        } else {
            val = this.buffer[index];
        }

        // Clamp to [-1, 1]
        val = Math.max(-1, Math.min(1, val));
        
        // Convert to Int16
        outputBuffer[i] = val < 0 ? val * 0x8000 : val * 0x7FFF;
      }

      this.port.postMessage({
        event: 'audio-input',
        pcmData: outputBuffer.buffer
      }, [outputBuffer.buffer]);

      // Remove processed samples
      // Note: In a production worklet, using a RingBuffer is more efficient than slice/new array
      // but for this prototype, this is safer to avoid pointer math errors.
      this.buffer = this.buffer.slice(neededInputSamples);
    }

    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
