import { useState } from "react";
import { Play, Plus, Check, Info, Star } from "lucide-react";
import { motion } from "motion/react";
import { MediaItem } from "../types";

interface MovieCardProps {
  key?: any;
  item: MediaItem;
  onSelect: (item: MediaItem) => void;
  onPlay: (item: MediaItem) => void;
  isInWatchlist: boolean;
  onToggleWatchlist: (item: MediaItem) => void;
}

export default function MovieCard({
  item,
  onSelect,
  onPlay,
  isInWatchlist,
  onToggleWatchlist,
}: MovieCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const title = item.title || item.name || "Untitled Production";
  const releaseDate = item.release_date || item.first_air_date || "";
  const releaseYear = releaseDate ? releaseDate.substring(0, 4) : "2026";
  const rating = item.vote_average ? item.vote_average.toFixed(1) : "0.0";
  const mediaType = item.media_type || (item.first_air_date ? "tv" : "movie");

  // Calculate a mock matching percentage (e.g., based on vote average to look like Netflix's "98% Match")
  const matchPercentage = item.vote_average 
    ? Math.min(100, Math.round(item.vote_average * 10 + 20)) 
    : 85;

  // TMDB Image Base URLs
  const posterUrl = item.poster_path
    ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
    : `https://images.unsplash.com/photo-1542204172-e7052809a86e?q=80&w=342&auto=format&fit=crop`;

  return (
    <motion.div
      id={`movie-card-${item.id}`}
      className="relative flex-none w-44 md:w-52 h-64 md:h-76 rounded-md overflow-hidden group cursor-pointer bg-neutral-900 border border-neutral-800 transition-all duration-300 shadow-lg"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{
        y: -6,
        borderColor: "#e50914",
        boxShadow: "0 12px 24px rgba(0,0,0,0.6)",
      }}
    >
      {/* Background Poster Image */}
      <img
        src={posterUrl}
        alt={title}
        referrerPolicy="no-referrer"
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-500 scale-100 group-hover:scale-105"
      />

      {/* Elegant Bottom Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-300" />

      {/* Floating Meta Badges */}
      <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
        {/* Rating Badge */}
        <span className="flex items-center gap-1 text-[10px] font-semibold bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-amber-400 shadow-md">
          <Star className="w-2.5 h-2.5 fill-amber-400 stroke-none" />
          {rating}
        </span>
        {/* Media Type Badge */}
        <span className="text-[10px] uppercase font-bold bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded text-neutral-200 tracking-wider shadow-md">
          {mediaType === "tv" ? "TV Show" : "Movie"}
        </span>
      </div>

      {/* Modern Netflix-style Hover Control Overlay */}
      <div className="absolute inset-0 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-t from-[#0e0e11] via-[#0e0e11]/95 to-transparent">
        {/* Title and Release Info */}
        <h4 className="font-sans text-sm font-bold tracking-tight text-white mb-1 line-clamp-2">
          {title}
        </h4>
        
        <div className="flex items-center gap-2 mb-3 text-[11px] font-medium text-neutral-400">
          <span className="text-green-500 font-bold">{matchPercentage}% Match</span>
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
          <span>{releaseYear}</span>
        </div>

        {/* Action Button Strip */}
        <div id={`card-actions-${item.id}`} className="flex items-center gap-2 mt-1">
          {/* Main Play Action */}
          <button
            id={`btn-play-card-${item.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onPlay(item);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 bg-white text-black hover:bg-[#e50914] hover:text-white text-xs font-bold py-2 px-3 rounded-md transition-all duration-200 shadow-md"
          >
            <Play className="w-3.5 h-3.5 fill-current stroke-current" />
            Watch
          </button>

          {/* Plus Add/Remove Watchlist Action */}
          <button
            id={`btn-watchlist-card-${item.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleWatchlist(item);
            }}
            className={`flex items-center justify-center w-8 h-8 rounded-md border transition-colors ${
              isInWatchlist 
                ? "bg-[#e50914] text-white border-[#e50914] hover:bg-[#b80710]" 
                : "bg-[#1f1f23] text-neutral-200 border-neutral-700 hover:border-white hover:text-white"
            }`}
            title={isInWatchlist ? "Remove from List" : "Add to My List"}
          >
            {isInWatchlist ? (
              <Check className="w-4 h-4 text-white" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>

          {/* Info Action */}
          <button
            id={`btn-info-card-${item.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item);
            }}
            className="flex items-center justify-center w-8 h-8 rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-white hover:text-white transition-colors"
            title="More Info"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
