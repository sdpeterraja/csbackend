const token = "EAAL7t5ThQD0BSViAP04RqiP0LZCdeud7SRQ0yt4Pajt5V9E6srAea0XIMP2FoGgOT3k9TgXGm14K0QQDSA6PcgHHshNwcLOtmTF9EJphVgt0aFWBjaTGUX31U1VzhK0M7ACdVfdZBiBiLuTai42vlFlZBkEt6VgcUuVYBlvFNgwflgS1ZA06mTAM8B4EZB9X16AZDZD";
const wabaId = "1018588830881356";

async function checkSub() {
  const res = await fetch(`https://graph.facebook.com/v20.0/${wabaId}/subscribed_apps`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  console.log("Current Subscribed Apps:", JSON.stringify(data, null, 2));

  // If we want to subscribe it:
  const subRes = await fetch(`https://graph.facebook.com/v20.0/${wabaId}/subscribed_apps`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  const subData = await subRes.json();
  console.log("Subscribe Response:", JSON.stringify(subData, null, 2));
}
checkSub();
