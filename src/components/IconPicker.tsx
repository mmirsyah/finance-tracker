import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import DynamicIcon from './DynamicIcon';
import { ChevronsUpDown } from 'lucide-react';
import { Command, CommandInput, CommandList } from '@/components/ui/command';

// A curated list of icons relevant for finance apps
const iconList = [
  'Home', 'Car', 'ShoppingBag', 'Gift', 'UtensilsCrossed', 'HeartPulse', 'Plane', 'Bus', 'Train', 'Baby', 
  'Gamepad2', 'GraduationCap', 'PawPrint', 'Phone', 'Wifi', 'Bolt', 'Book', 'Briefcase', 'Brush', 'Clapperboard',
  'Cog', 'Construction', 'Droplet', 'Fuel', 'Landmark', 'Laptop', 'Mic', 'Mountain', 'Music', 'Pizza', 'Shirt', 'Ticket', 'Wallet',
  // Added more icons
  'Banknote', 'Coins', 'Receipt', 'CreditCard', 'DollarSign', 'ShoppingCart', 'Store', 'Wrench', 'Trash2', 'Lightbulb', 
  'Award', 'Bone', 'Cat', 'Dog', 'Dumbbell', 'Tv', 'Film', 'Camera', 'Paintbrush', 'Ship', 'Truck', 'Bike', 'Coffee', 'Wine', 'Building'
];

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
}

const IconPicker: React.FC<IconPickerProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIcons = iconList.filter(icon => 
    icon.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between font-normal">
          <div className="flex items-center gap-2">
            {value ? <DynamicIcon name={value} className="h-5 w-5" /> : <span>Pilih ikon</span>}
            <span className="truncate">{value || '...'}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput 
            placeholder="Cari ikon..." 
            value={searchTerm} 
            onValueChange={setSearchTerm} 
          />
          <CommandList>
            <div className="grid grid-cols-6 gap-2 p-2 max-h-56 overflow-y-auto">
              {filteredIcons.length > 0 ? (
                filteredIcons.map(iconName => (
                  <Button
                    key={iconName}
                    variant={value === iconName ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => {
                      onChange(iconName);
                      setIsOpen(false);
                    }}
                    className="w-full"
                  >
                    <DynamicIcon name={iconName} className="h-5 w-5" />
                  </Button>
                ))
              ) : (
                <p className="col-span-6 text-center text-sm text-muted-foreground py-4">
                  Ikon tidak ditemukan.
                </p>
              )}
            </div>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default IconPicker;
