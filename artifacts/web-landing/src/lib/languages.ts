import type { Language } from "@workspace/api-client-react";

export type Script = "latin" | "cyrl" | "greek" | "sc" | "tc" | "jp" | "kr" | "thai" | "lao" | "khmer" | "deva" | "beng" | "arab" | "hebr";
export type LangInfo = {
  code: Language;
  native: string;
  dir: "ltr" | "rtl";
  script: Script;
  locale: string;
};
const L = (code: Language, native: string, script: Script = "latin", dir: "ltr" | "rtl" = "ltr", locale: string = code): LangInfo =>
  ({ code, native, script, dir, locale });

/** Shared by the picker, URL handling and HTML generation. */
export const LANGUAGES: LangInfo[] = [
  L("vi", "Tiếng Việt", "latin", "ltr", "vi-VN"),
  L("en", "English", "latin", "ltr", "en-US"),
  L("zh-CN", "简体中文", "sc"),
  L("zh-TW", "繁體中文", "tc"),
  L("ja", "日本語", "jp"),
  L("ko", "한국어", "kr"),
  L("th", "ไทย", "thai"),
  L("id", "Bahasa Indonesia"),
  L("ms", "Bahasa Melayu"),
  L("fil", "Filipino"),
  L("km", "ខ្មែរ", "khmer"),
  L("lo", "ລາວ", "lao"),
  L("hi", "हिन्दी", "deva"),
  L("bn", "বাংলা", "beng"),
  L("ar", "العربية", "arab", "rtl"),
  L("fa", "فارسی", "arab", "rtl"),
  L("he", "עברית", "hebr", "rtl"),
  L("ur", "اردو", "arab", "rtl"),
  L("tr", "Türkçe"),
  L("ru", "Русский", "cyrl"),
  L("uk", "Українська", "cyrl"),
  L("pl", "Polski"),
  L("cs", "Čeština"),
  L("de", "Deutsch"),
  L("fr", "Français"),
  L("es", "Español"),
  L("pt", "Português"),
  L("it", "Italiano"),
  L("nl", "Nederlands"),
  L("sv", "Svenska"),
  L("el", "Ελληνικά", "greek"),
  L("ro", "Română"),
  L("hu", "Magyar"),
];
