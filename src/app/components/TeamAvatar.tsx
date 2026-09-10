const SIZE_CLASSES = {
  sm: "h-8 w-8",
  md: "h-16 w-16",
} as const;

type TeamAvatarProps = {
  avatar: string | null;
  size: keyof typeof SIZE_CLASSES;
  className?: string;
};

export function TeamAvatar({ avatar, size, className = "" }: TeamAvatarProps) {
  const base = `${SIZE_CLASSES[size]} shrink-0 rounded-full border border-gray-200 object-cover ${className}`;
  if (!avatar) {
    return <span className={`${base} bg-transparent`} />;
  }
  return <img src={`/${avatar}`} alt="" className={base} />;
}
