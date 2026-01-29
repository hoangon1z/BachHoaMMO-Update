'use client';

const gridCategories = [
  {
    name: 'Steam',
    subtitle: 'Nạp ví, Offline mode',
    letter: 'S',
    bg: 'bg-[#171A21]', // Steam brand color
  },
  {
    name: 'Canva Pro',
    subtitle: 'Thiết kế chuyên nghiệp',
    letter: 'C',
    bg: 'bg-[#00C4CC]', // Canva brand color
  },
  {
    name: 'Netflix Premium',
    subtitle: 'Xem 4K không giới hạn',
    letter: 'N',
    bg: 'bg-[#E50914]', // Netflix brand color
  },
  {
    name: 'ChatGPT Plus',
    subtitle: 'AI thông minh nhất',
    letter: 'AI',
    bg: 'bg-[#10A37F]', // ChatGPT brand color
  },
  {
    name: 'Spotify Premium',
    subtitle: 'Nghe nhạc không quảng cáo',
    letter: 'S',
    bg: 'bg-[#1DB954]', // Spotify brand color
  },
];

export function GridCategories() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
      {gridCategories.map((category, index) => (
        <a
          key={index}
          href="#"
          className="group bg-white border border-gray-200 hover:bg-gray-50 transition-colors overflow-hidden"
          style={{ borderRadius: '10px' }}
        >
          <div className={`aspect-video relative overflow-hidden ${category.bg} flex items-center justify-center`}>
            <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">{category.letter}</span>
          </div>
          <div className="p-3 sm:p-4">
            <h3 className="font-bold text-xs sm:text-sm mb-1 line-clamp-2">
              {category.name}
            </h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">{category.subtitle}</p>
          </div>
        </a>
      ))}
    </div>
  );
}
