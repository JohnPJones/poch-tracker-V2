'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { Plus, Home as HomeIcon, Menu, X } from 'lucide-react';

export default function Home() {
  const [phone, setPhone] = useState('');
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form states
  const [editWeight, setEditWeight] = useState('');
  const [editStage, setEditStage] = useState('');
  const [editDob, setEditDob] = useState('');

  const handleLineLogin = async () => {
    setIsLoading(true);
    
    // เช็ค Shopify ก่อน
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
    
    // เก็บข้อมูลลูกค้าไว้ใน localStorage ชั่วคราว
    localStorage.setItem('pending_customer', JSON.stringify(customer));
    
    // เปิด LINE Login
    signIn('line', { 
      callbackUrl: window.location.origin + '/auth/line-callback'
    });
  };

  const loadCustomer = async () => {
    await loadCustomerData(phone);
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
        console.log('Loaded customer:', customer);
        setUser(customer);
        setEditWeight(customer.weight_kg?.toString() || '');
        setEditStage(customer.disease_stage || '');
        setEditDob(customer.dob || '');
        loadOrders(customer.customer_id);
        loadLogs(customer.customer_id, selectedDate);
      } else {
        console.error('Failed to load customer');
      }
    } catch (error) {
      console.error('Error loading customer:', error);
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
  }, [selectedDate]);

  // เช็คว่ามี session จาก LINE Login callback หรือไม่
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const lineVerified = urlParams.get('line_verified');
    const phoneParam = urlParams.get('phone');
    
    console.log('URL params:', { lineVerified, phoneParam });
    
    if (lineVerified === 'true' && phoneParam) {
      setPhone(phoneParam);
      // Load customer ทันที
      loadCustomerData(phoneParam);
      // ลบ query params ออกจาก URL
      window.history.replaceState({}, '', '/');
    }


  const proteinConsumed = logs.reduce((sum, log) => sum + log.eat_protein, 0);
  const proteinTarget = user?.daily_protein_target || 0;
  const proteinPercent = proteinTarget > 0 ? Math.min((proteinConsumed / proteinTarget) * 100, 100) : 0;

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-12">
            <div className="inline-block">
              <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-3xl text-white">🏥</span>
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">เข้าสู่ระบบ</h1>
            <p className="text-gray-600">ติดตามโภชนาการไต</p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                เบอร์โทรศัพท์
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="กรอกเบอร์โทรศัพท์"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
            </div>

            <button
              onClick={handleLineLogin}
              disabled={!phone || isLoading}
              className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition text-base"
            >
              {isLoading ? 'กำลังตรวจสอบ...' : 'ดำเนินการต่อ'}
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">หรือ</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              ยังไม่มีบัญชี?{' '}
              <a href="https://medfood-1563.myshopify.com" className="text-blue-600 font-semibold hover:underline">
                สมัครสมาชิก
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">สวัสดี {user.name}</h1>
            <p className="text-sm text-gray-600">
              {user.disease_stage?.toLowerCase().includes('pre') ? 'ก่อนฟอกไต' : 'หลังฟอกไต'}
            </p>
          </div>
        </div>
      </div>

      {/* Date */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      {/* Ring */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-col items-center">
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r="80" stroke="#e5e7eb" strokeWidth="16" fill="none" />
                <circle
                  cx="96" cy="96" r="80"
                  stroke="#3b82f6" strokeWidth="16" fill="none"
                  strokeDasharray={`${2 * Math.PI * 80}`}
                  strokeDashoffset={`${2 * Math.PI * 80 * (1 - proteinPercent / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold">{proteinConsumed.toFixed(1)}</span>
                <span className="text-gray-600">/ {proteinTarget}g</span>
                <span className="text-sm text-gray-500 mt-1">โปรตีน</span>
              </div>
            </div>
            
            <div className="w-full mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span>โปรตีน</span>
                <span>{proteinPercent.toFixed(0)}%</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${proteinPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="max-w-2xl mx-auto px-4 pb-4">
        <h2 className="text-lg font-semibold mb-3">มื้อที่ทานวันนี้</h2>
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.log_id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex justify-between">
                <div>
                  <h3 className="font-semibold">เมนูอาหาร</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(log.eat_time).toLocaleTimeString('th-TH', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-blue-500">{log.eat_protein}g</span>
                  <p className="text-xs text-gray-600">โปรตีน</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-around py-3">
          <button className="flex flex-col items-center text-blue-500">
            <HomeIcon className="w-6 h-6" />
            <span className="text-xs mt-1">หน้าหลัก</span>
          </button>
          
          <button
            onClick={() => setShowAddMenu(true)}
            className="flex flex-col items-center"
          >
            <div className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center -mt-6 shadow-lg">
              <Plus className="w-8 h-8 text-white" />
            </div>
          </button>
          
          <button
            onClick={() => setShowProfile(true)}
            className="flex flex-col items-center text-gray-600"
          >
            <Menu className="w-6 h-6" />
            <span className="text-xs mt-1">ข้อมูล</span>
          </button>
        </div>
      </div>

      {/* Add Meal Modal */}
      {showAddMenu && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white rounded-t-3xl w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">เลือกเมนูอาหาร</h2>
              <button onClick={() => setShowAddMenu(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">จากรายการที่สั่งซื้อ 2 สัปดาห์ที่ผ่านมา</p>
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
                      <p className="text-sm text-gray-600">โปรตีน {product.protein_g}g</p>
                    </div>
                    <Plus className="w-5 h-5 text-blue-500" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Profile Sidebar */}
      {showProfile && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowProfile(false)}
          />
          <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform">
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
                  className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600"
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