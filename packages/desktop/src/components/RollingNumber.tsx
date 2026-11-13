import React from 'react';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

interface RollingDigitProps {
  char: string;
}

const RollingDigit: React.FC<RollingDigitProps> = React.memo(({ char }) => {
  const isDigit = DIGITS.includes(char);

  if (!isDigit) {
    return (
      <span className="inline-flex items-center justify-center h-[1.2em] leading-none select-none">
        {char}
      </span>
    );
  }

  const num = parseInt(char, 10);

  return (
    <span className="relative inline-flex items-center justify-center h-[1.2em] overflow-hidden leading-none select-none">
      <span className="invisible leading-none">{char}</span>
      <span
        className="absolute inset-x-0 top-0 h-full transition-transform duration-150 ease-[cubic-bezier(0.25,1,0.5,1)]"
        style={{ transform: `translateY(-${num * 100}%)` }}
      >
        {DIGITS.map((d, idx) => (
          <span
            key={d}
            className="absolute inset-x-0 h-full flex items-center justify-center leading-none"
            style={{ top: `${idx * 100}%` }}
          >
            {d}
          </span>
        ))}
      </span>
    </span>
  );
});

interface RollingNumberProps {
  value: string;
  className?: string;
}

export const RollingNumber: React.FC<RollingNumberProps> = ({ value, className = '' }) => {
  // Pad keys from the right to prevent shifting on digit change
  const chars = value.split('');
  const total = chars.length;

  return (
    <span className={`inline-flex items-center ticker-digits font-mono tracking-tight leading-none ${className}`}>
      {chars.map((char, idx) => (
        <RollingDigit key={`col-${total - idx}-${char === '.' ? 'dot' : 'char'}`} char={char} />
      ))}
    </span>
  );
};
