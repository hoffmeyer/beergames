import { useState } from "react";
import { AvatarPicker } from "./AvatarPicker";

type TeamFormProps = {
  takenAvatars: string[];
  isSubmitting: boolean;
  error?: string | null;
  onSubmit: (input: { name: string; avatar: string }) => Promise<unknown>;
};

export function TeamForm({ takenAvatars, isSubmitting, error, onSubmit }: TeamFormProps) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim() || !avatar) return;
        try {
          await onSubmit({ name: name.trim(), avatar });
          setName("");
          setAvatar(null);
        } catch {
          // Error is surfaced via the `error` prop; keep the user's input so
          // they don't have to retype it after e.g. an "avatar already taken".
        }
      }}
    >
      <input
        className="rounded border border-gray-300 px-3 py-2 text-base"
        placeholder="Team name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <AvatarPicker value={avatar} takenAvatars={takenAvatars} onChange={setAvatar} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting || !name.trim() || !avatar}
        className="min-h-11 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        Add team
      </button>
    </form>
  );
}
