import { useEffect } from "react";
import { api } from "@/api/client";

// Works out where a member is, for candle lighting and Havdalah — which is
// also what locks the app on Shabbos, so a wrong answer is worse than no
// answer.
//
// Order of trust:
//   1. the city they typed during onboarding, geocoded  — they told us
//   2. the browser's geolocation, if granted            — the device knows
//   3. the address their connection resolves to         — a guess
//
// The first two are saved and used. The third is only ever a *suggestion*:
// an ISP resolves to its own city (a Jerusalem member was placed in Buffalo),
// and computing candle lighting for the wrong continent would lock the app at
// the wrong moment. A suggestion is stored under suggested_* for the settings
// page to offer, and confirming it is a deliberate act.
async function reverseGeocode(latitude, longitude) {
  try {
    const { city, country_code, timezone } = await api.geo.reverse(latitude, longitude);
    return { city, country_code, timezone };
  } catch { return { city: '', country_code: '', timezone: '' }; }
}

// The zone that belongs to the coordinates, not to the device. They differ
// whenever someone travels, and the device's answer is the wrong one.
const zoneFor = (timezone) => {
  if (timezone) return timezone;
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ''; }
};

export async function locateFromCity(city) {
  if (!city || !String(city).trim()) return null;
  try {
    const [hit] = await api.geo.search(city, 1);
    if (!hit || hit.latitude == null) return null;
    return {
      latitude: hit.latitude,
      longitude: hit.longitude,
      timezone: zoneFor(hit.timezone),
      city: hit.city || String(city).trim(),
      country_code: hit.country_code || '',
    };
  } catch { return null; }
}

async function ipSuggestion() {
  try {
    const d = await api.geo.ip();
    if (!d || d.latitude == null) return false;
    await api.auth.updateMe({
      suggested_latitude: d.latitude,
      suggested_longitude: d.longitude,
      suggested_timezone: zoneFor(d.timezone),
      suggested_city: d.city || '',
      suggested_country_code: d.country_code || '',
      suggested_source: 'ip',
    });
    return true;
  } catch { return false; }
}

export function useDetectLocation() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!(await api.auth.hasAccount())) return;
        const me = await api.auth.me();
        if (me.latitude != null && me.longitude != null) return;

        // What they told us at sign-up beats anything we can sniff.
        if (me.home_city) {
          const fromCity = await locateFromCity(me.home_city);
          if (fromCity && !cancelled) {
            await api.auth.updateMe({ ...fromCity, shabbos_mode_source: 'onboarding' });
            return;
          }
        }

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async (pos) => {
            if (cancelled) return;
            const { latitude, longitude } = pos.coords;
            const { city, country_code, timezone } = await reverseGeocode(latitude, longitude);
            await api.auth.updateMe({ latitude, longitude, timezone: zoneFor(timezone), city, country_code, shabbos_mode_source: 'device' });
          }, async () => { if (!cancelled) await ipSuggestion(); }, { timeout: 10000, maximumAge: 600000 });
        } else {
          await ipSuggestion();
        }
      } catch { /* a missing location is handled everywhere it matters */ }
    })();
    return () => { cancelled = true; };
  }, []);
}
