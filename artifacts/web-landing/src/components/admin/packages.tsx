import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import {
  useListAdminPackages, getListAdminPackagesQueryKey,
  useCreateAdminPackage, useUpdateAdminPackage, useDeleteAdminPackage,
  useListAdminSamples, getListAdminSamplesQueryKey,
  type AdminPackage, type AdminPackageInput, type AdminPackageText,
} from "@workspace/api-client-react";
import { statusOf } from "@/lib/http";
import { adminErrorText, useSignOutOn401 } from "./shared";

// Same limits as the API; they keep every package inside what Whop accepts.
const NAME_MAX = 30;
const TAGLINE_MAX = 160;
const FEATURES_MAX = 8;
const FEATURE_MAX = 100;
const VND_MIN = 10_000;
const VND_MAX = 1_000_000_000;
const USD_MIN = 1;
const USD_MAX = 100_000;

const LIST_KEY = getListAdminPackagesQueryKey();
const NEW = "new";
const SAVED_LIVE = "Đã lưu lên Whop. Trang bán hàng cập nhật trong khoảng 1 phút.";

type Lang = "vi" | "en";
type Copy = { name: string; tagline: string; features: string };
type Form = { vi: Copy; en: Copy; priceVnd: string; priceUsd: string; onSale: boolean; recommended: boolean; pickSample: boolean };
type FieldKey = `${Lang}.${keyof Copy}` | "priceVnd" | "priceUsd";
type Errors = Partial<Record<FieldKey, string>>;
type SignedOut = (notice: string | null) => void;

const FIELD_ID: Record<FieldKey, string> = {
  priceVnd: "pkg-price-vnd", priceUsd: "pkg-price-usd",
  "vi.name": "pkg-vi-name", "vi.tagline": "pkg-vi-tagline", "vi.features": "pkg-vi-features",
  "en.name": "pkg-en-name", "en.tagline": "pkg-en-tagline", "en.features": "pkg-en-features",
};

/** Formatted the way the shop shows it: 299.000 ₫, $12, $12.50. */
function money(amount: number, currency: "VND" | "USD") {
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat(currency === "VND" ? "vi-VN" : "en-US", {
    style: "currency", currency, minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2,
  }).format(amount);
}

const byPrice = (a: AdminPackage, b: AdminPackage) =>
  (a.priceVnd ?? Infinity) - (b.priceVnd ?? Infinity) || a.key.localeCompare(b.key);

const oneLine = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim();
const featureLines = (text: string) =>
  text.split(/\r?\n/).map((line) => oneLine(line).replace(/^[-•*+]\s*/, "")).filter(Boolean);

const toCopy = (t: AdminPackageText): Copy => ({ name: t.name, tagline: t.tagline ?? "", features: t.features.join("\n") });
const EMPTY_COPY: Copy = { name: "", tagline: "", features: "" };

function toForm(p: AdminPackage | null): Form {
  if (!p) return { vi: EMPTY_COPY, en: EMPTY_COPY, priceVnd: "", priceUsd: "", onSale: true, recommended: false, pickSample: false };
  return {
    vi: toCopy(p.vi), en: toCopy(p.en),
    priceVnd: p.priceVnd == null ? "" : String(p.priceVnd),
    priceUsd: p.priceUsd == null ? "" : String(p.priceUsd),
    onSale: p.onSale, recommended: p.recommended, pickSample: p.pickSample,
  };
}

/** "299000", "299.000", "299,000 ₫" all mean 299000. */
function parseVnd(raw: string): number | null {
  const digits = raw.replace(/[\s.,_]/g, "").replace(/(₫|đ|vnd)$/i, "");
  return /^\d{1,10}$/.test(digits) ? Number(digits) : null;
}

/** "12", "12.5", "12,50", "$12" — at most 2 decimals. */
function parseUsd(raw: string): number | null {
  let s = raw.replace(/[\s$]/g, "").replace(/usd$/i, "");
  s = s.includes(",") && !s.includes(".") ? s.replace(",", ".") : s.replace(/,/g, "");
  return /^\d{1,6}(\.\d{1,2})?$/.test(s) ? Number(s) : null;
}

