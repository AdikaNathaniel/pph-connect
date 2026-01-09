import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import type { FilterField } from '@/types/filters'

type FieldSelectorModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  fields: FilterField[]
  onFieldSelect: (field: FilterField) => void
}

export function FieldSelectorModal({
  open,
  onOpenChange,
  fields,
  onFieldSelect,
}: FieldSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredFields = fields.filter((field) =>
    field.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleFieldClick = (field: FilterField) => {
    onFieldSelect(field)
    onOpenChange(false)
    setSearchQuery('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Select Field to Filter</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search fields..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Field list */}
          <div className="max-h-[400px] overflow-y-auto space-y-1">
            {filteredFields.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No fields found
              </p>
            ) : (
              filteredFields.map((field) => (
                <Button
                  key={field.key}
                  variant="ghost"
                  className="w-full justify-start text-left h-auto py-3 px-3"
                  onClick={() => handleFieldClick(field)}
                >
                  <div>
                    <div className="font-medium">{field.label}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {field.type} field
                    </div>
                  </div>
                </Button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
