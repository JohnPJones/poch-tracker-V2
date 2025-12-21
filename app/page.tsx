'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { Plus, Home as HomeIcon, Menu, X, BarChart, User, Users, Zap, AlignJustify } from 'lucide-react';

export default function Home() {
  const [phone, setPhone] = useState('');
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  
  // New OTP state
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(""));
  const [otpError, setOtpError] = useState('');

  // Form states
  const [editWeight, setEditWeight] = useState('');
  const [editStage, setEditStage] = useState('');
  const [editDob, setEditDob] = useState('');

  // This function now starts the original login process
  const startShopifyAndLineProcess = async () => {
    setIsLoading(true);
    const res = await fetch('/api/shopify/customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    
    if (!res.ok) {
      alert('ไม่พบข้อมูลสมาชิก');
      setIsLoading(false);
      return;
    }
    
    const customer = await res.json();
    localStorage.setItem('pending_customer', JSON.stringify(customer));
    signIn('line', { 
      callbackUrl: window.location.origin + '/auth/line-callback'
    });
  };

  const handleSendOtp = async () => {
    setIsLoading(true);
    setOtpError('');
    try {
      const res = await fetch('/api/twilio/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      if (!res.ok) {
        throw new Error('ไม่สามารถส่ง OTP ได้');
      }

      setShowOtpScreen(true);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleVerifyOtp = async () => {
    setIsLoading(true);
    setOtpError('');
    const otpCode = otp.join('');

    try {
      const res = await fetch('/api/twilio/check-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otpCode }),
      });

      const data = await res.json();

      if (!res.ok || data.status !== 'approved') {
        setOtpError('รหัส OTP ไม่ถูกต้อง');
        setOtp(new Array(6).fill("")); // Reset OTP input
        return;
      }

      // OTP is correct, proceed with original flow
      await startShopifyAndLineProcess();

    } catch (error) {
      setOtpError('เกิดข้อผิดพลาดในการยืนยัน OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomerData = async (phoneNumber: string) => {
    try {
      const res = await fetch('/api/shopify/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber }),
      });
      
      if (res.ok) {
        const customer = await res.json();
        setUser(customer);
        setEditWeight(customer.weight_kg?.toString() || '');
        setEditStage(customer.disease_stage || '');
        setEditDob(customer.dob || '');
        loadOrders(customer.customer_id);
        loadLogs(customer.customer_id, selectedDate);
      } else {
        console.error('Failed to load customer data');
        alert('ไม่สามารถโหลดข้อมูลลูกค้าได้ กรุณาลองใหม่อีกครั้ง');
      }
    } catch (error) {
      console.error('Error loading customer data:', error);
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
        if (window.location.search.includes('line_verified=true')) {
            window.history.replaceState({}, '', '/');
        }
    }
  };

  const loadCustomer = async () => {
    if (phone) {
      await loadCustomerData(phone);
    }
  };

  const loadOrders = async (customerId: string) => {
    const res = await fetch(`/api/shopify/orders?customerId=${customerId}`);
    const data = await res.json();
    setProducts(data);
  };

  const loadLogs = async (customerId: string, date: string) => {
    const res = await fetch(`/api/nutrition/logs?customerId=${customerId}&date=${date}`);
    const data = await res.json();
    setLogs(data);
  };

  const addMeal = async (product: any) => {
    await fetch('/api/nutrition/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: user.customer_id,
        eat_protein: product.protein_g,
        eat_calories: product.calories,
        eat_carbs: product.carbs_g,
        eat_fat: product.fat_g,
        eat_product_id: product.id,
      }),
    });
    
    loadLogs(user.customer_id, selectedDate);
    setShowAddMenu(false);
  };

  const updateProfile = async () => {
    const res = await fetch('/api/shopify/update-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: user.customer_id,
        weight_kg: parseFloat(editWeight),
        disease_stage: editStage,
        dob: editDob,
      }),
    });
    
    if (res.ok) {
      alert('บันทึกข้อมูลสำเร็จ');
      await loadCustomer();
      setShowProfile(false);
    } else {
      alert('เกิดข้อผิดพลาด');
    }
  };

  useEffect(() => {
    if (user && selectedDate) {
      loadLogs(user.customer_id, selectedDate);
    }
  }, [user, selectedDate]);

  // เช็คว่ามี session จาก LINE Login callback หรือไม่
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const lineVerified = urlParams.get('line_verified');
    const phoneParam = urlParams.get('phone');
    
    if (lineVerified === 'true' && phoneParam) {
      setPhone(phoneParam);
      loadCustomerData(phoneParam);
    }
  }, []);

  const proteinConsumed = logs.reduce((sum, log) => sum + (log.eat_protein || 0), 0);
  const caloriesConsumed = logs.reduce((sum, log) => sum + (log.eat_calories || 0), 0);
  const carbsConsumed = logs.reduce((sum, log) => sum + (log.eat_carbs || 0), 0);
  const fatConsumed = logs.reduce((sum, log) => sum + (log.eat_fat || 0), 0);
  
  // TODO: Get targets from user object
  const proteinTarget = user?.daily_protein_target || 0;
  const caloriesTarget = user?.daily_calories_target || 2000;
  const carbsTarget = user?.daily_carbs_target || 300;
  const fatTarget = user?.daily_fat_target || 70;

  const proteinPercent = proteinTarget > 0 ? Math.min((proteinConsumed / proteinTarget) * 100, 100) : 0;
  const caloriesPercent = caloriesTarget > 0 ? Math.min((caloriesConsumed / caloriesTarget) * 100, 100) : 0;
  const carbsPercent = carbsTarget > 0 ? Math.min((carbsConsumed / carbsTarget) * 100, 100) : 0;
  const fatPercent = fatTarget > 0 ? Math.min((fatConsumed / fatTarget) * 100, 100) : 0;
  
  const caloriesRemaining = caloriesTarget - caloriesConsumed;
  
  const handleOtpChange = (element: any, index: number) => {
    if (isNaN(element.value)) return false;

    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

    // Focus next input
    if (element.nextSibling) {
      element.nextSibling.focus();
    }
  };

  const OtpScreen = () => (
    <div className="fixed inset-0 bg-white z-20 flex flex-col items-center justify-center p-4 text-center" style={{color: '#212121'}}>
      <button onClick={() => setShowOtpScreen(false)} className="absolute top-4 left-4">
        {/* Back arrow icon */}
      </button>
      <h2 className="text-2xl font-bold mb-2">เราได้ส่งรหัสยืนยันไปที่</h2>
      <p className="mb-8">กรุณากรอกรหัสที่ได้รับทาง SMS ที่เบอร์ {phone}</p>
      
      <div className="flex gap-2 justify-center mb-6">
        {otp.map((data, index) => {
          return (
            <input
              className="w-12 h-14 text-center text-2xl border-2 rounded-lg focus:ring-2 focus:border-otp-verify focus:ring-otp-verify"
              key={index}
              type="text"
              name="otp"
              maxLength={1}
              value={data}
              onChange={e => handleOtpChange(e.target, index)}
              onFocus={e => e.target.select()}
            />
          );
        })}
      </div>
      
      {otpError && <p className="text-red-500 mb-4">{otpError}</p>}

      <button
        onClick={handleVerifyOtp}
        disabled={isLoading || otp.join('').length < 6}
        className="w-full max-w-xs text-white py-3 rounded-lg font-semibold transition text-base"
        style={{ backgroundColor: '#C4AA75' }}
      >
        {isLoading ? 'กำลังตรวจสอบ...' : 'ยืนยัน'}
      </button>

      <div className="mt-6 text-sm">
        <span>ไม่ได้รับรหัส? </span>
        <button className="font-semibold" style={{ color: '#C4AA75' }}>
          ส่งอีกครั้ง
        </button>
      </div>
    </div>
  );

  if (showOtpScreen) {
    return <OtpScreen />;
  }
  
  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-block mb-8">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 6.66666V15.3333M24 32.6667V41.3333M15.3333 24H6.66666M41.3333 24H32.6667M36.9333 11.0667L30.5 17.5M17.5 30.5L11.0667 36.9333M36.9333 36.9333L30.5 30.5M17.5 17.5L11.0667 11.0667" stroke="#212121" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M31.3333 24C31.3333 28.0518 28.0518 31.3333 24 31.3333C19.9482 31.3333 16.6667 28.0518 16.6667 24C16.6667 19.9482 19.9482 16.6667 24 16.6667C28.0518 16.6667 31.3333 19.9482 31.3333 24Z" stroke="#212121" strokeWidth="4"/>
            </svg>
            <h1 className="text-3xl font-bold text-gray-800">Poch Tracker</h1>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">เข้าสู่ระบบ</h2>
          <p className="text-gray-600 mb-8">ติดตามสารอาหารสำหรับผู้ป่วยโรคไต</p>

          <div className="space-y-4">
            <div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="กรอกเบอร์โทรศัพท์"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent text-base"
              />
            </div>
            <button
              onClick={handleSendOtp}
              disabled={!phone || isLoading}
              className="w-full bg-dark-button text-white py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:bg-gray-400 transition text-base"
            >
              {isLoading ? 'กำลังส่ง OTP...' : 'ดำเนินการต่อ'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-sm z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 6.66666V15.3333M24 32.6667V41.3333M15.3333 24H6.66666M41.3333 24H32.6667M36.9333 11.0667L30.5 17.5M17.5 30.5L11.0667 36.9333M36.9333 36.9333L30.5 30.5M17.5 17.5L11.0667 11.0667" stroke="#212121" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M31.3333 24C31.3333 28.0518 28.0518 31.3333 24 31.3333C19.9482 31.3333 16.6667 28.0518 16.6667 24C16.6667 19.9482 19.9482 16.6667 24 16.6667C28.0518 16.6667 31.3333 19.9482 31.3333 24Z" stroke="#212121" strokeWidth="4"/>
            </svg>
            <span className="text-xl font-bold text-gray-800">Poch Tracker</span>
          </div>
          <div className="w-9 h-9 bg-gray-200 rounded-full">
            {/* Placeholder for profile picture */}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 pb-28">
        {/* Date Selector */}
        <div className="flex justify-between items-center mb-4">
          {[...Array(5)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const isSelected = d.toISOString().split('T')[0] === selectedDate;
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(d.toISOString().split('T')[0])}
                className={`flex flex-col items-center p-2 rounded-lg w-14 ${
                  isSelected ? 'bg-gray-200 text-gray-800' : 'text-gray-500'
                }`}
              >
                <span className="text-xs">{d.toLocaleDateString('th-TH', { weekday: 'short' })}</span>
                <span className="font-bold">{d.getDate()}</span>
              </button>
            );
          }).reverse()}
        </div>

        {/* Main Calorie Summary */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4 text-center">
          <div className="relative w-48 mx-auto">
            <svg className="w-full h-full" viewBox="0 0 100 50">
              <path d="M10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#e5e7eb" strokeWidth="10" />
              <path d="M10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#212121" strokeWidth="10" strokeDasharray="125.6" strokeDashoffset={125.6 * (1 - caloriesPercent / 100)} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-x-0 bottom-0">
              <span className="text-3xl font-bold text-gray-800">{caloriesRemaining.toFixed(0)}</span>
              <p className="text-sm text-gray-500">แคลอรี่ที่เหลือ</p>
            </div>
          </div>
          <div className="flex justify-between mt-4 text-sm">
            <div className="text-left">
              <p className="text-gray-500">การกิน</p>
              <p className="font-bold">{caloriesConsumed.toFixed(0)}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500">เผาผลาญ</p>
              <p className="font-bold">0</p>
            </div>
          </div>
        </div>
        
        {/* Macronutrient Breakdown */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Protein */}
          <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-center justify-center">
            <div className="relative w-20 h-20">
              <svg className="w-full h-full transform -rotate-90"><circle cx="40" cy="40" r="34" stroke="#fecaca" strokeWidth="6" fill="none"/><circle cx="40" cy="40" r="34" stroke="#ef4444" strokeWidth="6" fill="none" strokeDasharray={2 * Math.PI * 34} strokeDashoffset={2 * Math.PI * 34 * (1 - proteinPercent/100)} strokeLinecap="round"/></svg>
              <div className="absolute inset-0 flex items-center justify-center font-bold text-xl">{proteinConsumed.toFixed(0)}<span className="text-xs">g</span></div>
            </div>
            <p className="font-semibold mt-2">โปรตีน</p>
            <p className="text-xs text-gray-500">{proteinConsumed.toFixed(0)}/{proteinTarget.toFixed(0)}</p>
          </div>
          {/* Carbs */}
          <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-center justify-center">
            <div className="relative w-20 h-20">
              <svg className="w-full h-full transform -rotate-90"><circle cx="40" cy="40" r="34" stroke="#bfdbfe" strokeWidth="6" fill="none"/><circle cx="40" cy="40" r="34" stroke="#3b82f6" strokeWidth="6" fill="none" strokeDasharray={2 * Math.PI * 34} strokeDashoffset={2 * Math.PI * 34 * (1 - carbsPercent/100)} strokeLinecap="round"/></svg>
              <div className="absolute inset-0 flex items-center justify-center font-bold text-xl">{carbsConsumed.toFixed(0)}<span className="text-xs">g</span></div>
            </div>
            <p className="font-semibold mt-2">แป้ง</p>
            <p className="text-xs text-gray-500">{carbsConsumed.toFixed(0)}/{carbsTarget.toFixed(0)}</p>
          </div>
          {/* Fat */}
          <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-center justify-center">
            <div className="relative w-20 h-20">
              <svg className="w-full h-full transform -rotate-90"><circle cx="40" cy="40" r="34" stroke="#fef08a" strokeWidth="6" fill="none"/><circle cx="40" cy="40" r="34" stroke="#eab308" strokeWidth="6" fill="none" strokeDasharray={2 * Math.PI * 34} strokeDashoffset={2 * Math.PI * 34 * (1 - fatPercent/100)} strokeLinecap="round"/></svg>
              <div className="absolute inset-0 flex items-center justify-center font-bold text-xl">{fatConsumed.toFixed(0)}<span className="text-xs">g</span></div>
            </div>
            <p className="font-semibold mt-2">ไขมัน</p>
            <p className="text-xs text-gray-500">{fatConsumed.toFixed(0)}/{fatTarget.toFixed(0)}</p>
          </div>
        </div>

        {/* Meal List */}
        <div>
          <h2 className="text-lg font-semibold mb-3 text-gray-800">รายการอาหารที่กิน</h2>
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.log_id} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-lg">
                  {/* Placeholder for food image */}
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold">เมนูอาหาร</h3>
                    <p className="text-xs text-gray-500">{new Date(log.eat_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <p className="text-sm font-bold text-gray-700">{log.eat_calories} แคลอรี่</p>
                  <div className="flex gap-4 text-xs text-gray-500 mt-1">
                    <span><span className="text-red-500">P:</span> {log.eat_protein}g</span>
                    <span><span className="text-blue-500">C:</span> {log.eat_carbs}g</span>
                    <span><span className="text-yellow-500">F:</span> {log.eat_fat}g</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-dark-button z-10">
        <div className="max-w-md mx-auto flex items-center justify-around py-2">
          {/* BarChart - Active */}
          <button className="flex flex-col items-center p-2 rounded-lg bg-white w-1/5">
            <BarChart className="w-6 h-6 text-dark-button" />
            {/* <span className="text-xs mt-1">หน้าหลัก</span> */}
          </button>
          
          {/* Users - Inactive */}
          <button className="flex flex-col items-center p-2 rounded-lg w-1/5" onClick={() => setShowProfile(true)}>
            <Users className="w-6 h-6 text-otp-verify" />
            {/* <span className="text-xs mt-1">ภาพรวม</span> */}
          </button>
          
          {/* Central Button */}
          <div className="w-1/5">
            <button
              onClick={() => setShowAddMenu(true)}
              className="w-14 h-14 bg-white rounded-full flex items-center justify-center -mt-8 shadow-lg mx-auto"
            >
              {/* Placeholder for custom S-shaped icon */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" stroke="#C4AA75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 6C10.1193 6 8.5 7.53604 8.5 9.47222C8.5 11.4084 10.1193 12.9444 12 12.9444C13.8807 12.9444 15.5 11.4084 15.5 9.47222C15.5 7.53604 13.8807 6 12 6Z" stroke="#C4AA75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9.5 14.5C9.5 14.5 9.5 16.5 12 16.5C14.5 16.5 14.5 14.5 14.5 14.5" stroke="#C4AA75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          
          {/* Zap - Inactive */}
          <button className="flex flex-col items-center p-2 rounded-lg w-1/5">
            <Zap className="w-6 h-6 text-otp-verify" />
            {/* <span className="text-xs mt-1">ข้อมูล</span> */}
          </button>
          
          {/* Menu - Inactive */}
          <button className="flex flex-col items-center p-2 rounded-lg w-1/5">
            <AlignJustify className="w-6 h-6 text-otp-verify" />
            {/* <span className="text-xs mt-1">โปรไฟล์</span> */}
          </button>
        </div>
      </footer>

      {/* Add Meal Modal etc. (can be refactored later) */}
      {showAddMenu && (
         <div className="fixed inset-0 bg-black/50 flex items-end z-50">
           <div className="bg-white rounded-t-3xl w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto mx-auto">
             <div className="flex justify-between items-center mb-4">
               <h2 className="text-xl font-bold">เลือกเมนูอาหาร</h2>
               <button onClick={() => setShowAddMenu(false)}>
                 <X className="w-6 h-6" />
               </button>
             </div>
             <div className="space-y-3">
               {products.map((product) => (
                 <button
                   key={product.id}
                   onClick={() => addMeal(product)}
                   className="w-full bg-gray-50 hover:bg-gray-100 rounded-xl p-4 text-left"
                 >
                   <div className="flex justify-between items-center">
                     <div>
                       <h3 className="font-semibold">{product.name}</h3>
                       <div className="flex gap-4 text-xs text-gray-500 mt-1">
                          <span><span className="text-red-500">P:</span> {product.protein_g}g</span>
                          <span><span className="text-blue-500">C:</span> {product.carbs_g}g</span>
                          <span><span className="text-yellow-500">F:</span> {product.fat_g}g</span>
                       </div>
                     </div>
                     <Plus className="w-5 h-5 text-dark-button" />
                   </div>
                 </button>
               ))}
             </div>
           </div>
         </div>
      )}

      {showProfile && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowProfile(false)}
          />
          <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform p-6 overflow-y-auto">
            <div className="p-6 h-full overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">ข้อมูลส่วนตัว</h2>
                <button onClick={() => setShowProfile(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ชื่อ</label>
                  <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-800">
                    {user.name}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">อายุ</label>
                  <div className="px-4 py-3 bg-gray-50 rounded-lg text-gray-800">
                    {user.age} ปี
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">น้ำหนัก (kg)</label>
                  <input
                    type="number"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ระยะโรค</label>
                  <select
                    value={editStage}
                    onChange={(e) => setEditStage(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  >
                    <option value="PreDial">ก่อนฟอกไต</option>
                    <option value="PostDial">หลังฟอกไต</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">วันเกิด</label>
                  <input
                    type="date"
                    value={editDob}
                    onChange={(e) => setEditDob(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                </div>

                <button
                  onClick={updateProfile}
                  className="w-full bg-dark-button text-white py-3 rounded-lg font-semibold hover:bg-gray-800"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}