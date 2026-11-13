import React from 'react';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

interface RollingDigitProps {
  char: string;
}

const RollingDigit: React.FC<RollingDigitProps> = React.memo(({ char }) => {
  const isDigit = DIGITS.includes(char);

  if (!isDigit) {
    return <span className="inline-flex items-center justify-center select-none h-[1.1em] leading-[1.1em]">{char}</span>;
  }

  const num = parseInt(char, 10);

  return (
    <span className="inline-flex items-start justify-center h-[1.1em] overflow-hidden leading-[1.1em] select-none">
      <span
        className="flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
        style={{ transform: `translateY(-${num * 10}%)` }}
      >
        {DIGITS.map(d => (
          <span key={d} className="h-[1.1em] leading-[1.1em] shrink-0 flex items-center justify-center">
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
