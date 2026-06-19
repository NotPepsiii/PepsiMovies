import { useState, useEffect } from "react";
import { X, ListVideo, Shield } from "lucide-react";
import { MediaItem, WatchHistoryItem } from "../types";
import { smartFetch } from "../api";

interface VideoPlayerProps {
  item: MediaItem;
  onClose: () => void;
  onUpdateHistory: (history: WatchHistoryItem) => void;
}

interface Episode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  air_date: string;
}

export default function VideoPlayer({ item, onClose, onUpdateHistory }: VideoPlayerProps) {
  const [currentSeason, setCurrentSeason] = useState<number>(1);
  const [currentEpisode, setCurrentEpisode] = useState<number>(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState<boolean>(false);
  const [episodeError, setEpisodeError] = useState<string | null>(null);
  
  const title = item.title || item.name || "Unknown title";
  const imdbId = item.external_ids?.imdb_id || "";
  const tmdbId = item.id;
  const isShow = item.first_air_date !== undefined;

  // Track episode changes to save watch history
  useEffect(() => {
    const historyItem: WatchHistoryItem = {
      mediaId: item.id,
      title: item.title || item.name || "Untitled",
      posterPath: item.poster_path,
      mediaType: isShow ? "tv" : "movie",
      timestamp: Date.now(),
      progressPercent: isShow ? Math.round((currentEpisode / (item.number_of_episodes || 10)) * 100) : 10,
      lastSeason: isShow ? currentSeason : undefined,
      lastEpisode: isShow ? currentEpisode : undefined,
    };
    onUpdateHistory(historyItem);
  }, [currentSeason, currentEpisode, item]);

  // Fetch episodes when season or show changes
  useEffect(() => {
    if (isShow) {
      fetchSeasonEpisodes(currentSeason);
    }
  }, [currentSeason, item]);

  const fetchSeasonEpisodes = async (seasonNum: number) => {
    setLoadingEpisodes(true);
    setEpisodeError(null);
    try {
      const response = await smartFetch(`/api/tv/${tmdbId}/season/${seasonNum}`);
      if (!response.ok) {
        throw new Error("Failed to load episodes.");
      }
      const data = await response.json();
      setEpisodes(data.episodes || []);
    } catch (err: any) {
      console.error("Error fetching season episodes:", err);
      setEpisodeError("Failed to load episodes. Please try switching servers or opening the show in a new tab.");
    } finally {
      setLoadingEpisodes(false);
    }
  };

  // Generate Stream URLs
  const getEmbedUrl = () => {
    if (isShow) {
      return `https://embedmaster.link/tv/${tmdbId}/${currentSeason}/${currentEpisode}`;
    } else {
      return `https://embedmaster.link/movie/${tmdbId}`;
    }
  };

  const currentEpisodeName = episodes.find(e => e.episode_number === currentEpisode)?.name;

  return (
    <div className="bg-[#0f0f0f] border-b border-neutral-800 py-8 px-4 md:px-12 relative">
      <div className="max-w-5xl mx-auto relative z-10">
        
        {/* Header Block with Control */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase text-[#e50914] tracking-wider font-bold">
                Streaming Player
              </span>
            </div>
            
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              {title}
            </h2>
            
            {isShow && (
              <p className="text-xs text-neutral-400 mt-1">
                Now Playing: Season {currentSeason}, Episode {currentEpisode}
                {currentEpisodeName ? ` — “${currentEpisodeName}”` : ""}
              </p>
            )}
          </div>

          <div id="player-headers-actions" className="flex items-center gap-3">
            <a
              id="btn-ad-blocker"
              href="https://ublockorigin.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-600 text-black transition-all text-xs font-bold"
              title="Highly Recommended: Install uBlock Origin to block video player ads"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Ad Blocker</span>
            </a>

            <button
              id="btn-close-theater-node"
              onClick={onClose}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-neutral-800 hover:border-[#e50914] hover:bg-neutral-800/20 text-neutral-400 hover:text-white transition-all duration-200"
              title="Close Player"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Outer Frame with Glowing Shadow Case */}
        <div className="relative aspect-video w-full bg-black rounded-md overflow-hidden border border-neutral-800 shadow-2xl">
          {/* Active Broadcast Frame */}
          <iframe
            src={getEmbedUrl()}
            className="w-full h-full absolute inset-0 bg-neutral-950"
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="no-referrer"
            scrolling="no"
          />
        </div>

        {/* TV Series Episode Drawer and Season Controller */}
        {isShow && (
          <div className="mt-6 bg-[#141414] border border-neutral-800 rounded-md p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <ListVideo className="text-[#e50914] w-5 h-5" />
                <h3 className="text-sm font-bold tracking-wider text-neutral-200 uppercase">
                  Episode List
                </h3>
              </div>

              {/* Season Selector */}
              <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
                <span className="text-xs text-neutral-500 mr-1">Season</span>
                {Array.from({ length: item.number_of_seasons || 1 }, (_, i) => i + 1).map((sNum) => (
                  <button
                    key={sNum}
                    id={`btn-season-${sNum}`}
                    onClick={() => {
                      setCurrentSeason(sNum);
                      setCurrentEpisode(1);
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors ${
                      currentSeason === sNum
                        ? "bg-[#e50914] border-[#e50914] text-white"
                        : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-neutral-500"
                    }`}
                  >
                    S{sNum}
                  </button>
                ))}
              </div>
            </div>

            {/* Episode Scrolling Container */}
            {loadingEpisodes ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#e50914] border-t-transparent mb-2" />
                <p className="text-xs text-neutral-400">
                  Loading season episodes...
                </p>
              </div>
            ) : episodeError ? (
              <div className="flex items-center justify-center py-8 text-neutral-400 text-xs text-center border border-dashed border-neutral-800 rounded">
                {episodeError}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                {episodes.map((ep) => {
                  const isActive = ep.episode_number === currentEpisode;
                  const epStill = ep.still_path
                    ? `https://image.tmdb.org/t/p/w185${ep.still_path}`
                    : `https://images.unsplash.com/photo-1542204172-e7052809a86e?q=80&w=150&auto=format&fit=crop`;
                  
                  return (
                    <button
                      key={ep.id}
                      id={`btn-episode-${ep.episode_number}`}
                      onClick={() => setCurrentEpisode(ep.episode_number)}
                      className={`flex flex-col text-left p-2.5 rounded border transition-all duration-200 ${
                        isActive
                          ? "bg-neutral-900 border-[#e50914] text-white"
                          : "bg-neutral-950/40 border-neutral-800 hover:bg-neutral-900 hover:border-neutral-700"
                      }`}
                    >
                      <div className="flex gap-2.5 items-start">
                        <div className="relative shrink-0 w-20 aspect-video rounded overflow-hidden bg-neutral-900">
                          <img
                            src={epStill}
                            alt={ep.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/20" />
                          <div className="absolute bottom-1 right-1 text-[9px] bg-black/80 px-1 py-0.5 rounded text-neutral-300">
                            Ep {ep.episode_number}
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className={`text-xs font-semibold line-clamp-1 ${isActive ? "text-[#e50914]" : "text-neutral-200"}`}>
                            {ep.name || `Episode ${ep.episode_number}`}
                          </h4>
                          <span className="block text-[10px] text-neutral-500 mt-0.5">
                            {ep.air_date || ""}
                          </span>
                        </div>
                      </div>
                      
                      {ep.overview && (
                        <p className="text-[10px] text-neutral-400 mt-1.5 line-clamp-2 leading-relaxed">
                          {ep.overview}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
