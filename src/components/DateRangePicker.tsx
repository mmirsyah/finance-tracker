// src/components/DateRangePicker.tsx
"use client"

import * as React from "react"
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  onUpdate: (payload: { range: DateRange | undefined }) => void;
  initialDate?: DateRange;
}

export function DateRangePicker({ className, onUpdate, initialDate }: DateRangePickerProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(initialDate);
  const [preset, setPreset] = React.useState<string>("custom");

  React.useEffect(() => {
    setDate(initialDate);
  }, [initialDate]);

  const handleSelect = (selectedDate: DateRange | undefined) => {
    setDate(selectedDate);
    setPreset("custom");
    onUpdate({ range: selectedDate });
  }

  const handlePresetChange = (value: string) => {
    setPreset(value);
    const now = new Date();
    let newRange: DateRange | undefined;

    switch (value) {
      case "this_month":
        newRange = { from: startOfMonth(now), to: endOfMonth(now) };
        break;
      case "last_month": {
        const lastMonth = subDays(startOfMonth(now), 1);
        newRange = { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
        break;
      }
      case "this_year":
        newRange = { from: startOfYear(now), to: endOfYear(now) };
        break;
      case "last_30_days":
        newRange = { from: subDays(now, 29), to: now };
        break;
      default:
        newRange = undefined;
    }
    
    setDate(newRange);
    if (newRange) {
      onUpdate({ range: newRange });
    }
  }

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-2", className)}>
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger>
          <SelectValue placeholder="Pilih Preset" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="custom">Kustom</SelectItem>
          <SelectItem value="this_month">Bulan Ini</SelectItem>
          <SelectItem value="last_month">Bulan Lalu</SelectItem>
          <SelectItem value="this_year">Tahun Ini</SelectItem>
          <SelectItem value="last_30_days">30 Hari Terakhir</SelectItem>
        </SelectContent>
      </Select>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full md:w-[260px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pilih rentang tanggal</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
