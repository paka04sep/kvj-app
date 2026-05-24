export type NotificationType =
  | 'transaction_created'
  | 'transaction_updated'
  | 'transaction_deleted'
  | 'settlement_created'
  | 'obligation_created'
  | 'obligation_paid'
  | 'savings_goal_updated'
  | 'auto_system_reminder';

export interface NotificationMetadata {
  amount?: number;
  description?: string;
  category?: string;
  type?: 'income' | 'expense';
  month?: string;
  target_amount?: number;
  receiver_name?: string;
  old_amount?: number;
  old_description?: string;
}

// Helper to format English style month (e.g. '2026-05') into Thai month (e.g. 'พฤษภาคม 2569')
const formatThaiMonth = (monthStr?: string) => {
  if (!monthStr) return 'ไม่ระบุเดือน';
  try {
    const [year, month] = monthStr.split('-');
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const mIndex = parseInt(month, 10) - 1;
    const thYear = parseInt(year, 10) + 543;
    if (mIndex >= 0 && mIndex < 12) {
      return `${months[mIndex]} ${thYear}`;
    }
    return monthStr;
  } catch (e) {
    return monthStr;
  }
};

/**
 * Returns formatted notification details (title, body, icon, theme)
 * Easily customizable in one place!
 */
export const getNotificationText = (
  actionType: string,
  actorName: string,
  metadata: NotificationMetadata
): { title: string; body: string; icon: string; theme: 'emerald' | 'rose' | 'amber' | 'blue' } => {
  const name = actorName || 'สมาชิกในบ้าน';

  switch (actionType) {
    case 'transaction_created': {
      const isIncome = metadata.type === 'income';
      const formattedAmount = metadata.amount ? Number(metadata.amount).toLocaleString() : '0';
      const cat = metadata.category ? metadata.category.split(' ').pop() : 'ไม่ระบุหมวดหมู่';
      return {
        title: isIncome ? '💸 มีรายรับใหม่เข้ามา!' : '🛒 บันทึกรายจ่ายใหม่',
        body: `${name} ได้บันทึก "${metadata.description}" จำนวน ฿${formattedAmount} ในหมวด [${cat}]`,
        icon: isIncome ? '📈' : '📉',
        theme: isIncome ? 'emerald' : 'rose'
      };
    }

    case 'transaction_updated': {
      const formattedAmount = metadata.amount ? Number(metadata.amount).toLocaleString() : '0';
      return {
        title: '✏️ มีการแก้ไขรายการเงิน',
        body: `${name} ได้แก้ไขรายการเป็น "${metadata.description}" ยอดใหม่ ฿${formattedAmount}`,
        icon: '📝',
        theme: 'amber'
      };
    }

    case 'transaction_deleted': {
      const formattedAmount = metadata.amount ? Number(metadata.amount).toLocaleString() : '0';
      return {
        title: '🗑️ รายการเงินถูกลบออก',
        body: `${name} ได้ลบรายการ "${metadata.description}" ยอด ฿${formattedAmount}`,
        icon: '⚠️',
        theme: 'rose'
      };
    }

    case 'settlement_created': {
      const formattedAmount = metadata.amount ? Number(metadata.amount).toLocaleString() : '0';
      return {
        title: '🤝 คืนเงินเรียบร้อย',
        body: `${name} ได้โอนเงินคืนให้ ${metadata.receiver_name || 'สมาชิกในบ้าน'} จำนวน ฿${formattedAmount}`,
        icon: '✅',
        theme: 'emerald'
      };
    }

    case 'obligation_created': {
      const formattedAmount = metadata.amount ? Number(metadata.amount).toLocaleString() : '0';
      return {
        title: '📌 เพิ่มบิลค่าใช้จ่ายใหม่',
        body: `มีรายการเรียกเก็บเงินค่า "${metadata.description}" ยอดเงิน ฿${formattedAmount}`,
        icon: '📅',
        theme: 'blue'
      };
    }

    case 'obligation_paid': {
      const formattedAmount = metadata.amount ? Number(metadata.amount).toLocaleString() : '0';
      return {
        title: '🎉 ชำระบิลเรียบร้อย!',
        body: `${name} ได้ทำการชำระค่าบิล "${metadata.description}" จำนวน ฿${formattedAmount} แล้ว`,
        icon: '💖',
        theme: 'emerald'
      };
    }

    case 'savings_goal_updated': {
      const formattedAmount = metadata.target_amount ? Number(metadata.target_amount).toLocaleString() : '0';
      return {
        title: '🎯 ปรับเป้าหมายการออม',
        body: `${name} ได้ปรับเป้าหมายการออมประจำเดือน ${formatThaiMonth(metadata.month)} เป็น ฿${formattedAmount}`,
        icon: '🏆',
        theme: 'amber'
      };
    }

    case 'auto_system_reminder': {
      return {
        title: metadata.category || '🔔 แจ้งเตือนระบบ',
        body: metadata.description || '',
        icon: metadata.receiver_name || '🤖',
        theme: (metadata.type as any) || 'amber'
      };
    }

    default:
      return {
        title: '🔔 กิจกรรมใหม่ในครอบครัว',
        body: `${name} ได้ทำรายการอัปเดตระบบการเงินของบ้าน`,
        icon: '🏡',
        theme: 'blue'
      };
  }
};
