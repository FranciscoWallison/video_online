export function createRecorder(compositeVideoStream, audioTracks = []) {
  // Merge audio tracks into the composite stream
  const finalStream = new MediaStream();

  // Add video track from composite
  for (const track of compositeVideoStream.getVideoTracks()) {
    finalStream.addTrack(track);
  }

  // Add all audio tracks
  for (const track of audioTracks) {
    finalStream.addTrack(track);
  }

  // Pick best supported codec
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(finalStream, {
    mimeType,
    videoBitsPerSecond: 2_500_000,
  });

  const chunks = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return {
    start() {
      chunks.length = 0;
      recorder.start(1000); // 1s timeslice
    },

    pause() {
      if (recorder.state === 'recording') recorder.pause();
    },

    resume() {
      if (recorder.state === 'paused') recorder.resume();
    },

    stop() {
      return new Promise((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          resolve(blob);
        };
        recorder.stop();
      });
    },

    get state() {
      return recorder.state;
    },
  };
}

function pickMimeType() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return 'video/webm';
}

export function mixAudioTracks(tracks) {
  if (tracks.length === 0) return [];
  if (tracks.length === 1) return tracks;

  // Mix multiple audio tracks using AudioContext
  const ctx = new AudioContext();
  const dest = ctx.createMediaStreamDestination();

  for (const track of tracks) {
    const stream = new MediaStream([track]);
    const source = ctx.createMediaStreamSource(stream);
    source.connect(dest);
  }

  return dest.stream.getAudioTracks();
}
