

export interface UserStreak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_streak_date: string; // YYYY-MM-DD
  streak_multiplier: number;
  updated_at: string;
}

export const getStreak = async (userId: string, db: any): Promise<UserStreak | null> => {
  const result = await db.prepare('SELECT * FROM user_streaks WHERE user_id = ?').bind(userId).first();
  return result as UserStreak | null;
};

export const updateStreak = async (userId: string, db: any) => {
  // Use Asia/Jakarta time (WIB)
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date()); // YYYY-MM-DD

  let streak = await getStreak(userId, db);

  if (!streak) {
    // Initialize if not exists
    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO user_streaks (id, user_id, current_streak, longest_streak, last_streak_date, streak_multiplier)
      VALUES (?, ?, 1, 1, ?, 1.0)
    `).bind(id, userId, today).run();
    return { current_streak: 1, multiplier: 1.0 };
  }

  if (streak.last_streak_date === today) {
    // Already updated today
    return { current_streak: streak.current_streak, multiplier: streak.streak_multiplier };
  }

  const lastDate = new Date(streak.last_streak_date);
  const currentDate = new Date(today);
  const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let newStreak = 1;
  let multiplier = 1.0;

  if (diffDays === 1) {
    // Consecutive day
    newStreak = streak.current_streak + 1;
  } else {
    // Streak broken
    newStreak = 1;
  }

  // Calculate multiplier
  if (newStreak >= 20) multiplier = 2.0;
  else if (newStreak >= 10) multiplier = 1.5;
  else if (newStreak >= 5) multiplier = 1.2;
  else multiplier = 1.0;

  const longest = Math.max(newStreak, streak.longest_streak);

  await db.prepare(`
    UPDATE user_streaks 
    SET current_streak = ?, longest_streak = ?, last_streak_date = ?, streak_multiplier = ?, updated_at = datetime('now')
    WHERE user_id = ?
  `).bind(newStreak, longest, today, multiplier, userId).run();

  return { current_streak: newStreak, multiplier };
};
