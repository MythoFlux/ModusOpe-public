import React from 'react';
import { COLOR_OPTIONS } from '../../constants/colors';

interface ColorSelectorProps {
  label: string;
  selectedColor: string;
  onChange: (color: string) => void;
}

export default function ColorSelector({ label, selectedColor, onChange }: ColorSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
        {COLOR_OPTIONS.map((color) => (
          <button
            key={color.value}
            type="button"
            onClick={() => onChange(color.value)}
            className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
              selectedColor === color.value 
                ? 'border-gray-800 ring-2 ring-gray-300' 
                : 'border-gray-200 hover:border-gray-400'
            }`}
            style={{ backgroundColor: color.value }}
            title={color.name}
          />
        ))}
      </div>
    </div>
  );
}
