import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../../utils/api.js';

export default function DrugImporter() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMessage('');
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/import/drugs', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.status !== 200) {
        setError(response.data?.error || 'Failed to import drugs');
      } else {
        setMessage(`✅ ${response.data.message}`);
        setFile(null);
        if (document.getElementById('fileInput')) {
          document.getElementById('fileInput').value = '';
        }
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-[var(--md-surface-variant)] rounded-[var(--md-radius-lg)] shadow-[var(--md-shadow-1)] max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Import Drugs</h2>

      <div className="mb-4">
        <label htmlFor="fileInput" className="block text-sm font-medium text-gray-700 mb-2">
          Select Excel/CSV File
        </label>
        <input
          id="fileInput"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none p-2"
        />
        {file && <p className="text-sm text-green-600 mt-2">✓ {file.name}</p>}
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition"
      >
        {loading ? 'Uploading...' : 'Upload & Import'}
      </button>

      {message && (
        <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-gray-700">
        <p className="font-semibold mb-2">Expected CSV Headers (Arabic/English):</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>id / اسم انجليزي (English name - required)</li>
          <li>اسم عربي (Arabic name - fallback)</li>
          <li>باركود دولي (International barcode - auto-generated if missing)</li>
          <li>سعر جديد (New price - maps to sell_price)</li>
          <li>سعر قديم (Old price - maps to avg_cost)</li>
          <li>مادة فعالة (Active ingredient)</li>
          <li>الفئة (Category)</li>
          <li>شكل صيدلاني (Unit/Pharmaceutical form)</li>
          <li>وحدات كبرى (Strip count - number of strips per box)</li>
        </ul>
      </div>
    </div>
  );
}
