import { Input } from '../atoms/Input';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (value: string) => void;
  className?: string;
}

export function SearchBar({
  placeholder = 'Search...',
  onSearch,
  className = ''
}: SearchBarProps) {
  return (
    <div className={`relative ${className}`}>
      <Input
        placeholder={placeholder}
        leftIcon="search"
        onChange={(e) => onSearch?.(e.target.value)}
        containerClassName="!space-y-0"
        className="bg-surface-container-low !rounded-lg border-none"
      />
    </div>
  );
}
