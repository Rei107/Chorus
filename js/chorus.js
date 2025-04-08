let mediaRecorder;
let recordedChunks = [];
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let recordedBuffer;

/* 録音・再生ボタン関連(見本あり録音・見本なし録音) */
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
                stream.getTracks().forEach(track => track.stop()); // ストリームを停止
            };

            // マイクアクセスが許可された場合に successAudioId を再生
            playAudio(successAudioId);

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

setupRecorder('record1', 'stop1', 'play1', 'audio1', 'audio6');
setupRecorder('record2', 'stop2', 'play2', 'audio2', 'audio4');



/* 見本音声再生 */
document.getElementById('Teacher').addEventListener('click', () => {
    playAudio('audio3');
});

document.getElementById('Teacher2').addEventListener('click', () => {
    playAudio('audio5');
});

/* 見本あり録音再生 */
document.getElementById('play1').addEventListener('click', () => {
    playAudio('audio1');
    playAudio('audio4');
});

/* 見本なし録音再生 */
document.getElementById('play2').addEventListener('click', () => {
    playAudio('audio2');
    playAudio('audio4');
});

/* 見本あり同時再生 */
document.getElementById('play3').addEventListener('click', () => {
    playAudio('audio1');

    playAudio('audio6');
});

/* 見本ありスロー同時再生 */
document.getElementById('slow1').addEventListener('click', () => {
    playAudio('audio1', 0.85); // 半分の速度で再生
    playAudio('audio6', 0.85); // 半分の速度で再生
});

/* 見本なし同時再生 */
document.getElementById('play4').addEventListener('click', () => {
    // audio2はすぐに再生
    audio2.play();

    // audio3の再生を0.2秒遅らせる
    setTimeout(() => {
        audio6.play();
    }, 150); // 200ms（0.2秒）遅延
});

/* 見本なしスロー同時再生 */
document.getElementById('slow2').addEventListener('click', () => {
    // audio 要素を取得
    const audio2 = document.getElementById('audio2');
    const audio6 = document.getElementById('audio6');
    
    // 再生速度を設定
    audio2.playbackRate = 0.85;
    audio6.playbackRate = 0.85;

    // audio2はすぐに再生
    audio2.play();

    // audio6の再生を0.2秒遅らせる
    setTimeout(() => {
        audio6.play();
    }, 150); // 200ms（0.2秒）遅延
});




/* ノイズ除去 */
function applyNoiseReduction(buffer) {
    // ノイズ除去の実装
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

    const targetGain = Math.max(getRMS(recordedBuffer), getRMS(existingBuffer1), getRMS(existingBuffer2), getRMS(existingBuffer3));

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
    }, 150); // 150msの遅延を加える
    setTimeout(() => {
        playBuffer(audioContext, existingBuffer3, existingGainNode3);
    }, 300); // 300msの遅延を加える
}

/*クリック時にデフォルトで上にいってしまうのを防止*/
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