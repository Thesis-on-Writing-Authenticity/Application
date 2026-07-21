export function applyDelete(document, start, end) {
  return document.slice(0, start) + document.slice(end + 1);
}
