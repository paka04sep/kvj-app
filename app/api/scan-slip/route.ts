import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: NextRequest) {
  try {
    const apiKey = 
      process.env.GEMINI_API_KEY || 
      process.env.NEXT_PUBLIC_GEMINI_API_KEY || 
      process.env.GEMINI_APK_KEY || 
      process.env.NEXT_PUBLIC_GEMINI_APK_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'ยังไม่ได้กำหนด GEMINI_API_KEY ใน Environment Variables ของระบบ (กรุณาตรวจสอบว่าสะกดถูกต้องใน .env.local)' },
        { status: 500 }
      )
    }

    const { image, categories } = await req.json()

    if (!image) {
      return NextResponse.json({ error: 'ไม่พบไฟล์รูปภาพสลิป' }, { status: 400 })
    }

    // Initialize Google Generative AI
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json'
      }
    })

    // Extract base64 details
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '')
    
    const prompt = `
คุณคือผู้เชี่ยวชาญการวิเคราะห์สลิปธนาคารและใบเสร็จรับเงินภาษาไทย (Bank Slips, Receipts, Handwritten bills, cash notes)
จงวิเคราะห์ภาพที่ส่งมาและดึงข้อมูลธุรกรรมที่ถูกต้องที่สุดออกมาในรูปแบบ JSON เท่านั้น

กติกาในการวิเคราะห์:
1. ตรวจสอบว่าภาพนี้เป็นสลิปโอนเงิน (เช่น K PLUS, SCB Easy, Krungthai NEXT) หรือใบเสร็จทั่วไป
2. ระบุประเภท "type":
   - "expense" (รายจ่าย): หากเป็นสลิปโอนเงินออก, จ่ายเงินค่าสินค้า/บริการ, ซื้อของ
   - "income" (รายรับ): หากเป็นสลิปโอนเงินเข้า, ได้รับเงินคืน, เงินเดือนเข้า
3. ระบุจำนวนเงิน "amount": เป็นตัวเลขทศนิยม (float) เช่น 150.00 หรือ 2500 (ไม่ต้องใส่คอมม่า)
4. ระบุวันที่ทำรายการ "date": ในฟอร์แมต "YYYY-MM-DD" หากหาไม่เจอหรือคลุมเครือ ให้ใช้วันที่ปัจจุบัน
5. ระบุรายละเอียด "description": สรุปรายการสั้นๆ เป็นภาษาไทย เช่น "โอนเงินจ่ายค่าข้าวให้ส้ม", "ซื้อของร้านสะดวกซื้อ", "เงินโอนเข้าจากคุณพ่อ"
6. เลือกหมวดหมู่ "category" ที่เหมาะสมที่สุดจากรายการหมวดหมู่ที่มีให้ดังต่อไปนี้:
   ${categories && categories.length > 0 ? categories.map((c: string) => `   - "${c}"`).join('\n') : '   - "ค่าข้าว"\n   - "ค่าไปโรงเรียนน้อง"\n   - "รายได้รายวัน"\n   - "รายได้เสริม"\n   - "อื่นๆ"'}
   * หากไม่มีหมวดหมู่ใดเหมาะสมเลย ให้ใช้หมวดหมู่ "อื่นๆ"

รูปแบบผลลัพธ์ที่ต้องการ (JSON JSON Only):
{
  "type": "income" | "expense",
  "amount": number,
  "date": "YYYY-MM-DD",
  "category": "ชื่อหมวดหมู่ที่เลือก",
  "description": "รายละเอียดภาษาไทยสั้นๆ"
}
`

    // Call Gemini 2.5 Flash for multimodal processing
    const response = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data
        }
      }
    ])

    const text = response.response.text()
    if (!text) {
      throw new Error('ไม่สามารถดึงข้อมูลจากสลิปได้')
    }

    const result = JSON.parse(text)

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Scan Slip API Error:', error)
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในการวิเคราะห์สลิปด้วย AI' },
      { status: 500 }
    )
  }
}
