import fetch from "node-fetch";

export async function sendTelegram(msg) {
    const token = "7747876685:AAFT221G3asycT6gRG80ThpaEvIOzT3cpp4";
    const chat_id = "5959932024";
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    try {
        await fetch(url, {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({
                chat_id,
                text: msg
            })
        });
    } catch(e) {
        console.error("Gagal kirim telegram", e.message);
    }
}
