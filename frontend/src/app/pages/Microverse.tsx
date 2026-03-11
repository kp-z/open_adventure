import React from 'react';

export default function Microverse() {
  return (
    <div
      className="fixed left-0 right-0 z-40"
      style={{
        top: '80px', // 顶部栏高度 (h-20 = 80px)
        bottom: 0,
        width: '100vw',
        height: 'calc(100vh - 80px)',
        overflow: 'hidden',
      }}
    >
      <iframe
        src="/microverse/index.html"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block'
        }}
        title="Microverse Game"
        allow="autoplay; fullscreen"
      />
    </div>
  );
}
