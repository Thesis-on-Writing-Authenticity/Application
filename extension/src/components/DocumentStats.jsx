export default function DocumentStats({
  wordCount,
  charCount,
  operations,
  revisions,
}) {
  return (
    <>
      <h3>Quick Statistics</h3>

      <table
        style={{
          width: "100%",
          fontSize: 13,
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr>
            <th>Words</th>
            <th>Characters</th>
            <th>Operations</th>
            <th>Revisions</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td style={{ textAlign: "center" }}>{wordCount}</td>
            <td style={{ textAlign: "center" }}>{charCount}</td>
            <td style={{ textAlign: "center" }}>{operations?.length ?? 0}</td>
            <td style={{ textAlign: "center" }}>{revisions?.length ?? 0}</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}