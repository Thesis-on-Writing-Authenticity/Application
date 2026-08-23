export function formatWritingDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return "0 min";
  }

  const totalMinutes = Math.round(ms / 60000);

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${minutes} min`;
}

export function formatPercentage(value) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  if (Number.isInteger(value)) {
    return `${value}%`;
  }

  return `${value.toFixed(1)}%`;
}