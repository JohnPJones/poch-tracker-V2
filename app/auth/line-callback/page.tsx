'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function LineCallback() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('กำลังตรวจสอบ...');

  useEffect(() => {
    async function handleCallback() {
      try {
        // ดึงข้อมูล customer ที่เก็บไว้
        const pendingCustomer = localStorage.getItem('pending_customer');
        if (!pendingCustomer) {
          setStatus('เกิดข้อผิดพลาด: ไม่พบข้อมูลลูกค้า');
          return;
        }

        const customer = JSON.parse(pendingCustomer);

        // ดึง LINE user profile
        const lineRes = await fetch('/api/auth/session');
        const session = await lineRes.json();
        
        if (!session?.user?.id) {
          setStatus('เกิดข้อผิดพลาด: LINE authentication ล้มเหลว');
          return;
        }

        const lineUserId = session.user.id;
        setStatus('กำลังตรวจสอบสถานะเพื่อน...');

        // เช็ค friend status
        const friendRes = await fetch('/api/line/check-friend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: lineUserId }),
        });

        const { isFriend } = await friendRes.json();
        setStatus('กำลังบันทึกข้อมูล...');

        // Update Shopify
        await fetch('/api/shopify/update-customer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: customer.customer_id,
            line_verified: true,
            line_user_id: lineUserId,
            line_marketing_agreed: isFriend,
          }),
        });

        // ลบข้อมูล pending
        localStorage.removeItem('pending_customer');

        setStatus('สำเร็จ! กำลังเข้าสู่ระบบ...');

        // Redirect กลับไปหน้าหลัก
        setTimeout(() => {
          window.location.href = `/?line_verified=true&phone=${customer.phone}`;
        }, 1000);

      } catch (error) {
        console.error('Callback error:', error);
        setStatus('เกิดข้อผิดพลาด: ' + (error as Error).message);
      }
    }

    handleCallback();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-lg text-gray-700">{status}</p>
      </div>
    </div>
  );
}