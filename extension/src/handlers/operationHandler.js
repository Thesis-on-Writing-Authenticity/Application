function insert(operation, metadata) {
  return [
    {
      type: "insert",
      position: operation.ibi - 1,
      text: operation.s,
      length: operation.s.length,
      ...metadata,
    },
  ];
}

function remove(operation, metadata) {
  return [
    {
      type: "delete",
      start: operation.si - 1,
      end: operation.ei - 1,
      length: operation.ei - operation.si + 1,
      ...metadata,
    },
  ];
}

function style(operation, metadata) {
  return [
    {
      type: "style",
      start: operation.si - 1,
      end: operation.ei - 1,
      styleType: operation.st,
      style: operation.sm,
      ...metadata,
    },
  ];
}

function multi(operation, metadata) {
  return operation.mts.flatMap((child) =>
    parseOperation(child, metadata),
  );
}

const handlers = {
  is: insert,
  ds: remove,
  as: style,
  mlti: multi,
};

export function parseOperation(operation, metadata) {
  const handler = handlers[operation.ty];

  if (!handler) {
    return [
      {
        type: operation.ty,
        raw: operation,
        ...metadata,
      },
    ];
  }

  return handler(operation, metadata);
}