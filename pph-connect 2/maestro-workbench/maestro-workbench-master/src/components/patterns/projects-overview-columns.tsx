"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, GripVertical, ArrowUpDown } from "lucide-react"
import { Link } from "react-router-dom"

export type ProjectOverview = {
  id: string
  name: string
  plugin: string
  pluginModality: string
  totalQuestions: number
  activeQuestions: number
  status: 'active' | 'paused' | 'completed'
  language?: string
  locale?: string
  created_at?: string
  due_date?: string | null
  completed_tasks?: number
  total_tasks?: number
}

export const columns: ColumnDef<ProjectOverview>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "drag",
    header: "",
    cell: () => (
      <div className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs font-medium h-8 px-2"
        >
          Project Name
          <ArrowUpDown className="ml-1.5 h-3 w-3" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "plugin",
    header: "Plugin",
    cell: ({ row }) => {
      const modality = row.original.pluginModality
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm">{row.getValue("plugin")}</span>
          <Badge variant="outline" className="text-xs h-5 px-1.5 font-normal">
            {modality}
          </Badge>
        </div>
      )
    },
  },
  {
    accessorKey: "totalQuestions",
    header: ({ column }) => {
      return (
        <div className="text-right">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-xs font-medium h-8 px-2"
          >
            Total Questions
            <ArrowUpDown className="ml-1.5 h-3 w-3" />
          </Button>
        </div>
      )
    },
    cell: ({ row }) => {
      return <div className="text-right font-medium">{row.getValue("totalQuestions")}</div>
    },
  },
  {
    accessorKey: "activeQuestions",
    header: ({ column }) => {
      return (
        <div className="text-right">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="text-xs font-medium h-8 px-2"
          >
            Active Questions
            <ArrowUpDown className="ml-1.5 h-3 w-3" />
          </Button>
        </div>
      )
    },
    cell: ({ row }) => {
      return <div className="text-right font-medium">{row.getValue("activeQuestions")}</div>
    },
  },
  {
    accessorKey: "progress",
    header: "Progress",
    cell: ({ row }) => {
      const completed = row.original.completed_tasks || 0
      const total = row.original.total_tasks || 0
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
      
      return (
        <div className="w-full max-w-[200px]">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">{percentage}%</span>
            <span className="font-medium">{completed}/{total}</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "language",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs font-medium h-8 px-2"
        >
          Language
          <ArrowUpDown className="ml-1.5 h-3 w-3" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <div className="text-sm">{row.getValue("language") || "Unknown"}</div>
    },
  },
  {
    accessorKey: "locale",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs font-medium h-8 px-2"
        >
          Locale
          <ArrowUpDown className="ml-1.5 h-3 w-3" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <div className="text-sm">{row.getValue("locale") || "Unknown"}</div>
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs font-medium h-8 px-2"
        >
          Created
          <ArrowUpDown className="ml-1.5 h-3 w-3" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = row.getValue("created_at") as string
      return <div className="text-sm">{date ? new Date(date).toLocaleDateString() : "-"}</div>
    },
  },
  {
    accessorKey: "due_date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs font-medium h-8 px-2"
        >
          Due Date
          <ArrowUpDown className="ml-1.5 h-3 w-3" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = row.getValue("due_date") as string | null
      return <div className="text-sm">{date ? new Date(date).toLocaleDateString() : "-"}</div>
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-xs font-medium h-8 px-2"
        >
          Status
          <ArrowUpDown className="ml-1.5 h-3 w-3" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      const variant = status === 'active' ? 'default' : status === 'completed' ? 'secondary' : 'outline'
      return <Badge variant={variant} className="text-xs h-5 px-2 font-normal">{status}</Badge>
    },
  },
  {
    id: "actions",
    header: "Action",
    enableHiding: false,
    cell: ({ row }) => {
      const project = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" asChild>
              <Link to={`/m/projects/questions/${project.id}`}>
                View Questions
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => {
                // Handle Edit
                const event = new CustomEvent('edit-project', { detail: project.id })
                window.dispatchEvent(event)
              }}
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => {
                // Handle Preview
                const event = new CustomEvent('preview-project', { detail: project.id })
                window.dispatchEvent(event)
              }}
            >
              Preview
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>State</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    const event = new CustomEvent('update-project-status', { 
                      detail: { id: project.id, status: 'paused' }
                    })
                    window.dispatchEvent(event)
                  }}
                  disabled={project.status === 'paused'}
                >
                  Pause
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    const event = new CustomEvent('update-project-status', { 
                      detail: { id: project.id, status: 'completed' }
                    })
                    window.dispatchEvent(event)
                  }}
                  disabled={project.status === 'completed'}
                >
                  Mark Complete
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive cursor-pointer"
                  onClick={() => {
                    const event = new CustomEvent('delete-project', { detail: project.id })
                    window.dispatchEvent(event)
                  }}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

