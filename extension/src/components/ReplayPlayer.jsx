import { useEffect, useState } from "react";
import PlaybackDocument from "./ReplayFrame";

export default function PlaybackViewer({ frames }) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setCurrentFrame(0);
    setPlaying(false);
  }, [frames]);

  useEffect(() => {
    if (!playing || !frames.length) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentFrame((frame) => {
        if (frame >= frames.length - 1) {
          setPlaying(false);
          return frame;
        }

        return frame + 1;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [playing, frames]);

  if (!frames.length) {
    return null;
  }

  const frame = frames[currentFrame];
  const previousFrame = currentFrame > 0 ? frames[currentFrame - 1] : null;

  return (
    <>
      <hr />

      <h3>Playback</h3>

      <PlaybackDocument frame={frame} previousFrame={previousFrame} />

      <input
        type="range"
        min={0}
        max={frames.length - 1}
        value={currentFrame}
        onChange={(e) => setCurrentFrame(Number(e.target.value))}
        style={{
          width: "100%",
          marginTop: 15,
        }}
      />

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 10,
        }}
      >
        <button onClick={() => setCurrentFrame(0)}>⏮</button>

        <button onClick={() => setCurrentFrame((i) => Math.max(0, i - 1))}>
          ◀
        </button>

        <button onClick={() => {
            if (currentFrame >= frames.length - 1) {
              setCurrentFrame(0);
            }
            setPlaying((p) => !p);
          }}
        >
          {playing ? "Pause" : "Play"}
        </button>

        <button
          onClick={() =>
            setCurrentFrame((i) => Math.min(frames.length - 1, i + 1))
          }
        >
          ▶
        </button>

        <button onClick={() => setCurrentFrame(frames.length - 1)}>⏭</button>
      </div>

      <div
        style={{
          marginTop: 15,
          fontSize: 13,
        }}
      >
        <div>
          <strong>Frame:</strong> {currentFrame + 1} / {frames.length}
        </div>

        <div>
          <strong>User:</strong> {frame.userName}
        </div>

        <div>
          <strong>Time:</strong> {new Date(frame.time).toLocaleString()}
        </div>
      </div>
    </>
  );
}
