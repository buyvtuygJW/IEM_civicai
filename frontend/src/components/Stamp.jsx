const LABELS = {
  submitted: "Submitted",
  in_progress: "In Progress",
  resolved: "Resolved",
  escalated: "Escalated",
};

export default function Stamp({ status }) {
  const cls = `stamp stamp-${status}`;
  return <span className={cls}>{LABELS[status] || status}</span>;
}
