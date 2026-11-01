"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, ChevronsUpDown, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { StubOutLocationSummary } from "@/lib/types"

interface StubOutLocationComboboxProps {
  value: string | null
  onChange: (value: string | null, location?: StubOutLocationSummary | null) => void
  id?: string
  label?: string
  disabled?: boolean
  allowUnassigned?: boolean
  placeholder?: string
}

function getStubOutOptionLabel(location: StubOutLocationSummary) {
  const place = [location.sitio, location.barangay, location.municipality].filter(Boolean).join(", ")
  return `${location.code}${place ? ` - ${place}` : ""}`
}

export function StubOutLocationCombobox({
  value,
  onChange,
  id = "stub_out_location_id",
  label = "Stub Out Location",
  disabled,
  allowUnassigned = true,
  placeholder = "No Stub Out assigned",
}: StubOutLocationComboboxProps) {
  const [open, setOpen] = useState(false)
  const [locations, setLocations] = useState<StubOutLocationSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadLocations() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await fetch("/api/admin/stub-out-locations")
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load Stub Out locations.")
        }

        if (isMounted) {
          setLocations(payload.locations || [])
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Failed to load Stub Out locations.")
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadLocations()

    return () => {
      isMounted = false
    }
  }, [])

  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === value) || null,
    [locations, value],
  )

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="h-9 w-full justify-between font-normal"
          >
            <span className={cn("truncate", !selectedLocation && "text-muted-foreground")}>
              {selectedLocation ? getStubOutOptionLabel(selectedLocation) : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="z-[70] w-[var(--radix-popover-trigger-width)] min-w-0 overflow-hidden p-0"
          align="start"
          sideOffset={4}
        >
          <Command>
            <CommandInput placeholder="Search code or location..." />
            <CommandList
              className="max-h-64 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
              onWheel={(event) => event.stopPropagation()}
              onTouchMove={(event) => event.stopPropagation()}
            >
              <CommandEmpty>
                {isLoading ? "Loading Stub Out locations..." : "No Stub Out location found."}
              </CommandEmpty>
              <CommandGroup>
                {allowUnassigned ? (
                  <CommandItem
                    value="__none__"
                    onSelect={() => {
                      onChange(null, null)
                      setOpen(false)
                    }}
                  >
                    <Check className={cn("h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                    <span>No Stub Out assigned</span>
                  </CommandItem>
                ) : null}
                {locations.map((location) => (
                  <CommandItem
                    key={location.id}
                    value={`${location.code} ${location.name || ""} ${location.sitio || ""} ${location.barangay} ${location.municipality}`}
                    onSelect={() => {
                      onChange(location.id, location)
                      setOpen(false)
                    }}
                  >
                    <Check className={cn("h-4 w-4", value === location.id ? "opacity-100" : "opacity-0")} />
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{getStubOutOptionLabel(location)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {errorMessage ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{errorMessage}</p>
      ) : null}
    </div>
  )
}
