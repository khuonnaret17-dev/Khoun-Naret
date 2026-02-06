
import * as React from 'react';

interface LoadingOverlayProps {
  message: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 bg-maroon/10 backdrop-blur-md z-[100] flex items-center justify-center p-6">
      <div className="bg-white rounded-[3rem] shadow-2xl p-12 max-w-sm w-full text-center animate-fadeIn border border-white/40">
        <div className="relative w-24 h-24 mx-auto mb-8">
          {/* Inner pulse */}
          <div className="absolute inset-0 bg-maroon/5 rounded-full animate-ping"></div>
          {/* Outer ring */}
          <div className="absolute inset-0 border-[6px] border-maroon/10 rounded-full"></div>
          {/* Spinner */}
          <div className="absolute inset-0 border-[6px] border-maroon rounded-full border-t-transparent animate-spin shadow-inner"></div>
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center text-3xl animate-bounce">🇰🇭</div>
        </div>
        <h3 className="text-2xl font-black text-maroon mb-3 heading-kh">សូមរង់ចាំបន្តិច</h3>
        <p className="text-gray-500 text-sm leading-relaxed small-kh opacity-80">{message}</p>
        
        {/* Loading dots */}
        <div className="flex justify-center gap-1.5 mt-6">
          <div className="w-2 h-2 bg-maroon rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-maroon rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-maroon rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
