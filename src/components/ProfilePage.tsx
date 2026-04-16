import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { CelebrityImage, Rating } from '../types';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Loader2, Calendar, User, Edit2, Check, X } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [images, setImages] = useState<Record<string, CelebrityImage>>({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState(0);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'ratings'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rating));
      setRatings(rats.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'ratings');
    });

    // Fetch images for these ratings
    const imagesUnsubscribe = onSnapshot(collection(db, 'images'), (snapshot) => {
      const imgs: Record<string, CelebrityImage> = {};
      snapshot.docs.forEach(doc => {
        imgs[doc.id] = { id: doc.id, ...doc.data() } as CelebrityImage;
      });
      setImages(imgs);
    });

    return () => {
      unsubscribe();
      imagesUnsubscribe();
    };
  }, [user]);

  const handleUpdateRating = async (ratingId: string) => {
    try {
      await updateDoc(doc(db, 'ratings', ratingId), {
        rating: editValue,
        timestamp: serverTimestamp()
      });
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'ratings');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-bold tracking-tighter uppercase">My <span className="text-[#F27D26]">Ratings</span></h1>
          <p className="text-gray-500 text-xs tracking-widest uppercase mt-1">History of your celebrity evaluations</p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-[#F27D26]" />
          </div>
        ) : ratings.length === 0 ? (
          <div className="text-center py-20 bg-[#111] border border-white/10 rounded-3xl">
            <Star className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold uppercase tracking-tight mb-2">No Ratings Yet</h3>
            <p className="text-gray-500 text-sm">Start rating celebrities to see your history here!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {ratings.map((rating) => {
                const img = images[rating.imageId];
                if (!img) return null;

                const isEditing = editingId === rating.id;

                return (
                  <motion.div
                    key={rating.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#111] border border-white/10 rounded-2xl p-4 flex items-center gap-6 group hover:border-white/20 transition-all"
                  >
                    <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-white/5">
                      <img 
                        src={img.imageURL} 
                        alt={img.person_name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg truncate uppercase tracking-tight">{img.person_name}</h3>
                      <div className="flex items-center gap-4 text-gray-500 text-[10px] uppercase tracking-widest font-bold mt-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {rating.timestamp?.toDate ? rating.timestamp.toDate().toLocaleDateString() : 'Just now'}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(val => (
                              <button 
                                key={val}
                                onClick={() => setEditValue(val)}
                                className="p-1"
                              >
                                <Star className={`w-5 h-5 ${editValue >= val ? 'fill-[#F27D26] text-[#F27D26]' : 'text-gray-700'}`} />
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-1 ml-2">
                            <button 
                              onClick={() => handleUpdateRating(rating.id)}
                              className="p-2 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30 transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setEditingId(null)}
                              className="p-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(val => (
                              <Star 
                                key={val} 
                                className={`w-4 h-4 ${rating.rating >= val ? 'fill-[#F27D26] text-[#F27D26]' : 'text-gray-800'}`} 
                              />
                            ))}
                          </div>
                          <button 
                            onClick={() => {
                              setEditingId(rating.id);
                              setEditValue(rating.rating);
                            }}
                            className="p-2 text-gray-600 hover:text-white hover:bg-white/5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
