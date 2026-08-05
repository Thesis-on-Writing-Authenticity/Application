import "./ReplayFrame.css";

export default function PlaybackDocument({ frame, previousFrame }) {
  if (!frame) {
    return null;
  }

  const operation = frame.operation;

  if (!operation) {
    return (
      <div className="playbackDocument">
        {frame.text}
      </div>
    );
  }

  if (operation.type === "insert") {
    const start = operation.position;
    const end = start + operation.text.length;

    return (
      <div className="playbackDocument">
        {frame.text.slice(0, start)}

        <span className="insertHighlight">
          {frame.text.slice(start, end)}
        </span>

        {frame.text.slice(end)}
      </div>
    );
  }

  if (operation.type === "delete" && previousFrame) {
    const deleted = previousFrame.text.slice(
      operation.start,
      operation.end + 1,
    );

    return (
      <div className="playbackDocument">
        {frame.text.slice(0, operation.start)}

        <span className="deleteHighlight">
          {deleted}
        </span>

        {frame.text.slice(operation.start)}
      </div>
    );
  }

  return (
    <div className="playbackDocument">
      {frame.text}
    </div>
  );
}