import React from 'react';

const DataTable = ({ columns, data, pagination, onPageChange, loading }) => {
  if (loading) {
    return (
      <div className="animate-pulse flex flex-col space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-slate-800 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 bg-slate-800/50 rounded-lg border border-slate-700">
        No data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-800">
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="bg-slate-900/50 text-slate-400 font-medium uppercase text-xs">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className="px-6 py-4">{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-slate-700/50 transition-colors">
              {columns.map((col, colIndex) => (
                <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                  {col.cell ? col.cell(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      {pagination && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-700 bg-slate-800/50">
          <div className="text-sm text-slate-400">
            Page <span className="font-medium text-slate-200">{pagination.page}</span> of{' '}
            <span className="font-medium text-slate-200">{pagination.pages || 1}</span>
            {pagination.total ? ` — ${pagination.total} total` : ''}
          </div>
          <div className="flex space-x-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="px-3 py-1 bg-slate-700 rounded text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors text-sm"
            >
              ← Prev
            </button>
            <button
              disabled={pagination.page >= (pagination.pages || 1)}
              onClick={() => onPageChange(pagination.page + 1)}
              className="px-3 py-1 bg-slate-700 rounded text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors text-sm"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
