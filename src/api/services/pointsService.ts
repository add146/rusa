export const calculateAttendancePoints = (isOnTime: boolean, streakMultiplier: number): number => {
  const basePoints = 10;
  const onTimeBonus = isOnTime ? 5 : 0;
  return Math.round((basePoints + onTimeBonus) * streakMultiplier);
};

export const calculateCheckoutPoints = (checkInAt: string, checkOutAt: string, streakMultiplier: number): number => {
  const start = new Date(checkInAt);
  const end = new Date(checkOutAt);
  const hoursWorked = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

  // Full day bonus: 5 points if working 8-13 hours
  if (hoursWorked >= 8 && hoursWorked <= 13) {
    return Math.round(5 * streakMultiplier);
  }
  return 0;
};

export const awardPoints = async (
  userId: string,
  amount: number,
  type: string,
  referenceId: string,
  description: string,
  db: any
) => {
  if (amount <= 0) return;

  // 1. Add to user balance
  await db.prepare('UPDATE users SET points_balance = points_balance + ? WHERE id = ?')
    .bind(amount, userId).run();

  // 2. Record in ledger
  await db.prepare(`
    INSERT INTO points_ledger (id, user_id, transaction_type, amount, reference_type, reference_id, description, balance_after)
    SELECT ?, ?, 'earn', ?, ?, ?, ?, points_balance FROM users WHERE id = ?
  `).bind(crypto.randomUUID(), userId, amount, type, referenceId, description, userId).run();

  return { success: true, amount };
};
