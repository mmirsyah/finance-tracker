import React from 'react';
import * as icons from 'lucide-react';

interface DynamicIconProps {
  name: string;
  className?: string;
}

const DynamicIcon: React.FC<DynamicIconProps> = ({ name, className }) => {
  // @ts-expect-error - Dynamically indexing icons module
  const IconComponent = icons[name];

  if (!IconComponent) {
    // Fallback icon or return null
    return <icons.HelpCircle className={className} />;
  }

  return <IconComponent className={className} />;
};

export default DynamicIcon;
