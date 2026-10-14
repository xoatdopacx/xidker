// Prints the phone-size geometry of the live site (section offsets, road stops) to plan the footage.
import { setTimeout as sleep } from "node:timers/promises";
import { launch } from "./cdp.mjs";

const browser = await launch({ port: 9352 });
try {
  const page = await browser.newPage({ width: 390, height: 844, dpr: 2, mobile: true });
  await page.goto("http://localhost:80/?lang=vi");
  await sleep(3000);
  const info = await page.eval(`(() => {
    const y = (el) => Math.round(el.getBoundingClientRect().top + scrollY);
    return {
      height: document.documentElement.scrollHeight,
      sections: [...document.querySelectorAll("section[id], [id^=ban-], #cach-dung, #hoi-dap")].map((el) => ({ id: el.id, y: y(el), h: Math.round(el.getBoundingClientRect().height) })),
      stops: [...document.querySelectorAll("[data-stop], .stop, [id]")].filter((el) => /^[a-z-]+$/.test(el.id)).map((el) => el.id + "@" + y(el)).slice(0, 30),
    };
  })()`);
  console.log(JSON.stringify(info, null, 1));
} finally {
  await browser.close();
}
