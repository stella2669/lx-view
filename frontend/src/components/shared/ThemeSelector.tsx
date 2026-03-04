import React, { useRef, useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Palette, Check, ChevronDown } from 'lucide-react';

const THEMES = [
    { id: 'dark', label: 'Dark (Default)', color: '#1e2330' },
    { id: 'light', label: 'Light', color: '#f3f4f6' },
    { id: 'dracula', label: 'Dracula', color: '#282a36' },
    { id: 'ocean', label: 'Ocean', color: '#0f172a' },
    { id: 'solarized-light', label: 'Solarized Light', color: '#fdf6e3' },
];

export const ThemeSelector: React.FC = () => {
    const { theme, setTheme } = useStore();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedTheme = THEMES.find(t => t.id === theme) || THEMES[0];

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border-main bg-panel-header hover:bg-hover transition-colors text-sm text-text-muted hover:text-text-main group"
                title="Select Theme"
            >
                <Palette className="w-4 h-4 text-text-accent opacity-80 group-hover:opacity-100" />
                <span className="max-w-[100px] truncate">{selectedTheme.label}</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-2xl bg-panel border border-border-main overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-1">
                        {THEMES.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => {
                                    setTheme(t.id);
                                    setIsOpen(false);
                                }}
                                className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg transition-colors ${theme === t.id
                                        ? 'bg-text-accent/10 text-text-accent font-medium'
                                        : 'text-text-main hover:bg-hover'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span
                                        className="w-3 h-3 rounded-full border border-border-main shadow-sm"
                                        style={{ backgroundColor: t.color }}
                                    />
                                    {t.label}
                                </div>
                                {theme === t.id && <Check className="w-4 h-4" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
