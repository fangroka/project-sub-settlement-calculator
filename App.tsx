
import React, { useState, useMemo } from 'react';
import { 
  ProjectFinancials, 
  SubcontractInfo, 
  CurrentSettlement, 
  DeductionItem
} from './types';
import { Icons } from './constants';

/**
 * 核心 UI 组件
 */
const InfoItem: React.FC<{ label: string; value: string | number; isMoney?: boolean; colorClass?: string; span?: string }> = ({ label, value, isMoney, colorClass = "text-slate-700", span = "col-span-1" }) => (
  <div className={`${span} space-y-1`}>
    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{label}</p>
    <p className={`text-[13px] font-bold ${isMoney ? 'font-mono' : ''} ${colorClass}`}>
      {isMoney && typeof value === 'number' ? `¥ ${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` : value}
    </p>
  </div>
);

const App: React.FC = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [deductionMode, setDeductionMode] = useState<'actual' | 'estimated'>('estimated');
  const [estimationScenario, setEstimationScenario] = useState<'special' | 'general' | 'mixed'>('special');

  // 模拟数据初始化
  const [projectData] = useState<ProjectFinancials>({
    projectName: "广东深圳大远村设计项目 - 二期旧城改造与环境综合整治提升工程设计项目标段一",
    projectNo: "PRJ-SZ-2024-001",
    projectBelonging: "中国房建设计集团有限公司 - 第一事业部",
    totalAmount: 3000000.00,
    invoicedAmount: 1850000.00,
    receivedAmount: 1200000.00,
    accumulatedSubSettlement: 800000.00,
    availableFunds: 400000.00,
  });

  const [subcontractData] = useState<SubcontractInfo>({
    contractName: "分包合同 - 景观绿化专项深化设计劳务外包协议",
    vendorName: "中国房建园林工程咨询服务部",
    contractAmount: 600000.00,
    accumulatedSettlement: 350000.00,
    unsettledAmount: 250000.00,
    contractNo: "SUB-SZ-2024-005",
    cooperationMode: "加盟",
    accumulatedInvoicing: 220000.00,
    paidAmount: 200000.00,
  });

  const [settlementData, setSettlementData] = useState<CurrentSettlement>({
    settlementNo: "FBJS-2024-1025-001",
    projectSettlableAmount: 400000.00,
    settlementAmount: 250000.00,
    deductions: [
      { id: 'vat', label: '增值税 (6%)', type: 'rate', value: 0.06, isActive: true },
      { id: 'additional', label: '附加税率 (2%)', type: 'rate', value: 0.02, isActive: true },
      { id: 'signing', label: '签字费率 (2%)', type: 'rate', value: 0.02, isActive: true },
      { id: 'mgmt', label: '加盟管理费', type: 'fixed', value: 5000.00, isActive: true },
      { id: 'perf_bond', label: '履约保证金', type: 'fixed', value: 2000.00, isActive: true },
    ]
  });

  const [estimatedData, setEstimatedData] = useState({
    taxRate: 0.06,
    mixedSpecialRatio: 0.5
  });

  // 核心财务计算
  const financials = useMemo(() => {
    const amt = settlementData.settlementAmount;
    const totalDeductions = settlementData.deductions.reduce((acc, item) => {
      if (!item.isActive) return acc;
      if (item.type === 'rate') return acc + (amt * item.value);
      return acc + item.value;
    }, 0);

    const basePayable = Math.max(0, amt - totalDeductions);
    let totalInputTaxDeduction = 0;
    let specialAmt = 0;
    let generalAmt = 0;

    if (deductionMode === 'estimated') {
      if (estimationScenario === 'special') {
        specialAmt = basePayable * (1 + estimatedData.taxRate);
        totalInputTaxDeduction = (specialAmt / (1 + estimatedData.taxRate)) * estimatedData.taxRate;
      } else if (estimationScenario === 'general') {
        generalAmt = basePayable;
        totalInputTaxDeduction = 0;
      } else if (estimationScenario === 'mixed') {
        const baseFromSpecial = basePayable * estimatedData.mixedSpecialRatio;
        const baseFromGeneral = basePayable - baseFromSpecial;
        specialAmt = baseFromSpecial * (1 + estimatedData.taxRate);
        generalAmt = baseFromGeneral;
        totalInputTaxDeduction = (specialAmt / (1 + estimatedData.taxRate)) * estimatedData.taxRate;
      }
    }

    return { totalDeductions, basePayable, totalInputTaxDeduction, specialAmt, generalAmt, netPayable: basePayable + totalInputTaxDeduction };
  }, [settlementData, deductionMode, estimationScenario, estimatedData]);

  // 联动逻辑
  const handleMixedAmountChange = (type: 'special' | 'general', value: number) => {
    const basePayable = financials.basePayable;
    if (basePayable <= 0) return;
    if (type === 'special') {
      const baseFromSpecial = value / (1 + estimatedData.taxRate);
      setEstimatedData(prev => ({ ...prev, mixedSpecialRatio: Math.min(1, Math.max(0, baseFromSpecial / basePayable)) }));
    } else {
      setEstimatedData(prev => ({ ...prev, mixedSpecialRatio: Math.min(1, Math.max(0, (basePayable - value) / basePayable)) }));
    }
  };

  const formatCurrency = (val: number) => val.toLocaleString('zh-CN', { minimumFractionDigits: 2 });
  
  const updateDeduction = (id: string, updates: Partial<DeductionItem>) => {
    setSettlementData(prev => ({
      ...prev,
      deductions: prev.deductions.map(d => d.id === id ? { ...d, ...updates } : d)
    }));
  };

  const addDeduction = () => {
    const newId = `custom_${Date.now()}`;
    setSettlementData(prev => ({
      ...prev,
      deductions: [...prev.deductions, { id: newId, label: '新增核减项', type: 'fixed', value: 0, isActive: true, isCustom: true }]
    }));
  };

  // 详情页预览
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] pb-24">
         <div className="bg-slate-900 py-10 text-white shadow-xl">
            <div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg"><Icons.Check className="w-7 h-7 text-white" /></div>
                <div>
                  <h1 className="text-2xl font-black">分包结算单详情预览</h1>
                  <p className="text-slate-400 font-medium">单号：{settlementData.settlementNo}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => window.print()} className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-sm transition-all">导出 PDF</button>
                <button onClick={() => setIsSubmitted(false)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold text-sm transition-all">返回修改</button>
              </div>
            </div>
         </div>
         <main className="max-w-5xl mx-auto px-8 mt-12 space-y-12">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-12 space-y-12">
               <section className="border-b-2 border-slate-100 pb-10">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">基本信息</h3>
                  <div className="grid grid-cols-2 gap-8">
                     <InfoItem label="项目名称" value={projectData.projectName} span="col-span-2" />
                     <InfoItem label="分包合同" value={subcontractData.contractName} span="col-span-2" />
                     <InfoItem label="分包商" value={subcontractData.vendorName} />
                     <InfoItem label="本次支付净额" value={financials.netPayable} isMoney colorClass="text-indigo-600" />
                  </div>
               </section>
               <section>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">计算细节</h3>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-slate-100">
                      <tr><td className="py-4 text-slate-500">结算申报总额</td><td className="py-4 text-right font-mono font-bold">¥ {formatCurrency(settlementData.settlementAmount)}</td></tr>
                      <tr><td className="py-4 text-slate-500">扣除项合计</td><td className="py-4 text-right font-mono text-amber-600">- ¥ {formatCurrency(financials.totalDeductions)}</td></tr>
                      <tr><td className="py-4 text-slate-500">进项补差收益</td><td className="py-4 text-right font-mono text-emerald-600">+ ¥ {formatCurrency(financials.totalInputTaxDeduction)}</td></tr>
                      <tr className="bg-slate-50 font-black"><td className="py-4 px-4">应付净额 (含税预估)</td><td className="py-4 px-4 text-right font-mono text-lg">¥ {formatCurrency(financials.netPayable)}</td></tr>
                    </tbody>
                  </table>
               </section>
            </div>
         </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-50 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg"><Icons.Project className="w-6 h-6" /></div>
          <div>
            <h1 className="text-lg font-black tracking-tight">项目分包结算计算器</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Sub-Settlement Calculator</p>
          </div>
        </div>
        <div className="flex items-center gap-8">
           <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">预估实付</p>
              <p className="text-2xl font-black font-mono text-indigo-600">¥ {formatCurrency(financials.netPayable)}</p>
           </div>
           <button onClick={() => setIsSubmitted(true)} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl active:scale-95">生成正式单据</button>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* 左侧：输入与配置 (8/12) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* 1. 本次结算金额卡片 */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden p-8">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-800 flex items-center gap-3">
                  <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span> 本次结算金额
                </h3>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-lg">¥</span>
                  <input 
                    type="number" 
                    className="bg-slate-50 border border-slate-200 rounded-2xl px-10 py-4 w-64 text-right font-mono font-black text-indigo-600 outline-none focus:ring-4 ring-indigo-50 border-indigo-200 transition-all text-xl" 
                    value={settlementData.settlementAmount} 
                    onChange={(e) => setSettlementData({...settlementData, settlementAmount: Number(e.target.value)})}
                  />
                </div>
              </div>
            </div>

            {/* 2. 扣除配置卡片 */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden p-8">
               <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
                  <h3 className="font-black text-slate-800 flex items-center gap-3">
                    <span className="w-1.5 h-6 bg-amber-500 rounded-full"></span> 扣除配置
                  </h3>
                  <button onClick={addDeduction} className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-all">+ 新增核减项</button>
               </div>
               
               <div className="space-y-3">
                  {settlementData.deductions.map(item => (
                    <div key={item.id} className={`flex items-center gap-6 p-4 rounded-2xl border transition-all ${item.isActive ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-transparent opacity-50'}`}>
                      <input type="checkbox" checked={item.isActive} onChange={(e) => updateDeduction(item.id, { isActive: e.target.checked })} className="w-5 h-5 rounded border-slate-300 text-indigo-600" />
                      <div className="flex-1 font-bold text-sm text-slate-700">{item.label}</div>
                      <div className="flex items-center gap-2">
                         <input 
                           type="number" 
                           className="bg-slate-50 border-none rounded-lg px-3 py-1.5 w-24 text-right text-xs font-mono font-bold outline-none" 
                           value={item.type === 'rate' ? (item.value * 100).toFixed(2) : item.value} 
                           onChange={(e) => updateDeduction(item.id, { value: item.type === 'rate' ? Number(e.target.value)/100 : Number(e.target.value) })}
                         />
                         <span className="text-[10px] text-slate-400 font-black">{item.type === 'rate' ? '%' : 'CNY'}</span>
                      </div>
                      <div className="w-32 text-right font-mono font-black text-slate-900">
                        ¥ {formatCurrency(item.isActive ? (item.type === 'rate' ? settlementData.settlementAmount * item.value : item.value) : 0)}
                      </div>
                    </div>
                  ))}
               </div>
               
               <div className="mt-8 bg-amber-50 p-6 rounded-2xl border border-amber-100 flex items-center justify-between">
                  <span className="text-xs font-black text-amber-700 uppercase tracking-widest">合计扣除 (已启用)</span>
                  <span className="text-xl font-black font-mono text-amber-700">¥ {formatCurrency(financials.totalDeductions)}</span>
               </div>
            </div>

            {/* 税务测算区 */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden p-8">
               <div className="flex items-center justify-between mb-10 border-b border-slate-50 pb-6">
                  <h3 className="font-black text-slate-800 flex items-center gap-3">
                    <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span> 进项测算模型设定
                  </h3>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => setEstimationScenario('special')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${estimationScenario === 'special' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>全专票</button>
                    <button onClick={() => setEstimationScenario('general')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${estimationScenario === 'general' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>全普票</button>
                    <button onClick={() => setEstimationScenario('mixed')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${estimationScenario === 'mixed' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>专普混合</button>
                  </div>
               </div>
               
               <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-12">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">测算适用税率</label>
                        <select className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-sm outline-none cursor-pointer" value={estimatedData.taxRate} onChange={(e) => setEstimatedData({...estimatedData, taxRate: Number(e.target.value)})}>
                           <option value={0.06}>6.00% (设计/技术服务)</option>
                           <option value={0.09}>9.00% (建筑/运输服务)</option>
                           <option value={0.13}>13.00% (设备/物资类)</option>
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">测算收益补差 (+)</label>
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-6 py-3 flex items-center justify-between">
                           <span className="font-black text-emerald-600 font-mono text-lg">¥ {formatCurrency(financials.totalInputTaxDeduction)}</span>
                           <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-black">AUTO</span>
                        </div>
                     </div>
                  </div>

                  {estimationScenario === 'mixed' && (
                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 space-y-6">
                       <div className="flex items-center gap-8">
                          <input type="range" min="0" max="1" step="0.01" className="flex-1 h-1.5 bg-slate-200 rounded-full appearance-none accent-indigo-600" value={estimatedData.mixedSpecialRatio} onChange={(e) => setEstimatedData({...estimatedData, mixedSpecialRatio: Number(e.target.value)})} />
                          <div className="bg-white border px-4 py-2 rounded-lg font-black text-indigo-600 font-mono">{(estimatedData.mixedSpecialRatio*100).toFixed(0)}% 专票</div>
                       </div>
                       <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-2">
                             <span className="text-[10px] font-black text-slate-400 uppercase">专票含税额</span>
                             <input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-mono text-sm outline-none" value={financials.specialAmt.toFixed(2)} onChange={(e) => handleMixedAmountChange('special', Number(e.target.value))} />
                          </div>
                          <div className="space-y-2">
                             <span className="text-[10px] font-black text-slate-400 uppercase">普票不含税额</span>
                             <input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 font-mono text-sm outline-none" value={financials.generalAmt.toFixed(2)} onChange={(e) => handleMixedAmountChange('general', Number(e.target.value))} />
                          </div>
                       </div>
                    </div>
                  )}
               </div>
            </div>
          </div>

          {/* 右侧：结果看板 (4/12) */}
          <div className="lg:col-span-4 space-y-8 sticky top-28">
             <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl space-y-8 overflow-hidden relative">
                <Icons.Analysis className="absolute -right-10 -top-10 w-48 h-48 opacity-5 text-white" />
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">实时测算结果汇总</p>
                   <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black font-mono tracking-tighter">¥{formatCurrency(financials.netPayable).split('.')[0]}</span>
                      <span className="text-xl font-bold text-slate-500">.{formatCurrency(financials.netPayable).split('.')[1]}</span>
                   </div>
                   <p className="text-xs text-indigo-400 font-bold mt-2">预计实际应付净额 (含税预估)</p>
                </div>
                <div className="space-y-4 border-t border-white/10 pt-8">
                   <div className="flex justify-between text-xs"><span className="text-slate-400 font-bold uppercase">基准应付</span><span className="font-mono">¥ {formatCurrency(financials.basePayable)}</span></div>
                   <div className="flex justify-between text-xs"><span className="text-slate-400 font-bold uppercase">核减合计</span><span className="font-mono text-amber-400">- ¥ {formatCurrency(financials.totalDeductions)}</span></div>
                   <div className="flex justify-between text-xs"><span className="text-slate-400 font-bold uppercase">进项补差</span><span className="font-mono text-emerald-400">+ ¥ {formatCurrency(financials.totalInputTaxDeduction)}</span></div>
                </div>
                <div className="pt-4 text-center">
                   <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">计算由系统逻辑驱动，仅供内部参考</p>
                </div>
             </div>
          </div>

        </div>
      </main>
      
      {/* Footer for mobile */}
      <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-xl border-t border-slate-200 p-6 md:hidden z-40">
         <button onClick={() => setIsSubmitted(true)} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl">生成正式结算单</button>
      </div>
    </div>
  );
};

export default App;
