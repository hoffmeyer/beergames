import { useState } from "react";
import { ColorPicker } from "./ColorPicker";

type TeamFormProps = {
  takenColors: string[];
  isSubmitting: boolean;
  error?: string | null;
  onSubmit: (input: { name: string; color: string }) => Promise<unknown>;
};

export function TeamForm({ takenColors, isSubmitting, error, onSubmit }: TeamFormProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim() || !color) return;
        try {
          await onSubmit({ name: name.trim(), color });
          setName("");
          setColor(null);
        } catch {
          // Error is surfaced via the `error` prop; keep the user's input so
          // they don't have to retype it after e.g. a "color already taken".
        }
      }}
    >
      <input
        className="rounded border border-gray-300 px-3 py-2 text-base"
        placeholder="Team name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <ColorPicker value={color} takenColors={takenColors} onChange={setColor} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting || !name.trim() || !color}
        className="min-h-11 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        Add team
      </button>
    </form>
  );
}
