export default function StatsBar({ stats }) {
  if (!stats.length) {
    return null;
  }

  return (
    <>
      <hr />
      <h3>Contributions</h3>
      <table
        style={{
          width: "100%",
          fontSize: 13,
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>User</th>
            <th>Words Added</th>
            <th>Words Deleted</th>
            <th>Characters Added</th>
            <th>Characters Deleted</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((user) => (
            <tr key={user.name}>
              <td>{user.name}</td>
              <td style={{ textAlign: "center", color: "#2e7d32" }}>
                {user.wordsAdded}
              </td>
              <td style={{ textAlign: "center", color: "#d32f2f" }}>
                {user.wordsDeleted}
              </td>
              <td style={{ textAlign: "center", color: "#2e7d32" }}>
                {user.charsAdded}
              </td>
              <td style={{ textAlign: "center", color: "#d32f2f" }}>
                {user.charsDeleted}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}