function sameCopy(a: Copy, b: Copy) {
  return oneLine(a.name) === oneLine(b.name) && oneLine(a.tagline) === oneLine(b.tagline)
    && featureLines(a.features).join("\n") === featureLines(b.features).join("\n");
}

function validate(f: Form): { errors: Errors; input: AdminPackageInput | null } {
  const errors: Errors = {};
  const copy = (lang: Lang) => {
    const label = lang === "vi" ? "tiếng Việt" : "tiếng Anh";
    const name = oneLine(f[lang].name);
    const tagline = oneLine(f[lang].tagline);
    const features = featureLines(f[lang].features);
    if (!name) errors[`${lang}.name`] = `Nhập tên gói bằng ${label}.`;
    else if (name.length > NAME_MAX) errors[`${lang}.name`] = `Tên gói tối đa ${NAME_MAX} ký tự (giới hạn của Whop).`;
    if (tagline.length > TAGLINE_MAX) errors[`${lang}.tagline`] = `Câu giới thiệu tối đa ${TAGLINE_MAX} ký tự.`;
    if (features.length > FEATURES_MAX) errors[`${lang}.features`] = `Tối đa ${FEATURES_MAX} tính năng.`;
    else if (features.some((x) => x.length > FEATURE_MAX)) errors[`${lang}.features`] = `Mỗi tính năng tối đa ${FEATURE_MAX} ký tự.`;
    return { name, tagline: tagline || null, features };
  };
  const vi = copy("vi");
  const en = copy("en");

  const priceVnd = parseVnd(f.priceVnd);
  if (priceVnd === null) errors.priceVnd = "Nhập giá bằng số, ví dụ 299000.";
  else if (priceVnd < VND_MIN) errors.priceVnd = `Giá thấp nhất là ${money(VND_MIN, "VND")}.`;
  else if (priceVnd > VND_MAX) errors.priceVnd = "Giá này lớn quá.";
  const priceUsd = parseUsd(f.priceUsd);
  if (priceUsd === null) errors.priceUsd = "Nhập giá bằng số, tối đa 2 chữ số sau dấu chấm, ví dụ 12 hoặc 12.50.";
  else if (priceUsd < USD_MIN) errors.priceUsd = "Giá thấp nhất là $1.";
  else if (priceUsd > USD_MAX) errors.priceUsd = "Giá này lớn quá.";

  if (Object.keys(errors).length > 0 || priceVnd === null || priceUsd === null) return { errors, input: null };
  return { errors, input: { vi, en, priceVnd, priceUsd, onSale: f.onSale, recommended: f.recommended, pickSample: f.pickSample } };
}

/* ---------------- screen ---------------- */

