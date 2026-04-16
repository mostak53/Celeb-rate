import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  getDocs,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { CelebrityImage, Rating } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Trash2, Image as ImageIcon, Loader2, X, BarChart3, Download, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

export const AdminDashboard: React.FC = () => {
  const [images, setImages] = useState<CelebrityImage[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'images'), orderBy('upload_time', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const imgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CelebrityImage));
      setImages(imgs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'images');
    });

    const ratingsUnsubscribe = onSnapshot(collection(db, 'ratings'), (snapshot) => {
      const rats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rating));
      setRatings(rats);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'ratings');
    });

    return () => {
      unsubscribe();
      ratingsUnsubscribe();
    };
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name) return;

    setUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      // Helper to compress and convert to Base64
      const processImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;

              // Max dimensions to keep size down
              const MAX_WIDTH = 800;
              const MAX_HEIGHT = 800;

              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);

              // Compress as JPEG (0.7 quality) to stay well under 1MB
              const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
              
              // Check size (Firestore limit is 1MB, but we want to be safe)
              const sizeInBytes = Math.round((dataUrl.length * 3) / 4);
              if (sizeInBytes > 800000) { // 800KB limit
                reject(new Error("Image is too large even after compression. Please use a smaller image."));
              } else {
                resolve(dataUrl);
              }
            };
            img.onerror = () => reject(new Error("Failed to load image for processing."));
          };
          reader.onerror = () => reject(new Error("Failed to read file."));
        });
      };

      setUploadProgress(30);
      const base64Image = await processImage(file);
      setUploadProgress(70);

      await addDoc(collection(db, 'images'), {
        imageURL: base64Image,
        person_name: name,
        tags: tags.split(',').map(t => t.trim()).filter(t => t),
        upload_time: new Date()
      });

      setUploadProgress(100);
      setName('');
      setTags('');
      setFile(null);
      setShowUpload(false);
      setUploadProgress(0);
    } catch (error: any) {
      console.error("Upload process failed:", error);
      setError(error.message || "Upload failed. Please check your configuration.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (image: CelebrityImage) => {
    if (!confirm(`Are you sure you want to delete ${image.person_name}?`)) return;

    try {
      // Delete from firestore only (no storage used anymore)
      await deleteDoc(doc(db, 'images', image.id));
      
      // Delete associated ratings
      const ratingsQuery = query(collection(db, 'ratings'), where('imageId', '==', image.id));
      const ratingsSnap = await getDocs(ratingsQuery);
      ratingsSnap.forEach(async (ratingDoc) => {
        await deleteDoc(doc(db, 'ratings', ratingDoc.id));
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'images');
    }
  };

  const exportToExcel = () => {
    const data = ratings.map(r => {
      const img = images.find(i => i.id === r.imageId);
      const stats = getStats(r.imageId);
      return {
        'User ID': r.userId,
        'Celebrity': img?.person_name || 'Unknown',
        'Rating': r.rating,
        'Timestamp': r.timestamp?.toDate ? r.timestamp.toDate().toLocaleString() : new Date(r.timestamp).toLocaleString(),
        'Celebrity Name': img?.person_name || 'Unknown',
        'Average Rating': stats.avg
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ratings");
    XLSX.writeFile(wb, "CelebrityRatings.xlsx");
  };

  const getStats = (imageId: string) => {
    const imgRatings = ratings.filter(r => r.imageId === imageId);
    const avg = imgRatings.length > 0 
      ? imgRatings.reduce((acc, curr) => acc + curr.rating, 0) / imgRatings.length 
      : 0;
    return { count: imgRatings.length, avg: avg.toFixed(1) };
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-bold tracking-tighter uppercase">Admin <span className="text-[#F27D26]">Panel</span></h1>
            <p className="text-gray-500 text-xs tracking-widest uppercase mt-1">Manage images and view analytics</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              EXPORT DATA
            </button>
            <button 
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-6 py-2 bg-[#F27D26] text-black rounded-lg hover:bg-[#ff8c3a] transition-colors text-sm font-bold"
            >
              <Upload className="w-4 h-4" />
              UPLOAD NEW
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-[#F27D26]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {images.map((img) => {
                const stats = getStats(img.id);
                return (
                  <motion.div
                    key={img.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="group bg-[#111] border border-white/10 rounded-2xl overflow-hidden hover:border-[#F27D26]/50 transition-all shadow-xl"
                  >
                    <div className="aspect-[4/5] relative overflow-hidden">
                      <img 
                        src={img.imageURL} 
                        alt={img.person_name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <button 
                        onClick={() => handleDelete(img)}
                        className="absolute top-4 right-4 p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-1 truncate">{img.person_name}</h3>
                      <div className="flex flex-wrap gap-1 mb-4">
                        {img.tags.map(tag => (
                          <span key={tag} className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded uppercase tracking-wider">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-[#F27D26]" />
                          <span className="text-sm font-bold">{stats.avg}</span>
                        </div>
                        <span className="text-xs text-gray-500 uppercase tracking-widest">{stats.count} RATINGS</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Upload Modal */}
        <AnimatePresence>
          {showUpload && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#111] border border-white/10 rounded-3xl p-8 max-w-lg w-full shadow-2xl"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold uppercase tracking-tight">Upload <span className="text-[#F27D26]">Celebrity</span></h2>
                  <button onClick={() => setShowUpload(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleUpload} className="space-y-6">
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3 text-red-500">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  )}

                  <div 
                    className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-[#F27D26]/50 transition-colors cursor-pointer relative"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <input 
                      id="file-upload"
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        setFile(e.target.files?.[0] || null);
                        setError('');
                      }}
                      className="hidden"
                    />
                    {file ? (
                      <div className="flex items-center justify-center gap-3 text-[#F27D26]">
                        <ImageIcon className="w-8 h-8" />
                        <span className="font-medium truncate max-w-[200px]">{file.name}</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 mx-auto text-gray-500" />
                        <p className="text-sm text-gray-400">Click or drag image to upload</p>
                      </div>
                    )}
                  </div>

                  {uploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                        <span>Uploading...</span>
                        <span>{Math.round(uploadProgress)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-[#F27D26]"
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">Celebrity Name</label>
                    <input 
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:border-[#F27D26] outline-none transition-colors"
                      placeholder="e.g. Robert Downey Jr."
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">Tags (comma separated)</label>
                    <input 
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-white focus:border-[#F27D26] outline-none transition-colors"
                      placeholder="e.g. actor, marvel, ironman"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={uploading || !file || !name}
                    className="w-full bg-[#F27D26] text-black font-bold py-4 rounded-xl hover:bg-[#ff8c3a] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        UPLOAD IMAGE
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
