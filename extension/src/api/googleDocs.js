export async function getGoogleDocument(documentId, token) {
  const response = await fetch(
    `https://docs.googleapis.com/v1/documents/${documentId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return await response.json();
}

export async function getGoogleDocsRevisions(documentId, start, end, token) {
  const response = await fetch(
    `https://docs.google.com/document/d/${documentId}/revisions/load?id=${documentId}&start=${start}&end=${end}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return await response.text();
}

export async function getGoogleDocsTiles(documentId, token) {
  const response = await fetch(
    `https://docs.google.com/document/d/${documentId}/revisions/tiles?id=${documentId}&start=1&showDetailedRevisions=false`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const text = await response.text();
  const cleaned = text.replace(")]}'", "").trim();
  return JSON.parse(cleaned);
}