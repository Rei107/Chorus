const fileInput = document.getElementById('file-input');
const recordBtn = document.getElementById('record-btn');
const sampleBtn = document.getElementById('sample-btn');
const downloadLink = document.getElementById('download-link');
const guideAudio = document.getElementById('guide-audio');
const sampleAudio = document.getElementById('sample-audio');
const ctx = document.getElementById('pitch-graph').getContext('2d');

const pitchChart = new Chart(ctx, {
  type: 'line',
  data: { labels: [], datasets: [] },
  options: {
    responsive: true,
    scales: {
      x: { title: { display: true, text: '時間 (秒)' } },
      y: { title: { display: true, text: '音程 (Hz)' }, suggestedMin: 50, suggestedMax: 400 }
    }
  }
});

let mediaRecorder, audioChunks = [];

async function processAudio(file, label) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const arrayBuffer = await file.arrayBuffer();
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

  function detectPitch(buffer, sampleRate) {
    let bestOffset = -1, bestCorrelation = 0, rms = 0;
    const size = buffer.length;
    for (let i = 0; i < size; i++) rms += buffer[i] ** 2;
    rms = Math.sqrt(rms / size);
    if (rms < 0.005) return null;

    for (let offset = 0; offset < size / 2; offset++) {
      let correlation = 0;
      for (let i = 0; i < size / 2; i++) correlation += buffer[i] * buffer[i + offset];
      correlation /= size / 2;
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestOffset = offset;
      }
    }
    return bestCorrelation > 0.01 ? sampleRate / bestOffset : null;
  }

  function processFrame() {
    if (start + 1024 >= buffer.length) {
      pitchChart.update();
      return;
    }
    const segment = buffer.slice(start, start + 1024);
    const pitch = detectPitch(segment, sampleRate);
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
  sampleAudio.currentTime = 0;
  sampleAudio.play();
  await processAudio(sampleAudio, "フォルテ(After)");
});

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

document.getElementById('downloadBtn')?.addEventListener('click', function() {
  const link = document.createElement('a');
  link.href = 'audio/フォルテ/フォルテ(After).zip';
  link.download = 'sample.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});
