let mediaRecorder;
let recordedChunks = [];
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let recordedBuffer;

/* 録音・再生ボタン関連（見本なし録音のみ） */
function setupRecorder(recordButtonId, stopButtonId, playButtonId, audioElementId, successAudioId) {
    let audioChunks = [];
    let audio = document.getElementById(audioElementId);

    document.getElementById(recordButtonId).addEventListener('click', async () => {
        try {
            let stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.start();

            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const audioURL = URL.createObjectURL(audioBlob);
                audio.src = audioURL;
                audioChunks = [];
                stream.getTracks().forEach(track => track.stop());
            };

            // マイクアクセスが許可された場合に successAudioId を再生
            playAudio(successAudioId);
            startBlink(); // ← ここを追加！

        } catch (err) {
            console.error('マイクアクセスが拒否されました: ', err);
        }
    });

    document.getElementById(stopButtonId).addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
    });

    document.getElementById(playButtonId).addEventListener('click', () => {
        audio.play();
    });
}

function playAudio(audioId, playbackRate = 1) {
    const audio = document.getElementById(audioId);
    audio.playbackRate = playbackRate;
    audio.play();
}

// 見本なし録音用だけ設定
setupRecorder('record2', 'stop2', 'play2', 'audio2', 'audio4');

/* 見本音声再生 */
document.getElementById('Teacher').addEventListener('click', () => {
    playAudio('audio3');
});

document.getElementById('Teacher2').addEventListener('click', () => {
    playAudio('audio5');
});

/* 見本なし録音再生 */
document.getElementById('play2').addEventListener('click', () => {
    playAudio('audio2');
    playAudio('audio4');
});

/* 見本なし同時再生 */
document.getElementById('play4').addEventListener('click', () => {
    const a2 = document.getElementById('audio2');
    const a6 = document.getElementById('audio6');

    // 前回の再生を停止して位置を戻し、速度をリセット
    [a2, a6].forEach(a => {
        a.pause();
        a.currentTime = 0;
        a.playbackRate = 1.0;   // ← ここが重要
    });

    a2.play();
    setTimeout(() => {
        a6.play();
    }, 320);
});

/* 見本なしスロー同時再生 */
document.getElementById('slow2').addEventListener('click', () => {
    const a2 = document.getElementById('audio2');
    const a6 = document.getElementById('audio6');

    // 前回の再生を停止して位置を戻す
    [a2, a6].forEach(a => {
        a.pause();
        a.currentTime = 0;
        a.playbackRate = 0.85;  // ← スロー
    });

    a2.play();
    setTimeout(() => {
        a6.play();
    }, 320);
});


/* ノイズ除去などの関数はそのまま */
function applyNoiseReduction(buffer) {
    // ノイズ除去の実装予定
}

async function loadAudioBuffer(audioContext, url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();
        return audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
        console.error('Error loading audio buffer:', error);
    }
}

function getRMS(buffer) {
    const channelData = buffer.getChannelData(0);
    const sumSquares = channelData.reduce((sum, sample) => sum + sample * sample, 0);
    return Math.sqrt(sumSquares / channelData.length);
}

function playBuffer(audioContext, buffer, gainNode) {
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(gainNode).connect(audioContext.destination);
    source.start();
}

async function normalizeAndPlay() {
    const audio1 = document.getElementById('audio1');
    const audio3 = document.getElementById('audio3');
    const audio2 = document.getElementById('audio2');
    const existingBuffer1 = await loadAudioBuffer(audioContext, audio1.src);
    const existingBuffer2 = await loadAudioBuffer(audioContext, audio3.src);
    const existingBuffer3 = await loadAudioBuffer(audioContext, audio2.src);

    const targetGain = Math.max(
        getRMS(recordedBuffer),
        getRMS(existingBuffer1),
        getRMS(existingBuffer2),
        getRMS(existingBuffer3)
    );

    const recordedGainNode = audioContext.createGain();
    recordedGainNode.gain.value = targetGain / getRMS(recordedBuffer);

    const existingGainNode1 = audioContext.createGain();
    existingGainNode1.gain.value = targetGain / getRMS(existingBuffer1);

    const existingGainNode2 = audioContext.createGain();
    existingGainNode2.gain.value = targetGain / getRMS(existingBuffer2);

    const existingGainNode3 = audioContext.createGain();
    existingGainNode3.gain.value = targetGain / getRMS(existingBuffer3);

    playBuffer(audioContext, recordedBuffer, recordedGainNode);
    playBuffer(audioContext, existingBuffer1, existingGainNode1);
    setTimeout(() => {
        playBuffer(audioContext, existingBuffer2, existingGainNode2);
    }, 150);
    setTimeout(() => {
        playBuffer(audioContext, existingBuffer3, existingGainNode3);
    }, 300);
}

const linkIds = ['Teacher', 'Teacher2','record1', 'stop1', 'play1', 'play3', 'slow1', 'record2', 'stop2', 'play2', 'play4', 'slow2'];

linkIds.forEach(id => {
    const link = document.getElementById(id);
    if (link) {
        link.addEventListener('click', (event) => {
            event.preventDefault(); // デフォルト動作を無効化
            console.log(`${id} がクリックされました！`);
        });
    }
});


 // ▼ BPMライト制御 ▼
  const light = document.getElementById('bpm-light');
  let timerId = null;

  function startBlink() {
    stopBlink();
    const bpm = 107;     // 固定
    const pulsePct = 20; // 固定
    const beatMs = 60000 / bpm;
    const onMs  = Math.max(1, Math.round(beatMs * (pulsePct / 100)));

    function pulse() {
      light.classList.add('on');
      setTimeout(() => light.classList.remove('on'), onMs);
    }
    pulse();
    timerId = setInterval(pulse, beatMs);
  }

  function stopBlink() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
    light.classList.remove('on');
  }

  // 録音ボタン連動
  let audioStream = null; // グローバルに保存

document.getElementById('record2').addEventListener('click', async (e) => {
  e.preventDefault();

});

document.getElementById('stop2').addEventListener('click', (e) => {
    e.preventDefault();
    stopBlink(); // ← ここで点滅を止める！
    // 録音停止処理などがあればここに追加
  });


  // 任意で手動開始/停止も可能
  document.getElementById('bpm-light-start')?.addEventListener('click', (e) => {
    e.preventDefault();
    startBlink();
  });
  document.getElementById('bpm-light-stop')?.addEventListener('click', (e) => {
    e.preventDefault();
    stopBlink();
  });


/*「このように」に関して*/
  const playLink = document.getElementById('play-sample');
    const sampleAudio = document.getElementById('sample-audio');

    playLink.addEventListener('click', () => {
      // 先頭から再生
      sampleAudio.currentTime = 0;
      sampleAudio.play();
    });
