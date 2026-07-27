export default function PlaybackDocument({ frame, previousFrame }) {
  if (!frame) {
    return null;
  }

  const operation = frame.operation;

  if (!operation) {
    return (
      <div
        style={{
          whiteSpace: "pre-wrap",
          backgroundColor: "#fff",
          border: "1px solid #ddd",
          padding: 10,
          minHeight: 180,
          borderRadius: 6,
          fontFamily: "Arial",
          fontSize: 14,
        }}
      >
        {frame.text}
      </div>
    );
  }

  if (operation.type === "insert") {
    const start = operation.position;
    const end = start + operation.text.length;

    return (
      <div
        style={{
          whiteSpace: "pre-wrap",
          backgroundColor: "#fff",
          border: "1px solid #ddd",
          padding: 10,
          minHeight: 180,
          borderRadius: 6,
          fontFamily: "Arial",
          fontSize: 14,
        }}
      >
        {frame.text.slice(0, start)}

        <span
          style={{
            backgroundColor: "#9be79b",
            borderRadius: 3,
          }}
        >
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
      <div
        style={{
          whiteSpace: "pre-wrap",
          backgroundColor: "#fff",
          border: "1px solid #ddd",
          padding: 10,
          minHeight: 180,
          borderRadius: 6,
          fontFamily: "Arial",
          fontSize: 14,
        }}
      >
        {frame.text.slice(0, operation.start)}

        <span
          style={{
            color: "#d32f2f",
            textDecoration: "line-through",
            backgroundColor: "#ffd6d6",
            borderRadius: 3,
          }}
        >
          {deleted}
        </span>

        {frame.text.slice(operation.start)}
      </div>
    );
  }

  return (
    <div
      style={{
        whiteSpace: "pre-wrap",
        backgroundColor: "#fff",
        border: "1px solid #ddd",
        padding: 10,
        minHeight: 180,
        borderRadius: 6,
        fontFamily: "Arial",
        fontSize: 14,
      }}
    >
      {frame.text}
    </div>
  );
}
