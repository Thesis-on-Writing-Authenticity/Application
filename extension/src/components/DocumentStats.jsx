export default function DocumentStats({
  wordCount,
  charCount,
  operations,
  revisions,
}) {
  return (
    <>
      <hr />
      <h3>Statistics</h3>

      <p>
        Words:
        <b> {wordCount}</b>
      </p>

      <p>
        Characters:
        <b> {charCount}</b>
      </p>

      <p>
        Operations:
        <b> {operations?.length ?? 0}</b>
      </p>

      <p>
        Revisions:
        <b> {revisions.length}</b>
      </p>
    </>
  );
}