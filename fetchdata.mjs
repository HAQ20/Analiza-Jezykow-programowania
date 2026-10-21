import { writeFileSync } from "node:fs";

const TOKEN = process.env.GITHUB_TOKEN;
const LANGS = ["Python", "PHP", "JavaScript", "Java", "Kotlin", "C++"];
const FROM = 2008;
const TO = 2025;        // bez 2026 bo się jeszcze nie skończył
const MIN_STARS = 10;    // 10, żeby odfiltrować najmniejsze repozytoria

const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); // funkcja do wstrzymania działania programu na określony czas
// parametry szukania

async function count(lang, year) {
  let q = `language:"${lang}" created:${year}-01-01..${year}-12-31`; // rok i język

  if (MIN_STARS > 0) q += ` stars:>=${MIN_STARS}`; // gwiazdki

  const params = new URLSearchParams({ q, per_page: "1" }); // tylko 1 wynik, bo liczymy tylko ile jest repozytoriów a nie wszystkie strony wyników

  const url = `https://api.github.com/search/repositories?${params}`; // github api do wyszukiwania repozytoriów

  for (let attempt = 0; attempt < 3; attempt++) { // 3 próby pobrania danych
    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }),
      },
    });

    if (res.ok) return (await res.json()).total_count; // jak się rozwali to żeby coś zwróciło
    if (res.status === 403 || res.status === 429) {
      console.log("Limit zapytań");
      await sleep(60_000);
      continue;
    }
    throw new Error(`${res.status} dla ${lang} ${year}`);
  }
  throw new Error(`Nie udało się pobrać ${lang} ${year}`);
}

const data = { years: [], series: {} }; // tablica z danymi do zapisania
for (let y = FROM; y <= TO; y++) data.years.push(y); // lata do pobrania

for (const lang of LANGS) {  // dla każdego języka
  data.series[lang] = []; // tablica z liczbą repozytoriów dla każdego roku
  for (const year of data.years) { // dla każdego roku
    const n = await count(lang, year); // pobranie liczby repozytoriów dla danego języka i roku ( to aktywuje tą funkcje wyżej)
    data.series[lang].push(n); // dodanie liczby repozytoriów do tablicy

    console.log(`${lang} ${year}: ${n}`);

    await sleep(2500); // ok. 24 zapytań na minutę
  }
}

writeFileSync("data.json", JSON.stringify(data, null, 2));
console.log("Zapisano data.json");

// Do włączenia 
// $secure = Read-Host "Token" -AsSecureString
// $env:GITHUB_TOKEN = [System.Net.NetworkCredential]::new("", $secure).Password
// (token można wygenerować z https://github.com/settings/tokens) to włączyć w powershellu
// node fetchdata.mjs


// to tak troche działa więc chyba gug