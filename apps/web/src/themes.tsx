import React, { useEffect, useState } from 'react';
import './themes.css';

export const palettes = [
  { id: 'sage', name: 'Original · Sage', colours: ['#2F5D48', '#E9EEE1', '#F6F7F2'] },
  { id: 'navy', name: '01 · Connected Care', colours: ['#102F48', '#087F8C', '#72E1CF'] },
  { id: 'indigo', name: '02 · Calm Innovation', colours: ['#37337A', '#B9AEED', '#9FE2D0'] },
  { id: 'cobalt', name: '03 · Bright Digital Care', colours: ['#175CD3', '#008D97', '#E8F8FC'] },
];

export function ThemePicker() {
  const [theme, setTheme] = useState(() => {
    const choice =
      new URLSearchParams(location.search).get('theme') || localStorage.getItem('pw-theme-v2');
    return palettes.some((p) => p.id === choice) ? choice! : 'navy';
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('pw-theme-v2', theme);
  }, [theme]);
  return (
    <div className="theme-picker">
      <label htmlFor="colour-theme">Colour direction</label>
      <div className="theme-swatches" aria-hidden="true">
        {palettes
          .find((p) => p.id === theme)!
          .colours.map((c) => (
            <i key={c} style={{ background: c }} />
          ))}
      </div>
      <select id="colour-theme" value={theme} onChange={(e) => setTheme(e.target.value)}>
        {palettes.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
