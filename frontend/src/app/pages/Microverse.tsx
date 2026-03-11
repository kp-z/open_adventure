import React from 'react';

export default function Microverse() {
  return (
    <div style={{ 
      width: '100%', 
      height: 'calc(100vh - 60px)', // 减去顶部导航栏高度
      overflow: 'hidden',
      position: 'relative'
    }}>
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
