　　const fileInput = document.getElementById('file-input');
    const recordBtn = document.getElementById('record-btn');
    const sampleBtn = document.getElementById('sample-btn');
    const downloadLink = document.getElementById('download-link');
    const guideAudio = document.getElementById('guide-audio');
    const sampleAudio = document.getElementById('sample-audio');
    const ctx = document.getElementById('pitch-graph').getContext('2d');
    let cursorX = null;
    let animationFrameId = null;
    let startTime = null;
    const pitchChart = new Chart(ctx, {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        animation: false,
        plugins: {
          legend: { display: true }
        },
        scales: {
          x: {
            title: { display: true, text: '時間 (秒)' }
          },
          y: {
            title: { display: true, text: '音程 (Hz)' },
            suggestedMin: 50,
            suggestedMax: 400
          }
        }
      },
      plugins: [{
        id: 'cursorLine',
        afterDraw: (chart) => {
          if (cursorX !== null) {
            const xAxis = chart.scales.x;
            const yAxis = chart.scales.y;
            const ctx = chart.ctx;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(xAxis.getPixelForValue(cursorX), yAxis.top);
            ctx.lineTo(xAxis.getPixelForValue(cursorX), yAxis.bottom);
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
          }
        }
      }]
    });
    let speedFactor = 0.25; // 速さの調整（1が標準、2で速くなる）

function animateCursor(duration) {
  startTime = performance.now();
  function step(now) {
    const elapsed = (now - startTime) / 1000; // 秒に変換

    // グラフのスケールに合わせてカーソル位置を計算
    const xAxis = pitchChart.scales.x;
    const chartWidth = xAxis.width;

    // スピードファクターを適用
    const adjustedElapsed = elapsed * speedFactor;

    // 進行中のカーソル位置
    cursorX = Math.min(adjustedElapsed / duration * chartWidth, chartWidth);

    pitchChart.update();
    if (adjustedElapsed < duration) {
      animationFrameId = requestAnimationFrame(step);
    } else {
      cursorX = chartWidth; // 最終的に右端に固定
      pitchChart.update();
    }
  }
  animationFrameId = requestAnimationFrame(step);
}

    
    let mediaRecorder, audioChunks = [];
    function detectPitchYIN(buffer, sampleRate) {
      const threshold = 0.1;
      const bufferSize = buffer.length;
      const yinBuffer = new Float32Array(bufferSize / 2);
      let rms = 0;
      for (let i = 0; i < bufferSize; i++) rms += buffer[i] * buffer[i];
      rms = Math.sqrt(rms / bufferSize);
      if (rms < 0.005) return null;
      for (let tau = 0; tau < yinBuffer.length; tau++) {
        let sum = 0;
        for (let i = 0; i < yinBuffer.length; i++) {
          const delta = buffer[i] - buffer[i + tau];
          sum += delta * delta;
        }
        yinBuffer[tau] = sum;
      }
      yinBuffer[0] = 1;
      let runningSum = 0;
      for (let tau = 1; tau < yinBuffer.length; tau++) {
        runningSum += yinBuffer[tau];
        yinBuffer[tau] *= tau / runningSum;
      }
      let tauEstimate = -1;
      for (let tau = 2; tau < yinBuffer.length; tau++) {
        if (yinBuffer[tau] < threshold) {
          while (tau + 1 < yinBuffer.length && yinBuffer[tau + 1] < yinBuffer[tau]) tau++;
          tauEstimate = tau;
          break;
        }
      }
      if (tauEstimate === -1) return null;
      return sampleRate / tauEstimate;
    }
    async function processAudio(fileOrAudio, label) {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = fileOrAudio instanceof File
        ? await fileOrAudio.arrayBuffer()
        : await fetch(fileOrAudio.src).then(r => r.arrayBuffer());
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const buffer = audioBuffer.getChannelData(0);
      const sampleRate = audioContext.sampleRate;
      let start = 0, currentTime = 0, pitchHistory = [];
      const color = `hsl(${Math.random() * 360}, 75%, 50%)`;
      const newDataset = {
        label: label,
        data: [],
        borderColor: color,
        borderWidth: 1,
        tension: 0.3
      };
      pitchChart.data.datasets.push(newDataset);
      function processFrame() {
        if (start + 2048 >= buffer.length) {
          pitchChart.update();
          return;
        }
        const segment = buffer.slice(start, start + 2048);
        const pitch = detectPitchYIN(segment, sampleRate);
        if (pitch && pitch >= 80 && pitch <= 1000) pitchHistory.push(pitch);
        if (pitchHistory.length > 0) {
          pitchChart.data.labels.push(currentTime.toFixed(2));
          newDataset.data.push(pitchHistory[pitchHistory.length - 1]);
          pitchChart.update();
        }
        start += 1024;
        currentTime += 1024 / sampleRate;
        setTimeout(processFrame, 10);
      }
      processFrame();
    }
    fileInput.addEventListener('change', async (event) => {
      for (const file of event.target.files) {
        await processAudio(file, file.name);
      }
    });
    recordBtn.addEventListener('click', async () => {
      if (!mediaRecorder || mediaRecorder.state === "inactive") {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
          const audioFile = new File([audioBlob], "recorded_audio.webm", { type: "audio/webm" });
          downloadLink.href = URL.createObjectURL(audioBlob);
          downloadLink.download = "recorded_audio.webm";
          downloadLink.style.display = "block";
          downloadLink.textContent = "録音をダウンロード";
          await processAudio(audioFile, "録音データ");
        };
        guideAudio.currentTime = 0;
        guideAudio.play();
        mediaRecorder.start();
        recordBtn.textContent = "録音停止";
      } else {
        mediaRecorder.stop();
        guideAudio.pause();
        recordBtn.textContent = "録音開始";
      }
    });
    sampleBtn.addEventListener('click', async () => {
      cursorX = null;
      cancelAnimationFrame(animationFrameId);
      sampleAudio.currentTime = 0;
      sampleAudio.play();
      animateCursor(sampleAudio.duration);
    });
    /*ZIPファイル解凍*/
    document.getElementById('zipInput').addEventListener('change', async function(event) {
      const file = event.target.files[0];
      if (!file) return;
      const zip = new JSZip();
      const zipData = await file.arrayBuffer();
      const zipContents = await zip.loadAsync(zipData);
      const fileList = document.getElementById('fileList');
      fileList.innerHTML = '';
      Object.keys(zipContents.files).forEach(async filename => {
        const fileData = await zipContents.files[filename].async('blob');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(fileData);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
    });
    /*「録音開始」ボタンを押すと音源が流れる*/ 
    let hasPlayedStartAudio = false;
    document.getElementById('record-btn').addEventListener('click', () => {
      const sampleAudio = document.getElementById('start-audio');
      if (!hasPlayedStartAudio) {
        setTimeout(() => {
          sampleAudio.currentTime = 0;
          sampleAudio.play();
          hasPlayedStartAudio = true;
        }, 1000);
      }
    });
