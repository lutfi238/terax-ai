import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useUpdater } from "./useUpdater";

export function UpdaterDialog() {
  const { status, dismiss } = useUpdater();
  const release = status.kind === "available" ? status.info : null;

  return (
    <Dialog
      open={release !== null}
      onOpenChange={(open) => {
        if (!open) dismiss();
      }}
    >
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            Official Terax v{release?.version} is available
          </DialogTitle>
          <DialogDescription>
            You&apos;re on v{release?.currentVersion}. This custom build will
            not install official releases automatically.
          </DialogDescription>
        </DialogHeader>

        {release?.body && (
          <p className="max-h-48 overflow-y-auto whitespace-pre-wrap text-sm text-muted-foreground">
            {release.body}
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Later
          </Button>
          <Button
            size="sm"
            onClick={() => void openUrl(release?.releaseUrl ?? "")}
          >
            View official release
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
