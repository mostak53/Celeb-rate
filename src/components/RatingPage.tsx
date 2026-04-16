import React, { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { CelebrityImage, Rating } from '../types';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Star, SkipForward, Loader2, CheckCircle2 } from 'lucide-react';

export const RatingPage: React.FC = () => {
  const { user } = useAuth();
  const [images, setImages] = useState<CelebrityImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch all images and user's ratings to filter
  useEffect(() => {
    if (!user) return;

    const imagesUnsubscribe = onSnapshot(collection(db, 'images'), (snapshot) => {
      const allImgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CelebrityImage));
      
      // Also fetch user's ratings to filter
      const ratingsQuery = query(collection(db, 'ratings'), where('userId', '==', user.uid));
      getDocs(ratingsQuery).then(ratingsSnap => {
        const ratedImageIds = new Set(ratingsSnap.docs.map(doc => doc.data().imageId));
        const unratedImgs = allImgs.filter(img => !ratedImageIds.has(img.id));
        
        // Shuffle unrated images
        const shuffled = [...unratedImgs].sort(() => Math.random() - 0.5);
        setImages(shuffled);
        setLoading(false);
      }).catch(error => {
        console.error("Error fetching ratings for filter:", error);
        setLoading(false);
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'images');
    });

    return imagesUnsubscribe;
  }, [user]);

  const handleRate = async (value: number) => {
    if (!user || !images[currentIndex] || ratingLoading) return;

    setRatingLoading(true);
    const currentImage = images[currentIndex];

    try {
      // Create new rating (we only show unrated images now, but updateDoc is safe if logic changes)
      await addDoc(collection(db, 'ratings'), {
        userId: user.uid,
        imageId: currentImage.id,
        rating: value,
        timestamp: serverTimestamp()
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        // Remove the rated image from the local list immediately for better UX
        setImages(prev => prev.filter(img => img.id !== currentImage.id));
        // Reset index if needed (though filter handles it)
        if (currentIndex >= images.length - 1) {
          setCurrentIndex(0);
        }
      }, 800);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'ratings');
    } finally {
      setRatingLoading(false);
    }
  };

  const nextImage = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#F27D26]" />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-center p-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-tighter">No Images Found</h2>
          <p className="text-gray-500">Check back later for new celebrities to rate!</p>
        </div>
      </div>
    );
  }

  const currentImage = images[currentIndex];

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans overflow-hidden">
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImage.id}
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="max-w-xl w-full flex flex-col items-center"
          >
            {/* Image Card */}
            <div className="relative w-full aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border border-white/10 group mb-8">
              <img 
                src={currentImage.imageURL} 
                alt={currentImage.person_name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
              
              <div className="absolute bottom-8 left-8 right-8">
                <motion.h2 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-4xl font-bold tracking-tighter uppercase mb-2"
                >
                  {currentImage.person_name}
                </motion.h2>
                <div className="flex flex-wrap gap-2">
                  {currentImage.tags.map(tag => (
                    <span key={tag} className="text-[10px] bg-white/10 backdrop-blur-md text-white px-3 py-1 rounded-full uppercase tracking-widest font-bold">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Success Overlay */}
              <AnimatePresence>
                {showSuccess && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-[#F27D26]/80 flex flex-col items-center justify-center z-10"
                  >
                    <CheckCircle2 className="w-20 h-20 text-black mb-4" />
                    <span className="text-black font-black text-2xl uppercase tracking-tighter">Rating Saved</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Rating Controls */}
            <div className="flex flex-col items-center gap-8 w-full">
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    onClick={() => handleRate(star)}
                    disabled={ratingLoading || showSuccess}
                    className="p-2 transition-colors"
                  >
                    <Star 
                      className={`w-10 h-10 ${
                        (hoveredStar || 0) >= star || 0 >= star 
                          ? 'fill-[#F27D26] text-[#F27D26]' 
                          : 'text-gray-700'
                      } transition-colors`}
                    />
                  </motion.button>
                ))}
              </div>

              <button
                onClick={nextImage}
                disabled={ratingLoading || showSuccess}
                className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors uppercase tracking-widest text-xs font-bold"
              >
                <SkipForward className="w-4 h-4" />
                Skip this one
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Preload Next Image */}
        {images[(currentIndex + 1) % images.length] && (
          <link rel="preload" as="image" href={images[(currentIndex + 1) % images.length].imageURL} />
        )}
      </main>
    </div>
  );
};
