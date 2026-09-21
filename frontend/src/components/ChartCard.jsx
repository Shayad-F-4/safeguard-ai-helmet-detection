import React from 'react';

const ChartCard = ({ title, subtitle, children, className = '' }) => {
  return (
    <div className={`bg-slate-800 rounded-xl border border-slate-700 p-5 flex flex-col ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-medium text-slate-200">{title}</h3>
        {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
      </div>
      <div className="flex-1 w-full relative min-h-[250px]">
        {children}
      </div>
    </div>
  );
};

export default ChartCard;
