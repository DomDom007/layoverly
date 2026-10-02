// Layoverly: works out whether a long layover leaves real time in the city, and turns it into a timed mini itinerary.
import { useState } from "react";
import { uid, useStored } from "./lib/store";
import { hhmm, toHours } from "./lib/time";
import { Section, Stat, Stats } from "./ui/kit";

const T = "layoverly";
// Typical one-way times in minutes. Always check on the day.
const AIRPORTS: Record<string, { name: string; city: string; transit: number; mode: string; exit: number; security: number; bags: string; ideas: [string, number][] }> = {
  IST: { name: "Istanbul", city: "Sultanahmet", transit: 75, mode: "Metro M11 then tram, or taxi", exit: 45, security: 75, bags: "Left-luggage desk in the arrivals hall", ideas: [["Hagia Sophia and the Blue Mosque", 90], ["Grand Bazaar", 60], ["Tea and baklava by the Bosphorus", 45]] },
  CDG: { name: "Paris Charles de Gaulle", city: "Central Paris", transit: 50, mode: "RER B train", exit: 40, security: 60, bags: "Bagages du Monde, Terminal 2", ideas: [["Walk from Notre-Dame along the Seine", 75], ["Louvre courtyard and Tuileries", 60], ["Lunch in the Marais", 60]] },
  DXB: { name: "Dubai", city: "Downtown Dubai", transit: 30, mode: "Metro Red Line or taxi", exit: 45, security: 60, bags: "Baggage services in Terminals 1 and 3", ideas: [["Dubai Mall and fountain show", 75], ["Old Dubai, abra across the Creek", 75], ["Gold and spice souks", 45]] },
  DOH: { name: "Doha", city: "Souq Waqif", transit: 20, mode: "Metro Red Line or taxi", exit: 40, security: 60, bags: "Left-luggage in arrivals", ideas: [["Museum of Islamic Art", 75], ["Souq Waqif", 60], ["Corniche walk", 40]] },
  FRA: { name: "Frankfurt", city: "Römerberg", transit: 20, mode: "S-Bahn S8 or S9", exit: 40, security: 60, bags: "Left-luggage, Terminal 1", ideas: [["Römerberg old town square", 45], ["Walk the Main river bank", 45], ["Apple wine in Sachsenhausen", 60]] },
  AMS: { name: "Amsterdam Schiphol", city: "Centraal Station", transit: 20, mode: "Direct train", exit: 35, security: 60, bags: "Lockers below Schiphol Plaza", ideas: [["Canal ring walk", 75], ["Rijksmuseum gardens", 45], ["Jordaan cafes", 60]] },
  MAD: { name: "Madrid Barajas", city: "Puerta del Sol", transit: 45, mode: "Metro Line 8 then Line 10, or taxi", exit: 40, security: 60, bags: "Consigna in Terminals 1 and 4", ideas: [["Plaza Mayor and Mercado San Miguel", 60], ["Retiro park", 60], ["Churros at San Ginés", 30]] },
  LHR: { name: "London Heathrow", city: "Paddington", transit: 20, mode: "Heathrow Express", exit: 50, security: 75, bags: "Excess Baggage Company in each terminal", ideas: [["Hyde Park and Kensington Gardens", 60], ["Westminster and the river", 75], ["A proper pub lunch", 60]] },
  TUN: { name: "Tunis Carthage", city: "Medina of Tunis", transit: 25, mode: "Taxi", exit: 40, security: 75, bags: "Ask at the information desk", ideas: [["Medina and Zitouna mosque", 75], ["Sidi Bou Said", 90], ["Carthage ruins", 90]] },
};

