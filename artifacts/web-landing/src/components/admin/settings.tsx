import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetAdminSettings, getGetAdminSettingsQueryKey, useListBanks, getListBanksQueryKey,
  useUpdateAdminBank, useUpdateAdminEmailDomains, getGetAdminOverviewQueryKey,
  type AdminSettings as Settings,
} from "@workspace/api-client-react";
import { statusOf } from "@/lib/http";
import { adminErrorText, useSignOutOn401 } from "./shared";

const SETTINGS_KEY = getGetAdminSettingsQueryKey();
const DOMAINS_MAX = 300;
// Same checks as the API.
const ACCOUNT_NUMBER_RE = /^[0-9A-Za-z]{4,19}$/;
const DOMAIN_RE = /^(?=.{3,100}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

type SignedOut = (notice: string | null) => void;

/** The name as banks print it, the way the API saves it: "Nguyễn Văn A" → "NGUYEN VAN A". */
function bankName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

const domainLines = (text: string) => text.split(/\r?\n/).map((line) => line.trim().toLowerCase().replace(/^@/, ""));

/** Warns before leaving the page with unsaved edits. */
function useLeaveWarning(on: boolean) {
  useEffect(() => {
    if (!on) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [on]);
}

export function AdminSettings({ onSignedOut }: { onSignedOut: SignedOut }) {
  const settings = useGetAdminSettings({ query: { queryKey: SETTINGS_KEY, retry: false, staleTime: 60_000 } });
  useSignOutOn401(settings.error, onSignedOut);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" data-testid="admin-settings">
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
        <h1 className="text-xl font-extrabold">Cài đặt</h1>
        {settings.data ? (
          <>
            <BankForm settings={settings.data} onSignedOut={onSignedOut} />
            <DomainsForm settings={settings.data} onSignedOut={onSignedOut} />
            <section aria-labelledby="admin-account-title" className="adm-card p-4 md:p-5">
              <h2 id="admin-account-title" className="font-extrabold">Tài khoản quản trị</h2>
              <p className="mt-1 text-sm">
                <b className="break-all" dir="ltr">{settings.data.adminEmail}</b>
              </p>
              <p className="mt-1 text-sm text-[#3d4a3d]">
                Đăng nhập bằng email này ở trang đăng nhập như khách, rồi nhập thêm mã gửi về hộp thư. Mỗi lần đăng nhập vào được trang quản trị trong 12 giờ, và chỉ trên một trình duyệt.
              </p>
            </section>
          </>
        ) : settings.isError ? (
          <div className="adm-card p-6 text-sm">
            <p>{adminErrorText(settings.error)}</p>
            <button type="button" onClick={() => settings.refetch()} className="adm-btn h-9 px-3 mt-3">Thử lại</button>
          </div>
        ) : (
          <p className="text-sm text-[#3d4a3d]">Đang tải cài đặt…</p>
        )}
      </div>
    </div>
  );
}

/* ---------------- bank account ---------------- */

type Bank = { bin: string; accountNumber: string; accountName: string };
const bankOf = (s: Settings): Bank => ({ bin: s.bank?.bin ?? "", accountNumber: s.bank?.accountNumber ?? "", accountName: s.bank?.accountName ?? "" });

function BankForm({ settings, onSignedOut }: { settings: Settings; onSignedOut: SignedOut }) {
  const qc = useQueryClient();
  const banks = useListBanks({ query: { queryKey: getListBanksQueryKey(), retry: false, staleTime: Infinity } });
  useSignOutOn401(banks.error, onSignedOut);
  const save = useUpdateAdminBank();
  const [base, setBase] = useState(() => bankOf(settings));
  const [form, setForm] = useState(base);
  const [errors, setErrors] = useState<Partial<Record<keyof Bank, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const number = form.accountNumber.replace(/[\s.-]/g, "");
  const name = bankName(form.accountName);
  const dirty = form.bin !== base.bin || number !== base.accountNumber || name !== bankName(base.accountName);
  useLeaveWarning(dirty);
  const sorted = useMemo(() => [...(banks.data ?? [])].sort((a, b) => a.shortName.localeCompare(b.shortName)), [banks.data]);
  const chosen = sorted.find((b) => b.bin === form.bin);

  const edit = (patch: Partial<Bank>) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch) as (keyof Bank)[]) delete next[k];
      return next;
    });
    setNotice(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (save.isPending) return;
    const found: typeof errors = {};
    if (!chosen) found.bin = "Chọn ngân hàng.";
    if (!ACCOUNT_NUMBER_RE.test(number)) found.accountNumber = "Số tài khoản gồm 4 đến 19 chữ số (hoặc chữ cái), không có dấu cách.";
    if (name.length < 2) found.accountName = "Nhập tên chủ tài khoản.";
    else if (form.accountName.trim().length > 50 || name.length > 50) found.accountName = "Tên chủ tài khoản tối đa 50 ký tự.";
    setErrors(found);
    setFailure(null);
    const first = (["bin", "accountNumber", "accountName"] as const).find((k) => found[k]);
    if (first) { document.getElementById(`bank-${first}`)?.focus(); return; }
    save.mutate({ data: { bin: form.bin, accountNumber: number, accountName: name } }, {
      onSuccess: (saved) => {
        qc.setQueryData(SETTINGS_KEY, saved);
        void qc.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() });
        const next = bankOf(saved);
        setBase(next);
        setForm(next);
        setNotice("Đã lưu. Từ giờ mã QR của mọi đơn chưa thanh toán đều chuyển tiền vào tài khoản này.");
      },
      onError: (err) => {
        if (statusOf(err) === 401) { onSignedOut(adminErrorText(err)); return; }
        setFailure(adminErrorText(err));
      },
    });
  };

  return (
    <section aria-labelledby="bank-title" className="adm-card p-4 md:p-5">
      <h2 id="bank-title" className="font-extrabold">Tài khoản nhận tiền</h2>
      <p className="mt-1 text-sm text-[#3d4a3d]">
        Khách quét mã QR trên trang đơn hàng: app ngân hàng tự điền đúng tài khoản này, số tiền và mã đơn. Bạn xem tiền vào rồi xác nhận đơn trong thẻ "Đơn hàng".
      </p>
      {!settings.bank && (
        <p role="alert" className="adm-notice error mt-3" data-testid="text-bank-missing">Chưa có tài khoản nhận tiền nên khách chưa đặt hàng được.</p>
      )}

      <form onSubmit={submit} noValidate className="mt-4 space-y-4" data-testid="form-bank">
        {notice && <p role="status" className="adm-notice info" data-testid="text-bank-notice">{notice}</p>}
        {failure && <p role="alert" className="adm-notice error" data-testid="text-bank-error">{failure}</p>}

        <div>
          <label htmlFor="bank-bin" className="mb-1 block text-sm font-bold">Ngân hàng</label>
          <select id="bank-bin" value={form.bin} onChange={(e) => edit({ bin: e.target.value })} disabled={save.isPending || !banks.data}
            aria-invalid={errors.bin ? true : undefined} aria-describedby={errors.bin ? "bank-bin-help" : undefined}
            className="adm-field" data-testid="select-bank">
            <option value="">{banks.isPending ? "Đang tải danh sách ngân hàng…" : "Chọn ngân hàng"}</option>
            {sorted.map((b) => <option key={b.bin} value={b.bin}>{b.shortName} — {b.name}</option>)}
          </select>
          {errors.bin && <p id="bank-bin-help" className="mt-1 text-sm font-semibold text-[hsl(var(--pin-text))]">{errors.bin}</p>}
          {banks.isError && <p className="mt-1 text-sm font-semibold text-[hsl(var(--pin-text))]">{adminErrorText(banks.error)}</p>}
        </div>

        <div>
          <label htmlFor="bank-accountNumber" className="mb-1 block text-sm font-bold">Số tài khoản</label>
          <input id="bank-accountNumber" type="text" inputMode="numeric" autoComplete="off" spellCheck={false} maxLength={30}
            value={form.accountNumber} onChange={(e) => edit({ accountNumber: e.target.value })} disabled={save.isPending}
            aria-invalid={errors.accountNumber ? true : undefined} aria-describedby={errors.accountNumber ? "bank-accountNumber-help" : undefined}
            className="adm-field font-mono" data-testid="input-bank-number" />
          {errors.accountNumber && <p id="bank-accountNumber-help" className="mt-1 text-sm font-semibold text-[hsl(var(--pin-text))]">{errors.accountNumber}</p>}
        </div>

        <div>
          <label htmlFor="bank-accountName" className="mb-1 block text-sm font-bold">Tên chủ tài khoản</label>
          <input id="bank-accountName" type="text" autoComplete="off" spellCheck={false} maxLength={80}
            value={form.accountName} onChange={(e) => edit({ accountName: e.target.value })} disabled={save.isPending}
            aria-invalid={errors.accountName ? true : undefined} aria-describedby="bank-accountName-help"
            className="adm-field" data-testid="input-bank-name" />
          {errors.accountName
            ? <p id="bank-accountName-help" className="mt-1 text-sm font-semibold text-[hsl(var(--pin-text))]">{errors.accountName}</p>
            : <p id="bank-accountName-help" className="mt-1 text-xs text-[#5b6a5b]">Ghi đúng như trên thẻ, có dấu hay không đều được. Khách thấy: <b>{name || "…"}</b></p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={save.isPending || !dirty} className="adm-btn red h-11 px-5" data-testid="button-bank-save">
            {save.isPending ? "Đang lưu…" : "Lưu tài khoản"}
          </button>
          {dirty && (
            <button type="button" onClick={() => { setForm(base); setErrors({}); setFailure(null); }} disabled={save.isPending} className="adm-btn h-11 px-4">
              Hoàn tác
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

/* ---------------- email providers ---------------- */

function DomainsForm({ settings, onSignedOut }: { settings: Settings; onSignedOut: SignedOut }) {
  const qc = useQueryClient();
  const save = useUpdateAdminEmailDomains();
  const [base, setBase] = useState(() => settings.emailDomains.join("\n"));
  const [text, setText] = useState(base);
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const lines = domainLines(text);
  const domains = [...new Set(lines.filter(Boolean))];
  const dirty = domains.join("\n") !== domainLines(base).filter(Boolean).join("\n");
  useLeaveWarning(dirty);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (save.isPending) return;
    setFailure(null);
    const bad = lines.findIndex((line) => line && !DOMAIN_RE.test(line));
    const problem = bad >= 0
      ? `Dòng ${bad + 1} ("${lines[bad]}") chưa phải tên miền email. Ví dụ đúng: gmail.com`
      : domains.length === 0 ? "Cần ít nhất một nhà cung cấp email."
        : domains.length > DOMAINS_MAX ? `Tối đa ${DOMAINS_MAX} dòng.` : null;
    setError(problem);
    if (problem) { document.getElementById("email-domains")?.focus(); return; }
    save.mutate({ data: { domains } }, {
      onSuccess: (saved) => {
        qc.setQueryData(SETTINGS_KEY, saved);
        const next = saved.emailDomains.join("\n");
        setBase(next);
        setText(next);
        setNotice(`Đã lưu ${saved.emailDomains.length} nhà cung cấp email.`);
      },
      onError: (err) => {
        if (statusOf(err) === 401) { onSignedOut(adminErrorText(err)); return; }
        setFailure(adminErrorText(err));
      },
    });
  };

  return (
    <section aria-labelledby="domains-title" className="adm-card p-4 md:p-5">
      <h2 id="domains-title" className="font-extrabold">Email được phép tạo tài khoản</h2>
      <p className="mt-1 text-sm text-[#3d4a3d]">
        Chỉ email thuộc các nhà cung cấp dưới đây mới tạo được tài khoản, để chặn email ảo dùng một lần. Tài khoản đã tạo trước đó không bị ảnh hưởng.
      </p>
      <form onSubmit={submit} noValidate className="mt-4 space-y-3" data-testid="form-email-domains">
        {notice && !dirty && <p role="status" className="adm-notice info" data-testid="text-domains-notice">{notice}</p>}
        {failure && <p role="alert" className="adm-notice error" data-testid="text-domains-error">{failure}</p>}
        <div>
          <div className="mb-1 flex items-baseline gap-2">
            <label htmlFor="email-domains" className="text-sm font-bold">Mỗi dòng một tên miền</label>
            <span className={`ms-auto text-xs ${domains.length > DOMAINS_MAX ? "font-bold text-[hsl(var(--pin-text))]" : "text-[#5b6a5b]"}`}>{domains.length} nhà cung cấp</span>
          </div>
          <textarea id="email-domains" value={text} rows={12} spellCheck={false} autoCapitalize="none" disabled={save.isPending}
            onChange={(e) => { setText(e.target.value); setError(null); setNotice(null); }}
            aria-invalid={error ? true : undefined} aria-describedby="email-domains-help"
            className="adm-field adm-area block font-mono !text-sm" data-testid="input-email-domains" />
          {error
            ? <p id="email-domains-help" className="mt-1 text-sm font-semibold text-[hsl(var(--pin-text))]">{error}</p>
            : <p id="email-domains-help" className="mt-1 text-xs text-[#5b6a5b]">Ví dụ: gmail.com, outlook.com, yahoo.com. Email quản trị luôn đăng nhập được.</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={save.isPending || !dirty} className="adm-btn red h-11 px-5" data-testid="button-domains-save">
            {save.isPending ? "Đang lưu…" : "Lưu danh sách"}
          </button>
          {dirty && (
            <button type="button" onClick={() => { setText(base); setError(null); setFailure(null); }} disabled={save.isPending} className="adm-btn h-11 px-4">
              Hoàn tác
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