export function AdminPackages({ onSignedOut }: { onSignedOut: SignedOut }) {
  const qc = useQueryClient();
  const list = useListAdminPackages({ query: { queryKey: LIST_KEY, retry: false, staleTime: 30_000 } });
  useSignOutOn401(list.error, onSignedOut);

  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // The package just saved, shown until the list query has it.
  const [lastSaved, setLastSaved] = useState<AdminPackage | null>(null);
  const dirty = useRef(false);

  const packages = list.data ?? [];
  const current = selected && selected !== NEW
    ? packages.find((p) => p.key === selected) ?? (lastSaved?.key === selected ? lastSaved : null)
    : null;
  const editing = selected === NEW || current !== null;

  const open = (key: string | null) => {
    if (key === selected) return;
    if (dirty.current && !window.confirm("Bỏ các thay đổi chưa lưu?")) return;
    dirty.current = false;
    setNotice(null);
    setSelected(key);
  };

  const onSaved = (pkg: AdminPackage, message: string) => {
    qc.setQueryData<AdminPackage[]>(LIST_KEY, (old) => old && [...old.filter((p) => p.key !== pkg.key), pkg].sort(byPrice));
    // The recommended mark may have moved off another package.
    void qc.invalidateQueries({ queryKey: LIST_KEY });
    dirty.current = false;
    setLastSaved(pkg);
    setSelected(pkg.key);
    setNotice(message);
  };

  const onDeleted = (key: string) => {
    qc.setQueryData<AdminPackage[]>(LIST_KEY, (old) => old?.filter((p) => p.key !== key));
    void qc.invalidateQueries({ queryKey: LIST_KEY });
    dirty.current = false;
    setSelected(null);
    setNotice("Đã xóa gói khỏi Whop.");
  };

  return (
    <div className="flex-1 min-h-0 flex">
      <section aria-label="Danh sách gói"
        className={`${editing ? "hidden md:flex" : "flex"} w-full md:w-[320px] lg:w-[360px] shrink-0 flex-col border-e-[3px] border-[#1b2a1c] bg-[hsl(var(--paper))]`}>
        <div className="p-3 border-b-[3px] border-[#1b2a1c]">
          <button type="button" onClick={() => open(NEW)} aria-pressed={selected === NEW} className="adm-btn gold w-full h-11" data-testid="button-new-package">
            <Plus className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> Đăng bán source mới
          </button>
        </div>
        {notice && !editing && <p role="status" className="adm-notice info m-3 mb-0" data-testid="text-packages-notice">{notice}</p>}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {list.isPending ? (
            <p className="p-6 text-sm text-[#3d4a3d]">Đang tải các gói từ Whop…</p>
          ) : list.isError && !list.data ? (
            <div className="p-6 text-sm">
              <p>{adminErrorText(list.error)}</p>
              <button type="button" onClick={() => list.refetch()} className="adm-btn h-9 px-3 mt-3">Thử lại</button>
            </div>
          ) : packages.length === 0 ? (
            <p className="p-6 text-sm text-[#3d4a3d]">Chưa có gói nào. Bấm "Đăng bán source mới" để thêm gói đầu tiên.</p>
          ) : (
            <ul>
              {packages.map((p) => (
                <li key={p.key}><PackageRow pkg={p} active={p.key === selected} onOpen={() => open(p.key)} /></li>
              ))}
            </ul>
          )}
        </div>
        <p className="p-3 border-t-[3px] border-[#1b2a1c] text-xs text-[#3d4a3d]">
          Giá và chữ được lưu thẳng lên Whop. Trang bán hàng cập nhật trong khoảng 1 phút.
        </p>
      </section>

      <section aria-label={selected === NEW ? "Đăng bán source mới" : "Sửa gói"} className={`${editing ? "flex" : "hidden md:flex"} flex-1 min-w-0 flex-col`}>
        {editing ? (
          <Editor key={selected} pkg={current} notice={notice} onBack={() => open(null)}
            onDirty={(d) => { dirty.current = d; }} onSaved={onSaved} onDeleted={onDeleted} onSignedOut={onSignedOut} />
        ) : (
          <div className="m-auto p-6 text-center text-sm text-[#3d4a3d]">
            Chọn một gói bên trái để sửa giá và nội dung, hoặc bấm "Đăng bán source mới".
          </div>
        )}
      </section>
    </div>
  );
}

function PackageRow({ pkg, active, onOpen }: { pkg: AdminPackage; active: boolean; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} aria-current={active ? "true" : undefined}
      className={`adm-item ${pkg.onSale ? "" : "is-hidden"}`} data-testid={`row-package-${pkg.key}`}>
      <span className="flex items-center gap-2">
        <span className="font-bold truncate">{pkg.vi.name || pkg.en.name}</span>
        {pkg.recommended && <span className="adm-chip shrink-0">Đề xuất</span>}
        {pkg.pickSample && <span className="adm-chip shrink-0">Chọn mẫu</span>}
      </span>
      <span className="mt-0.5 block text-sm">
        {pkg.priceVnd != null ? money(pkg.priceVnd, "VND") : "Chưa có giá VND"}
        <span className="text-[#5b6a5b]"> · </span>
        {pkg.priceUsd != null ? money(pkg.priceUsd, "USD") : "Chưa có giá USD"}
      </span>
      <span className="mt-0.5 block text-xs text-[#5b6a5b]">
        <span className={pkg.onSale ? "font-bold text-[hsl(var(--grass-d))]" : "font-bold"}>{pkg.onSale ? "Đang bán" : "Đang ẩn"}</span>
        {" · "}{pkg.buyers} người mua
      </span>
    </button>
  );
}

