import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Check, ChevronDown, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Location } from '@/types/roster';

interface LocationFilterProps {
  locations: Location[];
  selectedLocationId: string | null;
  onLocationChange: (locationId: string | null) => void;
  isLoading?: boolean;
}

export function LocationFilter({
  locations,
  selectedLocationId,
  onLocationChange,
  isLoading = false,
}: LocationFilterProps) {
  const { t } = useTranslation();
  const selectedLocation = locations.find((l) => l.id === selectedLocationId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          disabled={isLoading}
          className={cn(
            'h-9 gap-2 rounded-lg border px-3 text-sm font-medium transition-all',
            selectedLocationId
              ? 'border-primary-500/30 bg-primary-50 text-primary-600 hover:bg-primary-100'
              : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
          )}
        >
          <MapPin className="h-4 w-4" />
          <span className="max-w-[150px] truncate">
            {isLoading ? t('common.loading') : selectedLocation?.name || t('roster.allLocations')}
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent
        align="start"
        className="w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1"
      >
        <AnimatePresence mode="popLayout">
          {/* All locations option */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            <DropdownMenuItem
              onClick={() => onLocationChange(null)}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                !selectedLocationId
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
              )}
            >
              <Building2 className="h-4 w-4" />
              <span className="flex-1">{t('roster.allLocations')}</span>
              {!selectedLocationId && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex h-4 w-4 items-center justify-center rounded-full bg-primary-500"
                >
                  <Check className="h-3 w-3 text-white" />
                </motion.div>
              )}
            </DropdownMenuItem>
          </motion.div>
          
          {locations.length > 0 && (
            <DropdownMenuSeparator className="my-1 bg-zinc-100" />
          )}
          
          {/* Location list */}
          {locations.map((location, index) => (
            <motion.div
              key={location.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay: index * 0.03 }}
            >
              <DropdownMenuItem
                onClick={() => onLocationChange(location.id)}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                  selectedLocationId === location.id
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
                )}
              >
                <MapPin className="h-4 w-4 text-zinc-400" />
                <div className="flex-1 overflow-hidden">
                  <p className="truncate font-medium">{location.name}</p>
                  {location.address && (
                    <p className="truncate text-xs text-zinc-400">{location.address}</p>
                  )}
                </div>
                {selectedLocationId === location.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex h-4 w-4 items-center justify-center rounded-full bg-primary-500"
                  >
                    <Check className="h-3 w-3 text-white" />
                  </motion.div>
                )}
              </DropdownMenuItem>
            </motion.div>
          ))}
          
          {/* Empty state */}
          {locations.length === 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-3 py-4 text-center"
            >
              <MapPin className="mx-auto h-8 w-8 text-zinc-400" />
              <p className="mt-2 text-sm text-zinc-500">{t('roster.noLocationsFound')}</p>
              <p className="text-xs text-zinc-400">{t('roster.addLocationsInSettings')}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default LocationFilter;
