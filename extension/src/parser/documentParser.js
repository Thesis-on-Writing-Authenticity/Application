export function extractText(document) {
  let text = "";
  const content = document.body?.content || [];
  for (const item of content) {
    if (!item.paragraph) {
      continue;
    }

    const elements = item.paragraph.elements || [];
    for (const element of elements) {
      if (element.textRun?.content) {
        text += element.textRun.content;
      }
    }
  }
  return text.trim();
}