/* ---------------- editor ---------------- */

function Editor({ pkg, notice, onBack, onDirty, onSaved, onDeleted, onSignedOut }: {
  pkg: AdminPackage | null;
  notice: string | null;
  onBack: () => void;
  onDirty: (dirty: boolean) => void;
  onSaved: (pkg: AdminPackage, message: string) => void;
  onDeleted: (key: string) => void;
  onSignedOut: SignedOut;
}) {
  const [base, setBase] = useState(() => toForm(pkg));
  const [form, setForm] = useState(base);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const create = useCreateAdminPackage();
  const update = useUpdateAdminPackage();
  const remove = useDeleteAdminPackage();
  const busy = create.isPending || update.isPending || remove.isPending;
  const dirty = JSON.stringify(form) !== JSON.stringify(base);
  // Only asked while the box is ticked: with no sample on show, buyers skip the choice.
  const samples = useListAdminSamples({ query: { queryKey: getListAdminSamplesQueryKey(), enabled: form.pickSample, retry: false, staleTime: 30_000 } });
  const noSampleOnShow = form.pickSample && samples.data !== undefined && !samples.data.some((s) => s.visible);
  const enChanged = !sameCopy(form.en, base.en);

  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const setCopy = (lang: Lang, field: keyof Copy, value: string) => {
    setForm((f) => ({ ...f, [lang]: { ...f[lang], [field]: value } }));
    setErrors((e) => (e[`${lang}.${field}`] ? { ...e, [`${lang}.${field}`]: undefined } : e));
  };
  const setPrice = (field: "priceVnd" | "priceUsd", value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  };

  const fail = (err: unknown) => {
    if (statusOf(err) === 401) { onSignedOut(adminErrorText(err)); return; }
    setFailure(adminErrorText(err));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const result = validate(form);
    setErrors(result.errors);
    setFailure(null);
    if (!result.input) {
      const first = (Object.keys(FIELD_ID) as FieldKey[]).find((k) => result.errors[k]);
      if (first) requestAnimationFrame(() => document.getElementById(FIELD_ID[first])?.focus());
      return;
    }
    if (pkg) {
      update.mutate({ key: pkg.key, data: result.input }, {
        onSuccess: (saved) => {
          const fresh = toForm(saved);
          setBase(fresh);
          setForm(fresh);
          onSaved(saved, saved.onSale ? SAVED_LIVE : "Đã lưu. Gói đang ẩn nên khách không thấy trên trang.");
        },
        onError: fail,
      });
    } else {
      create.mutate({ data: result.input }, {
        onSuccess: (saved) => onSaved(saved, saved.onSale
          ? "Đã đăng bán. Gói mới hiện trong mục Bảng giá trên trang trong khoảng 1 phút."
          : "Đã lưu gói mới ở trạng thái ẩn. Đánh dấu \"Đang bán\" rồi lưu khi muốn mở bán."),
        onError: fail,
      });
    }
  };

  const reset = () => { setForm(base); setErrors({}); setFailure(null); };
  const vndValue = parseVnd(form.priceVnd);
  const usdValue = parseUsd(form.priceUsd);

  const doDelete = () => {
    if (!pkg || busy) return;
    remove.mutate({ key: pkg.key }, {
      onSuccess: () => onDeleted(pkg.key),
      onError: (err) => { setConfirmDelete(false); fail(err); },
    });
  };

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 border-b-[3px] border-[#1b2a1c] bg-[hsl(var(--paper))]">
        <button type="button" onClick={onBack} aria-label="Quay lại danh sách gói" className="adm-btn adm-back h-9 w-9 shrink-0" data-testid="button-packages-back">
          <ArrowLeft className="h-4 w-4" strokeWidth={3} />
        </button>
        <h2 className="font-extrabold truncate min-w-0">{pkg ? `Sửa gói: ${pkg.vi.name || pkg.en.name}` : "Đăng bán source mới"}</h2>
        {pkg && <span className="ms-auto shrink-0 text-xs font-bold">{pkg.onSale ? "Đang bán" : "Đang ẩn"} · {pkg.buyers} người mua</span>}
      </div>

      <form onSubmit={submit} noValidate className="flex-1 min-h-0 flex flex-col" data-testid="form-package">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="max-w-5xl p-4 md:p-6 space-y-6">
            {notice && !dirty && <p role="status" className="adm-notice info" data-testid="text-package-notice">{notice}</p>}
            {failure && <p role="alert" className="adm-notice error" data-testid="text-package-error">{failure}</p>}
            {!pkg && (
              <p className="text-sm text-[#3d4a3d]">
                Gói mới hiện thành một thẻ trong mục Bảng giá, bên cạnh các gói đang bán. Khách trả tiền qua Whop như các gói khác.
              </p>
            )}

            <fieldset disabled={busy} className="space-y-3">
              <legend className="font-extrabold">Giá bán</legend>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field id={FIELD_ID.priceVnd} label="Giá VND" error={errors.priceVnd}
                  hint={vndValue ? `Trên trang: ${money(vndValue, "VND")}` : "Ví dụ 299000"}>
                  {(aria) => (
                    <div className="relative">
                      <input {...aria} type="text" inputMode="numeric" autoComplete="off" maxLength={20} value={form.priceVnd}
                        onChange={(e) => setPrice("priceVnd", e.target.value)} className="adm-field has-unit" data-testid="input-package-price-vnd" />
                      <span aria-hidden="true" className="absolute end-3 top-1/2 -translate-y-1/2 font-bold">₫</span>
                    </div>
                  )}
                </Field>
                <Field id={FIELD_ID.priceUsd} label="Giá USD" error={errors.priceUsd}
                  hint={usdValue ? `Trên trang: ${money(usdValue, "USD")}` : "Ví dụ 12 hoặc 12.50"}>
                  {(aria) => (
                    <div className="relative">
                      <input {...aria} type="text" inputMode="decimal" autoComplete="off" maxLength={12} value={form.priceUsd}
                        onChange={(e) => setPrice("priceUsd", e.target.value)} className="adm-field has-unit" data-testid="input-package-price-usd" />
                      <span aria-hidden="true" className="absolute end-3 top-1/2 -translate-y-1/2 font-bold">$</span>
                    </div>
                  )}
                </Field>
              </div>
              <p className="text-xs text-[#3d4a3d]">Khách đổi qua lại hai loại tiền ngay trên trang. Thuế (nếu có) do Whop cộng thêm lúc thanh toán.</p>
            </fieldset>

            <div className="grid xl:grid-cols-2 gap-6">
              <CopyFields lang="vi" value={form.vi} errors={errors} disabled={busy} onChange={setCopy}
                note="Khách xem trang bằng tiếng Việt thấy phần này." />
              <CopyFields lang="en" value={form.en} errors={errors} disabled={busy} onChange={setCopy}
                note="Khách xem trang bằng các thứ tiếng còn lại thấy phần này, trừ khi gói có sẵn bản dịch riêng.">
                {pkg?.translations === "built_in" && (
                  <p className={`adm-notice ${enChanged ? "error" : "info"}`} data-testid="text-package-translations">
                    {enChanged
                      ? "Bạn vừa sửa chữ tiếng Anh. Sau khi lưu, khách dùng các thứ tiếng khác (Pháp, Nhật, Hàn…) sẽ thấy chữ tiếng Anh này thay cho bản dịch có sẵn."
                      : "Gói này có sẵn bản dịch cho các thứ tiếng khác. Giữ nguyên chữ tiếng Anh thì bản dịch vẫn được dùng."}
                  </p>
                )}
                {pkg?.translations === "outdated" && (
                  <p className="adm-notice info" data-testid="text-package-translations">
                    Chữ tiếng Anh đã khác bản dịch có sẵn, nên khách dùng các thứ tiếng khác đang thấy chữ tiếng Anh.
                  </p>
                )}
              </CopyFields>
            </div>

            <fieldset disabled={busy} className="adm-group space-y-3">
              <legend className="sr-only">Hiển thị</legend>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="adm-check" checked={form.onSale}
                  onChange={(e) => setForm((f) => ({ ...f, onSale: e.target.checked }))} data-testid="checkbox-package-on-sale" />
                <span>
                  <span className="font-bold">Đang bán</span>
                  <span className="block text-sm text-[#3d4a3d]">Hiện trên trang và cho khách mua. Bỏ đánh dấu để ẩn gói.</span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="adm-check" checked={form.recommended}
                  onChange={(e) => setForm((f) => ({ ...f, recommended: e.target.checked }))} data-testid="checkbox-package-recommended" />
                <span>
                  <span className="font-bold">Gói đề xuất</span>
                  <span className="block text-sm text-[#3d4a3d]">Làm nổi bật trên trang. Chỉ một gói được đề xuất: chọn gói này sẽ bỏ đánh dấu ở gói khác.</span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="adm-check" checked={form.pickSample}
                  onChange={(e) => setForm((f) => ({ ...f, pickSample: e.target.checked }))} data-testid="checkbox-package-pick-sample" />
                <span>
                  <span className="font-bold">Khách chọn mẫu source</span>
                  <span className="block text-sm text-[#3d4a3d]">Trước khi thanh toán, khách xem ảnh và chọn một mẫu trong thẻ "Mẫu source". Mẫu đã chọn hiện trong thẻ "Đơn hàng".</span>
                </span>
              </label>
              {noSampleOnShow && (
                <p className="adm-notice info" data-testid="text-package-no-samples">
                  Chưa có mẫu nào đang hiện, nên khách vẫn mua gói này như bình thường cho tới khi bạn thêm mẫu.
                </p>
              )}
            </fieldset>
          </div>
        </div>

        <div className="border-t-[3px] border-[#1b2a1c] bg-[#ebe8de] px-4 py-3 flex flex-wrap items-center gap-2">
          {pkg?.translations === "built_in" && enChanged && (
            <p className="w-full text-sm font-semibold text-[hsl(var(--pin))]" data-testid="text-package-english-warning">
              Chữ tiếng Anh đã đổi: sau khi lưu, các thứ tiếng khác sẽ hiện chữ tiếng Anh.
            </p>
          )}
          <button type="submit" disabled={busy || (pkg !== null && !dirty)} className="adm-btn red h-11 px-5" data-testid="button-save-package">
            {create.isPending || update.isPending ? "Đang lưu…" : pkg ? "Lưu thay đổi" : form.onSale ? "Đăng bán" : "Lưu (chưa bán)"}
          </button>
          {dirty && (
            <button type="button" onClick={reset} disabled={busy} className="adm-btn h-11 px-4" data-testid="button-reset-package">
              {pkg ? "Hoàn tác" : "Xóa nội dung"}
            </button>
          )}
          {pkg && pkg.buyers === 0 && (
            confirmDelete ? (
              <span className="ms-auto flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">Xóa hẳn gói này khỏi Whop?</span>
                <button type="button" onClick={doDelete} disabled={busy} className="adm-btn red h-11 px-4" data-testid="button-confirm-delete-package">
                  {remove.isPending ? "Đang xóa…" : "Xóa"}
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} disabled={busy} className="adm-btn h-11 px-4">Thôi</button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} disabled={busy} className="adm-btn h-11 px-4 ms-auto" data-testid="button-delete-package">
                Xóa gói
              </button>
            )
          )}
          {pkg && pkg.buyers > 0 && (
            <span className="ms-auto text-xs text-[#3d4a3d] max-w-[22rem]">Gói đã có người mua nên không xóa được; muốn ngừng bán thì bỏ đánh dấu "Đang bán".</span>
          )}
        </div>
      </form>
    </>
  );
}

