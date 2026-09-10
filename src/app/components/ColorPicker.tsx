import { TEAM_COLOR_PALETTE } from "../../../shared/palette";

type ColorPickerProps = {
  value: string | null;
  takenColors: string[];
  onChange: (color: string) => void;
};

export function ColorPicker({ value, takenColors, onChange }: ColorPickerProps) {
  return (
    <div className="flex gap-3">
      {TEAM_COLOR_PALETTE.map((color) => {
        const isTaken = takenColors.includes(color) && color !== value;
        const isSelected = color === value;
        return (
          <button
            key={color}
            type="button"
            aria-label={color}
            aria-pressed={isSelected}
            disabled={isTaken}
            onClick={() => onChange(color)}
            className={`h-11 w-11 rounded-full border-2 transition ${
              isSelected ? "border-black" : "border-transparent"
            } ${isTaken ? "cursor-not-allowed opacity-30" : "cursor-pointer"}`}
            style={{ backgroundColor: color }}
          />
        );
      })}
    </div>
  );
}
