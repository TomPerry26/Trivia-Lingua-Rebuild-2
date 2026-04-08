// Guest progress tracking utilities

interface GuestProgress {
  date: string; // YYYY-MM-DD
  wordsRead: number;
  quizzesCompleted: number;
  dailyTarget: number;
}

function getTodayDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const GUEST_PROGRESS_KEY = 'guestProgress';
const DEFAULT_DAILY_TARGET = 1000;

export function getGuestProgress(): GuestProgress {
  const today = getTodayDate();
  const stored = localStorage.getItem(GUEST_PROGRESS_KEY);
  
  if (stored) {
    try {
      const progress = JSON.parse(stored) as GuestProgress;
      // If the stored date is today, return it
      if (progress.date === today) {
        return progress;
      }
    } catch (e) {
      console.error('Failed to parse guest progress:', e);
    }
  }
  
  // Return fresh progress for today
  return {
    date: today,
    wordsRead: 0,
    quizzesCompleted: 0,
    dailyTarget: DEFAULT_DAILY_TARGET,
  };
}

export function updateGuestProgress(wordsToAdd: number): void {
  const today = getTodayDate();
  const current = getGuestProgress();
  
  const updated: GuestProgress = {
    date: today,
    wordsRead: current.wordsRead + wordsToAdd,
    quizzesCompleted: current.quizzesCompleted + 1,
    dailyTarget: current.dailyTarget,
  };
  
  localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(updated));
}

export function updateGuestDailyTarget(newTarget: number): void {
  const current = getGuestProgress();
  current.dailyTarget = newTarget;
  localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(current));
}
