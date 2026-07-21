import { parseOperation } from "./operationHandler";

export function parseChangeLog(data) {
  const operations = [];

  if (!Array.isArray(data?.changelog)) {
    return operations;
  }

  for (const entry of data.changelog) {
    const metadata = {
      timestamp: entry[1],
      author: entry[2],
      revision: entry[3],
      session: entry[4],
      index: entry[5],
    };

    operations.push(...parseOperation(entry[0], metadata));
  }

  return operations;
}