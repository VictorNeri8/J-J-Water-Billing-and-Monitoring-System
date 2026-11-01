"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, ChevronsUpDown, Trash2 } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  type AddressOption,
  type AddressSelection,
  getBarangays,
  getMunicipalities,
  normalizeAddressKey,
  normalizeAddressText,
} from "@/lib/address-data"
import { cn } from "@/lib/utils"

interface StructuredAddressFieldsProps {
  value: AddressSelection
  onChange: (value: AddressSelection) => void
  idPrefix?: string
  disabled?: boolean
}

interface CreatableAddressComboboxProps {
  label: string
  value: string
  selectedId?: string | null
  options: AddressOption[]
  disabled: boolean
  loading?: boolean
  placeholder: string
  id: string
  onSelect: (option: AddressOption | null, value: string) => void
  onDeleteOption: (option: AddressOption) => void
}

type PendingDelete =
  | { type: "sitio"; option: AddressOption }
  | { type: "purok"; option: AddressOption }
  | null

const emptyAddressSelection: AddressSelection = {
  municipality: "",
  barangay: "",
  sitio: "",
  purok: "",
  sitioId: null,
  purokId: null,
}

function CreatableAddressCombobox({
  label,
  value,
  selectedId,
  options,
  disabled,
  loading,
  placeholder,
  id,
  onSelect,
  onDeleteOption,
}: CreatableAddressComboboxProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState(value)
  const normalizedSearch = normalizeAddressKey(searchValue)
  const normalizedCreatedValue = normalizeAddressText(searchValue)
  const filteredOptions = useMemo(() => {
    if (!normalizedSearch) {
      return options
    }

    return options.filter((option) => option.normalized_name.includes(normalizedSearch))
  }, [normalizedSearch, options])
  const exactMatch = options.some((option) => option.normalized_name === normalizedCreatedValue?.normalized)
  const canCreate = Boolean(normalizedCreatedValue && !exactMatch)

  useEffect(() => {
    if (open) {
      setSearchValue(value)
    }
  }, [open, value])

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
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
            <span className={cn("truncate", !value && "text-muted-foreground")}>
              {value || placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              value={searchValue}
              onValueChange={setSearchValue}
              placeholder={placeholder}
              maxLength={80}
            />
            <CommandList>
              <CommandEmpty>
                {loading ? "Loading..." : canCreate ? "No exact match." : "No saved options."}
              </CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.name}
                    onSelect={() => {
                      onSelect(option, option.name)
                      setSearchValue(option.name)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4",
                        selectedId === option.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">{option.name}</span>
                    {option.is_custom ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          onDeleteOption(option)
                        }}
                        onMouseDown={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete {option.name}</span>
                      </Button>
                    ) : null}
                  </CommandItem>
                ))}
                {canCreate && normalizedCreatedValue ? (
                  <CommandItem
                    value={normalizedCreatedValue.value}
                    onSelect={() => {
                      onSelect(null, normalizedCreatedValue.value)
                      setSearchValue(normalizedCreatedValue.value)
                      setOpen(false)
                    }}
                  >
                    <span className="h-4 w-4" />
                    <span className="truncate">Use &quot;{normalizedCreatedValue.value}&quot;</span>
                  </CommandItem>
                ) : null}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function StructuredAddressFields({
  value,
  onChange,
  idPrefix = "address",
  disabled = false,
}: StructuredAddressFieldsProps) {
  const [sitios, setSitios] = useState<AddressOption[]>([])
  const [puroks, setPuroks] = useState<AddressOption[]>([])
  const [isLoadingSitios, setIsLoadingSitios] = useState(false)
  const [isLoadingPuroks, setIsLoadingPuroks] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [optionError, setOptionError] = useState<string | null>(null)
  const barangays = value.municipality ? getBarangays(value.municipality) : []

  async function loadSitios(municipality: string, barangay: string) {
    if (!municipality || !barangay) {
      setSitios([])
      return
    }

    setIsLoadingSitios(true)
    setOptionError(null)

    try {
      const response = await fetch(
        `/api/admin/address-options?municipality=${encodeURIComponent(municipality)}&barangay=${encodeURIComponent(barangay)}`,
      )
      const payload = await response.json()

      if (!response.ok) {
        setOptionError(payload.error || "Failed to load sitios.")
        setSitios([])
        return
      }

      setSitios(payload.sitios || [])
    } catch {
      setOptionError("Failed to load sitios.")
      setSitios([])
    } finally {
      setIsLoadingSitios(false)
    }
  }

  async function loadPuroks(sitioId: string | null | undefined) {
    if (!sitioId) {
      setPuroks([])
      return
    }

    setIsLoadingPuroks(true)
    setOptionError(null)

    try {
      const response = await fetch(
        `/api/admin/address-options?puroksForSitioId=${encodeURIComponent(sitioId)}`,
      )
      const payload = await response.json()

      if (!response.ok) {
        setOptionError(payload.error || "Failed to load puroks.")
        setPuroks([])
        return
      }

      setPuroks(payload.puroks || [])
    } catch {
      setOptionError("Failed to load puroks.")
      setPuroks([])
    } finally {
      setIsLoadingPuroks(false)
    }
  }

  useEffect(() => {
    void loadSitios(value.municipality, value.barangay)
  }, [value.municipality, value.barangay])

  useEffect(() => {
    void loadPuroks(value.sitioId)
  }, [value.sitioId])

  async function handleDeleteOption() {
    if (!pendingDelete) {
      return
    }

    setIsDeleting(true)
    setOptionError(null)

    const endpoint =
      pendingDelete.type === "sitio"
        ? `/api/admin/address-options/sitios/${pendingDelete.option.id}`
        : `/api/admin/address-options/puroks/${pendingDelete.option.id}`

    try {
      const response = await fetch(endpoint, { method: "DELETE" })
      const payload = await response.json()

      if (!response.ok) {
        setOptionError(payload.error || "Failed to delete address option.")
        return
      }

      if (pendingDelete.type === "sitio") {
        if (value.sitioId === pendingDelete.option.id) {
          onChange({
            ...value,
            sitio: "",
            purok: "",
            sitioId: null,
            purokId: null,
          })
        }

        await loadSitios(value.municipality, value.barangay)
      } else {
        if (value.purokId === pendingDelete.option.id) {
          onChange({
            ...value,
            purok: "",
            purokId: null,
          })
        }

        await loadPuroks(value.sitioId)
      }

      setPendingDelete(null)
    } catch {
      setOptionError("Failed to delete address option.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}_municipality`}>Municipality</Label>
          <Select
            value={value.municipality}
            disabled={disabled}
            onValueChange={(municipality) => {
              onChange({
                ...emptyAddressSelection,
                municipality,
              })
            }}
          >
            <SelectTrigger id={`${idPrefix}_municipality`} className="w-full">
              <SelectValue placeholder="Select municipality" />
            </SelectTrigger>
            <SelectContent>
              {getMunicipalities().map((municipality) => (
                <SelectItem key={municipality} value={municipality}>
                  {municipality}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}_barangay`}>Barangay</Label>
          <Select
            key={value.municipality}
            value={value.barangay}
            disabled={disabled || !value.municipality}
            onValueChange={(barangay) => {
              onChange({
                ...value,
                barangay,
                sitio: "",
                purok: "",
                sitioId: null,
                purokId: null,
              })
            }}
          >
            <SelectTrigger id={`${idPrefix}_barangay`} className="w-full">
              <SelectValue placeholder="Select barangay" />
            </SelectTrigger>
            <SelectContent>
              {barangays.map((barangay) => (
                <SelectItem key={barangay} value={barangay}>
                  {barangay}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <CreatableAddressCombobox
          id={`${idPrefix}_sitio`}
          label="Sitio"
          value={value.sitio}
          selectedId={value.sitioId}
          options={sitios}
          disabled={disabled || !value.barangay}
          loading={isLoadingSitios}
          placeholder="Select or type sitio"
          onSelect={(option, sitio) => {
            onChange({
              ...value,
              sitio,
              purok: "",
              sitioId: option?.id ?? null,
              purokId: null,
            })
          }}
          onDeleteOption={(option) => setPendingDelete({ type: "sitio", option })}
        />

        <CreatableAddressCombobox
          id={`${idPrefix}_purok`}
          label="Purok"
          value={value.purok}
          selectedId={value.purokId}
          options={puroks}
          disabled={disabled || !value.sitio}
          loading={isLoadingPuroks}
          placeholder="Select or type purok"
          onSelect={(option, purok) => {
            onChange({
              ...value,
              purok,
              purokId: option?.id ?? null,
            })
          }}
          onDeleteOption={(option) => setPendingDelete({ type: "purok", option })}
        />
      </div>

      {optionError ? (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {optionError}
        </p>
      ) : null}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Address Option</AlertDialogTitle>
            <AlertDialogDescription>
              Delete {pendingDelete?.option.name ?? "this address option"} from saved address options.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault()
                void handleDeleteOption()
              }}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export { emptyAddressSelection }
