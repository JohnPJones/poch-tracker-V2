'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { Plus, Home as HomeIcon, Menu, X, BarChart, User, Users, Zap, AlignJustify, Apple, Bell, Flame, Leaf, Wheat, Droplet, Settings, LayoutGrid } from 'lucide-react';

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
              className="w-12 h-14 text-center text-2xl border-2 rounded-lg focus:ring-2 focus:border-otp-verify focus:ring-otp-verify focus:outline-none"
              key={index}
              type="tel"
              inputMode="numeric"
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
              className="w-full bg-otp-verify text-white py-3 rounded-lg font-semibold hover:opacity-90 disabled:bg-gray-400 transition text-base"
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
            <Apple className="w-7 h-7" />
            <span className="text-2xl font-bold text-gray-800">Cal AI</span>
          </div>
          <div className="relative">
            <Bell className="w-7 h-7" />
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500" />
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 pb-28">
        {/* Date Selector */}
        <div className="flex justify-between items-center mb-6">
          {[...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const isSelected = d.toISOString().split('T')[0] === selectedDate;
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(d.toISOString().split('T')[0])}
                className={`flex flex-col items-center justify-center h-16 w-12 rounded-2xl transition-all duration-300 ${
                  isSelected ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                <span className="text-sm uppercase">{d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}</span>
                <span className="text-lg font-bold">{d.getDate()}</span>
              </button>
            );
          })}
        </div>

        {/* Main Calorie Summary */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4 flex items-center justify-between">
          <div>
            <span className="text-5xl font-bold text-gray-800">{caloriesRemaining.toFixed(0)}</span>
            <p className="text-lg text-gray-500">Calories left</p>
          </div>
          <div className="relative w-24 h-24">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="10" />
              <circle cx="50" cy="50" r="45" fill="none" stroke="#212121" strokeWidth="10" strokeDasharray="282.6" strokeDashoffset={282.6 * (1 - caloriesPercent / 100)} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Flame className="w-8 h-8 text-gray-700" />
            </div>
          </div>
        </div>
        
        {/* Macronutrient Breakdown */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Protein */}
          <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-start justify-center">
            <h3 className="text-2xl font-bold text-gray-800">{proteinConsumed.toFixed(0)}g</h3>
            <p className="text-sm text-gray-500 mb-2">Protein left</p>
            <div className="relative w-16 h-16 self-center">
              <svg className="w-full h-full transform -rotate-90"><circle cx="32" cy="32" r="28" stroke="#fecaca" strokeWidth="8" fill="none"/><circle cx="32" cy="32" r="28" stroke="#ef4444" strokeWidth="8" fill="none" strokeDasharray={2 * Math.PI * 28} strokeDashoffset={2 * Math.PI * 28 * (1 - proteinPercent/100)} strokeLinecap="round"/></svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Leaf className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </div>
          {/* Carbs */}
          <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-start justify-center">
            <h3 className="text-2xl font-bold text-gray-800">{carbsConsumed.toFixed(0)}g</h3>
            <p className="text-sm text-gray-500 mb-2">Carbs left</p>
            <div className="relative w-16 h-16 self-center">
              <svg className="w-full h-full transform -rotate-90"><circle cx="32" cy="32" r="28" stroke="#bfdbfe" strokeWidth="8" fill="none"/><circle cx="32" cy="32" r="28" stroke="#3b82f6" strokeWidth="8" fill="none" strokeDasharray={2 * Math.PI * 28} strokeDashoffset={2 * Math.PI * 28 * (1 - carbsPercent/100)} strokeLinecap="round"/></svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Wheat className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>
          {/* Fat */}
          <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-start justify-center">
            <h3 className="text-2xl font-bold text-gray-800">{fatConsumed.toFixed(0)}g</h3>
            <p className="text-sm text-gray-500 mb-2">Fat left</p>
            <div className="relative w-16 h-16 self-center">
              <svg className="w-full h-full transform -rotate-90"><circle cx="32" cy="32" r="28" stroke="#fef08a" strokeWidth="8" fill="none"/><circle cx="32" cy="32" r="28" stroke="#eab308" strokeWidth="8" fill="none" strokeDasharray={2 * Math.PI * 28} strokeDashoffset={2 * Math.PI * 28 * (1 - fatPercent/100)} strokeLinecap="round"/></svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Droplet className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Meal List */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-gray-800">Recently uploaded</h2>
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.log_id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
                <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden">
                  {/* Placeholder for food image */}
                  <img src={`https://source.unsplash.com/random/100x100?food,${log.log_id}`} alt="Food" className="w-full h-full object-cover" />
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-lg">เมนูอาหาร</h3>
                    <p className="text-sm text-gray-400">{new Date(log.eat_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <p className="text-lg font-bold text-gray-700 flex items-center gap-2">
                    <Flame className="w-5 h-5 text-red-500" />
                    {log.eat_calories} calories
                  </p>
                  <div className="flex gap-4 text-sm text-gray-500 mt-2">
                    <span className="flex items-center gap-1"><Leaf className="w-4 h-4 text-red-500" /> {log.eat_protein}g</span>
                    <span className="flex items-center gap-1"><Wheat className="w-4 h-4 text-blue-500" /> {log.eat_carbs}g</span>
                    <span className="flex items-center gap-1"><Droplet className="w-4 h-4 text-yellow-500" /> {log.eat_fat}g</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 z-10">
        <div className="max-w-md mx-auto bg-white rounded-t-3xl shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-around py-4">
            <button className="flex flex-col items-center justify-center w-1/4">
              <HomeIcon className="w-7 h-7 text-gray-800" />
              <span className="text-xs mt-1">Home</span>
            </button>
            <button className="flex flex-col items-center justify-center w-1/4">
              <LayoutGrid className="w-7 h-7 text-gray-400" />
              <span className="text-xs mt-1 text-gray-400">Progress</span>
            </button>
            <button
              onClick={() => setShowAddMenu(true)}
              className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center -mt-10 shadow-lg"
            >
              <Plus className="w-8 h-8" />
            </button>
            <button className="flex flex-col items-center justify-center w-1/4">
              <Settings className="w-7 h-7 text-gray-400" />
              <span className="text-xs mt-1 text-gray-400">Settings</span>
            </button>
            <button className="flex flex-col items-center justify-center w-1/4" onClick={() => setShowProfile(true)}>
              <User className="w-7 h-7 text-gray-400" />
              <span className="text-xs mt-1 text-gray-400">Profile</span>
            </button>
          </div>
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