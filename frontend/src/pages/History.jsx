import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../components/DataTable';
import { Calendar, Download, Search, Trash2, Eye } from 'lucide-react';
import { api } from '../services/api';

const History = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PER_PAGE = 15;

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/sessions', { params: { page, per_page: PER_PAGE } });
      setSessions(res.data.items || []);
      setTotalPages(res.data.pages || 1);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this session and all its detections?')) return;
    try {
      await api.delete(`/sessions/${id}`);
      fetchSessions();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const columns = [
    {
      header: 'Session ID',
      accessor: 'id',
      cell: (row) => <span className="font-mono text-blue-400">#{row.id}</span>,
    },
    {
      header: 'Date',
      accessor: 'created_at',
      cell: (row) => {
        const d = new Date(row.created_at);
        return (
          <div>
            <div className="text-slate-200 text-sm">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            <div className="text-slate-500 text-xs">{d.toLocaleTimeString([], { hour12: false })}</div>
          </div>
        );
      },
    },
    {
      header: 'Type',
      accessor: 'input_type',
      cell: (row) => (
        <span className={`px-2 py-0.5 text-xs rounded border font-medium capitalize ${
          row.input_type === 'live' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10'
          : row.input_type === 'video' ? 'text-purple-400 border-purple-500/30 bg-purple-500/10'
          : 'text-green-400 border-green-500/30 bg-green-500/10'
        }`}>
          {row.input_type}
        </span>
      ),
    },
    { header: 'Source', accessor: 'source', cell: (row) => <span className="text-slate-400 text-sm truncate max-w-xs block">{row.source || '—'}</span> },
    { header: 'Workers', accessor: 'total_workers', cell: (row) => <span className="font-mono">{row.total_workers}</span> },
    { header: 'Helmet ✓', accessor: 'helmet_count', cell: (row) => <span className="text-green-400 font-mono">{row.helmet_count}</span> },
    { header: 'No Helmet ✗', accessor: 'no_helmet_count', cell: (row) => <span className="text-red-400 font-mono">{row.no_helmet_count}</span> },
    {
      header: 'Compliance',
      accessor: 'compliance_rate',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-14 bg-slate-700 rounded-full h-1.5 shrink-0">
            <div
              className={`h-1.5 rounded-full ${row.compliance_rate >= 90 ? 'bg-green-500' : row.compliance_rate >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${row.compliance_rate}%` }}
            />
          </div>
          <span className="text-xs font-mono">{row.compliance_rate}%</span>
        </div>
      ),
    },
    { header: 'Avg Conf', accessor: 'average_confidence', cell: (row) => <span className="font-mono text-slate-300">{(row.average_confidence * 100).toFixed(1)}%</span> },
    {
      header: 'Actions',
      accessor: 'actions',
      cell: (row) => (
        <div className="flex gap-2">
          <button className="p-1.5 hover:bg-slate-700 text-blue-400 rounded transition-colors" title="View detections">
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="p-1.5 hover:bg-red-500/10 text-red-400 rounded transition-colors"
            title="Delete session"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Detection History</h1>
          <p className="text-slate-400 text-sm mt-1">{total} sessions recorded</p>
        </div>
        <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white rounded-lg flex items-center gap-2 transition-colors text-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search sessions..."
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg pl-10 pr-4 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <select className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg pl-10 pr-8 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none">
            <option>All Time</option>
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={sessions}
        loading={loading}
        pagination={{ page, pages: totalPages, total }}
        onPageChange={setPage}
      />
    </div>
  );
};

export default History;
