import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { getDetections } from '../services/api';
import { formatTimestamp } from '../utils/helpers';
import { Search, Download, ClipboardList, X } from 'lucide-react';

const DetectionResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const PER_PAGE = 20;

  const fetchDetections = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        per_page: PER_PAGE,
        status: statusFilter || undefined,
        session_id: sessionId ? parseInt(sessionId) : undefined,
        search: search.trim() || undefined,
      };
      const res = await getDetections(params);
      setItems(res.data.items || []);
      setPages(res.data.pages || 1);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Detection results error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, sessionId, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDetections();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchDetections]);

  const handleExportCSV = () => {
    if (!items || items.length === 0) {
      alert('No detections to export.');
      return;
    }
    const headers = ['ID', 'Class', 'Status', 'Confidence %', 'Bounding Box', 'Timestamp'];
    const rows = items.map(d => [
      d.id,
      `"${d.class_name || ''}"`,
      `"${d.status || ''}"`,
      d.confidence,
      `"[${d.bbox?.x1 || 0}, ${d.bbox?.y1 || 0}, ${d.bbox?.x2 || 0}, ${d.bbox?.y2 || 0}]"`,
      `"${new Date(d.timestamp).toISOString()}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `safeguard-detections-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    {
      header: 'ID',
      accessor: 'id',
      cell: (row) => <span className="font-mono text-blue-400 text-sm font-semibold">#{row.id}</span>,
    },
    {
      header: 'Class / Object',
      accessor: 'class_name',
      cell: (row) => (
        <span className={`capitalize font-semibold ${row.class_name === 'helmet' ? 'text-green-400' : 'text-red-400'}`}>
          {row.class_name?.replace('_', ' ') || '—'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => <StatusBadge status={row.status === 'safe' ? 'SAFE' : 'VIOLATION'} />,
    },
    {
      header: 'Confidence',
      accessor: 'confidence',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-12 bg-slate-700 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${row.confidence >= 90 ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(row.confidence, 100)}%` }}
            />
          </div>
          <span className="font-mono text-sm text-slate-300 font-medium">{row.confidence}%</span>
        </div>
      ),
    },
    {
      header: 'Bounding Box',
      accessor: 'bbox',
      cell: (row) => (
        <span className="font-mono text-xs text-slate-400 bg-slate-900/60 px-2 py-1 rounded border border-slate-700/50">
          [{row.bbox?.x1 ?? 0}, {row.bbox?.y1 ?? 0}, {row.bbox?.x2 ?? 0}, {row.bbox?.y2 ?? 0}]
        </span>
      ),
    },
    {
      header: 'Timestamp',
      accessor: 'timestamp',
      cell: (row) => (
        <div>
          <div className="text-slate-300 text-sm font-medium">{formatTimestamp(row.timestamp)}</div>
          <div className="text-slate-500 text-xs font-mono">{new Date(row.timestamp).toLocaleDateString()}</div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-400" /> Detection Results
          </h1>
          <p className="text-slate-400 text-sm mt-1">{total} total detections in database</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white rounded-lg flex items-center gap-2 transition-colors text-sm shadow-sm"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Session Filter Badge */}
      {sessionId && (
        <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-2.5 text-sm text-blue-300">
          <span>
            Filtered by Session: <strong className="font-mono text-white">#{sessionId}</strong>
          </span>
          <button
            onClick={() => {
              searchParams.delete('session_id');
              setSearchParams(searchParams);
              setPage(1);
            }}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-white bg-blue-500/20 px-2.5 py-1 rounded-md transition"
          >
            <X className="w-3.5 h-3.5" /> Clear Filter
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search detections by class or status..."
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg pl-10 pr-4 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div className="flex gap-1 p-1 bg-slate-900 rounded-lg border border-slate-700">
          {[
            { label: 'All', value: '' },
            { label: '✓ Safe', value: 'safe' },
            { label: '✗ Violation', value: 'violation' },
          ].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => { setStatusFilter(value); setPage(1); }}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                statusFilter === value ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        pagination={{ page, pages, total }}
        onPageChange={setPage}
      />
    </div>
  );
};

export default DetectionResults;