export default function Layoverly() {
  const [code, setCode] = useStored(T, "code", "IST");
  const [arr, setArr] = useStored(T, "arr", "07:40");
  const [dep, setDep] = useStored(T, "dep", "16:55");
  const [visa, setVisa] = useStored(T, "visa", "check");
  const [checked, setChecked] = useStored(T, "checked", true);
  const [custom, setCustom] = useStored<{ id: string; what: string; mins: number }[]>(T, "custom", []);
  const [pick, setPick] = useState<string[]>([]);
  const ap = AIRPORTS[code];
  let gap = toHours(dep) - toHours(arr); if (gap <= 0) gap += 24;
  const out = ap.exit / 60, back = (ap.security + 30) / 60, tr = ap.transit / 60;
  const cityTime = gap - out - tr * 2 - back - (checked ? 0 : 0.5);
  const leave = toHours(arr) + out, inCity = leave + tr, mustLeave = toHours(dep) - back - tr;
  const verdict = visa === "no" ? ["Stay airside", "bad", "You need a visa you don't have, so you can't leave the airport."] : cityTime >= 3 ? ["Go into the city", "good", `About ${cityTime.toFixed(1)} hours to enjoy.`] : cityTime >= 1.5 ? ["Short trip possible", "warn", `Only ${cityTime.toFixed(1)} hours in the city. Pick one thing close to the station.`] : ["Stay in the airport", "bad", "Not enough time once you add immigration, travel and security."];
  const ideas = [...ap.ideas.map(([w, m]) => ({ id: w, what: w, mins: m })), ...custom];
  const chosen = ideas.filter(i => pick.includes(i.id));
  const used = chosen.reduce((a, i) => a + i.mins, 0) / 60;
  let t = inCity;
  const plan = [{ at: toHours(arr), what: `Land at ${ap.name}` }, { at: leave, what: `Through immigration${checked ? "" : ", collect bags"} and leave the airport. ${ap.bags}.` }, { at: leave, what: `${ap.mode} to ${ap.city} (about ${ap.transit} min)` },
    ...chosen.map(i => { const s = { at: t, what: `${i.what} (${i.mins} min)` }; t += i.mins / 60; return s; }),
    { at: mustLeave, what: `Head back: leave ${ap.city} by this time at the latest` }, { at: mustLeave + tr, what: "Back at the airport: security and passport control" }, { at: toHours(dep) - 0.5, what: "Be at the gate" }, { at: toHours(dep), what: "Departure" }];

  return (
    <div className="stack">
      <Section title="Your layover">
        <div className="row">
          <label className="field"><span>Airport</span><select id="lo-a" className="input" value={code} onChange={e => { setCode(e.target.value); setPick([]); }}>{Object.entries(AIRPORTS).map(([k, a]) => <option key={k} value={k}>{k} · {a.name}</option>)}</select></label>
          <label className="field" style={{ flex: "0 0 130px" }}><span>You land</span><input id="lo-arr" type="time" className="input" value={arr} onChange={e => setArr(e.target.value)} /></label>
          <label className="field" style={{ flex: "0 0 130px" }}><span>Next flight leaves</span><input id="lo-dep" type="time" className="input" value={dep} onChange={e => setDep(e.target.value)} /></label>
          <label className="field"><span>Can you enter the country?</span><select id="lo-v" className="input" value={visa} onChange={e => setVisa(e.target.value)}><option value="yes">Yes, no visa needed or I have one</option><option value="check">Not sure yet</option><option value="no">No</option></select></label>
        </div>
        <label className="check" style={{ marginTop: 10 }}><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} />My bags are checked through to my final destination</label>
      </Section>
      <section className={"panel lv-verdict " + verdict[1]}>
        <p className="eyebrow">Verdict</p><h2>{verdict[0]}</h2><p>{verdict[2]}</p>
        {visa === "check" && <p className="note" style={{ marginTop: 6 }}>Check the entry rules for your passport on the official government website or with your airline before you plan.</p>}
        <Stats><Stat value={`${gap.toFixed(1)} h`} label="Layover" /><Stat value={`${Math.max(0, cityTime).toFixed(1)} h`} label="Time in the city" /><Stat value={cityTime > 0 ? hhmm(mustLeave) : "–"} label="Leave the city by" tone="warn" /></Stats>
      </section>
      {verdict[1] !== "bad" && <div className="grid2">
        <Section title={`Ideas near ${ap.city}`}>
          <div className="stack" style={{ gap: 6 }}>{ideas.map(i => <label key={i.id} className="check" style={{ justifyContent: "space-between" }}><span><input type="checkbox" checked={pick.includes(i.id)} onChange={e => setPick(e.target.checked ? [...pick, i.id] : pick.filter(x => x !== i.id))} /> {i.what}</span><span className="note">{i.mins} min</span></label>)}</div>
          <form className="row" style={{ marginTop: 10 }} onSubmit={e => { e.preventDefault(); const f = e.currentTarget; const w = (f.elements.namedItem("w") as HTMLInputElement).value.trim(), m = parseInt((f.elements.namedItem("m") as HTMLInputElement).value) || 45; if (w) setCustom([...custom, { id: uid(), what: w, mins: m }]); f.reset(); }}><input name="w" className="input" style={{ flex: 2 }} aria-label="Your own idea" placeholder="Your own idea" /><input name="m" className="input num" style={{ flex: 1 }} aria-label="Minutes" placeholder="Minutes" /><button className="btn small" type="submit">Add</button></form>
          <p className="note" style={{ marginTop: 10 }}><span className={"pill " + (used > cityTime ? "bad" : "good")}>{used.toFixed(1)} of {Math.max(0, cityTime).toFixed(1)} hours used</span></p>
        </Section>
        <Section title="Timed plan">
          <ol className="lv-plan">{plan.map((p, i) => <li key={i} className={p.at > mustLeave && i > 2 && i < plan.length - 4 ? "late" : ""}><b className="num">{hhmm(p.at)}</b><span>{p.what}</span></li>)}</ol>
          <p className="note">Times use typical transit and queue lengths ({ap.exit} min out, {ap.security} min back through security). Leave more buffer at rush hour.</p>
        </Section>
      </div>}
      <style>{`.lv-verdict{border-top:6px solid}.lv-verdict.good{border-color:var(--good)}.lv-verdict.warn{border-color:var(--warn)}.lv-verdict.bad{border-color:var(--bad)}.lv-verdict h2{font-size:36px;margin:4px 0}.lv-verdict .row{margin-top:14px}
      .lv-plan{list-style:none;padding:0;margin:0;display:grid;gap:8px}.lv-plan li{display:flex;gap:12px}.lv-plan b{font-family:var(--mono);min-width:50px}.lv-plan .late span{color:var(--bad)}`}</style>
    </div>
  );
}
