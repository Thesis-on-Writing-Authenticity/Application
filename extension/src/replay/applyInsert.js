export function applyInsert(document, position, text) {
  return document.slice(0, position) + text + document.slice(position);
}
