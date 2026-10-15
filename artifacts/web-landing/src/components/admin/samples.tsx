import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ImagePlus, Loader2, Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  useListAdminSamples, getListAdminSamplesQueryKey, useCreateAdminSample, useUpdateAdminSample,
  useDeleteAdminSample, useReorderAdminSamples, type AdminSample, type AdminSampleImageInput,
} from "@workspace/api-client-react";
import { statusOf } from "@/lib/http";
import { adminErrorText, useSignOutOn401 } from "./shared";
import { ImageProblem, prepareSampleImage } from "./sample-upload";

// Same limits as the API.
const NAME_MAX = 60;
const IMAGES_MAX = 12;

const LIST_KEY = getListAdminSamplesQueryKey();
const NEW = "new";

type SignedOut = (notice: string | null) => void;

/** One picture in the editor: saved or uploaded ("ready"), being shrunk and uploaded, or failed. */
type Pic = {
  key: string;
  state: "ready" | "working" | "failed";
  image: AdminSampleImageInput | null;
  thumbUrl: string | null;
  fullUrl: string | null;
  error: string | null;
  /** Kept until the upload works, so "Thử lại" can start over. */
  file: File | null;
};

let picCount = 0;
const nextKey = () => `new-${++picCount}`;

const savedPics = (s: AdminSample | null): Pic[] =>
  (s?.images ?? []).map((img) => ({
    key: img.path,
    state: "ready",
    image: { path: img.path, thumb: img.thumb, width: img.width, height: img.height },
    thumbUrl: img.thumbUrl,
    fullUrl: img.url,
    error: null,
    file: null,
  }));

const oneLine = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim();

type Form = { name: string; visible: boolean; pics: Pic[] };
const toForm = (s: AdminSample | null): Form => ({ name: s?.name ?? "", visible: s?.visible ?? true, pics: savedPics(s) });
const signature = (f: Form) =>
  JSON.stringify([oneLine(f.name), f.visible, f.pics.map((p) => (p.state === "ready" ? p.image?.path : p.key))]);

/* ---------------- screen ---------------- */

