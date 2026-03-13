"use client"

import * as React from "react"
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table"

import { cn } from "@/lib/utils"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    className?: string
}

export function DataTable<TData, TValue>({
    columns,
    data,
    className,
}: DataTableProps<TData, TValue>) {
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    return (
        <div className={cn("w-full overflow-auto", className)}>
            <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b border-zinc-200">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id} className="transition-colors hover:bg-zinc-50/50 data-[state=selected]:bg-zinc-50">
                            {headerGroup.headers.map((header) => {
                                return (
                                    <th
                                        key={header.id}
                                        className="h-10 px-4 text-left align-middle font-medium text-zinc-500 [&:has([role=checkbox])]:pr-0 uppercase tracking-wider text-[10px]"
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </th>
                                )
                            })}
                        </tr>
                    ))}
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <tr
                                key={row.id}
                                className="border-b border-zinc-200 transition-colors hover:bg-zinc-50 data-[state=selected]:bg-zinc-50"
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <td
                                        key={cell.id}
                                        className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-zinc-900"
                                    >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={columns.length} className="h-24 text-center text-zinc-500">
                                No results.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}