type Aria = { id: string; "aria-invalid"?: true; "aria-describedby"?: string };

function Field({ id, label, hint, error, counter, over, children }: {
  id: string; label: string; hint?: string; error?: string; counter?: string; over?: boolean; children: (aria: Aria) => ReactNode;
}) {
  const helpId = `${id}-help`;
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1">
        <label htmlFor={id} className="text-sm font-bold">{label}</label>
        {counter && (
          <span className={`ms-auto text-xs ${over ? "font-bold text-[hsl(var(--pin))]" : "text-[#5b6a5b]"}`} aria-hidden="true">{counter}</span>
        )}
      </div>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": error || hint ? helpId : undefined })}
      {error
        ? <p id={helpId} className="mt-1 text-sm font-semibold text-[hsl(var(--pin))]">{error}</p>
        : hint && <p id={helpId} className="mt-1 text-xs text-[#5b6a5b]">{hint}</p>}
    </div>
  );
}

function CopyFields({ lang, value, errors, disabled, onChange, note, children }: {
  lang: Lang; value: Copy; errors: Errors; disabled: boolean;
  onChange: (lang: Lang, field: keyof Copy, value: string) => void; note: string; children?: ReactNode;
}) {
  const features = featureLines(value.features);
  const nameLength = oneLine(value.name).length;
  const taglineLength = oneLine(value.tagline).length;
  return (
    // Named by the visible heading: a <legend> would sit inside the group's top border.
    <fieldset disabled={disabled} aria-labelledby={`pkg-${lang}-title`} aria-describedby={`pkg-${lang}-note`}
      className="adm-group space-y-4" data-testid={`fieldset-package-${lang}`}>
      <div>
        <p id={`pkg-${lang}-title`} className="font-extrabold">{lang === "vi" ? "Tiếng Việt" : "Tiếng Anh"}</p>
        <p id={`pkg-${lang}-note`} className="text-xs text-[#3d4a3d] xl:min-h-8">{note}</p>
      </div>
      <Field id={FIELD_ID[`${lang}.name`]} label="Tên gói" error={errors[`${lang}.name`]}
        counter={`${nameLength}/${NAME_MAX}`} over={nameLength > NAME_MAX}>
        {(aria) => (
          <input {...aria} type="text" autoComplete="off" maxLength={120} value={value.name} lang={lang}
            onChange={(e) => onChange(lang, "name", e.target.value)} className="adm-field" data-testid={`input-package-${lang}-name`} />
        )}
      </Field>
      <Field id={FIELD_ID[`${lang}.tagline`]} label="Câu giới thiệu ngắn" error={errors[`${lang}.tagline`]}
        counter={`${taglineLength}/${TAGLINE_MAX}`} over={taglineLength > TAGLINE_MAX} hint="Một câu, hiện ngay dưới tên gói. Có thể để trống.">
        {(aria) => (
          <input {...aria} type="text" autoComplete="off" maxLength={400} value={value.tagline} lang={lang}
            onChange={(e) => onChange(lang, "tagline", e.target.value)} className="adm-field" data-testid={`input-package-${lang}-tagline`} />
        )}
      </Field>
      <Field id={FIELD_ID[`${lang}.features`]} label="Khách nhận được gì" error={errors[`${lang}.features`]}
        counter={`${features.length}/${FEATURES_MAX} dòng`} over={features.length > FEATURES_MAX || features.some((x) => x.length > FEATURE_MAX)} hint={`Mỗi dòng một ý, tối đa ${FEATURES_MAX} dòng, mỗi dòng tối đa ${FEATURE_MAX} ký tự.`}>
        {(aria) => (
          <textarea {...aria} rows={8} value={value.features} lang={lang}
            onChange={(e) => onChange(lang, "features", e.target.value)} className="adm-field adm-area block" data-testid={`input-package-${lang}-features`} />
        )}
      </Field>
      {children}
    </fieldset>
  );
}