export function AdminSamples({ onSignedOut }: { onSignedOut: SignedOut }) {
  const qc = useQueryClient();
  const list = useListAdminSamples({ query: { queryKey: LIST_KEY, retry: false, staleTime: 30_000 } });
  useSignOutOn401(list.error, onSignedOut);
  const reorder = useReorderAdminSamples();

  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  // The sample just saved, shown until the list query has it.
  const [lastSaved, setLastSaved] = useState<AdminSample | null>(null);
  const dirty = useRef(false);

  const samples = list.data ?? [];
  const current = selected && selected !== NEW
    ? samples.find((s) => s.id === selected) ?? (lastSaved?.id === selected ? lastSaved : null)
    : null;
  const editing = selected === NEW || current !== null;
  const onShow = samples.filter((s) => s.visible).length;

  const open = (id: string | null) => {
    if (id === selected) return;
    if (dirty.current && !window.confirm("Bỏ các thay đổi chưa lưu?")) return;
    dirty.current = false;
    setNotice(null);
    setSelected(id);
  };

  const move = (index: number, by: -1 | 1) => {
    const target = index + by;
    if (reorder.isPending || target < 0 || target >= samples.length) return;
    const before = samples;
    const next = [...samples];
    [next[index], next[target]] = [next[target], next[index]];
    qc.setQueryData<AdminSample[]>(LIST_KEY, next);
    setOrderError(null);
    reorder.mutate({ data: { ids: next.map((s) => s.id) } }, {
      onSuccess: (rows) => qc.setQueryData<AdminSample[]>(LIST_KEY, rows),
      onError: (err) => {
        qc.setQueryData<AdminSample[]>(LIST_KEY, before);
        if (statusOf(err) === 401) { onSignedOut(adminErrorText(err)); return; }
        setOrderError(`Chưa đổi được thứ tự. ${adminErrorText(err)}`);
      },
    });
  };

  const onSaved = (sample: AdminSample, message: string) => {
    qc.setQueryData<AdminSample[]>(LIST_KEY, (old) => {
      if (!old) return old;
      return old.some((s) => s.id === sample.id) ? old.map((s) => (s.id === sample.id ? sample : s)) : [...old, sample];
    });
    void qc.invalidateQueries({ queryKey: LIST_KEY });
    dirty.current = false;
    setLastSaved(sample);
    setSelected(sample.id);
    setNotice(message);
  };

  const onDeleted = (id: string) => {
    qc.setQueryData<AdminSample[]>(LIST_KEY, (old) => old?.filter((s) => s.id !== id));
    void qc.invalidateQueries({ queryKey: LIST_KEY });
    dirty.current = false;
    setSelected(null);
    setNotice("Đã xóa mẫu.");
  };

  return (
    <div className="flex-1 min-h-0 flex">
      <section aria-label="Danh sách mẫu source"
        className={`${editing ? "hidden md:flex" : "flex"} w-full md:w-[320px] lg:w-[360px] shrink-0 flex-col border-e-[3px] border-[#1b2a1c] bg-[hsl(var(--paper))]`}>
        <div className="p-3 border-b-[3px] border-[#1b2a1c]">
          <button type="button" onClick={() => open(NEW)} aria-pressed={selected === NEW} className="adm-btn gold w-full h-11" data-testid="button-new-sample">
            <Plus className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> Thêm mẫu mới
          </button>
        </div>
        {notice && !editing && <p role="status" className="adm-notice info m-3 mb-0" data-testid="text-samples-notice">{notice}</p>}
        {orderError && <p role="alert" className="adm-notice error m-3 mb-0" data-testid="text-samples-order-error">{orderError}</p>}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {list.isPending ? (
            <p className="p-6 text-sm text-[#3d4a3d]">Đang tải các mẫu…</p>
          ) : list.isError && !list.data ? (
            <div className="p-6 text-sm">
              <p>{adminErrorText(list.error)}</p>
              <button type="button" onClick={() => list.refetch()} className="adm-btn h-9 px-3 mt-3">Thử lại</button>
            </div>
          ) : samples.length === 0 ? (
            <p className="p-6 text-sm text-[#3d4a3d]">Chưa có mẫu nào. Bấm "Thêm mẫu mới" rồi đăng vài ảnh của mẫu source.</p>
          ) : (
            <ul aria-busy={reorder.isPending || undefined}>
              {samples.map((s, i) => (
                <li key={s.id} className="flex">
                  <SampleRow sample={s} active={s.id === selected} onOpen={() => open(s.id)} />
                  <div className="shrink-0 flex flex-col border-b-2 border-s-2 border-[#cfcbbf]">
                    <MoveButton label={`Đưa mẫu ${s.name} lên trên`} off={i === 0} onClick={() => move(i, -1)} testId={`button-sample-up-${s.id}`}>
                      <ArrowUp className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                    </MoveButton>
                    <MoveButton label={`Đưa mẫu ${s.name} xuống dưới`} off={i === samples.length - 1} onClick={() => move(i, 1)} testId={`button-sample-down-${s.id}`}>
                      <ArrowDown className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                    </MoveButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="p-3 border-t-[3px] border-[#1b2a1c] text-xs text-[#3d4a3d]">
          {samples.length > 0 && <>Đang hiện {onShow}/{samples.length} mẫu, theo đúng thứ tự trên. </>}
          Gói nào cho khách chọn mẫu thì bật trong thẻ "Sản phẩm & giá". Khi không có mẫu nào đang hiện, khách mua như bình thường.
        </p>
      </section>

      <section aria-label={selected === NEW ? "Thêm mẫu mới" : "Sửa mẫu"} className={`${editing ? "flex" : "hidden md:flex"} flex-1 min-w-0 flex-col`}>
        {editing ? (
          <Editor key={selected} sample={current} notice={notice} onBack={() => open(null)}
            onDirty={(d) => { dirty.current = d; }} onSaved={onSaved} onDeleted={onDeleted} onSignedOut={onSignedOut} />
        ) : (
          <div className="m-auto max-w-md p-6 text-center text-sm text-[#3d4a3d]">
            Chọn một mẫu bên trái để sửa tên và ảnh, hoặc bấm "Thêm mẫu mới". Khách mua gói có chọn mẫu sẽ xem ảnh các mẫu rồi chọn một mẫu trước khi thanh toán.
          </div>
        )}
      </section>
    </div>
  );
}

function SampleRow({ sample, active, onOpen }: { sample: AdminSample; active: boolean; onOpen: () => void }) {
  const cover = sample.images[0];
  return (
    <button type="button" onClick={onOpen} aria-current={active ? "true" : undefined}
      className={`adm-item min-w-0 ${sample.visible ? "" : "is-hidden"}`} data-testid={`row-sample-${sample.id}`}>
      <span className="flex items-center gap-3">
        <span className="block h-[50px] w-10 shrink-0 overflow-hidden border-2 border-[#1b2a1c] bg-white">
          {cover && <img src={cover.thumbUrl} alt="" width={40} height={50} loading="lazy" decoding="async" className="h-full w-full object-cover" />}
        </span>
        <span className="min-w-0">
          <span className="block font-bold truncate" dir="auto">{sample.name}</span>
          <span className="mt-0.5 block text-xs text-[#5b6a5b]">
            <span className={sample.visible ? "font-bold text-[hsl(var(--grass-d))]" : "font-bold"}>{sample.visible ? "Đang hiện" : "Đang ẩn"}</span>
            {" · "}{sample.images.length} ảnh
          </span>
        </span>
      </span>
    </button>
  );
}

/** Stays focusable at the ends of the list (aria-disabled), so focus never drops after a move. */
function MoveButton({ label, off, onClick, testId, children }: {
  label: string; off: boolean; onClick: () => void; testId: string; children: ReactNode;
}) {
  return (
    <button type="button" aria-label={label} aria-disabled={off || undefined} onClick={off ? undefined : onClick}
      className="flex-1 w-10 grid place-items-center hover:bg-white/60 aria-disabled:opacity-30 aria-disabled:cursor-not-allowed focus-visible:outline-3 focus-visible:outline-[hsl(var(--pin))] focus-visible:-outline-offset-3"
      data-testid={testId}>
      {children}
    </button>
  );
}

/* ---------------- editor ---------------- */

function Editor({ sample, notice, onBack, onDirty, onSaved, onDeleted, onSignedOut }: {
  sample: AdminSample | null;
  notice: string | null;
  onBack: () => void;
  onDirty: (dirty: boolean) => void;
  onSaved: (sample: AdminSample, message: string) => void;
  onDeleted: (id: string) => void;
  onSignedOut: SignedOut;
}) {
  const [base, setBase] = useState(() => toForm(sample));
  const [form, setForm] = useState(base);
  const [nameError, setNameError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const create = useCreateAdminSample();
  const update = useUpdateAdminSample();
  const remove = useDeleteAdminSample();
  const busy = create.isPending || update.isPending || remove.isPending;
  const dirty = signature(form) !== signature(base);
  const working = form.pics.some((p) => p.state === "working");
  const room = IMAGES_MAX - form.pics.length;
  const nameLength = oneLine(form.name).length;

  // Pictures are shrunk and uploaded one at a time; local preview links are freed when the editor closes.
  const alive = useRef(true);
  const localUrls = useRef<string[]>([]);
  const queue = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      localUrls.current.forEach((url) => URL.revokeObjectURL(url));
      localUrls.current = [];
    };
  }, []);

  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => {
    if (!dirty && !working) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, working]);

  const patchPic = (key: string, patch: Partial<Pic>) =>
    setForm((f) => ({ ...f, pics: f.pics.map((p) => (p.key === key ? { ...p, ...patch } : p)) }));

  const process = (key: string, file: File) => {
    queue.current = queue.current.then(async () => {
      if (!alive.current) return;
      try {
        const prepared = await prepareSampleImage(file);
        if (!alive.current) {
          URL.revokeObjectURL(prepared.thumbUrl);
          URL.revokeObjectURL(prepared.fullUrl);
          return;
        }
        localUrls.current.push(prepared.thumbUrl, prepared.fullUrl);
        patchPic(key, { state: "ready", image: prepared.image, thumbUrl: prepared.thumbUrl, fullUrl: prepared.fullUrl, error: null, file: null });
      } catch (err) {
        if (!alive.current) return;
        if (statusOf(err) === 401) { onSignedOut(adminErrorText(err)); return; }
        patchPic(key, { state: "failed", error: err instanceof ImageProblem ? err.message : adminErrorText(err) });
      }
    });
  };

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0 || busy) return;
    const picked = Array.from(files);
    const taken = picked.slice(0, Math.max(0, room));
    setFailure(picked.length > taken.length
      ? `Mỗi mẫu tối đa ${IMAGES_MAX} ảnh, nên ${picked.length - taken.length} ảnh không được thêm.`
      : null);
    if (taken.length === 0) return;
    const added: Pic[] = taken.map((file) => ({ key: nextKey(), state: "working", image: null, thumbUrl: null, fullUrl: null, error: null, file }));
    setForm((f) => ({ ...f, pics: [...f.pics, ...added] }));
    for (const pic of added) process(pic.key, pic.file as File);
  };

  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    e.target.value = "";
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  };

  const retry = (pic: Pic) => {
    if (!pic.file) return;
    patchPic(pic.key, { state: "working", error: null });
    process(pic.key, pic.file);
  };
  const removePic = (key: string) => setForm((f) => ({ ...f, pics: f.pics.filter((p) => p.key !== key) }));
  const movePic = (index: number, by: -1 | 1) => setForm((f) => {
    const target = index + by;
    if (target < 0 || target >= f.pics.length) return f;
    const pics = [...f.pics];
    [pics[index], pics[target]] = [pics[target], pics[index]];
    return { ...f, pics };
  });

  const fail = (err: unknown) => {
    if (statusOf(err) === 401) { onSignedOut(adminErrorText(err)); return; }
    setFailure(adminErrorText(err));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const name = oneLine(form.name);
    const badName = !name ? "Nhập tên mẫu." : name.length > NAME_MAX ? `Tên mẫu tối đa ${NAME_MAX} ký tự.` : null;
    setNameError(badName);
    let problem: string | null = null;
    if (form.pics.length === 0) problem = "Thêm ít nhất 1 ảnh của mẫu.";
    else if (working) problem = "Đợi ảnh tải lên xong rồi lưu nhé.";
    else if (form.pics.some((p) => p.state === "failed")) problem = "Có ảnh bị lỗi. Bấm \"Thử lại\" hoặc xóa ảnh đó rồi lưu.";
    setFailure(problem);
    if (badName) { requestAnimationFrame(() => document.getElementById("sample-name")?.focus()); return; }
    if (problem) return;

    const data = { name, visible: form.visible, images: form.pics.map((p) => p.image as AdminSampleImageInput) };
    const done = (saved: AdminSample, message: string) => {
      // Saved pictures are now served by the site; the local copies stay alive until the editor closes.
      const fresh = toForm(saved);
      setBase(fresh);
      setForm(fresh);
      onSaved(saved, message);
    };
    const savedText = (saved: AdminSample) => saved.visible
      ? "Đã lưu. Khách thấy mẫu này khi mua gói có chọn mẫu."
      : "Đã lưu. Mẫu đang ẩn nên khách chưa thấy.";
    if (sample) {
      update.mutate({ id: sample.id, data }, { onSuccess: (saved) => done(saved, savedText(saved)), onError: fail });
    } else {
      create.mutate({ data }, { onSuccess: (saved) => onSaved(saved, savedText(saved)), onError: fail });
    }
  };

  const reset = () => { setForm(base); setNameError(null); setFailure(null); };

  const doDelete = () => {
    if (!sample || busy) return;
    remove.mutate({ id: sample.id }, {
      onSuccess: () => onDeleted(sample.id),
      onError: (err) => { setConfirmDelete(false); fail(err); },
    });
  };

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 border-b-[3px] border-[#1b2a1c] bg-[hsl(var(--paper))]">
        <button type="button" onClick={onBack} aria-label="Quay lại danh sách mẫu" className="adm-btn adm-back h-9 w-9 shrink-0" data-testid="button-samples-back">
          <ArrowLeft className="h-4 w-4" strokeWidth={3} />
        </button>
        <h2 className="font-extrabold truncate min-w-0" dir="auto">{sample ? `Sửa mẫu: ${sample.name}` : "Thêm mẫu mới"}</h2>
        {sample && <span className="ms-auto shrink-0 text-xs font-bold">{sample.visible ? "Đang hiện" : "Đang ẩn"} · {sample.images.length} ảnh</span>}
      </div>

      <form onSubmit={submit} noValidate className="flex-1 min-h-0 flex flex-col" data-testid="form-sample">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="max-w-5xl p-4 md:p-6 space-y-6">
            {notice && !dirty && <p role="status" className="adm-notice info" data-testid="text-sample-notice">{notice}</p>}
            {failure && <p role="alert" className="adm-notice error" data-testid="text-sample-error">{failure}</p>}

            <div className="max-w-xl">
              <div className="flex items-baseline gap-2 mb-1">
                <label htmlFor="sample-name" className="text-sm font-bold">Tên mẫu</label>
                <span className={`ms-auto text-xs ${nameLength > NAME_MAX ? "font-bold text-[hsl(var(--pin))]" : "text-[#5b6a5b]"}`} aria-hidden="true">{nameLength}/{NAME_MAX}</span>
              </div>
              <input id="sample-name" type="text" autoComplete="off" maxLength={200} value={form.name} dir="auto" disabled={busy}
                aria-invalid={nameError ? true : undefined} aria-describedby="sample-name-help"
                onChange={(e) => { const name = e.target.value; setForm((f) => ({ ...f, name })); setNameError(null); }}
                className="adm-field" data-testid="input-sample-name" />
              {nameError
                ? <p id="sample-name-help" className="mt-1 text-sm font-semibold text-[hsl(var(--pin))]">{nameError}</p>
                : <p id="sample-name-help" className="mt-1 text-xs text-[#5b6a5b]">Khách thấy đúng tên này, ở mọi ngôn ngữ.</p>}
            </div>

            <fieldset disabled={busy} aria-describedby="sample-images-help" className="adm-group" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
              <legend className="sr-only">Ảnh mẫu</legend>
              <div className="flex items-baseline gap-2">
                <p className="font-extrabold" aria-hidden="true">Ảnh mẫu</p>
                <span className="ms-auto text-xs text-[#5b6a5b]">{form.pics.length}/{IMAGES_MAX} ảnh</span>
              </div>
              <p id="sample-images-help" className="text-xs text-[#3d4a3d] mb-3">
                Ảnh đầu tiên là ảnh bìa. Nên dùng ảnh chụp toàn trang. Ảnh lớn được tự thu nhỏ trước khi tải lên. Có thể kéo thả ảnh vào đây.
              </p>
              <ul className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {form.pics.map((pic, i) => (
                  <PicTile key={pic.key} pic={pic} index={i} last={i === form.pics.length - 1}
                    onMove={(by) => movePic(i, by)} onRemove={() => removePic(pic.key)} onRetry={() => retry(pic)} />
                ))}
                {room > 0 && (
                  <li>
                    <label className="flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-2 border-[3px] border-dashed border-[#1b2a1c] bg-white/50 p-3 text-center text-sm font-bold hover:bg-white focus-within:outline-3 focus-within:outline-[hsl(var(--pin))] focus-within:outline-offset-2">
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/*" multiple onChange={onFiles} disabled={busy}
                        className="sr-only" data-testid="input-sample-files" />
                      <ImagePlus className="h-7 w-7" strokeWidth={2.5} aria-hidden="true" />
                      {form.pics.length === 0 ? "Chọn ảnh" : "Thêm ảnh"}
                      <span className="text-xs font-normal text-[#3d4a3d]">Còn thêm được {room} ảnh</span>
                    </label>
                  </li>
                )}
              </ul>
            </fieldset>

            <fieldset disabled={busy} className="adm-group">
              <legend className="sr-only">Hiển thị</legend>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="adm-check" checked={form.visible}
                  onChange={(e) => { const visible = e.target.checked; setForm((f) => ({ ...f, visible })); }} data-testid="checkbox-sample-visible" />
                <span>
                  <span className="font-bold">Hiện cho khách chọn</span>
                  <span className="block text-sm text-[#3d4a3d]">Bỏ đánh dấu để tạm ẩn mẫu này khỏi trang bán hàng.</span>
                </span>
              </label>
            </fieldset>
          </div>
        </div>

        <div className="border-t-[3px] border-[#1b2a1c] bg-[#ebe8de] px-4 py-3 flex flex-wrap items-center gap-2">
          <button type="submit" disabled={busy || (sample !== null && !dirty)} className="adm-btn red h-11 px-5" data-testid="button-save-sample">
            {create.isPending || update.isPending ? "Đang lưu…" : sample ? "Lưu thay đổi" : "Lưu mẫu"}
          </button>
          {dirty && (
            <button type="button" onClick={reset} disabled={busy} className="adm-btn h-11 px-4" data-testid="button-reset-sample">
              {sample ? "Hoàn tác" : "Xóa nội dung"}
            </button>
          )}
          {working && <span role="status" className="text-sm font-semibold">Đang tải ảnh lên…</span>}
          {sample && (
            confirmDelete ? (
              <span className="ms-auto flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">Xóa hẳn mẫu này? Đơn hàng đã chọn mẫu vẫn giữ tên mẫu.</span>
                <button type="button" onClick={doDelete} disabled={busy} className="adm-btn red h-11 px-4" data-testid="button-confirm-delete-sample">
                  {remove.isPending ? "Đang xóa…" : "Xóa"}
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} disabled={busy} className="adm-btn h-11 px-4">Thôi</button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} disabled={busy} className="adm-btn h-11 px-4 ms-auto" data-testid="button-delete-sample">
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Xóa mẫu
              </button>
            )
          )}
        </div>
      </form>
    </>
  );
}

function PicTile({ pic, index, last, onMove, onRemove, onRetry }: {
  pic: Pic; index: number; last: boolean; onMove: (by: -1 | 1) => void; onRemove: () => void; onRetry: () => void;
}) {
  const n = index + 1;
  return (
    <li className="flex flex-col border-[3px] border-[#1b2a1c] bg-white" data-testid={`tile-sample-image-${index}`}>
      <div className="relative aspect-[4/5] overflow-hidden border-b-[3px] border-[#1b2a1c] bg-[#ebe8de]">
        {pic.thumbUrl && (
          pic.fullUrl
            ? <a href={pic.fullUrl} target="_blank" rel="noopener" className="block h-full" aria-label={`Xem ảnh ${n} cỡ lớn`}>
                <img src={pic.thumbUrl} alt="" width={640} height={800} decoding="async" className="h-full w-full object-cover" />
              </a>
            : <img src={pic.thumbUrl} alt="" width={640} height={800} decoding="async" className="h-full w-full object-cover" />
        )}
        {pic.state === "working" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80 text-sm font-bold">
            <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Đang tải lên…
          </div>
        )}
        {pic.state === "failed" && (
          <p className="absolute inset-0 overflow-y-auto bg-[#fff2f0] p-2 text-sm font-semibold text-[hsl(var(--pin))]">{pic.error}</p>
        )}
        {index === 0 && pic.state === "ready" && <span className="adm-chip absolute top-1.5 start-1.5">Ảnh bìa</span>}
      </div>
      <div className="flex items-center gap-1 p-1.5">
        <span className="font-num w-6 text-center text-sm" aria-hidden="true">{n}</span>
        <TileButton label={`Đưa ảnh ${n} lên trước`} off={index === 0} onClick={() => onMove(-1)}>
          <ArrowLeft className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
        </TileButton>
        <TileButton label={`Đưa ảnh ${n} ra sau`} off={last} onClick={() => onMove(1)}>
          <ArrowRight className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
        </TileButton>
        {pic.state === "failed" && pic.file && (
          <TileButton label={`Thử lại ảnh ${n}`} onClick={onRetry}>
            <RotateCcw className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
          </TileButton>
        )}
        <span className="ms-auto">
          <TileButton label={`Xóa ảnh ${n}`} onClick={onRemove}>
            <Trash2 className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          </TileButton>
        </span>
      </div>
    </li>
  );
}

function TileButton({ label, off, onClick, children }: { label: string; off?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} aria-disabled={off || undefined} onClick={off ? undefined : onClick}
      className="adm-btn h-9 w-9 aria-disabled:opacity-40 aria-disabled:cursor-not-allowed">
      {children}
    </button>
  );
}
