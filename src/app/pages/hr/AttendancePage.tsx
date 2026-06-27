import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { Button, Spinner } from '../../components/atoms';
import { toast } from 'sonner';
import { useState, useEffect, useRef } from 'react';
import { compressImageToBase64 } from '../../lib/imageCompressor';
import { getToken, decodeToken } from '../../lib/auth';

// Helper: Haversine distance
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const [now, setNow] = useState(new Date());
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [closestLocation, setClosestLocation] = useState<{ name: string, distance: number, radius: number } | null>(null);

  const user = decodeToken(getToken() || '');
  const isFieldWorker = user?.role === 'sales' || user?.role === 'marketing';

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: status, isLoading } = useQuery<any>({
    queryKey: ['attendance', 'today'],
    queryFn: () => apiFetch('/attendance/today'),
  });

  const { data: locations } = useQuery<any[]>({
    queryKey: ['locations'],
    queryFn: () => apiFetch('/locations'),
    enabled: !isFieldWorker // Only need geofence feedback if not a field worker
  });

  // Watch position for feedback
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        if (locations && locations.length > 0) {
          let minDistance = Infinity;
          let bestLoc = null;

          for (const loc of locations) {
            const dist = getDistance(latitude, longitude, loc.latitude, loc.longitude);
            if (dist < minDistance) {
              minDistance = dist;
              bestLoc = loc;
            }
          }

          if (bestLoc) {
            setClosestLocation({
              name: bestLoc.name,
              distance: minDistance,
              radius: bestLoc.radius_meters || 100
            });
          }
        }
      },
      (err) => console.error('GPS Error:', err),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [locations]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const mutation = useMutation({
    mutationFn: async (type: 'check-in' | 'check-out') => {
      let photo_url = '';
      
      if (type === 'check-in') {
        if (!photoFile) throw new Error('Foto selfie wajib untuk check-in');
        
        toast.info('Mengkompres & mengunggah foto...');
        const base64 = await compressImageToBase64(photoFile, 0.8, 800, 800);
        
        // Direct upload to ImgBB to save server bandwidth/storage
        const formData = new FormData();
        formData.append('image', base64);
        
        const imgbbRes = await fetch('https://api.imgbb.com/1/upload?key=aac6020804140df6ac86f95fc226a3c1', {
          method: 'POST',
          body: formData
        });
        
        if (!imgbbRes.ok) {
          throw new Error('Gagal mengunggah foto ke server ImgBB');
        }
        
        const uploadData = await imgbbRes.json() as any;
        photo_url = uploadData.data.url;
      }

      toast.info('Mengambil lokasi GPS...');
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              const res = await apiFetch(`/attendance/${type}`, {
                method: 'POST',
                body: JSON.stringify({
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  ...(photo_url ? { photo_url } : {})
                }),
              });
              resolve(res);
            } catch (e: any) { 
              reject(new Error(e.error || 'Gagal mengirim data absensi')); 
            }
          },
          (err) => reject(new Error('Gagal mendapatkan lokasi: ' + err.message)),
          { enableHighAccuracy: true }
        );
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Berhasil memperbarui status absensi');
      setPhotoFile(null);
      setPhotoPreview(null);
    },
    onError: (err: any) => toast.error(err.message || 'Gagal melakukan absensi')
  });

  const isWithinGeofence = isFieldWorker || (closestLocation && closestLocation.distance <= closestLocation.radius);

  if (isLoading) return <Spinner />;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-h1 font-h1 text-primary">{now.toLocaleTimeString('id-ID')}</h1>
        <p className="text-on-surface-variant">{now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {isFieldWorker && (
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center gap-3">
          <span className="material-symbols-outlined text-blue-600">travel_explore</span>
          <div className="text-xs text-blue-800">
            <strong>Mode Lapangan Aktif:</strong> Anda dapat melakukan absensi di mana saja. Lokasi GPS tetap akan dicatat.
          </div>
        </div>
      )}

      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 shadow-sm text-center space-y-6">
        <div className="w-24 h-24 bg-primary-container/10 rounded-full flex items-center justify-center text-primary mx-auto overflow-hidden">
          {photoPreview ? (
            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <span className="material-symbols-outlined text-5xl">
              {status?.check_in_at ? (status.check_out_at ? 'task_alt' : 'timer') : 'fingerprint'}
            </span>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold text-on-surface">
            {status?.check_in_at ? (status.check_out_at ? 'Selesai Bekerja' : 'Sedang Bekerja') : 'Siap Bekerja?'}
          </h2>
          <p className="text-sm text-on-surface-variant">
            {isFieldWorker ? 'Kunjungan lapangan sedang aktif.' : 'Pastikan Anda berada di lokasi kantor.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4 border-y border-outline-variant/50">
          <div>
            <p className="text-[10px] text-on-surface-variant uppercase font-bold">Masuk</p>
            <p className="font-mono text-lg">{status?.check_in_at ? new Date(status.check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant uppercase font-bold">Pulang</p>
            <p className="font-mono text-lg">{status?.check_out_at ? new Date(status.check_out_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
          </div>
        </div>

        {!status?.check_in_at && (
          <div className="space-y-4">
            <input 
              type="file" 
              accept="image/*" 
              capture="user" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handlePhotoChange} 
            />
            <Button 
              className="w-full py-4 text-sm rounded-xl bg-surface-container-high text-on-surface hover:bg-surface-container-highest" 
              leftIcon="photo_camera"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={mutation.isPending}
            >
              {photoFile ? 'Ganti Foto Selfie' : 'Ambil Foto Selfie'}
            </Button>

            <Button 
              className="w-full py-6 text-lg rounded-xl" 
              leftIcon="login"
              loading={mutation.isPending}
              onClick={() => mutation.mutate('check-in')}
              disabled={!photoFile || !isWithinGeofence}
            >
              Check In
            </Button>
            
            {!isWithinGeofence && (
              <p className="text-xs text-error font-bold animate-pulse">
                Anda berada di luar area kantor. Check-in dinonaktifkan.
              </p>
            )}
          </div>
        )}

        {status?.check_in_at && !status?.check_out_at && (
          <Button 
            className="w-full py-6 text-lg rounded-xl" 
            variant="outline"
            leftIcon="logout"
            loading={mutation.isPending}
            onClick={() => mutation.mutate('check-out')}
          >
            Check Out
          </Button>
        )}

        {status?.check_out_at && (
          <div className="p-4 bg-green-50 text-green-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
            <span className="material-symbols-outlined">verified</span>
            Absensi Hari Ini Selesai
          </div>
        )}
      </div>

      <div className={`p-4 rounded-xl flex items-center gap-3 transition-colors ${isWithinGeofence ? 'bg-green-50 border border-green-100' : 'bg-error/5 border border-error/10'}`}>
        <span className={`material-symbols-outlined ${isWithinGeofence ? 'text-green-600' : 'text-error'}`}>
          {isWithinGeofence ? 'location_on' : 'location_off'}
        </span>
        <div className="flex-1">
          <div className="text-xs font-bold text-on-surface">
            {isFieldWorker ? 'Lokasi GPS Tercatat' : (isWithinGeofence ? `Terverifikasi: ${closestLocation?.name}` : 'Di Luar Area Kantor')}
          </div>
          {userLocation && (
            <div className="text-[10px] text-on-surface-variant font-mono">
              {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
            </div>
          )}
        </div>
        {!isFieldWorker && closestLocation && (
          <div className="text-[10px] font-bold text-on-surface-variant">
            {closestLocation.distance > 1000 ? `${(closestLocation.distance/1000).toFixed(1)}km` : `${Math.round(closestLocation.distance)}m`}
          </div>
        )}
      </div>
    </div>
  );
}

