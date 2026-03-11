import React from 'react';

export default function Microverse() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
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
