export function getEditDeadline() {
  const rawDeadline = process.env.PRODE_EDIT_DEADLINE;
  if (!rawDeadline) return null;
  const deadline = new Date(rawDeadline);
  return Number.isNaN(deadline.getTime()) ? null : deadline;
}

export function getEditWindow() {
  const deadline = getEditDeadline();
  const now = new Date();
  return {
    deadline: deadline?.toISOString() ?? null,
    open: !deadline || now <= deadline,
  };
}
