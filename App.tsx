
import React, { useState, useMemo } from 'react';
import { 
  ProjectFinancials, 
  SubcontractInfo, 
  CurrentSettlement, 
  DeductionItem
} from './types';
import { Icons } from './constants';

/**
 * 核心 UI 组件 - 优化字号与间距
 */
const InfoItem: React.FC<{ label: string; value: string | number; isMoney?: boolean; colorClass?: string; span?: string }> = ({ label, value, isMoney, colorClass = "text-slate-700", span = "col-span-1" }) => (
  <div className={`${span} space-y-2`}>
    <p className="text-xs text-slate-400 font-black uppercase tracking-widest">{label}</p>
    <p className={`text-base font-bold ${isMoney ? 'font-mono' : ''} ${colorClass}`}>
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

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] pb-24">
         <div className="bg-slate-900 py-12 text-white shadow-xl">
            <div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
              <div className="flex items-center gap-8">
                <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg"><Icons.Check className="w-8 h-8 text-white" /></div>
                <div>
                  <h1 className="text-3xl font-black">分包结算单详情预览</h1>
                  <p className="text-slate-400 font-medium text-lg mt-1">单号：{settlementData.settlementNo}</p>
                </div>
              </div>
              <div className="flex gap-6">
                <button onClick={() => window.print()} className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold text-base transition-all">导出 PDF</button>
                <button onClick={() => setIsSubmitted(false)} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-bold text-base transition-all shadow-lg">返回修改</button>
              </div>
            </div>
         </div>
         <main className="max-w-5xl mx-auto px-8 mt-12 space-y-12">
            <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden p-16 space-y-16">
               <section className="border-b-2 border-slate-100 pb-12">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-8">基本信息</h3>
                  <div className="grid grid-cols-2 gap-10">
                     <InfoItem label="项目名称" value={projectData.projectName} span="col-span-2" />
                     <InfoItem label="分包合同" value={subcontractData.contractName} span="col-span-2" />
                     <InfoItem label="分包商" value={subcontractData.vendorName} />
                     <div className="space-y-2">
                        <p className="text-xs text-slate-400 font-black uppercase tracking-widest">本次支付净额</p>
                        <p className="text-2xl font-black font-mono text-indigo-600">¥ {formatCurrency(financials.netPayable)}</p>
                     </div>
                  </div>
               </section>
               <section>
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-8">计算细节分析</h3>
                  <table className="w-full text-base">
                    <tbody className="divide-y divide-slate-100">
                      <tr><td className="py-6 text-slate-500 font-medium">结算申报总额</td><td className="py-6 text-right font-mono font-black text-lg">¥ {formatCurrency(settlementData.settlementAmount)}</td></tr>
                      <tr><td className="py-6 text-slate-500 font-medium">扣除项合计 (核减)</td><td className="py-6 text-right font-mono text-amber-600 font-black text-lg">- ¥ {formatCurrency(financials.totalDeductions)}</td></tr>
                      <tr><td className="py-6 text-slate-500 font-medium">进项补差收益 (补偿)</td><td className="py-6 text-right font-mono text-emerald-600 font-black text-lg">+ ¥ {formatCurrency(financials.totalInputTaxDeduction)}</td></tr>
                      <tr className="bg-slate-50 font-black"><td className="py-8 px-8 rounded-l-3xl text-lg">最终应付净额 (预估)</td><td className="py-8 px-8 text-right font-mono text-3xl text-indigo-700 rounded-r-3xl">¥ {formatCurrency(financials.netPayable)}</td></tr>
                    </tbody>
                  </table>
               </section>
            </div>
         </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header - 增强视觉层次 */}
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
           <button onClick={() => setIsSubmitted(true)} className="px-10 py-5 bg-slate-900 text-white rounded-[1.25rem] font-black text-sm uppercase tracking-[0.1em] hover:bg-indigo-600 transition-all shadow-2xl hover:shadow-indigo-200 active:scale-95">生成正式单据</button>
        </div>
      </header>

      <main className="max-w-[1500px] mx-auto p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* 左侧：输入与配置 (8/12) */}
          <div className="lg:col-span-8 space-y-10">
            
            {/* 1. 本次结算金额卡片 - 强化输入焦点 */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden p-10 group hover:border-indigo-200 transition-all">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-4">
                        <span className="w-2 h-8 bg-indigo-600 rounded-full"></span> 本次结算申报金额
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

            {/* 2. 扣除配置卡片 - 增加列表清晰度 */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden p-10">
               <div className="flex items-center justify-between mb-10 pb-6 border-b border-slate-50">
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-4">
                    <span className="w-2 h-8 bg-amber-500 rounded-full"></span> 财务扣除配置
                  </h3>
                  <button onClick={addDeduction} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg">+ 新增核减项</button>
               </div>
               
               <div className="space-y-4">
                  {settlementData.deductions.map(item => (
                    <div key={item.id} className={`flex items-center gap-8 p-6 rounded-3xl border-2 transition-all ${item.isActive ? 'bg-white border-slate-100 shadow-md scale-[1.01]' : 'bg-slate-50 border-transparent opacity-50 grayscale'}`}>
                      <input type="checkbox" checked={item.isActive} onChange={(e) => updateDeduction(item.id, { isActive: e.target.checked })} className="w-6 h-6 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                      <div className="flex-1 font-bold text-lg text-slate-800">{item.label}</div>
                      <div className="flex items-center gap-4">
                         <div className="relative">
                            <input 
                                type="number" 
                                className="bg-slate-100 border-none rounded-xl px-4 py-3 w-32 text-right text-base font-mono font-black outline-none focus:bg-white focus:ring-2 ring-indigo-200 transition-all" 
                                value={item.type === 'rate' ? (item.value * 100).toFixed(2) : item.value} 
                                onChange={(e) => updateDeduction(item.id, { value: item.type === 'rate' ? Number(e.target.value)/100 : Number(e.target.value) })}
                            />
                            <span className="absolute -top-6 right-0 text-[10px] text-slate-400 font-black uppercase tracking-tighter">{item.type === 'rate' ? 'Rate (%)' : 'Amount (CNY)'}</span>
                         </div>
                      </div>
                      <div className="w-48 text-right font-mono font-black text-xl text-slate-900">
                        ¥ {formatCurrency(item.isActive ? (item.type === 'rate' ? settlementData.settlementAmount * item.value : item.value) : 0)}
                      </div>
                    </div>
                  ))}
               </div>
               
               <div className="mt-10 bg-amber-50/80 p-8 rounded-3xl border-2 border-amber-100 flex items-center justify-between shadow-inner">
                  <div className="space-y-1">
                    <span className="text-xs font-black text-amber-600 uppercase tracking-widest block">合计扣除金额 (已启用项目)</span>
                    <p className="text-sm text-amber-500 font-medium">这些项目将从结算申报总额中扣除</p>
                  </div>
                  <span className="text-3xl font-black font-mono text-amber-700">¥ {formatCurrency(financials.totalDeductions)}</span>
               </div>
            </div>

            {/* 3. 税务测算区 - 优化模型展示 */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden p-10">
               <div className="flex items-center justify-between mb-12 border-b border-slate-50 pb-8">
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-4">
                        <span className="w-2 h-8 bg-emerald-500 rounded-full"></span> 进项测算模型设定
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
                           <option value={0.06}>6.00% (设计/技术服务)</option>
                           <option value={0.09}>9.00% (建筑/运输服务)</option>
                           <option value={0.13}>13.00% (设备/物资类)</option>
                        </select>
                     </div>
                     <div className="space-y-4">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">测算补差收益 (+)</label>
                        <div className="bg-emerald-50/50 border-2 border-emerald-100 rounded-2xl px-8 py-5 flex items-center justify-between shadow-inner">
                           <span className="font-black text-emerald-600 font-mono text-3xl">¥ {formatCurrency(financials.totalInputTaxDeduction)}</span>
                           <span className="text-[10px] bg-emerald-500 text-white px-2 py-1 rounded font-black tracking-widest">SYSTEM</span>
                        </div>
                     </div>
                  </div>

                  {estimationScenario === 'mixed' && (
                    <div className="bg-slate-50 p-10 rounded-[2rem] border-2 border-slate-100 space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
                       <div className="flex items-center gap-10">
                          <input type="range" min="0" max="1" step="0.01" className="flex-1 h-3 bg-slate-200 rounded-full appearance-none accent-indigo-600 cursor-pointer" value={estimatedData.mixedSpecialRatio} onChange={(e) => setEstimatedData({...estimatedData, mixedSpecialRatio: Number(e.target.value)})} />
                          <div className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-lg font-mono shadow-lg">{(estimatedData.mixedSpecialRatio*100).toFixed(0)}% 专票比例</div>
                       </div>
                       <div className="grid grid-cols-2 gap-10">
                          <div className="space-y-3">
                             <span className="text-xs font-black text-slate-400 uppercase tracking-widest">专票对应结算额 (含税)</span>
                             <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-mono font-bold">¥</span>
                                <input type="number" className="w-full bg-white border-2 border-slate-100 rounded-2xl px-10 py-4 font-mono text-xl font-black outline-none focus:border-indigo-500 transition-all text-indigo-600" value={financials.specialAmt.toFixed(2)} onChange={(e) => handleMixedAmountChange('special', Number(e.target.value))} />
                             </div>
                          </div>
                          <div className="space-y-3">
                             <span className="text-xs font-black text-slate-400 uppercase tracking-widest">普票对应结算额 (不含税)</span>
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

          {/* 右侧：结果看板 (4/12) - 极简极致 */}
          <div className="lg:col-span-4 space-y-10 sticky top-32">
             <div className="bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl space-y-10 overflow-hidden relative">
                <Icons.Analysis className="absolute -right-16 -top-16 w-64 h-64 opacity-[0.03] text-white pointer-events-none" />
                
                <div className="space-y-2 relative z-10">
                   <p className="text-xs font-black text-indigo-400 uppercase tracking-[0.4em] mb-4">实时测算结果汇总</p>
                   <div className="flex items-baseline gap-1">
                      <span className="text-7xl font-black font-mono tracking-tighter">¥{formatCurrency(financials.netPayable).split('.')[0]}</span>
                      <span className="text-2xl font-bold text-slate-500 font-mono">.{formatCurrency(financials.netPayable).split('.')[1]}</span>
                   </div>
                   <p className="text-sm text-slate-400 font-medium mt-4 border-l-2 border-indigo-600 pl-4 py-1">预计实际应付净额 <span className="text-white">(含进项补差)</span></p>
                </div>

                <div className="space-y-6 border-t border-white/10 pt-10 relative z-10">
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-black uppercase tracking-widest">基准应付金额</span>
                      <span className="font-mono font-black text-lg">¥ {formatCurrency(financials.basePayable)}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-black uppercase tracking-widest">累计核减明细</span>
                      <span className="font-mono font-black text-lg text-amber-500">- ¥ {formatCurrency(financials.totalDeductions)}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-black uppercase tracking-widest">税务进项补差</span>
                      <span className="font-mono font-black text-lg text-emerald-400">+ ¥ {formatCurrency(financials.totalInputTaxDeduction)}</span>
                   </div>
                </div>

                <div className="pt-8 text-center relative z-10">
                   <div className="bg-white/5 py-4 px-6 rounded-2xl inline-block">
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">本测算基于预设财务逻辑，最终以财务系统入账为准</p>
                   </div>
                </div>
             </div>
             
             {/* 辅助操作区 */}
             <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 space-y-6 shadow-sm">
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-4">快速导出</h4>
                <div className="grid grid-cols-2 gap-4">
                    <button className="flex flex-col items-center gap-3 p-6 bg-slate-50 rounded-3xl hover:bg-slate-100 transition-all border border-slate-100">
                        <div className="p-3 bg-white rounded-xl shadow-sm"><Icons.Edit className="w-5 h-5 text-indigo-600" /></div>
                        <span className="text-xs font-black text-slate-600">打印草案</span>
                    </button>
                    <button className="flex flex-col items-center gap-3 p-6 bg-slate-50 rounded-3xl hover:bg-slate-100 transition-all border border-slate-100">
                        <div className="p-3 bg-white rounded-xl shadow-sm"><Icons.Check className="w-5 h-5 text-emerald-600" /></div>
                        <span className="text-xs font-black text-slate-600">保存模板</span>
                    </button>
                </div>
             </div>
          </div>

        </div>
      </main>
      
      {/* Footer for mobile - 针对移动端适配字号 */}
      <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-2xl border-t border-slate-200 p-8 md:hidden z-40 shadow-[0_-20px_50px_rgba(0,0,0,0.1)]">
         <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-black text-slate-400 uppercase">预估实付:</span>
            <span className="text-3xl font-black font-mono text-indigo-600 tracking-tighter">¥ {formatCurrency(financials.netPayable)}</span>
         </div>
         <button onClick={() => setIsSubmitted(true)} className="w-full py-6 bg-slate-900 text-white rounded-[1.5rem] font-black text-base uppercase tracking-widest shadow-2xl active:scale-95 transition-transform">生成正式单据</button>
      </div>
    </div>
  );
};

export default App;
