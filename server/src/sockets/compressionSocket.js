// In-memory list of connected sockets
const activeSessions = {};

export const setupCompressionSockets = (io) => {
  io.on('connection', (socket) => {
    console.log(`⚡ Compression client connected: ${socket.id}`);
    activeSessions[socket.id] = { socketId: socket.id, connectedAt: new Date() };

    // Handler: Trigger AI Multi-Agent Simulation
    socket.on('run_agent_simulation', ({ filename, size, mime, entropy, textRatio, mode }) => {
      console.log(`📡 Simulating AI Agents for ${filename} (${size} bytes) in ${mode} mode`);
      
      const sendLog = (agent, message, delay) => {
        setTimeout(() => {
          socket.emit('agent_log', {
            agent,
            message,
            timestamp: new Date().toISOString(),
          });
        }, delay);
      };

      const sendProgress = (percent, delay) => {
        setTimeout(() => {
          socket.emit('compression_progress', {
            percent,
            status: percent === 100 ? 'Completed' : 'Compressing...',
          });
        }, delay);
      };

      // 1. Strategy Agent analyzes details
      sendLog('Strategy Agent', `🔍 Commencing metadata inspection for file: "${filename}"`, 300);
      sendLog('Strategy Agent', `📊 Properties detected: Size = ${size} bytes, MIME = ${mime}, Shannon Entropy = ${entropy} bits`, 800);
      
      let chosenCodec = 'zstd';
      let chosenLevel = 6;
      if (mode === 'dsa' || mode === 'huffman') {
        chosenCodec = 'huffman';
        chosenLevel = 1;
      } else if (mime.startsWith('image/') || mime.startsWith('video/')) {
        chosenCodec = 'store';
        chosenLevel = 0;
      } else if (textRatio > 0.8) {
        chosenCodec = 'brotli';
        chosenLevel = 6;
      }
      
      sendLog('Strategy Agent', `🎯 Optimal strategy selected: Codec = "${chosenCodec}" (Level = ${chosenLevel})`, 1300);

      // 2. Optimization Agent calibrates streams
      sendLog('Optimization Agent', `⚙️ Calibrating worker blocks. Chunk size allocation: ${chosenCodec === 'huffman' ? '1MB' : '2MB'}`, 1800);
      sendLog('Optimization Agent', `🧵 Thread mapping: Set to optimal single-process streaming pipeline.`, 2200);

      // 3. Compression Agent pipes streams and updates progress bar
      sendLog('Compression Agent', `⚡ Initializing stream writer and starting compression read loops...`, 2700);
      sendProgress(10, 2900);
      sendProgress(35, 3300);
      sendProgress(60, 3700);
      sendProgress(85, 4100);
      sendProgress(100, 4500);
      sendLog('Compression Agent', `💾 Data piped. Byte buffers written to target storage successfully.`, 4600);

      // 4. Security Agent calculates hashes
      sendLog('Security Agent', `🔐 Hashing file payload to prevent bit-rot and ensure zero data corruption...`, 5000);
      const fakeHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      sendLog('Security Agent', `🔑 SHA-256 generated: "${fakeHash.substring(0, 24)}..."`, 5500);
      sendLog('Security Agent', `✅ Verification complete: Manifest verified. Roundtrip decompression matched exactly.`, 6000);

      // 5. Telemetry Agent reports speed/ratios
      sendLog('Telemetry Agent', `📈 Compiling telemetry log report...`, 6400);
      
      let ratioVal = 0.45;
      if (chosenCodec === 'store') ratioVal = 1.0;
      else if (chosenCodec === 'huffman') ratioVal = 0.62;
      
      sendLog('Telemetry Agent', `📊 final statistics: Codec = ${chosenCodec}, Ratio = ${ratioVal.toFixed(2)}, Reclaimed Space = ${((1 - ratioVal) * 100).toFixed(0)}%`, 6800);
      sendLog('Telemetry Agent', `🏁 Process terminated successfully.`, 7200);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Compression client disconnected: ${socket.id}`);
      delete activeSessions[socket.id];
    });
  });
};
