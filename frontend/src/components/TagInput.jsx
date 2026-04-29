import { useState, useRef } from 'react';

export default function TagInput({
  tags = [],
  onChange,
  placeholder = 'Add item...',
  chipClass = 'bg-primary/20 border border-primary/40 text-primary',
  maxTags = 10,
}) {
  const [input, setInput] = useState('');
  const inputRef  = useRef(null);
  const prevKeyRef = useRef(null);

  const addTag = (raw) => {
    const value = raw.trim();
    if (!value || tags.includes(value) || tags.length >= maxTags) return;
    onChange([...tags, value]);
    setInput('');
  };

  const removeTag = (tag) => onChange(tags.filter(t => t !== tag));

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === ' ' && prevKeyRef.current === ' ' && input.trim()) {
      // Double-space accepts the current input as a tag
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
    prevKeyRef.current = e.key;
  };

  const handleBlur = () => {
    if (input.trim()) addTag(input);
  };

  return (
    <div
      className="bg-surface-container-lowest border border-white/10 rounded-lg p-2 flex flex-wrap gap-2 min-h-[50px] cursor-text focus-within:border-primary/40 transition-colors"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map(tag => (
        <span key={tag} className={`${chipClass} px-3 py-1 rounded-full text-xs font-grotesk flex items-center gap-1.5 select-none`}>
          {tag}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); removeTag(tag); }}
            className="material-symbols-outlined hover:opacity-70 transition-opacity"
            style={{ fontSize: 13 }}
          >
            close
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="bg-transparent border-none outline-none focus:ring-0 text-xs font-grotesk flex-1 min-w-[120px] text-slate-400 placeholder-slate-600 p-0"
      />
    </div>
  );
}
