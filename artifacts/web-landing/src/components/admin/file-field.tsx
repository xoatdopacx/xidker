import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { FileArchive, Upload, X } from "lucide-react";
import { useListBuiltinFiles, getListBuiltinFilesQueryKey, type BuiltinFile } from "@workspace/api-client-react";
import { statusOf } from "@/lib/http";
import { adminErrorText, fileSize, useSignOutOn401 } from "./shared";
import { ZipProblem, uploadZip, type PickedFile } from "./zip-upload";

type SignedOut = (notice: string | null) => void;

/**
 * Picks the source code a buyer downloads: one of the zips that come with the site, or a .zip
 * the admin uploads (up to 200 MB, with progress). Reports `busy` while an upload runs.
 */
export function FileField({ id, label, help, empty, value, onChange, onBusy, onBuiltin, disabled, onSignedOut }: {
  id: string;
  label: string;
  help: ReactNode;
  /** Said when no file is picked. */
  empty: string;
  value: PickedFile | null;
  onChange: (file: PickedFile | null) => void;
  onBusy?: (busy: boolean) => void;
  /** Called after one of the built-in files is picked (the sample editor fills in its demo link). */
  onBuiltin?: (file: BuiltinFile) => void;
  disabled?: boolean;
  onSignedOut: SignedOut;
}) {
  const builtins = useListBuiltinFiles({ query: { queryKey: getListBuiltinFilesQueryKey(), retry: false, staleTime: 5 * 60_000 } });
  useSignOutOn401(builtins.error, onSignedOut);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const job = useRef<AbortController | null>(null);
  const uploading = progress !== null;

  useEffect(() => () => job.current?.abort(), []);
  useEffect(() => { onBusy?.(uploading); }, [uploading, onBusy]);

  const pickBuiltin = (slug: string) => {
    const file = builtins.data?.find((f) => f.slug === slug);
    if (!file) return;
    setError(null);
    // The name buyers download it under, as the API saves it.
    onChange({ input: { kind: "builtin", slug: file.slug }, name: `xidker-${file.slug}-source.zip`, size: file.size });
    onBuiltin?.(file);
  };

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || uploading) return;
    const controller = new AbortController();
    job.current = controller;
    setError(null);
    setProgress(0);
    try {
      const uploaded = await uploadZip(file, (share) => setProgress(share), controller.signal);
      if (controller.signal.aborted) return;
      onChange(uploaded);
    } catch (err) {
      if (controller.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
      if (statusOf(err) === 401) { onSignedOut(adminErrorText(err)); return; }
      setError(err instanceof ZipProblem ? err.message : adminErrorText(err));
    } finally {
      if (job.current === controller) {
        job.current = null;
        setProgress(null);
      }
    }
  };

  const cancel = () => {
    job.current?.abort();
    job.current = null;
    setProgress(null);
  };

  const builtin = value?.input.kind === "builtin";
  const pct = Math.round((progress ?? 0) * 100);

  return (
    <div role="group" aria-labelledby={`${id}-label`} aria-describedby={`${id}-help`} data-testid={`field-${id}`}>
      <p id={`${id}-label`} className="text-sm font-bold">{label}</p>
      <div id={`${id}-help`} className="text-xs text-[#3d4a3d] mb-2">{help}</div>

      {value ? (
        <div className="flex items-center gap-3 border-[3px] border-[#1b2a1c] bg-white p-2.5">
          <FileArchive className="h-6 w-6 shrink-0" strokeWidth={2.2} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block font-bold break-all" dir="auto" data-testid={`text-${id}-name`}>{value.name}</span>
            <span className="block text-xs text-[#5b6a5b]">
              {fileSize(value.size)} · {builtin ? "Source có sẵn trên web" : "File bạn đã tải lên"}
            </span>
          </span>
          <button type="button" onClick={() => { setError(null); onChange(null); }} disabled={disabled || uploading}
            className="adm-btn h-9 w-9 shrink-0" aria-label={`Bỏ file ${value.name}`} title="Bỏ file" data-testid={`button-${id}-clear`}>
            <X className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <p className="border-[3px] border-dashed border-[#8d8a80] bg-white/50 p-2.5 text-sm text-[#3d4a3d]" data-testid={`text-${id}-empty`}>{empty}</p>
      )}

      {uploading ? (
        <div className="mt-2 flex items-center gap-3">
          <div role="progressbar" aria-label="Đang tải file .zip lên" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
            className="relative h-5 flex-1 border-[3px] border-[#1b2a1c] bg-white">
            <span className="absolute inset-y-0 start-0 bg-[hsl(var(--gold))]" style={{ width: `${pct}%` }} />
          </div>
          <span className="font-num w-12 text-end text-sm" aria-hidden="true">{pct}%</span>
          <button type="button" onClick={cancel} className="adm-btn h-9 px-3 text-sm" data-testid={`button-${id}-cancel`}>Dừng</button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className={`adm-btn h-10 px-3 text-sm ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} focus-within:outline-3 focus-within:outline-[hsl(var(--pin))] focus-within:outline-offset-2`}>
            <input type="file" accept=".zip,application/zip,application/x-zip-compressed" onChange={onPick} disabled={disabled}
              className="sr-only" data-testid={`input-${id}-zip`} />
            <Upload className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            {value && !builtin ? "Tải file khác lên" : "Tải file .zip lên"}
          </label>
          {builtins.data && builtins.data.length > 0 && (
            <select value="" onChange={(e) => pickBuiltin(e.target.value)} disabled={disabled} aria-label="Chọn source có sẵn trên web"
              className="adm-field !h-10 !w-auto max-w-full !text-sm" data-testid={`select-${id}-builtin`}>
              <option value="">Hoặc chọn source có sẵn…</option>
              {builtins.data.map((f) => (
                <option key={f.slug} value={f.slug}>Mẫu {f.name} ({fileSize(f.size)})</option>
              ))}
            </select>
          )}
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-[hsl(var(--pin))]" data-testid={`text-${id}-error`}>{error}</p>}
    </div>
  );
}
