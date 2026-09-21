import React from 'react';

const StatCard = ({ title, value, unit, icon: Icon, color = 'blue', trend, subtitle }) => {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    green: 'bg-green-500/10 text-green-500 border-green-500/20',
    red: 'bg-red-500/10 text-red-500 border-red-500/20',
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  };

  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-400 text-sm font-medium">{title}</h3>
        <div className={`p-2 rounded-lg ${colorClasses[color]} border`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      
      <div>
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-white font-mono">{value}</span>
          {unit && <span className="text-slate-400 text-sm font-medium">{unit}</span>}
        </div>
        
        {(trend || subtitle) && (
          <div className="mt-2 flex items-center text-sm">
            {trend && (
              <span className={`mr-2 font-medium ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
              </span>
            )}
            {subtitle && <span className="text-slate-500">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
