export function parseModelChunk(modelData) {
  if (!modelData || !modelData.chunk) {
    return null;
  }

  let text = "";

  const operations = [];

  for (const item of modelData.chunk) {
    if (item.ty === "is") {
      text += item.s || "";

      operations.push({
        type: "INSERT",

        text: item.s || "",
      });
    }
  }

  return {
    text,

    characters: text.length,

    words: text.trim().split(/\s+/).filter(Boolean).length,

    operations,
  };
}
