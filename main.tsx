import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MediaItem } from "../types";
import MovieCard from "./MovieCard";

interface MovieCarouselProps {
  title: string;
  items: MediaItem[];
  watchlist: number[];
  onSelect: (item: MediaItem) => void;
  onPlay: (item: MediaItem) => void;
  onToggleWatchlist: (item: MediaItem) => void;
}

export default function MovieCarousel({
  title,
  items,
  watchlist,
  onSelect,
  onPlay,
  onToggleWatchlist,
}: MovieCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // Check scroll positions to toggle navigation arrows
  const checkScrollState = () => {
    const el = scrollContainerRef.current;
    if (el) {
      setShowLeftArrow(el.scrollLeft > 10);
      setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    }
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener("scroll", checkScrollState);
      checkScrollState();
    }
    return () => {
      if (el) {
        el.removeEventListener("scroll", checkScrollState);
      }
    };
  }, [items]);

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (el) {
      const scrollAmount = el.clientWidth * 0.8;
      el.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="relative my-6 px-4 md:px-12 group/carousel">
      {/* Sleek Row Header */}
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="font-sans text-lg md:text-xl font-bold tracking-tight text-white/90 hover:text-white transition-colors cursor-pointer">
          {title}
        </h3>
      </div>

      {/* Carousel Body Wrapper */}
      <div className="relative">
        {/* Left Pagination Slider Button */}
        {showLeftArrow && (
          <button
            id={`carousel-left-${title.toLowerCase().replace(/\s+/g, '-')}`}
            onClick={() => handleScroll("left")}
            className="absolute left-0 top-0 bottom-4 z-20 flex items-center justify-center w-10 md:w-12 bg-black/60 hover:bg-black/80 text-white rounded-r-md transition-all duration-200 opacity-0 group-hover/carousel:opacity-100"
          >
            <ChevronLeft className="w-8 h-8 transition-transform group-hover/carousel:scale-110" />
          </button>
        )}

        {/* Right Pagination Slider Button */}
        {showRightArrow && (
          <button
            id={`carousel-right-${title.toLowerCase().replace(/\s+/g, '-')}`}
            onClick={() => handleScroll("right")}
            className="absolute right-0 top-0 bottom-4 z-20 flex items-center justify-center w-10 md:w-12 bg-black/60 hover:bg-black/80 text-white rounded-l-md transition-all duration-200 opacity-0 group-hover/carousel:opacity-100"
          >
            <ChevronRight className="w-8 h-8 transition-transform group-hover/carousel:scale-110" />
          </button>
        )}

        {/* Horizontal Card Scrolling viewport */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 md:gap-5 overflow-x-auto overflow-y-hidden pb-4 pt-1 snap-x scrollbar-none scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          {items.map((item) => (
            <div key={item.id} className="snap-start">
              <MovieCard
                item={item}
                onSelect={onSelect}
                onPlay={onPlay}
                isInWatchlist={watchlist.includes(item.id)}
                onToggleWatchlist={onToggleWatchlist}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
