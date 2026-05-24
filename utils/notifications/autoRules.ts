/**
 * Configuration for automated system notifications and reminders.
 * You can easily edit notification titles, body text, icons, themes, and trigger times here.
 */
export const AUTO_NOTIFICATION_CONFIG = {
  // Rule 1: Daily income/expense record reminder
  recordReminder: {
    enabled: true,
    // Times of the day to check and trigger reminders (HH:MM in local time)
    times: ['12:00', '18:00', '21:00'],
    title: '📝 วันนี้บันทึกหรือยังนะ?',
    body: 'วันนี้คุณบันทึกรายรับ-รายจ่ายของบ้านแล้วรึยัง?? อย่าลืมสะสมข้อมูลความรักและความอบอุ่นการเงินนะ 💖',
    icon: '📝',
    theme: 'amber' as 'emerald' | 'rose' | 'amber' | 'blue',
  },

  // Rule 2: Reminder when there is no income entered today
  noIncomeReminder: {
    enabled: true,
    // Times of the day to check (HH:MM in local time)
    times: ['13:00', '19:00', '21:30'],
    title: '🏠 วันนี้ยังไม่มีรายรับเลย',
    body: 'วันนี้ยังไม่มีรายรับเข้าบ้านเลยนะ สู้ๆ นะคะทุกคน! มาร่วมมือรันบ้านของเรากันนะ 💪💵',
    icon: '💸',
    theme: 'rose' as 'emerald' | 'rose' | 'amber' | 'blue',
  },

  // Rule 3: Obligations/Bills scheduled reminders
  billReminder: {
    enabled: true,
    // Days before due date to trigger the reminder
    triggerDays: [14, 7, 3, 1],
    // Time of day to run the automated check (starts after this time)
    checkTime: '09:00',
    title: '📅 ครบกำหนดชำระบิล',
    // Dynamic text builder based on days remaining
    getBody: (billName: string, daysLeft: number, amount: number) => {
      const formattedAmount = Number(amount).toLocaleString('th-TH');
      if (daysLeft === 1) {
        return `บิล "${billName}" ยอด ฿${formattedAmount} จะครบกำหนดชำระ *วันพรุ่งนี้แล้วนะ*! คุณชำระแล้วรึยังคะ? ⏰`;
      }
      return `อีก ${daysLeft} วัน จะถึงกำหนดชำระบิล "${billName}" ยอด ฿${formattedAmount} ชำระเรียบร้อยรึยังเอ่ย? 💸`;
    },
    icon: '🔔',
    theme: 'blue' as 'emerald' | 'rose' | 'amber' | 'blue',
  }
};
