export async function getRevisions(documentId, token) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${documentId}/revisions?fields=revisions(id,modifiedTime,lastModifyingUser)`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = await response.json();

  return data.revisions || [];
}
