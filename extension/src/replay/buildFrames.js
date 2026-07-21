import { applyInsert } from "./applyInsert";
import { applyDelete } from "./applyDelete";
import { buildUserMap } from "../parser/buildUserMap";

export function buildFrames(edits, rawUserMap) {
  const userMap = buildUserMap(edits, rawUserMap);

  let document = "";
  const frames = [];

  for (const edit of edits) {
    switch (edit.type) {
      case "insert":
        document = applyInsert(document, edit.position, edit.text);
        break;
      case "delete":
        document = applyDelete(document, edit.start, edit.end);
        break;
      default:
        break;
    }

    const user = userMap[edit.author];

    frames.push({
      text: document,
      time: edit.timestamp,
      userId: edit.author,
      userName: user?.name || "Unknown",
      operation: edit,
    });
  }

  return frames;
}
