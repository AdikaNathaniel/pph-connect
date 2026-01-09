import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

interface VersionTrackerProps {
  className?: string;
  showIcon?: boolean;
}

const VersionTracker: React.FC<VersionTrackerProps> = ({ 
  className = "", 
  showIcon = true 
}) => {
  // Get version from package.json - this will be updated during build
  const version = import.meta.env.VITE_APP_VERSION || '0.1.1';
  
  return (
    <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
      {showIcon && <Info className="h-3 w-3" />}
      <span>Version {version}</span>
    </div>
  );
};

export default VersionTracker;
