'use client';

import { useState, useEffect } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { Plus, LogOut } from 'lucide-react';

export default function Home() {
  const { data: session } = useSession();
  const [phone, setPhone] = useState('');
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Load customer data
  const loadCustomer = async () => {
    const res = await fetch('/api/shopify/customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    
    if (res.ok) {
      const customer = await res.json();
      setUser(customer);
      loadOrders(customer.customer_id);
      loadLogs(customer.customer_id, selectedDate);
    } else {
      alert('ไม่พบข้อมูลลูกค้า');
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

  useEffect(() => {
    if (user && selectedDate) {
      loadLogs(user.customer_id, selectedDate);
    }
  }, [selectedDate]);

  const proteinConsumed = logs.reduce((sum, log) => sum + log.eat_protein, 0);
  const proteinTarget = user?.daily_protein_target || 0;
  const proteinPercent = proteinTarget > 0 ? Math.min((proteinConsumed / proteinTarget) * 100, 100) : 0;

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🏥</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">ติดตามโภชนาการไต</h1>
            <p className="text-gray-600">เข้าสู่ระบบด้วย LINE</p>
          </div>
          
          <div className="space-y-4">
            <input
              type="tel"
              placeholder="เบอร์โทรศัพท์"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            />
            <button
              onClick={() => signIn('line')}
              className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600"
            >
              เข้าสู่ระบบด้วย LINE
            </button>
            <button
              onClick={loadCustomer}
              className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600"
            >
              ดำเนินการต่อ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">สวัสดี คุณลูกค้า</h1>
            <p className="text-sm text-gray-600">
              {user.disease_stage?.toLowerCase().includes('pre') ? 'ก่อนฟอกไต' : 'หลังฟอกไต'}
            </p>
          </div>
          <button onClick={() => setUser(null)} className="p-2 hover:bg-gray-100 rounded-full">
            <LogOut className="w-5 h-5" />
          </button>
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

      {/* Add button */}
      <div className="max-w-2xl mx-auto px-4 mb-4">
        <button
          onClick={() => setShowAddMenu(true)}
          className="w-full bg-blue-500 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-blue-600 shadow-lg"
        >
          <Plus className="w-5 h-5" />
          เพิ่มมื้ออาหาร
        </button>
      </div>

      {/* Logs */}
      <div className="max-w-2xl mx-auto px-4 pb-20">
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

      {/* Modal */}
      {showAddMenu && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white rounded-t-3xl w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">เลือกเมนูอาหาร</h2>
              <button onClick={() => setShowAddMenu(false)}>✕</button>
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
    </div>
  );
}