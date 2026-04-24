class PCM16Processor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input || input.length === 0) return true;
    const pcm16 = new Int16Array(input.length);
    let sumSq = 0;
    for (let i = 0; i < input.length; i++) {
      pcm16[i] = Math.max(-32768, Math.min(32767, Math.round(input[i] * 32767)));
      sumSq += input[i] * input[i];
    }
    const rms = Math.sqrt(sumSq / input.length);
    this.port.postMessage({ pcm16: pcm16.buffer, rms }, [pcm16.buffer]);
    return true;
  }
}
registerProcessor('pcm16-processor', PCM16Processor);
