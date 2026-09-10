export const AVATAR_OPTIONS = [
  { file: "alpha-avatar.webp", label: "Alpha" },
  { file: "beer-avatar.webp", label: "Beer" },
  { file: "buttcrack-avatar.webp", label: "Buttcrack" },
  { file: "gigachad-avatar.webp", label: "Gigachad" },
  { file: "heavymetal-avatar.webp", label: "Heavy Metal" },
  { file: "princess-avatar.webp", label: "Princess" },
  { file: "unicorn-avatar.webp", label: "Unicorn" },
] as const;

export type AvatarFile = (typeof AVATAR_OPTIONS)[number]["file"];

export function isValidAvatar(avatar: string): avatar is AvatarFile {
  return AVATAR_OPTIONS.some((option) => option.file === avatar);
}
