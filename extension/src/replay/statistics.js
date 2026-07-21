function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function buildUserStats(frames) {
  const stats = {};
  let previousWordCount = 0;

  frames.forEach((frame, index) => {
    const op = frame.operation;

    if (!op) {
      return;
    }

    const id = frame.userId;

    if (!stats[id]) {
      stats[id] = {
        name: frame.userName,
        wordsAdded: 0,
        wordsDeleted: 0,
        charsAdded: 0,
        charsDeleted: 0,
      };
    }

    const currentWordCount = wordCount(frame.text);
    const wordDelta = currentWordCount - previousWordCount;

    if (op.type === "insert") {
      stats[id].charsAdded += op.text.length;

      if (wordDelta > 0) {
        stats[id].wordsAdded += wordDelta;
      }
    } else if (op.type === "delete") {
      const previousFrame = index > 0 ? frames[index - 1] : null;
      const deletedText = previousFrame
        ? previousFrame.text.slice(op.start, op.end + 1)
        : "";

      stats[id].charsDeleted += deletedText.length;

      if (wordDelta < 0) {
        stats[id].wordsDeleted += -wordDelta;
      }
    }

    previousWordCount = currentWordCount;
  });

  return Object.values(stats);
}