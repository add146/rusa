import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { Button } from '../../components/atoms/Button';
import { toast } from 'sonner';

export default function ClientImportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [csvData, setCsvData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');

  const importMutation = useMutation({
    mutationFn: (data: any[]) => apiFetch('/clients/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ clients: data }),
    }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(`Berhasil mengimpor ${res.imported} klien.`);
      navigate('/clients');
    },
    onError: () => {
      toast.error('Gagal mengimpor data klien.');
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrors([]);
    setCsvData([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        const parsed = parseCSV(text);
        validateData(parsed);
      } catch (err: any) {
        setErrors([`Gagal memproses file: ${err.message}`]);
      }
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/);
    if (lines.length === 0 || !lines[0].trim()) {
      throw new Error('File CSV kosong.');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
    
    // Validate headers
    const requiredHeaders = ['company_name', 'pic_name'];
    const missing = requiredHeaders.filter(h => !headers.includes(h));
    if (missing.length > 0) {
      throw new Error(`Kolom wajib tidak ditemukan: ${missing.join(', ')}`);
    }

    const results = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      const row: any = {};
      headers.forEach((header, idx) => {
        let val = values[idx] || '';
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        }
        row[header] = val;
      });
      results.push(row);
    }
    return results;
  };

  const validateData = (data: any[]) => {
    const validationErrors: string[] = [];
    const validRows = data.map((row, idx) => {
      const lineNum = idx + 2; // header is line 1
      
      if (!row.company_name) {
        validationErrors.push(`Baris ${lineNum}: Nama Perusahaan (company_name) wajib diisi.`);
      }
      if (!row.pic_name) {
        validationErrors.push(`Baris ${lineNum}: Nama PIC (pic_name) wajib diisi.`);
      }

      return {
        company_name: row.company_name || '',
        pic_name: row.pic_name || '',
        pic_phone: row.pic_phone || '',
        pic_email: row.pic_email || '',
        owner_name: row.owner_name || '',
        address: row.address || '',
        city: row.city || '',
        notes: row.notes || '',
      };
    });

    setErrors(validationErrors);
    setCsvData(validRows);
  };

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "company_name,pic_name,pic_phone,pic_email,owner_name,address,city,notes\n"
      + "PT. Rusamas Sejahtera,Budi Santoso,08123456789,budi@rusamas.com,Hermawan,Jl. Sudirman No 1,Jakarta,Klien Prioritas\n"
      + "CV. Maju Bersama,Ahmad Fauzi,0876543210,ahmad@majubersama.com,Ahmad,Jl. Gajah Mada No 2,Bandung,\n";
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_klien.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button onClick={() => navigate('/clients')} variant="ghost" size="sm" leftIcon="arrow_back" />
        <div>
          <h1 className="text-h2 font-h2 text-primary">Import Klien via CSV</h1>
          <p className="text-on-surface-variant text-body-md">Unggah data klien secara massal dari file spreadsheet CSV.</p>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-outline-variant pb-4">
          <div>
            <h3 className="font-bold text-on-surface">Panduan CSV & Template</h3>
            <p className="text-xs text-on-surface-variant mt-1">Gunakan header kolom yang sesuai agar sistem dapat mendata klien dengan benar.</p>
          </div>
          <Button onClick={downloadTemplate} variant="outline" size="sm" leftIcon="download">
            Unduh Template CSV
          </Button>
        </div>

        <div className="border-2 border-dashed border-outline-variant rounded-xl p-8 text-center bg-surface-container-low hover:border-primary/50 transition-colors relative">
          <input 
            type="file" 
            accept=".csv"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/70 mb-2">upload_file</span>
          <p className="text-sm font-semibold text-on-surface">
            {fileName ? `File terpilih: ${fileName}` : 'Klik untuk memilih file CSV'}
          </p>
          <p className="text-[10px] text-on-surface-variant mt-1">Mendukung file teks dipisahkan koma (.csv) maks 5MB</p>
        </div>

        {errors.length > 0 && (
          <div className="bg-error-container/10 border border-error/20 p-4 rounded-lg space-y-1">
            <h4 className="text-xs font-bold text-error uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">warning</span>
              Kesalahan Validasi Data ({errors.length})
            </h4>
            <div className="max-h-[150px] overflow-y-auto pr-2">
              <ul className="list-disc list-inside text-xs text-error space-y-1">
                {errors.map((err, idx) => <li key={idx}>{err}</li>)}
              </ul>
            </div>
          </div>
        )}

        {csvData.length > 0 && errors.length === 0 && (
          <div className="space-y-3">
            <h3 className="font-bold text-on-surface text-sm uppercase tracking-wider">Preview Data ({csvData.length} Klien)</h3>
            <div className="overflow-x-auto border border-outline-variant rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-container border-b border-outline-variant text-on-surface-variant font-bold">
                    <th className="px-4 py-2">Perusahaan</th>
                    <th className="px-4 py-2">PIC</th>
                    <th className="px-4 py-2">Owner</th>
                    <th className="px-4 py-2">WhatsApp</th>
                    <th className="px-4 py-2">Kota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {csvData.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className="hover:bg-surface-container-low/50">
                      <td className="px-4 py-2 font-semibold">{row.company_name}</td>
                      <td className="px-4 py-2">{row.pic_name}</td>
                      <td className="px-4 py-2">{row.owner_name || '-'}</td>
                      <td className="px-4 py-2">{row.pic_phone || '-'}</td>
                      <td className="px-4 py-2">{row.city || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {csvData.length > 10 && (
                <div className="p-2 bg-surface text-center text-on-surface-variant italic">
                  Menampilkan 10 dari {csvData.length} baris data...
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
          <Button onClick={() => navigate('/clients')} variant="outline">Batal</Button>
          <Button 
            onClick={() => importMutation.mutate(csvData)}
            loading={importMutation.isPending}
            disabled={csvData.length === 0 || errors.length > 0}
            leftIcon="publish"
          >
            Import Sekarang
          </Button>
        </div>
      </div>
    </div>
  );
}
