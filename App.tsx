
import React, { useState, useMemo } from 'react';
import { 
  ProjectFinancials, 
  SubcontractInfo, 
  CurrentSettlement, 
  DeductionItem
} from './types';
import { Icons } from './constants';

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
      { id: 'vat', label: '增值税率(6%)', type: 'rate', value: 0.06, isActive: true },
      { id: 'additional', label: '附加税率(2%)', type: 'rate', value: 0.02, isActive: true },
      { id: 'signing', label: '签字费率(6%)', type: 'rate', value: 0.06, isActive: true },
      { id: 'other_rate', label: '其他费率', type: 'rate', value: 0.00, isActive: false },
      { id: 'mgmt', label: '加盟管理费(年费)', type: 'fixed', value: 5000.00, isActive: true },
      { id: 'bid_svc', label: '投标服务费', type: 'fixed', value: 0.00, isActive: false },
      { id: 'bid_bond', label: '投标保证金', type: 'fixed', value: 0.00, isActive: false },
      { id: 'perf_bond', label: '履约保证金', type: 'fixed', value: 2000.00, isActive: true },
      { id: 'guarantee', label: '保函费用', type: 'fixed', value: 0.00, isActive: false },
      { id: 'penalty', label: '罚款', type: 'fixed', value: 0.00, isActive: false },
    ]
  });

  const [estimatedData, setEstimatedData] = useState({
    taxRate: 0.06,
    mixedSpecialRatio: 0.5
  });

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
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 pb-24 print:bg-white print:pb-0">
         {/* 顶部控制栏 */}
         <div className="bg-slate-900 py-6 text-white shadow-xl print:hidden sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-8 flex justify-between items-center">
              <div className="flex items-center gap-6">
                <button onClick={() => setIsSubmitted(false)} className="p-2 hover:bg-white/10 rounded-lg transition-all group">
                  <svg className="w-6 h-6 rotate-180 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
                <div>
                  <h1 className="text-xl font-black tracking-tight">项目分包结算测算结果</h1>
                  <p className="text-slate-400 text-xs mt-0.5 tracking-widest font-bold uppercase">Settlement Calculation Results</p>
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => window.print()} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                   导出 PDF 报告
                </button>
              </div>
            </div>
         </div>

         {/* 打印预览主体 */}
         <main className="max-w-6xl mx-auto p-12 print:p-0">
            <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 p-16 print:shadow-none print:border-none print:p-0 space-y-16">
               
               {/* 报告页眉 */}
               <div className="flex justify-between items-end border-b-2 border-slate-100 pb-12">
                  <div className="space-y-4">
                     <h1 className="text-4xl font-black text-slate-900 tracking-tight">项目分包结算测算报告</h1>
                     <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                           <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                           <span className="text-sm font-black text-slate-400 tracking-widest uppercase">报告时间：{getCurrentTime()}</span>
                        </div>
                     </div>
                  </div>
               </div>

               {/* 数据总览区域 */}
               <section className="space-y-6">
                  {/* 第一行：基础组件指标 */}
                  <div className="grid grid-cols-3 gap-6">
                     <div className="bg-slate-50/80 rounded-[2rem] p-8 border border-slate-100 transition-all hover:bg-white hover:border-indigo-200 group">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 group-hover:text-indigo-400 transition-colors">本次结算金额</p>
                        <p className="text-3xl font-black font-mono text-slate-900 leading-none tracking-tighter">¥ {formatCurrency(settlementData.settlementAmount)}</p>
                     </div>
                     <div className="bg-slate-50/80 rounded-[2rem] p-8 border border-slate-100 transition-all hover:bg-white hover:border-amber-200 group">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 group-hover:text-amber-500 transition-colors">扣除金额合计</p>
                        <p className="text-3xl font-black font-mono text-amber-600 leading-none tracking-tighter">- ¥ {formatCurrency(financials.totalDeductions)}</p>
                     </div>
                     <div className="bg-slate-50/80 rounded-[2rem] p-8 border border-slate-100 transition-all hover:bg-white hover:border-emerald-200 group">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 group-hover:text-emerald-500 transition-colors">进项抵扣税额</p>
                        <p className="text-3xl font-black font-mono text-emerald-600 leading-none tracking-tighter">+ ¥ {formatCurrency(financials.totalInputTaxDeduction)}</p>
                     </div>
                  </div>

                  {/* 第二行：核心结果指标 */}
                  <div className="grid grid-cols-12 gap-6">
                     <div className="col-span-5 bg-indigo-50/50 rounded-[2rem] p-10 border border-indigo-100 shadow-sm flex flex-col justify-center">
                        <p className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">结算金额-扣除金额</p>
                        <p className="text-4xl font-black font-mono text-indigo-700 leading-none tracking-tighter">¥ {formatCurrency(financials.basePayable)}</p>
                     </div>
                     <div className="col-span-7 bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl shadow-indigo-100/50 flex flex-col justify-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                        <div className="relative z-10">
                           <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-4">最终应付金额</p>
                           <div className="flex items-baseline gap-2">
                              <span className="text-5xl font-black font-mono text-emerald-400 tracking-tighter">¥ {formatCurrency(financials.netPayable)}</span>
                           </div>
                        </div>
                     </div>
                  </div>
               </section>

               {/* 测算细节 */}
               <div className="grid grid-cols-12 gap-12">
                  <div className="col-span-7 space-y-8">
                    <div className="flex items-center gap-4">
                       <div className="w-1.5 h-7 bg-amber-500 rounded-full shadow-lg shadow-amber-100"></div>
                       <h3 className="text-xl font-black text-slate-800 tracking-tight">扣除项明细</h3>
                    </div>
                    <div className="border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
                       <table className="w-full text-sm">
                          <thead className="bg-slate-50/80">
                             <tr>
                                <th className="px-8 py-5 text-left font-black text-slate-400 uppercase tracking-[0.2em] text-[10px]">项名目</th>
                                <th className="px-8 py-5 text-center font-black text-slate-400 uppercase tracking-[0.2em] text-[10px]">依据</th>
                                <th className="px-8 py-5 text-right font-black text-slate-400 uppercase tracking-[0.2em] text-[10px]">金额</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                             {settlementData.deductions.filter(d => d.isActive).map(item => (
                                <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                                   <td className="px-8 py-6 font-black text-slate-700">{item.label}</td>
                                   <td className="px-8 py-6 text-center text-slate-400 font-bold text-xs uppercase">
                                      {item.type === 'rate' ? `${(item.value * 100).toFixed(2)}% 比例` : '固定金额'}
                                   </td>
                                   <td className="px-8 py-6 text-right font-mono font-black text-slate-900 text-base">
                                      ¥ {formatCurrency(item.type === 'rate' ? settlementData.settlementAmount * item.value : item.value)}
                                   </td>
                                </tr>
                             ))}
                             <tr className="bg-slate-50/50">
                                <td colSpan={2} className="px-8 py-6 text-right font-black text-slate-400 uppercase tracking-widest text-[10px]">合计金额</td>
                                <td className="px-8 py-6 text-right font-mono font-black text-amber-600 text-lg">
                                   ¥ {formatCurrency(financials.totalDeductions)}
                                </td>
                             </tr>
                          </tbody>
                       </table>
                    </div>
                  </div>

                  <div className="col-span-5 space-y-8">
                    <div className="flex items-center gap-4">
                       <div className="w-1.5 h-7 bg-emerald-500 rounded-full shadow-lg shadow-emerald-100"></div>
                       <h3 className="text-xl font-black text-slate-800 tracking-tight">税务测算详情</h3>
                    </div>
                    <div className="bg-slate-50/50 border border-slate-100 rounded-[2rem] p-10 space-y-8 shadow-sm">
                       <div className="space-y-6">
                          <div className="flex justify-between items-center group">
                             <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">测算模型</span>
                             <span className="px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-indigo-600 shadow-sm group-hover:border-indigo-200 transition-all">
                                {estimationScenario === 'special' ? '全专票测算' : estimationScenario === 'general' ? '全普票测算' : '专普混合模式'}
                             </span>
                          </div>
                          <div className="flex justify-between items-center">
                             <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">适用税率</span>
                             <span className="font-black text-slate-700 text-lg">{(estimatedData.taxRate * 100).toFixed(2)}%</span>
                          </div>
                          {financials.specialAmt > 0 && (
                            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                               <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">专票金额 (含税)</span>
                               <span className="font-black font-mono text-slate-700">¥ {formatCurrency(financials.specialAmt)}</span>
                            </div>
                          )}
                          {financials.generalAmt > 0 && (
                            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                               <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">普票金额 (含税)</span>
                               <span className="font-black font-mono text-slate-700">¥ {formatCurrency(financials.generalAmt)}</span>
                            </div>
                          )}
                       </div>
                       <div className="pt-8 border-t-2 border-dashed border-slate-200">
                          <div className="flex justify-between items-center mb-3">
                             <span className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">进项抵扣收益</span>
                             <span className="text-2xl font-black font-mono text-emerald-600 tracking-tighter">+ ¥ {formatCurrency(financials.totalInputTaxDeduction)}</span>
                          </div>
                          <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                             <p className="text-[10px] text-emerald-700 font-bold leading-relaxed">
                                基于所选税务模型的进项发票抵扣收益，已自动计入最终应付总额。
                             </p>
                          </div>
                       </div>
                    </div>
                  </div>
               </div>

               <div className="pt-16 border-t-2 border-slate-50">
                  <p className="text-xs text-slate-400 font-medium max-w-2xl leading-relaxed">
                     声明：本报表数据基于用户输入的测算模型自动生成，主要用于财务内部审核与预算控制，不具备最终财务入账的法律效力。
                  </p>
               </div>
            </div>
         </main>
         <style>{`
            @media print {
               body { background: white !important; }
               .print-hidden { display: none !important; }
               @page { margin: 1cm; size: portrait; }
               main { width: 100% !important; max-width: none !important; padding: 0 !important; }
               .shadow-2xl, .shadow-sm, .shadow-lg, .shadow-xl { shadow: none !important; box-shadow: none !important; border: 1px solid #f1f5f9 !important; }
               .bg-slate-50 { background-color: #f8fafc !important; }
               .bg-indigo-50\/50 { background-color: #f5f7ff !important; }
               .bg-slate-900 { background-color: #0f172a !important; color: white !important; -webkit-print-color-adjust: exact; }
               .rounded-[2.5rem], .rounded-[3rem], .rounded-[2rem] { border-radius: 1.5rem !important; }
               .grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)) !important; }
            }
         `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="bg-white border-b border-slate-200 px-10 py-6 sticky top-0 z-50 flex items-center justify-between shadow-sm backdrop-blur-md bg-white/90">
        <div className="flex items-center gap-5">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-xl rotate-3"><Icons.Project className="w-7 h-7" /></div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">项目分包结算计算器</h1>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-0.5">Project Sub-Settlement Calculator</p>
          </div>
        </div>
        <div className="flex items-center gap-12">
           <div className="text-right">
              <p className="text-xs font-black text-slate-400 uppercase mb-1 tracking-tighter">实时预估实付</p>
              <p className="text-3xl font-black font-mono text-indigo-600 tracking-tighter">¥ {formatCurrency(financials.netPayable)}</p>
           </div>
           <button onClick={() => setIsSubmitted(true)} className="px-10 py-5 bg-slate-900 text-white rounded-[1.25rem] font-black text-sm uppercase tracking-[0.1em] hover:bg-indigo-600 transition-all shadow-2xl hover:shadow-indigo-200 active:scale-95">生成测算结果</button>
        </div>
      </header>

      <main className="max-w-[1500px] mx-auto p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-8 space-y-10">
            {/* 本次结算金额 */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden p-10 group hover:border-indigo-200 transition-all">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-4">
                        <span className="w-2 h-8 bg-indigo-600 rounded-full"></span> 本次结算金额
                    </h3>
                    <p className="text-sm text-slate-400 font-medium ml-6">请输入本次需要进行结算的分包总金额</p>
                </div>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 font-mono font-bold text-2xl">¥</span>
                  <input 
                    type="number" 
                    className="bg-slate-50 border-2 border-slate-100 rounded-3xl px-12 py-6 w-80 text-right font-mono font-black text-indigo-600 outline-none focus:ring-8 ring-indigo-50 focus:border-indigo-600 transition-all text-3xl shadow-inner" 
                    value={settlementData.settlementAmount} 
                    onChange={(e) => setSettlementData({...settlementData, settlementAmount: Number(e.target.value)})}
                  />
                </div>
              </div>
            </div>

            {/* 扣除配置 */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden p-10">
               <div className="flex items-center justify-between mb-10 pb-6 border-b border-slate-50">
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-4">
                    <span className="w-2 h-8 bg-amber-500 rounded-full"></span> 扣除配置
                  </h3>
                  <button onClick={addDeduction} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95">+ 新增扣除项</button>
               </div>
               
               <div className="space-y-4">
                  {settlementData.deductions.map(item => (
                    <div key={item.id} className={`flex items-center gap-8 p-6 rounded-[2rem] border-2 transition-all duration-300 ${item.isActive ? 'bg-white border-indigo-200 shadow-[0_20px_50px_rgba(79,70,229,0.08)] scale-[1.01]' : 'bg-slate-50/50 border-transparent opacity-50 grayscale'}`}>
                      <input 
                        type="checkbox" 
                        checked={item.isActive} 
                        onChange={(e) => updateDeduction(item.id, { isActive: e.target.checked })} 
                        className="w-7 h-7 rounded-xl border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-transform active:scale-90" 
                      />
                      
                      <div className="flex-1 space-y-2">
                        <input 
                          type="text"
                          className={`bg-transparent font-black text-lg w-full outline-none border-b-2 border-transparent focus:border-indigo-300 transition-all py-1 ${item.isActive ? 'text-slate-800' : 'text-slate-400'}`}
                          value={item.label}
                          onChange={(e) => updateDeduction(item.id, { label: e.target.value })}
                          placeholder="输入扣除项名称"
                        />
                        <div className="flex items-center gap-4">
                          <select 
                            className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-300 transition-all cursor-pointer"
                            value={item.type}
                            onChange={(e) => updateDeduction(item.id, { type: e.target.value as 'rate' | 'fixed', value: 0 })}
                          >
                            <option value="rate">比例结算模式</option>
                            <option value="fixed">固定金额模式</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                         <div className="relative group/input">
                            <input 
                                type="number" 
                                className={`bg-slate-100/50 border-2 rounded-2xl px-5 py-3.5 w-36 text-right text-lg font-mono font-black outline-none transition-all ${item.isActive ? 'border-slate-100 focus:bg-white focus:border-indigo-400 focus:ring-8 ring-indigo-50' : 'border-transparent'}`} 
                                value={item.type === 'rate' ? (item.value * 100).toFixed(2) : item.value} 
                                onChange={(e) => updateDeduction(item.id, { value: item.type === 'rate' ? Number(e.target.value)/100 : Number(e.target.value) })}
                            />
                            <span className="absolute -top-6 right-1 text-[10px] text-slate-400 font-black uppercase tracking-widest opacity-0 group-hover/input:opacity-100 transition-opacity">
                              {item.type === 'rate' ? 'Rate %' : 'Amount ¥'}
                            </span>
                         </div>
                         <div className="w-48 text-right">
                           <p className={`font-mono font-black text-2xl transition-all ${item.isActive ? 'text-slate-900' : 'text-slate-300'}`}>
                             ¥ {formatCurrency(item.isActive ? (item.type === 'rate' ? settlementData.settlementAmount * item.value : item.value) : 0)}
                           </p>
                         </div>
                      </div>
                    </div>
                  ))}
               </div>

               {/* 底部新增按钮 */}
               <div className="mt-8 flex justify-center">
                 <button 
                  onClick={addDeduction} 
                  className="flex items-center gap-3 px-10 py-5 border-2 border-dashed border-slate-200 rounded-[2.5rem] text-slate-400 font-black text-sm uppercase tracking-widest hover:border-indigo-400 hover:text-indigo-400 hover:bg-indigo-50/30 transition-all active:scale-95 group"
                 >
                    <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
                    </svg>
                    新增扣除项
                 </button>
               </div>

               <div className="mt-12 bg-amber-50/60 p-10 rounded-[2.5rem] border-2 border-amber-100 flex items-center justify-between shadow-inner">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-4 bg-amber-400 rounded-full"></div>
                      <span className="text-xs font-black text-amber-700 uppercase tracking-[0.2em] block">合计扣除金额 (Selected Total)</span>
                    </div>
                    <p className="text-sm text-amber-600/70 font-medium ml-4">已启用项目的核减金额总计</p>
                  </div>
                  <div className="text-right">
                    <span className="text-4xl font-black font-mono text-amber-600 tracking-tighter">¥ {formatCurrency(financials.totalDeductions)}</span>
                  </div>
               </div>
            </div>

            {/* 进项发票测算 */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden p-10">
               <div className="flex items-center justify-between mb-12 border-b border-slate-50 pb-8">
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-4">
                        <span className="w-2 h-8 bg-emerald-500 rounded-full"></span> 进项发票测算
                    </h3>
                    <p className="text-sm text-slate-400 font-medium ml-6">基于票据类型自动计算进项补差收益</p>
                  </div>
                  <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                    <button onClick={() => setEstimationScenario('special')} className={`px-6 py-3 text-xs font-black uppercase rounded-[1rem] transition-all ${estimationScenario === 'special' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>全专票</button>
                    <button onClick={() => setEstimationScenario('general')} className={`px-4 py-3 text-xs font-black uppercase rounded-[1rem] transition-all ${estimationScenario === 'general' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>全普票</button>
                    <button onClick={() => setEstimationScenario('mixed')} className={`px-4 py-3 text-xs font-black uppercase rounded-[1rem] transition-all ${estimationScenario === 'mixed' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}>专普混合</button>
                  </div>
               </div>
               <div className="space-y-10">
                  <div className="grid grid-cols-2 gap-16">
                     <div className="space-y-4">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">测算适用税率模型</label>
                        <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-5 font-black text-lg outline-none cursor-pointer focus:bg-white focus:border-indigo-500 transition-all appearance-none" value={estimatedData.taxRate} onChange={(e) => setEstimatedData({...estimatedData, taxRate: Number(e.target.value)})}>
                           <option value={0.01}>1.00% (小规模纳税人)</option>
                           <option value={0.03}>3.00% (小规模纳税人)</option>
                           <option value={0.06}>6.00% (设计/技术服务)</option>
                           <option value={0.09}>9.00% (建筑/运输服务)</option>
                           <option value={0.13}>13.00% (设备/物资类)</option>
                        </select>
                     </div>
                     <div className="space-y-4">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">进项抵扣税额</label>
                        <div className="bg-emerald-50/50 border-2 border-emerald-100 rounded-2xl px-8 py-5 flex items-center justify-between shadow-inner">
                           <span className="font-black text-emerald-600 font-mono text-3xl">¥ {formatCurrency(financials.totalInputTaxDeduction)}</span>
                           <span className="text-[10px] bg-emerald-500 text-white px-3 py-1 rounded font-black tracking-widest">自动计算</span>
                        </div>
                     </div>
                  </div>
                  {estimationScenario === 'special' && (
                    <div className="bg-indigo-50/30 p-8 rounded-3xl border-2 border-indigo-100 space-y-3">
                       <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">专票金额(价税合计)</span>
                       <p className="text-3xl font-black font-mono text-indigo-600">¥ {formatCurrency(financials.specialAmt)}</p>
                    </div>
                  )}
                  {estimationScenario === 'general' && (
                    <div className="bg-slate-50/80 p-8 rounded-3xl border-2 border-slate-100 space-y-3">
                       <span className="text-xs font-black text-slate-400 uppercase tracking-widest">普票金额(价税合计)</span>
                       <p className="text-3xl font-black font-mono text-slate-600">¥ {formatCurrency(financials.generalAmt)}</p>
                    </div>
                  )}
                  {estimationScenario === 'mixed' && (
                    <div className="bg-slate-50 p-10 rounded-[2rem] border-2 border-slate-100 space-y-8">
                       <div className="flex items-center gap-10">
                          <input type="range" min="0" max="1" step="0.01" className="flex-1 h-3 bg-slate-200 rounded-full appearance-none accent-indigo-600 cursor-pointer" value={estimatedData.mixedSpecialRatio} onChange={(e) => setEstimatedData({...estimatedData, mixedSpecialRatio: Number(e.target.value)})} />
                          <div className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-lg font-mono shadow-lg">{(estimatedData.mixedSpecialRatio*100).toFixed(0)}% 专票比例</div>
                       </div>
                       <div className="grid grid-cols-2 gap-10">
                          <div className="space-y-3">
                             <span className="text-xs font-black text-slate-400 uppercase tracking-widest">专票金额(价税合计)</span>
                             <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-mono font-bold">¥</span>
                                <input type="number" className="w-full bg-white border-2 border-slate-100 rounded-2xl px-10 py-4 font-mono text-xl font-black outline-none focus:border-indigo-500 transition-all text-indigo-600" value={financials.specialAmt.toFixed(2)} onChange={(e) => handleMixedAmountChange('special', Number(e.target.value))} />
                             </div>
                          </div>
                          <div className="space-y-3">
                             <span className="text-xs font-black text-slate-400 uppercase tracking-widest">普票金额(价税合计)</span>
                             <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-mono font-bold">¥</span>
                                <input type="number" className="w-full bg-white border-2 border-slate-100 rounded-2xl px-10 py-4 font-mono text-xl font-black outline-none focus:border-indigo-500 transition-all text-slate-600" value={financials.generalAmt.toFixed(2)} onChange={(e) => handleMixedAmountChange('general', Number(e.target.value))} />
                             </div>
                          </div>
                       </div>
                    </div>
                  )}
               </div>
            </div>
          </div>

          {/* 右侧看板 */}
          <div className="lg:col-span-4 space-y-10 sticky top-32">
             <div className="bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl space-y-10 overflow-hidden relative">
                <Icons.Analysis className="absolute -right-16 -top-16 w-64 h-64 opacity-[0.03] text-white pointer-events-none" />
                <div className="space-y-2 relative z-10">
                   <p className="text-xs font-black text-indigo-400 uppercase tracking-[0.4em] mb-4">实时测算结果汇总</p>
                   <div className="flex items-baseline gap-1">
                      <span className="text-7xl font-black font-mono tracking-tighter">¥{formatCurrency(financials.netPayable).split('.')[0]}</span>
                      <span className="text-2xl font-bold text-slate-500 font-mono">.{formatCurrency(financials.netPayable).split('.')[1]}</span>
                   </div>
                   <p className="text-sm text-slate-400 font-medium mt-4 border-l-2 border-indigo-600 pl-4 py-1">预计实际应付金额 (含进项抵扣)</p>
                </div>
                <div className="space-y-6 border-t border-white/10 pt-10 relative z-10">
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-black uppercase tracking-widest">结算金额-扣除金额</span>
                      <span className="font-mono font-black text-lg">¥ {formatCurrency(financials.basePayable)}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-black uppercase tracking-widest">扣除项金额合计</span>
                      <span className="font-mono font-black text-lg text-amber-500">- ¥ {formatCurrency(financials.totalDeductions)}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-black uppercase tracking-widest">进项抵扣税额</span>
                      <span className="font-mono font-black text-lg text-emerald-400">+ ¥ {formatCurrency(financials.totalInputTaxDeduction)}</span>
                   </div>
                </div>
                <div className="pt-8 text-center relative z-10">
                   <div className="bg-white/5 py-4 px-6 rounded-2xl inline-block">
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">本测算基于预设财务逻辑，最终以财务系统入账为准</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
