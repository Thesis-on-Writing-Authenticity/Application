export function buildUserMap(operations, rawUserMap) {
  if (!rawUserMap) {
    return {};
  }

  const userMap = { ...rawUserMap };

  Object.keys(userMap).forEach((id) => {
    const hasEdits = operations.some(
      (op) => String(op.author) === String(id)
    );
    if (!hasEdits) {
      delete userMap[id];
    }
  });

  Object.keys(userMap).forEach((id) => {
    if (!userMap[id].name) {
      userMap[id].name = "Anonymous";
    }
  });

  return userMap;
}