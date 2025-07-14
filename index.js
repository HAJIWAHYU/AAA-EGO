import puppeteer from "puppeteer";
import fs from "fs";
import { sendTelegram } from "./utils.js";

export async function runBot(log) {
  // baca semua akun
  const accountLines = fs.readFileSync("idpw.txt", "utf8").split("\n").filter(Boolean);

  for (const line of accountLines) {
    const [username, password] = line.split("|");
    await jalankanAkun(username.trim(), password.trim(), log);
  }
}

async function jalankanAkun(username, password, log) {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: "/usr/bin/chromium-browser",
    args: ["--no-sandbox"]
  });
  const page = await browser.newPage();

  try {
    log(`🔐 Login akun ${username}...`);
    await page.goto("https://e-learning.radenfatah.ac.id/", { waitUntil: "networkidle0" });
    await page.type("#username", username);
    await page.type("#password", password);
    await page.click("button[type=submit]");
    await page.waitForNavigation({ waitUntil: "networkidle0" });
    log(`✅ ${username}: Login berhasil`);
    await sendTelegram(`✅ ${username}: Login berhasil`);
    
            // 🟡 Pilih tahun ajaran (semester)
    log("📅 Memilih semester...");
    await page.waitForSelector("#exampleFormControlSelect1");

    // Klik dropdown dan pilih semester (misalnya option ke-3)
    await Promise.all([
        page.select(
            "#exampleFormControlSelect1",
            await page.$eval("#exampleFormControlSelect1 > option:nth-child(3)", el => el.value)
        ),
        page.waitForNavigation({ waitUntil: "networkidle0" })
    ]);
    
 // atau pakai waitForNavigation kalau ada perubahan
    log("✅ Semester dipilih, lanjut ambil mata kuliah...");

    // ambil semua mata kuliah
    await page.waitForSelector("a.btn.btn-primary");
    const viewLinks = await page.$$eval("a.btn.btn-primary", links => links.map(link => link.href));
    log(`📚 ${username}: Ditemukan ${viewLinks.length} mata kuliah`);

    for (const mkUrl of viewLinks) {
      log(`➡️ ${username}: Masuk ke ${mkUrl}`);
      await page.goto(mkUrl, { waitUntil: "networkidle0" });

      let namaMatkul;
      try {
  // 1️⃣ saat di daftar mata kuliah
        namaMatkul = await page.$eval(
            "#content-page > div > div > div:nth-child(4) > div > div.iq-card-body.text-center > div.group-info.pt-3.pb-3 > p:nth-child(2)",
            el => el.textContent.trim()
        );
        } catch {
            try {
                // 2️⃣ saat di tab Tugas/Materi
                namaMatkul = await page.$eval(
                'h4.mb-2',
                el => el.textContent.trim()
                );
        } catch {
            try {
            // 3️⃣ saat di forum diskusi
            namaMatkul = await page.$eval(
                '#forum > div.iq-card > div > div > div:nth-child(2) > div > h3',
                el => el.textContent.trim()
            );
            } catch {
            namaMatkul = "Mata kuliah tidak terdeteksi";
            }
        }
        }

      try {
        await page.waitForSelector('#content-page > div > div > div:nth-child(1) > div > div > div > ul > li:nth-child(2) > a', { timeout: 5000 });
        await page.click('#content-page > div > div > div:nth-child(1) > div > div > div > ul > li:nth-child(2) > a');
        log(`${username}: Berhasil klik tab Tugas/Materi`);
      } catch {
        log(`${username}: Gagal klik tab Tugas/Materi`);
        continue;
      }

      for (let i = 1; i <= 16; i++) {
        log(`📘 ${username}: Mengecek Pertemuan ${i}`);
        let prevContent = '';
        try {
          await page.waitForSelector('.card-body', { timeout: 5000 });
          prevContent = await page.$eval('.card-body', el => el.innerText);
        } catch {}

        await page.evaluate(pertemuanKe => {
          const links = Array.from(document.querySelectorAll("a"));
          const link = links.find(a => a.textContent.includes(`Pertemuan ${pertemuanKe}`));
          if (link) link.click();
        }, i);

        if (prevContent) {
          try {
            await page.waitForFunction(
              oldContent => {
                const el = document.querySelector(".card-body");
                return el && el.innerText !== oldContent;
              },
              { timeout: 5000 },
              prevContent
            );
          } catch {}
        } else {
          await new Promise(r => setTimeout(r, 2000));
        }

        try {
          await page.waitForSelector("#TampilanData > div > div > div.col-md-auto > a", { timeout: 3000 });
          log(`✅ ${username}: Pertemuan ${i} ada absen`);
          page.once("dialog", async dialog => await dialog.accept());
          await Promise.all([
            page.click("#TampilanData > div > div > div.col-md-auto > a"),
            page.waitForNavigation({ waitUntil: "networkidle0", timeout: 10000 })
          ]);
          log(`✅ ${username}: Absen Pertemuan ${i} berhasil`);

          await sendTelegram(`✅ ${username}: Absen Pertemuan ${i} berhasil pada MK ${namaMatkul}`);

          try {
            await page.waitForSelector('#content-page > div > div > div:nth-child(1) > div > div > div > ul > li:nth-child(2) > a', { timeout: 5000 });
            await page.click('#content-page > div > div > div:nth-child(1) > div > div > div > ul > li:nth-child(2) > a');
            await new Promise(r => setTimeout(r, 1000));
          } catch {}

        } catch {
          log(`❌ ${username}: Pertemuan ${i} tidak ada absen`);
          
        }
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    await sendTelegram(`🎉 ${username}: Selesai semua absen`);
    log(`🎉 ${username}: Selesai semua absen`);

  } catch (e) {
    log(`❌ ${username}: Error ${e.message}`);
    await sendTelegram(`❌ ${username}: Gagal absen karena ${e.message}`);
  } finally {
    await browser.close();
  }
}
