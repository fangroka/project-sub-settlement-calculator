
import React, { useState, useMemo } from 'react';
import { 
  ProjectFinancials, 
  CurrentSettlement, 
  DeductionItem
} from './types';
import { Icons } from './constants';

const App: React.FC = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [deductionMode] = useState<'actual' | 'estimated'>('estimated');
  const [estimationScenario, setEstimationScenario] = useState<'special' | 'general' | 'mixed'>('special');

  // 项目基础财务数据 (保留在内存中供报告使用)
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

  // 结算数据初始化
  const [settlementData, setSettlementData] = useState<CurrentSettlement>({
    settlementNo: "FBJS-2024-1025-001",
    projectSettlableAmount: 400000.00,
    settlementAmount: 0, 
    deductions: [
      { id: 'vat', label: '增值税率(6%)', type: 'rate', value: 0.06, isActive: true },
      { id: 'additional', label: '附加税率(2%)', type: 'rate', value: 0.02, isActive: true },
      { id: 'signing', label: '签字费率(2%)', type: 'rate', value: 0.02, isActive: true },
      { id: 'other_rate', label: '其他费率', type: 'rate', value: 0.00, isActive: false },
      { id: 'mgmt', label: '加盟管理费(年费)', type: 'fixed', value: 5000.00, isActive: false },
      { id: 'bid_svc', label: '投标服务费', type: 'fixed', value: 0.00, isActive: false },
      { id: 'bid_bond', label: '投标保证金', type: 'fixed', value: 0.00, isActive: false },
      { id: 'perf_bond', label: '履约保证金', type: 'fixed', value: 2000.00, isActive: false },
      { id: 'guarantee', label: '保函费用', type: 'fixed', value: 0.00, isActive: false },
      { id: 'penalty', label: '罚款', type: 'fixed', value: 0.00, isActive: false },
    ]
  });

  const [estimatedData, setEstimatedData] = useState({
    taxRate: 0.06,
    mixedSpecialRatio: 0.5
  });

  // 核心测算逻辑
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
        generalAmt = 0;
        totalInputTaxDeduction = (specialAmt / (1 + estimatedData.taxRate)) * estimatedData.taxRate;
      } else if (estimationScenario === 'general') {
        specialAmt = 0;
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

    return { 
      totalDeductions, 
      basePayable, 
      totalInputTaxDeduction, 
      specialAmt, 
      generalAmt, 
      netPayable: basePayable + totalInputTaxDeduction 
    };
  }, [settlementData, deductionMode, estimationScenario, estimatedData]);

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
      deductions: [...prev.deductions, { id: newId, label: '新增扣除项', type: 'fixed', value: 0, isActive: true, isCustom: true }]
    }));
  };

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

  const getCurrentTime = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 pb-10 print:bg-white print:pb-0">
         <div className="bg-slate-900 py-4 text-white shadow-lg print:hidden sticky top-0 z-50">
            <div className="max-w-5xl mx-auto px-6 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <button onClick={() => setIsSubmitted(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/10 active:scale-95">
                  <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
                <div>
                  <h1 className="text-lg font-black tracking-tight">项目分包结算测算报告</h1>
                  <p className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Subcontract Settlement Report</p>
                </div>
              </div>
              <button onClick={() => window.print()} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 uppercase tracking-widest">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                   打印 PDF
              </button>
            </div>
         </div>

         <main className="max-w-5xl mx-auto p-8 print:p-0">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-10 print:shadow-none print:border-none print:p-0 space-y-8">
               <div className="border-b-2 border-slate-900 pb-6 flex justify-between items-end">
                  <div className="space-y-2">
                     <h1 className="text-3xl font-black text-slate-900 tracking-tightest">项目分包结算测算报告</h1>
                  </div>
               </div>

               <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: "本次结算金额", value: formatCurrency(settlementData.settlementAmount), color: "text-slate-900" },
                    { label: "扣除项金额合计", value: `- ¥ ${formatCurrency(financials.totalDeductions)}`, color: "text-amber-600" },
                    { label: "进项抵扣税额", value: `+ ¥ ${formatCurrency(financials.totalInputTaxDeduction)}`, color: "text-emerald-600" },
                    { label: "最终应付金额", value: `¥ ${formatCurrency(financials.netPayable)}`, color: "text-white", bg: "bg-indigo-600 shadow-indigo-100" }
                  ].map((stat, i) => (
                    <div key={i} className={`${stat.bg || 'bg-slate-50'} p-5 rounded-2xl border ${stat.bg ? 'border-transparent shadow-lg' : 'border-slate-100'}`}>
                      <p className={`text-[9px] font-black uppercase tracking-wider mb-1 ${stat.color === 'text-white' ? 'text-indigo-200' : 'text-slate-400'}`}>{stat.label}</p>
                      <p className={`text-xl font-black font-mono tracking-tight ${stat.color}`}>{stat.value}</p>
                    </div>
                  ))}
               </div>

               <div className="space-y-4">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <div className="w-1 h-5 bg-slate-900 rounded-full"></div> 扣除项明细
                  </h3>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                     <table className="w-full text-[11px]">
                        <thead className="bg-slate-50 border-b border-slate-200">
                           <tr className="text-slate-500 font-bold uppercase tracking-wider">
                              <th className="px-6 py-3 text-left">扣除项</th>
                              <th className="px-6 py-3 text-center">模式</th>
                              <th className="px-6 py-3 text-center">基准/数值</th>
                              <th className="px-6 py-3 text-right">核减金额</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {settlementData.deductions.filter(d => d.isActive).map(item => (
                              <tr key={item.id}>
                                 <td className="px-6 py-3 font-bold text-slate-800">{item.label}</td>
                                 <td className="px-6 py-3 text-center text-slate-500">{item.type === 'rate' ? '比例' : '金额'}</td>
                                 <td className="px-6 py-3 text-center font-mono">{item.type === 'rate' ? `${(item.value * 100).toFixed(1)}%` : `¥${formatCurrency(item.value)}`}</td>
                                 <td className="px-6 py-3 text-right font-black font-mono">¥ {formatCurrency(item.type === 'rate' ? settlementData.settlementAmount * item.value : item.value)}</td>
                              </tr>
                           ))}
                           <tr className="bg-slate-50/50">
                              <td colSpan={3} className="px-6 py-4 text-right font-black text-slate-400 uppercase text-[9px]">合计</td>
                              <td className="px-6 py-4 text-right font-mono font-black text-amber-600 text-base">¥ {formatCurrency(financials.totalDeductions)}</td>
                           </tr>
                        </tbody>
                     </table>
                  </div>
               </div>

               <div className="grid grid-cols-1 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                       <div className="w-1 h-5 bg-indigo-500 rounded-full"></div> 进项发票测算
                    </h3>
                    <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 space-y-4">
                       <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-slate-400 uppercase">测算模型</span>
                          <span className="font-black text-indigo-600">{estimationScenario === 'special' ? '全专票' : estimationScenario === 'general' ? '全普票' : '混合票据'}</span>
                       </div>
                       <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-slate-400 uppercase">设定税率</span>
                          <span className="font-black text-slate-900 font-mono">{(estimatedData.taxRate * 100).toFixed(1)}%</span>
                       </div>
                       <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-slate-400 uppercase">专票金额(价税合计)</span>
                          <span className="font-black text-slate-900 font-mono">¥ {formatCurrency(financials.specialAmt)}</span>
                       </div>
                       <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-slate-400 uppercase">普票金额(价税合计)</span>
                          <span className="font-black text-slate-900 font-mono">¥ {formatCurrency(financials.generalAmt)}</span>
                       </div>
                       <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-slate-400 uppercase">发票金额合计(价税合计)</span>
                          <span className="font-black text-slate-900 font-mono">¥ {formatCurrency(financials.specialAmt + financials.generalAmt)}</span>
                       </div>
                       <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                          <span className="text-xs font-black text-slate-900">进项抵扣税额</span>
                          <span className="text-lg font-black font-mono text-emerald-600">+ ¥ {formatCurrency(financials.totalInputTaxDeduction)}</span>
                       </div>
                    </div>
                  </div>
               </div>

               <div className="pt-8 border-t border-slate-100 flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                  <p>报表生成：{getCurrentTime()}</p>
               </div>
            </div>
         </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-50 flex items-center justify-between shadow-sm backdrop-blur-md bg-white/95">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-xl shadow-indigo-500/10"><Icons.Project className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">分包结算计算器</h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Settlement Calculator</p>
          </div>
        </div>
        <div className="flex items-center gap-10">
           <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">预估应付金额</p>
              <span className="text-2xl font-black font-mono text-indigo-600 tracking-tightest">¥ {formatCurrency(financials.netPayable)}</span>
           </div>
           <button onClick={() => setIsSubmitted(true)} className="px-8 py-3.5 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95">生成报告</button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* 左侧录入区 */}
          <div className="lg:col-span-8 space-y-8">
            {/* 本次结算录入 */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 group hover:border-indigo-200 transition-all">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                        <div className="w-1.5 h-7 bg-indigo-600 rounded-full"></div> 本次结算金额
                    </h3>
                    <p className="text-xs text-slate-400 font-medium ml-4">请输入分包单位报审的本期结算总金额</p>
                </div>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 font-mono font-bold text-2xl transition-colors group-focus-within:text-indigo-400">¥</span>
                  <input 
                    type="number" 
                    className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-12 py-5 w-[18rem] text-right font-mono font-black text-indigo-600 outline-none focus:ring-8 ring-indigo-50 focus:border-indigo-600 focus:bg-white transition-all text-3xl" 
                    value={settlementData.settlementAmount === 0 ? '' : settlementData.settlementAmount} 
                    onChange={(e) => setSettlementData({...settlementData, settlementAmount: Number(e.target.value)})}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* 扣除配置 */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
               <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                    <div className="w-1.5 h-7 bg-amber-500 rounded-full"></div> 扣除配置
                  </h3>
                  <button onClick={addDeduction} className="bg-slate-100 text-slate-600 px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 flex items-center gap-2">
                    <Icons.Edit className="w-3.5 h-3.5" /> 新增扣除项
                  </button>
               </div>
               
               <div className="grid grid-cols-1 gap-3">
                  {settlementData.deductions.map(item => (
                    <div key={item.id} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${item.isActive ? 'bg-white border-indigo-100 shadow-sm' : 'bg-slate-50 border-transparent opacity-40 grayscale'}`}>
                      <input 
                        type="checkbox" 
                        checked={item.isActive} 
                        onChange={(e) => updateDeduction(item.id, { isActive: e.target.checked })} 
                        className="w-6 h-6 rounded-lg border-2 border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                      />
                      <div className="flex-1 space-y-2">
                        <input 
                          type="text"
                          className="bg-transparent font-black text-base w-full outline-none border-b border-slate-100 focus:border-indigo-200 py-0.5 text-slate-700 transition-colors"
                          value={item.label}
                          onChange={(e) => updateDeduction(item.id, { label: e.target.value })}
                        />
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => updateDeduction(item.id, { type: 'rate' })}
                            className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-all ${item.type === 'rate' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                          >
                            比例
                          </button>
                          <button 
                            onClick={() => updateDeduction(item.id, { type: 'fixed' })}
                            className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-all ${item.type === 'fixed' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                          >
                            金额
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="relative">
                           <input 
                               type="number" 
                               className="bg-slate-100 border-none rounded-xl px-4 py-2.5 w-28 text-right text-sm font-mono font-black focus:bg-white focus:ring-4 ring-slate-100 transition-all" 
                               value={item.type === 'rate' ? (item.value * 100) : item.value} 
                               onChange={(e) => updateDeduction(item.id, { value: item.type === 'rate' ? Number(e.target.value)/100 : Number(e.target.value) })}
                           />
                           <span className="absolute -right-2 top-0 text-[8px] font-black text-slate-300">{item.type === 'rate' ? '%' : '¥'}</span>
                        </div>
                        <div className="w-44 text-right">
                          <p className={`font-mono font-black text-lg ${item.isActive ? 'text-slate-900' : 'text-slate-300'}`}>
                            ¥ {formatCurrency(item.isActive ? (item.type === 'rate' ? settlementData.settlementAmount * item.value : item.value) : 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* 列表底部新增按钮 */}
                  <button 
                    onClick={addDeduction}
                    className="w-full mt-2 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black text-[10px] uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2 group"
                  >
                    <div className="p-1 bg-slate-100 rounded-md group-hover:bg-indigo-100 transition-colors">
                      <Icons.Edit className="w-3.5 h-3.5" />
                    </div>
                    新增扣除项
                  </button>

                  {/* 扣除项金额合计 */}
                  <div className="pt-6 border-t border-slate-100 flex justify-between items-center mt-2">
                    <span className="text-sm font-black text-slate-500 uppercase tracking-widest">扣除项金额合计</span>
                    <span className="text-2xl font-black font-mono text-amber-600 tracking-tightest">¥ {formatCurrency(financials.totalDeductions)}</span>
                  </div>
               </div>
            </div>

            {/* 进项发票测算 */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-8">
               <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                      <div className="w-1.5 h-7 bg-emerald-500 rounded-full"></div> 进项发票测算
                  </h3>
                  <div className="flex bg-slate-100 p-1.5 rounded-xl">
                    {['special', 'general', 'mixed'].map((s) => (
                      <button key={s} onClick={() => setEstimationScenario(s as any)} className={`px-6 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${estimationScenario === s ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                        {s === 'special' ? '全专票' : s === 'general' ? '全普票' : '混合'}
                      </button>
                    ))}
                  </div>
               </div>
               
               <div className="space-y-8">
                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">适用税率模型</label>
                      <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-black text-base outline-none cursor-pointer focus:bg-white focus:border-indigo-500 transition-all appearance-none h-[60px]" value={estimatedData.taxRate} onChange={(e) => setEstimatedData({...estimatedData, taxRate: Number(e.target.value)})}>
                         <option value={0.01}>1.00% (小规模优惠)</option>
                         <option value={0.03}>3.00% (核心业务)</option>
                         <option value={0.06}>6.00% (设计咨询)</option>
                         <option value={0.09}>9.00% (工程服务)</option>
                         <option value={0.13}>13.00% (物资采购)</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">进项抵扣税额 <span className="ml-2 bg-emerald-500 text-white text-[7px] px-1.5 py-0.5 rounded font-black tracking-widest">自动计算</span></label>
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-6 py-3 flex items-center justify-between h-[60px]">
                         <span className="font-black text-emerald-600 font-mono text-3xl tracking-tighter">¥ {formatCurrency(financials.totalInputTaxDeduction)}</span>
                      </div>
                   </div>
                </div>

                {/* 全专票模式下的详情显示 */}
                {estimationScenario === 'special' && (
                  <div className="bg-indigo-50/30 p-6 rounded-2xl border border-indigo-100">
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                           <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">专票金额(价税合计)</span>
                           <div className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-3 font-mono text-base font-black text-indigo-600 mt-1 shadow-sm">
                             ¥ {formatCurrency(financials.specialAmt)}
                           </div>
                        </div>
                    </div>
                  </div>
                )}

                {/* 全普票模式下的详情显示 */}
                {estimationScenario === 'general' && (
                  <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">普票金额(价税合计)</span>
                           <div className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 font-mono text-base font-black text-slate-600 mt-1 shadow-sm">
                             ¥ {formatCurrency(financials.generalAmt)}
                           </div>
                        </div>
                    </div>
                  </div>
                )}

                {estimationScenario === 'mixed' && (
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-6">
                     <div className="flex items-center gap-6">
                        <input type="range" min="0" max="1" step="0.05" className="flex-1 h-2 bg-slate-200 rounded-full appearance-none accent-indigo-600 cursor-pointer" value={estimatedData.mixedSpecialRatio} onChange={(e) => setEstimatedData({...estimatedData, mixedSpecialRatio: Number(e.target.value)})} />
                        <div className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-black text-sm font-mono shadow-lg shadow-indigo-500/20">专票占比: {(estimatedData.mixedSpecialRatio*100).toFixed(0)}%</div>
                     </div>
                     <div className="grid grid-cols-2 gap-6">
                        <div>
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">专票金额(价税合计)</span>
                           <input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-mono text-base font-black outline-none focus:border-indigo-500 text-indigo-600 mt-1 shadow-sm" value={financials.specialAmt.toFixed(2)} onChange={(e) => handleMixedAmountChange('special', Number(e.target.value))} />
                        </div>
                        <div>
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">普票金额(价税合计)</span>
                           <input type="number" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-mono text-base font-black outline-none focus:border-indigo-500 text-slate-600 mt-1 shadow-sm" value={financials.generalAmt.toFixed(2)} onChange={(e) => handleMixedAmountChange('general', Number(e.target.value))} />
                        </div>
                     </div>
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* 右侧实时汇总卡片 */}
        <div className="lg:col-span-4 sticky top-24">
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl space-y-8 relative overflow-hidden group">
               {/* 装饰性背景 */}
               <Icons.Analysis className="absolute -right-20 -top-20 w-64 h-64 opacity-[0.03] text-white pointer-events-none group-hover:scale-110 transition-transform duration-700" />
               
               <div className="relative z-10 space-y-6">
                 <div className="space-y-2">
                   <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em] border-l-2 border-indigo-600 pl-4 mb-4 leading-none">Real-time Analysis</p>
                   <h3 className="text-2xl font-black tracking-tight">实时测算结果汇总</h3>
                 </div>

                 {/* 预计实际应付金额 */}
                 <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-2 backdrop-blur-sm">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">预计实际应付金额 (含进项抵扣)</p>
                    <div className="flex items-baseline gap-1">
                       <span className="text-5xl font-black font-mono tracking-tightest">¥{formatCurrency(financials.netPayable).split('.')[0]}</span>
                       <span className="text-xl font-bold text-slate-500 font-mono">.{formatCurrency(financials.netPayable).split('.')[1]}</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mt-4">
                       <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: financials.netPayable > 0 ? '100%' : '0%' }}></div>
                    </div>
                 </div>

                 {/* 次要指标网格 */}
                 <div className="grid grid-cols-1 gap-5">
                    <div className="flex justify-between items-center p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                       <div className="space-y-1">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-wider">结算金额 - 扣除金额</p>
                          <p className="text-xl font-black font-mono text-slate-200">¥ {formatCurrency(financials.basePayable)}</p>
                       </div>
                       <div className="p-2.5 bg-indigo-500/10 rounded-lg">
                          <Icons.Wallet className="w-5 h-5 text-indigo-400" />
                       </div>
                    </div>

                    <div className="flex justify-between items-center p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                       <div className="space-y-1">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-wider">扣除项金额合计</p>
                          <p className="text-xl font-black font-mono text-amber-500">- ¥ {formatCurrency(financials.totalDeductions)}</p>
                       </div>
                       <div className="p-2.5 bg-amber-500/10 rounded-lg">
                          <Icons.Edit className="w-5 h-5 text-amber-400" />
                       </div>
                    </div>

                    <div className="flex justify-between items-center p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                       <div className="space-y-1">
                          <p className="text-xs font-black text-emerald-500/70 uppercase tracking-wider">进项抵扣税额</p>
                          <p className="text-xl font-black font-mono text-emerald-400">+ ¥ {formatCurrency(financials.totalInputTaxDeduction)}</p>
                       </div>
                       <div className="p-2.5 bg-emerald-500/10 rounded-lg">
                          <Icons.Check className="w-5 h-5 text-emerald-400" />
                       </div>
                    </div>
                 </div>

                 <div className="pt-4">
                    <button 
                      onClick={() => setIsSubmitted(true)}
                      className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all active:scale-[0.98] shadow-xl shadow-white/5"
                    >
                      生成最终报告
                    </button>
                    <p className="text-[9px] text-center text-slate-600 mt-4 font-bold uppercase tracking-widest">
                      数据实时加密处理中 • v2.4 审计引擎
                    </p>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </main>
      
      <style>{`
        .tracking-tightest { letter-spacing: -0.07em; }
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
};

export default App;
