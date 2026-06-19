@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-title: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  --color-netflix-red: #e50914;
  --color-netflix-dark: #141414;
  --color-netflix-black: #080808;
}

/* Custom Scrollbars */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: #141414;
}
::-webkit-scrollbar-thumb {
  background: rgba(229, 9, 20, 0.4);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(229, 9, 20, 0.7);
}

/* Perfect cinematic overlays */
.netflix-card-shadow {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

body {
  background-color: #141414;
  color: #e5e5e5;
  overflow-x: hidden;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}


