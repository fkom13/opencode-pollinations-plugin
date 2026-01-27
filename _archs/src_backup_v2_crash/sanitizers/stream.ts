export class StreamProcessor {
    private accumulated: string = "";
    public lastSignature: string | null = null;
    public accumulatedBufferLimit: number = 50000;

    constructor(cachedSignature: string | null = null) {
        this.lastSignature = cachedSignature;
    }

    processChunk(chunkStr: string): string {
        // 1. Normalize finish_reason "STOP" -> "stop" (Gemini/Vertex Fix)
        if (chunkStr.includes('"finish_reason":"STOP"')) {
            if (!chunkStr.includes('"tool_calls"')) {
                chunkStr = chunkStr.replace(/"finish_reason":"STOP"/g, '"finish_reason":"stop"');
            } else {
                chunkStr = chunkStr.replace(/"finish_reason":"STOP"/g, '"finish_reason":"tool_calls"');
            }
        }

        // 2. Accumulate safely for Signature Capture
        if (this.accumulated.length < this.accumulatedBufferLimit) {
            this.accumulated += chunkStr;
            const match = this.accumulated.match(/"thought_signature"\s*:\s*"([^"]+)"/);
            if (match && match[1]) {
                this.lastSignature = match[1];
            }
        }

        return chunkStr;
    }

    getSignature(): string | null {
        return this.lastSignature;
    }
}
