import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { Project } from "../../types";

interface DeleteDialogProps {
    open: boolean;
    project: Project | null;
    deleteFiles: boolean;
    onOpenChange: (open: boolean) => void;
    onDeleteFilesChange: (checked: boolean) => void;
    onConfirm: () => void;
    onCancel: () => void;
}

export function DeleteDialog({
    open,
    project,
    deleteFiles,
    onOpenChange,
    onDeleteFilesChange,
    onConfirm,
    onCancel,
}: DeleteDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <Trash2 className="w-4 h-4 text-red-500" />
                        Remove project
                    </DialogTitle>
                </DialogHeader>

                <div className="py-2 space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to remove{" "}
                        <span className="font-semibold text-foreground font-mono">
                            {project?.name}
                        </span>{" "}
                        from Hive?
                    </p>

                    <div className="rounded-lg border bg-muted/40 p-3 flex items-start gap-3">
                        <Switch
                            id="delete-files"
                            checked={deleteFiles}
                            onCheckedChange={onDeleteFilesChange}
                            className="mt-0.5 shrink-0"
                        />
                        <div>
                            <Label
                                htmlFor="delete-files"
                                className="text-sm font-medium cursor-pointer"
                            >
                                Delete project files
                            </Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Permanently delete{" "}
                                <span className="font-mono">{project?.path}</span> from disk. This
                                cannot be undone.
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                    <Button variant="outline" size="sm" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button size="sm" variant="destructive" onClick={onConfirm}>
                        {deleteFiles ? "Delete project & files" : "Remove project"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
