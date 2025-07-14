import blessed from "blessed";
import chalk from "chalk";
import figlet from "figlet";
import { runBot } from "./index.js"; // panggil puppeteer
import { sendTelegram } from "./utils.js";

// buat screen
const screen = blessed.screen({
  smartCSR: true,
  title: "AUTO ABSEN BOT"
});

// header
const headerBox = blessed.box({
  top: 0,
  left: "center",
  width: "100%",
  height: 4,
  tags: true,
  content: chalk.cyan(figlet.textSync("AUTO ABSEN")),
  align: "center"
});

const subTitleBox = blessed.box({
  top: 4,
  left: "160",
  width: "100%",
  height: 1,
  tags: true,
  content: chalk.redBright("EGOIST PRJCT"),
  align: "center"
});

// status
const statusBox = blessed.box({
  top: 5,
  left: 0,
  width: "100%",
  height: 3,
  border: { type: "line" },
  content: chalk.yellow("Status: Standby..."),
  tags: true
});

// menu
const menuBox = blessed.list({
  top: 8,
  left: 0,
  width: "30%",
  height: "100%-8",
  border: { type: "line" },
  label: " {bold}Menu{/bold} ",
  tags: true,
  items: [
    "{green-fg}Mulai Absen{/green-fg}",
    "{yellow-fg}Lihat Log{/yellow-fg}",
    "{red-fg}Keluar{/red-fg}"
  ],
  keys: true,
  mouse: true,
  style: {
    selected: { bg: "blue" }
  }
});

// log
const logBox = blessed.log({
  top: 8,
  left: "30%",
  width: "70%",
  height: "100%-8",
  border: { type: "line" },
  label: " {bold}Log Aktivitas{/bold} ",
  tags: true,
  scrollable: true,
  scrollbar: {
    ch: " ",
    track: { bg: "grey" },
    style: { inverse: true }
  }
});

// append ke screen
screen.append(headerBox);
screen.append(statusBox);
screen.append(menuBox);
screen.append(logBox);
screen.append(subTitleBox);

// render
screen.render();

// interaksi menu
menuBox.on("select", async (item) => {
  const choice = item.getText();
  if (choice.includes("Mulai Absen")) {
    statusBox.setContent(chalk.green("Status: Sedang berjalan..."));
    logBox.log("{green-fg}Memulai bot absen...{/green-fg}");
    screen.render();
    try {
      await runBot((msg) => {
        logBox.log(msg);
        screen.render();
      });
      statusBox.setContent(chalk.green("Status: Selesai."));
      screen.render();
    } catch (err) {
      logBox.log(`{red-fg}Error: ${err.message}{/red-fg}`);
      statusBox.setContent(chalk.red("Status: Gagal."));
      screen.render();
    }
  } else if (choice.includes("Lihat Log")) {
    logBox.log("{yellow-fg}Belum ada fitur khusus log viewer{/yellow-fg}");
  } else if (choice.includes("Keluar")) {
    screen.destroy();
    process.exit(0);
  }
});

// keyboard exit
screen.key(["escape", "q", "C-c"], () => process.exit(0));
