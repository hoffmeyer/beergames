import { AVATAR_OPTIONS } from "../../../shared/avatars";

type AvatarPickerProps = {
  value: string | null;
  takenAvatars: string[];
  onChange: (avatar: string) => void;
};

export function AvatarPicker({ value, takenAvatars, onChange }: AvatarPickerProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {AVATAR_OPTIONS.map(({ file, label }) => {
        const isTaken = takenAvatars.includes(file) && file !== value;
        const isSelected = file === value;
        return (
          <button
            key={file}
            type="button"
            aria-label={label}
            aria-pressed={isSelected}
            disabled={isTaken}
            onClick={() => onChange(file)}
            className={`h-11 w-11 overflow-hidden rounded-full border-2 transition ${
              isSelected
                ? "border-sky-400 shadow-[0_0_0_2px_rgba(56,189,248,0.3),0_0_4px_1px_rgba(56,189,248,0.5)]"
                : "border-transparent"
            } ${isTaken ? "cursor-not-allowed opacity-30" : "cursor-pointer"}`}
          >
            <img src={`/${file}`} alt={label} className="h-full w-full object-cover" />
          </button>
        );
      })}
    </div>
  );
}
