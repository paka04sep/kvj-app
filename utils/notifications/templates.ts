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
      const formattedAmount = metadata.amount ? Number(metadata.amount).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00';
      return {
        title: isIncome ? '💰 มีรายรับเข้าบ้านแล้วคร้าบบ' : '💸 มีรายจ่ายอีกแล้วคร้าบบ!',
        body: `${name} บันทึก${isIncome ? 'รายรับ' : 'รายจ่าย'}\n"${metadata.description}" จำนวนเงิน ฿${formattedAmount}`,
        icon: isIncome ? '📈' : '📉', 
        theme: isIncome ? 'emerald' : 'rose'
      }; 
    }

    case 'transaction_updated': {
      const formattedAmount = metadata.amount ? Number(metadata.amount).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00';
      return {
        title: '📝 แก้ไขรายการ',
        body: `${name} แก้ไขรายการ\n"${metadata.description}" จำนวนเงิน ฿${formattedAmount}`,
        icon: '📝',
        theme: 'amber'
      };
    }

    case 'transaction_deleted': {
      const formattedAmount = metadata.amount ? Number(metadata.amount).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00';
      return {
        title: '🗑️ ลบรายการ',
        body: `${name} ลบรายการ\n"${metadata.description}" จำนวนเงิน ฿${formattedAmount}`,
        icon: '⚠️',
        theme: 'rose'
      };
    }

    case 'settlement_created': {
      const formattedAmount = metadata.amount ? Number(metadata.amount).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00';
      return {
        title: 'คืนเงิน',
        body: `${name} โอนเงินคืนให้ ${metadata.receiver_name || 'สมาชิกในบ้าน'}\n"โอนคืนเรียบร้อย" ฿${formattedAmount}`,
        icon: '✅',
        theme: 'emerald'
      };
    }

    case 'obligation_created': {
      const formattedAmount = metadata.amount ? Number(metadata.amount).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00';
      return {
        title: '📌 มีบิลที่ต้องชำระเพิ่มครับบ!',
        body: `${name} เพิ่มบิลใหม่\n"${metadata.description}" จำนวนเงิน ฿${formattedAmount}`,
        icon: '📅',
        theme: 'blue' 
      };
    }

    case 'obligation_paid': {
      const formattedAmount = metadata.amount ? Number(metadata.amount).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00';
      return {
        title: '💖 ชำระบิลประจำเดือนแล้วครับบ',
        body: `${name} ชำระค่าบิล\n"${metadata.description}" จำนวนเงิน ฿${formattedAmount}`,
        icon: '💖',
        theme: 'emerald'
      };
    }

    case 'savings_goal_updated': {
      const formattedAmount = metadata.target_amount ? Number(metadata.target_amount).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00';
      return {
        title: 'ปรับเป้าหมายการออม',
        body: `${name} ปรับเป้าหมายการออม\n"ประจำเดือน ${formatThaiMonth(metadata.month)}" จำนวนเงิน ฿${formattedAmount}`,
        icon: '🏆',
        theme: 'amber'
      };
    }

    case 'auto_system_reminder': {
      return {
        title: `[KVJ FAMILY] ${metadata.category || 'แจ้งเตือนระบบ'}`,
        body: metadata.description || '',
        icon: metadata.receiver_name || '🤖',
        theme: (metadata.type as any) || 'amber'
      };
    }

    default:
      return {
        title: '[KVJ FAMILY] กิจกรรมใหม่ในครอบครัว',
        body: `${name} - อัปเดตระบบการเงินของบ้าน`,
        icon: '🏡',
        theme: 'blue'
      };
  }
};
